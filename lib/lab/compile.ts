/**
 * The website's build step: a sketch goes to Kiungo's compile service
 * (Jumetra-Backend compile_service, its own Render service) and comes back as
 * Intel HEX for the emulator, in the desktop build's shape (`BuildResult`), so
 * the lab, the editor and the problems list treat both apps' builds the same.
 *
 * The service holds no accounts, so building works signed in or out; it limits
 * builds per address instead. Its free plan sleeps when idle: `wakeCompiler`
 * pings it early (when the lab opens with code) so Run doesn't wait a minute.
 */

import type { BuildResult } from "@kiungo/api";
import { parseDiagnostics } from "@kiungo/core/build";

/** Where the compile service answers. Override with NEXT_PUBLIC_COMPILE_API_URL (a local service, a preview). */
export const PRODUCTION_COMPILE_API_URL = "https://kiungo-compile.onrender.com";
export const COMPILE_API_BASE = (process.env.NEXT_PUBLIC_COMPILE_API_URL ?? PRODUCTION_COMPILE_API_URL).replace(/\/+$/, "");

/** A free service waking up can take about a minute; a build itself takes seconds. */
export const COMPILE_TIMEOUT_MS = 90_000;

export interface SketchFile {
  path: string;
  content: string;
}

/**
 * Why a build didn't happen. `unavailable`: the service can't be reached, is
 * busy or limited this address: not the code's fault, so the lab falls back to
 * the built-in behavior. `refused`: the sketch can't be sent as it is (a file
 * name, an #include of a file outside the sketch): the code needs a change.
 */
export class CompileUnavailable extends Error {
  readonly kind: "unavailable" | "refused";
  constructor(kind: "unavailable" | "refused", message: string) {
    super(message);
    this.kind = kind;
  }
}

interface ServiceAnswer {
  ok: boolean;
  hex?: string;
  log?: string;
  sketchDir?: string;
  flash?: { used: number; max: number };
  ram?: { used: number; max: number };
  durationMs?: number;
  cached?: boolean;
  message?: string;
}

type Fetch = typeof fetch;

/** Build a sketch for the Uno (or Nano). Resolves with the build, good or bad; rejects with CompileUnavailable when no build happened. */
export async function compileSketch(
  board: string,
  files: SketchFile[],
  { signal, fetchImpl = fetch, base = COMPILE_API_BASE }: { signal?: AbortSignal; fetchImpl?: Fetch; base?: string } = {},
): Promise<BuildResult> {
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), COMPILE_TIMEOUT_MS);
  const abort = () => timeout.abort();
  signal?.addEventListener("abort", abort);
  let res: Response;
  try {
    res = await fetchImpl(`${base}/firmware/compile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ board, files }),
      signal: timeout.signal,
    });
  } catch {
    if (signal?.aborted) throw new CompileUnavailable("unavailable", "Stopped.");
    throw new CompileUnavailable(
      "unavailable",
      timeout.signal.aborted
        ? "Kiungo's compiler didn't answer in time, so Run shows the built-in behavior. Try again in a minute."
        : "Kiungo's compiler can't be reached (check your connection), so Run shows the built-in behavior.",
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
  if (res.status === 422) {
    const detail = await res.json().then((b: { detail?: unknown }) => (typeof b.detail === "string" ? b.detail : null)).catch(() => null);
    throw new CompileUnavailable("refused", detail ?? "Kiungo's compiler can't build this sketch as it is.");
  }
  if (res.status === 429) {
    throw new CompileUnavailable("unavailable", `Kiungo's compiler is busy (too many builds just now), so Run shows the built-in behavior. Try again in ${res.headers.get("Retry-After") ?? "a few"} seconds.`);
  }
  if (!res.ok) throw new CompileUnavailable("unavailable", "Kiungo's compiler isn't working right now, so Run shows the built-in behavior. Try again in a minute.");
  const answer = (await res.json()) as ServiceAnswer;
  const log = answer.log ?? "";
  return {
    ok: Boolean(answer.ok && answer.hex),
    hex: answer.hex,
    diagnostics: parseDiagnostics(log, answer.sketchDir ?? ""),
    flash: answer.flash,
    ram: answer.ram,
    durationMs: answer.durationMs ?? 0,
    cached: answer.cached,
    message: answer.message,
    log,
  };
}

let waking: Promise<boolean> | null = null;

/** Ping the compile service so a sleeping free instance starts before the first Run. Once per page. */
export function wakeCompiler(fetchImpl: Fetch = fetch, base = COMPILE_API_BASE): Promise<boolean> {
  waking ??= fetchImpl(`${base}/health`, { method: "GET" })
    .then((r) => r.ok)
    .catch(() => false);
  return waking;
}

/** Tests only: forget the wake-up ping. */
export function resetWakeForTests() {
  waking = null;
}
