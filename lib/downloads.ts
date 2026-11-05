/**
 * The home page's own download of the desktop installer.
 *
 * The page fetches the file itself, through its own origin (app/api/desktop/
 * download), in pieces of a few megabytes: each piece is one short request, a
 * dropped connection costs only the piece in flight, and a download that
 * stopped can carry on from where it was. When the release manifest gives the
 * file's SHA-512, the bytes are checked against it before they're saved, so
 * "downloaded" means the file is whole. Anything that goes wrong comes back as
 * a DownloadProblem that names the cause, for the page to say what to do.
 *
 * Browser-only (fetch, ReadableStream, Blob, WebCrypto); the tests give it a
 * fake fetch.
 */

export const CHUNK_BYTES = 8 * 1024 * 1024;
const RETRIES = 5;
/** Backoff between tries at the same position: 1 s, 2 s, 4 s, 8 s, 8 s. */
const backoff = (attempt: number) => Math.min(8000, 1000 * 2 ** (attempt - 1));

export type ProblemKind =
  /** No connection at the moment it was needed. */
  | "offline"
  /** The file is gone from the release (404). */
  | "missing"
  /** The host said no (401, 403). */
  | "refused"
  /** Too many downloads at once (429). */
  | "busy"
  /** The download server or the asset host failed (5xx and the rest). */
  | "server"
  /** The connection kept failing part-way; the bytes so far are kept for a retry. */
  | "dropped"
  /** The file arrived, but its checksum doesn't match the release's. */
  | "damaged"
  /** The browser couldn't hold the file. */
  | "memory"
  /** Anything else the browser threw. */
  | "unknown";

/** The bytes a stopped download already had, so the next try carries on. */
export interface Partial {
  buffer: Uint8Array;
  received: number;
  total: number;
}

export class DownloadProblem extends Error {
  constructor(
    readonly kind: ProblemKind,
    readonly received: number,
    readonly total: number | null,
    /** The HTTP status that caused it, when one did. */
    readonly status?: number,
    /** What had arrived, when a retry can carry on from it. */
    readonly partial?: Partial,
  ) {
    super(`download ${kind}${status ? ` (${status})` : ""} at ${received}${total === null ? "" : ` of ${total}`}`);
    this.name = "DownloadProblem";
  }
}

export interface DownloadOptions {
  url: string;
  /** The size the release says; the real one comes from the response. */
  size?: number;
  /** The release manifest's SHA-512 (base64). Empty skips the check. */
  sha512?: string;
  signal?: AbortSignal;
  onProgress?: (received: number, total: number | null) => void;
  /** Carry on from a dropped download. */
  resume?: Partial | null;
  fetchImpl?: typeof fetch;
  chunkBytes?: number;
  retries?: number;
  /** Waits between tries; tests make it instant. */
  wait?: (ms: number, signal?: AbortSignal) => Promise<void>;
  /** For the checksum; null skips the check. Defaults to the browser's. */
  subtle?: SubtleCrypto | null;
  online?: () => boolean;
}

export interface Downloaded {
  blob: Blob;
  bytes: number;
  /** true: matches the release's checksum; false: not checked (no checksum, or no WebCrypto). */
  verified: boolean;
}

const abortError = () => new DOMException("The download was cancelled.", "AbortError");

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError());
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(abortError());
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/** Waits for the browser to say it's back online (or the signal to abort). */
function untilOnline(signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || navigator.onLine) return resolve();
    if (signal?.aborted) return reject(abortError());
    const done = () => {
      window.removeEventListener("online", done);
      signal?.removeEventListener("abort", onAbort);
      resolve();
    };
    function onAbort() {
      window.removeEventListener("online", done);
      reject(abortError());
    }
    window.addEventListener("online", done, { once: true });
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/** The status a response's problem maps to. */
export function problemFor(status: number): ProblemKind {
  if (status === 404 || status === 410) return "missing";
  if (status === 401 || status === 403) return "refused";
  if (status === 429) return "busy";
  return "server";
}

function contentRange(header: string | null): { start: number; end: number; total: number | null } | null {
  const m = /^bytes (\d+)-(\d+)\/(\d+|\*)$/.exec(header ?? "");
  if (!m) return null;
  return { start: Number(m[1]), end: Number(m[2]), total: m[3] === "*" ? null : Number(m[3]) };
}

export function base64(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < view.length; i++) s += String.fromCharCode(view[i]);
  return btoa(s);
}

/**
 * Downloads the file into memory and returns it as a Blob, checked against
 * `sha512` when given. Throws DownloadProblem, or AbortError when cancelled.
 */
export async function downloadToBlob(opts: DownloadOptions): Promise<Downloaded> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const chunk = opts.chunkBytes ?? CHUNK_BYTES;
  const retries = opts.retries ?? RETRIES;
  const wait = opts.wait ?? sleep;
  const online = opts.online ?? (() => typeof navigator === "undefined" || navigator.onLine);
  const subtle = opts.subtle === undefined ? (globalThis.crypto?.subtle ?? null) : opts.subtle;
  const { signal } = opts;

  let total: number | null = opts.resume?.total ?? (opts.size && opts.size > 0 ? opts.size : null);
  let buffer: Uint8Array | null = opts.resume?.buffer ?? null;
  let received = opts.resume?.received ?? 0;
  /** Pieces of a file whose size never came (no Content-Length, no Content-Range). */
  let parts: Uint8Array[] = [];
  let attempt = 0;
  let noSize = false;

  const progress = () => opts.onProgress?.(received, total);
  const allocate = (size: number): Uint8Array => {
    try {
      return new Uint8Array(size);
    } catch {
      throw new DownloadProblem("memory", received, size);
    }
  };
  const restart = (size: number | null) => {
    received = 0;
    total = size;
    buffer = null;
    parts = [];
  };
  /** A problem, carrying the bytes so far when a retry could carry on from them. */
  const fail = (kind: ProblemKind, status?: number) => {
    const resumable = kind === "dropped" || kind === "offline" || kind === "server" || kind === "busy";
    const partial = resumable && buffer && total !== null && received > 0 ? { buffer, received, total } : undefined;
    return new DownloadProblem(kind, received, total, status, partial);
  };

  if (!online()) throw fail("offline");

  while (!noSize && (total === null || received < total)) {
    if (signal?.aborted) throw abortError();
    let res: Response;
    try {
      res = await fetchImpl(opts.url, {
        headers: { Range: `bytes=${received}-${received + chunk - 1}` },
        cache: "no-store",
        credentials: "same-origin",
        ...(signal ? { signal } : {}),
      });
    } catch (error) {
      if (signal?.aborted || (error instanceof DOMException && error.name === "AbortError")) throw abortError();
      attempt += 1;
      if (attempt > retries) throw fail(online() ? "dropped" : "offline");
      if (!online()) await untilOnline(signal);
      await wait(backoff(attempt), signal);
      continue;
    }

    /** Where this piece should end, from the host's own answer; null when it never said. */
    let expected: number | null = null;
    if (res.status === 206) {
      const range = contentRange(res.headers.get("content-range"));
      // Not the piece that was asked for, or a file whose size changed under a resumed download: don't trust it.
      if (!range || range.start !== received || (buffer && range.total !== null && range.total !== buffer.length)) {
        await res.body?.cancel().catch(() => undefined);
        throw fail("server", res.status);
      }
      if (range.total !== null) total = range.total;
      expected = range.end + 1;
    } else if (res.status === 200) {
      // The host ignored the range: this is the whole file from the start.
      const length = Number(res.headers.get("content-length"));
      restart(Number.isFinite(length) && length > 0 ? length : null);
      noSize = total === null;
      expected = total;
    } else if (res.status === 416 && total !== null && received >= total) {
      await res.body?.cancel().catch(() => undefined);
      break;
    } else {
      await res.body?.cancel().catch(() => undefined);
      throw fail(problemFor(res.status), res.status);
    }
    if (total !== null && !buffer) buffer = allocate(total);

    const reader = res.body?.getReader();
    if (!reader) throw fail("server", res.status);
    let truncated = false;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value?.length) continue;
        if (buffer && total !== null) {
          if (received + value.length > total) {
            // More than the host said there was: don't trust any of it.
            await reader.cancel().catch(() => undefined);
            throw new DownloadProblem("server", received, total, res.status);
          }
          buffer.set(value, received);
        } else {
          parts.push(value);
        }
        received += value.length;
        progress();
      }
      // A piece that ended early (the connection closed) is the same as a dropped one.
      truncated = expected !== null && received < expected;
    } catch (error) {
      if (error instanceof DownloadProblem) throw error;
      if (signal?.aborted || (error instanceof DOMException && error.name === "AbortError")) throw abortError();
      truncated = true;
    }
    if (truncated) {
      attempt += 1;
      if (attempt > retries) throw fail(online() ? "dropped" : "offline");
      if (res.status === 200) restart(total);
      if (!online()) await untilOnline(signal);
      await wait(backoff(attempt), signal);
      continue;
    }
    attempt = 0;
  }

  let data: Uint8Array;
  if (buffer) data = buffer;
  else {
    data = allocate(received);
    let at = 0;
    for (const part of parts) {
      data.set(part, at);
      at += part.length;
    }
  }

  let verified = false;
  if (opts.sha512 && subtle) {
    const digest = await subtle.digest("SHA-512", data as BufferSource);
    if (base64(digest) !== opts.sha512) throw fail("damaged");
    verified = true;
  }
  return { blob: new Blob([data as BlobPart], { type: "application/octet-stream" }), bytes: received, verified };
}

/** Hands a downloaded file to the browser to save, under its name. */
export function saveBlob(blob: Blob, name: string, doc: Document = document): void {
  const href = URL.createObjectURL(blob);
  const a = doc.createElement("a");
  a.href = href;
  a.download = name;
  a.rel = "noopener";
  a.style.display = "none";
  doc.body.appendChild(a);
  a.click();
  a.remove();
  // The browser reads the blob when the click lands; a minute is plenty.
  setTimeout(() => URL.revokeObjectURL(href), 60_000);
}

/** Lets the browser download the file itself: what a plain link would do. */
export function saveWithBrowser(url: string, doc: Document = document): void {
  const a = doc.createElement("a");
  a.href = url;
  a.rel = "noopener";
  a.style.display = "none";
  doc.body.appendChild(a);
  a.click();
  a.remove();
}

/** Whether this browser can run the page's own download; otherwise it gets a plain link. */
export function canDownloadInPage(): boolean {
  return typeof window !== "undefined" && typeof fetch === "function" && typeof ReadableStream !== "undefined" && typeof Blob !== "undefined" && typeof URL.createObjectURL === "function";
}

/**
 * How far a download is, as the button shows it: a whole number from 1 to 99.
 * Never 0 (it has started) and never 100 (the done state says "Downloaded"
 * instead). Null when the size isn't known yet.
 */
export function downloadPercent(received: number, total: number | null | undefined): number | null {
  if (!total || total <= 0) return null;
  const pct = Math.floor((received / total) * 100);
  return Math.min(99, Math.max(1, pct));
}
