import { createHash, webcrypto } from "node:crypto";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/desktop/download/route";
import { DesktopCta } from "@/components/landing/DesktopCta";
import { DownloadBlock } from "@/components/landing/DownloadBlock";
import { DownloadProvider } from "@/components/landing/DownloadProvider";
import { downloadToBlob, DownloadProblem, problemFor, type DownloadOptions, type Downloaded } from "@/lib/downloads";
import { DESKTOP } from "@/lib/landing/content";
import { downloadHref, isReleaseFileUrl, type Release } from "@/lib/releases";

const EXE = "https://github.com/Jumetra-Technologies/jumetra-frontend/releases/download/desktop-v0.11.0/Kiungo-0.11.0-win-x64.exe";
const DMG = "https://github.com/Jumetra-Technologies/jumetra-frontend/releases/download/desktop-v0.11.0/Kiungo-0.11.0-mac-arm64.dmg";
const files: Release["files"] = [
  { platform: "windows", arch: "x64", kind: "nsis", url: EXE, sha512: "a".repeat(88), size: 148 * 1024 * 1024 },
  { platform: "macos", arch: "arm64", kind: "dmg", url: DMG, sha512: "b".repeat(88), size: 167 * 1024 * 1024 },
];
const release: Release = { channel: "beta", version: "0.11.0", notes: "", published_at: "2026-11-03T07:06:31Z", files, source: "github", releaseUrl: "https://github.com/Jumetra-Technologies/jumetra-frontend/releases/tag/desktop-v0.11.0" };
const WINDOWS_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0 Safari/537.36";
const PHONE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148";

/** A file of `size` bytes with a pattern in it, and its SHA-512 as the manifest carries it. */
function someFile(size: number): { data: Uint8Array; sha512: string } {
  const data = new Uint8Array(size);
  for (let i = 0; i < size; i++) data[i] = (i * 7 + 3) & 0xff;
  return { data, sha512: createHash("sha512").update(data).digest("base64") };
}

/** A body that arrives in 1 KB pieces; `cut` stops it part-way, like a connection that closed. */
function body(bytes: Uint8Array, cut = false): ReadableStream<Uint8Array> {
  const end = cut ? Math.floor(bytes.length / 2) : bytes.length;
  let at = 0;
  return new ReadableStream({
    pull(controller) {
      if (at >= end) {
        if (cut) controller.error(new TypeError("network error"));
        else controller.close();
        return;
      }
      const next = Math.min(at + 1024, end);
      controller.enqueue(bytes.slice(at, next));
      at = next;
    },
  });
}

type Hiccup = "throw" | "cut" | number | undefined;

/**
 * A host for `data`: honors Range (206 with Content-Range) unless `ranges` is
 * off, and does what `on(call)` says for a given request: throw, cut the body
 * short, or answer with that status.
 */
function host(data: Uint8Array, { ranges = true, on = () => undefined }: { ranges?: boolean; on?: (call: number) => Hiccup } = {}) {
  let calls = 0;
  const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    calls += 1;
    const what = on(calls);
    if (what === "throw") throw new TypeError("Failed to fetch");
    if (typeof what === "number") return new Response(null, { status: what });
    const range = /bytes=(\d+)-(\d+)/.exec(String((init?.headers as Record<string, string>)?.Range ?? ""));
    if (!ranges || !range) return new Response(body(data, what === "cut"), { status: 200, headers: { "content-length": String(data.length) } });
    const start = Number(range[1]);
    const end = Math.min(Number(range[2]), data.length - 1);
    return new Response(body(data.slice(start, end + 1), what === "cut"), { status: 206, headers: { "content-range": `bytes ${start}-${end}/${data.length}` } });
  });
  return fetchImpl as unknown as typeof fetch & { mock: { calls: Array<[string, RequestInit]> } };
}

const instant = async () => undefined;
const run = (opts: Partial<DownloadOptions> & { fetchImpl: typeof fetch }) =>
  downloadToBlob({ url: "/api/desktop/download?url=x", chunkBytes: 8 * 1024, wait: instant, subtle: webcrypto.subtle as SubtleCrypto, online: () => true, ...opts });

afterEach(() => vi.restoreAllMocks());

describe("the page's own download", () => {
  it("fetches the file in pieces, reports progress, and checks it against the release's checksum", async () => {
    const { data, sha512 } = someFile(20 * 1024);
    const fetchImpl = host(data);
    const seen: number[] = [];
    const got = await run({ fetchImpl, sha512, onProgress: (received) => seen.push(received) });
    expect(fetchImpl.mock.calls.map(([, init]) => (init.headers as Record<string, string>).Range)).toEqual(["bytes=0-8191", "bytes=8192-16383", "bytes=16384-24575"]);
    expect(got.bytes).toBe(data.length);
    expect(got.blob.size).toBe(data.length);
    expect(got.verified).toBe(true);
    expect(seen.at(-1)).toBe(data.length);
    expect(seen.length).toBeGreaterThan(3);
  });

  it("copes with a host that ignores ranges and sends the whole file", async () => {
    const { data, sha512 } = someFile(20 * 1024);
    const fetchImpl = host(data, { ranges: false });
    const got = await run({ fetchImpl, sha512 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(got.bytes).toBe(data.length);
    expect(got.verified).toBe(true);
  });

  it("a piece that fails or stops short is fetched again from where it stopped", async () => {
    const { data, sha512 } = someFile(20 * 1024);
    // The second request throws, the third (the retry) is cut short, and the rest arrive.
    const fetchImpl = host(data, { on: (call) => (call === 2 ? "throw" : call === 3 ? "cut" : undefined) });
    const got = await run({ fetchImpl, sha512 });
    expect(got.verified).toBe(true);
    const ranges = fetchImpl.mock.calls.map(([, init]) => (init.headers as Record<string, string>).Range);
    expect(ranges[0]).toBe("bytes=0-8191");
    expect(ranges[1]).toBe("bytes=8192-16383");
    expect(ranges[2]).toBe("bytes=8192-16383");
    // After the cut, half of the piece had arrived: the next request starts after it, and reaches the end.
    expect(ranges[3]).toBe(`bytes=${8192 + 4096}-${8192 + 4096 + 8191}`);
    expect(ranges).toHaveLength(4);
  });

  it("gives up after enough failures, keeping what arrived so a retry can carry on", async () => {
    const { data, sha512 } = someFile(20 * 1024);
    const fetchImpl = host(data, { on: (call) => (call >= 2 ? "throw" : undefined) });
    const problem = await run({ fetchImpl, sha512, retries: 2 }).catch((e: unknown) => e);
    expect(problem).toBeInstanceOf(DownloadProblem);
    const p = problem as DownloadProblem;
    expect(p.kind).toBe("dropped");
    expect(p.received).toBe(8 * 1024);
    expect(p.total).toBe(data.length);
    expect(p.partial?.received).toBe(8 * 1024);
    expect(fetchImpl).toHaveBeenCalledTimes(4);

    // The retry starts from the kept bytes and finishes with the rest.
    const again = host(data);
    const got = await run({ fetchImpl: again, sha512, resume: p.partial });
    expect(again.mock.calls.map(([, init]) => (init.headers as Record<string, string>).Range)).toEqual(["bytes=8192-16383", "bytes=16384-24575"]);
    expect(got.verified).toBe(true);
  });

  it("says what a status means: gone, refused, too many, or the server", async () => {
    const { data } = someFile(1024);
    for (const [status, kind] of [
      [404, "missing"],
      [403, "refused"],
      [429, "busy"],
      [503, "server"],
    ] as const) {
      const problem = (await run({ fetchImpl: host(data, { on: () => status }) }).catch((e: unknown) => e)) as DownloadProblem;
      expect(problem.kind).toBe(kind);
      expect(problem.status).toBe(status);
      expect(problemFor(status)).toBe(kind);
    }
  });

  it("a file whose checksum doesn't match is damaged, not downloaded", async () => {
    const { data } = someFile(4 * 1024);
    const problem = (await run({ fetchImpl: host(data), sha512: "A".repeat(88) }).catch((e: unknown) => e)) as DownloadProblem;
    expect(problem.kind).toBe("damaged");
    expect(problem.partial).toBeUndefined();
  });

  it("without a checksum, or without WebCrypto, the file is saved unchecked", async () => {
    const { data, sha512 } = someFile(4 * 1024);
    expect((await run({ fetchImpl: host(data) })).verified).toBe(false);
    expect((await run({ fetchImpl: host(data), sha512, subtle: null })).verified).toBe(false);
  });

  it("offline means offline, and cancelling is an AbortError", async () => {
    const { data } = someFile(4 * 1024);
    const offline = (await run({ fetchImpl: host(data), online: () => false }).catch((e: unknown) => e)) as DownloadProblem;
    expect(offline.kind).toBe("offline");

    const controller = new AbortController();
    controller.abort();
    const cancelled = (await run({ fetchImpl: host(data), signal: controller.signal }).catch((e: unknown) => e)) as DOMException;
    expect(cancelled.name).toBe("AbortError");
  });
});

describe("the download route", () => {
  const upstream = (status: number, bytes = new Uint8Array([1, 2, 3]), headers: Record<string, string> = {}) =>
    new Response(status === 204 || status >= 300 ? null : body(bytes), { status, headers });

  it("passes only this project's release files through, with the range the page asked for", async () => {
    expect(isReleaseFileUrl(EXE)).toBe(true);
    expect(isReleaseFileUrl("https://github.com/Jumetra-Technologies/jumetra-frontend/releases/download/desktop-v0.11.0/a/b.exe")).toBe(false);
    expect(isReleaseFileUrl("https://evil.example/Kiungo-0.11.0-win-x64.exe")).toBe(false);
    expect(isReleaseFileUrl("http://127.0.0.1:8766/Kiungo.exe", ["http://127.0.0.1:8766/"])).toBe(true);
    expect(downloadHref(files[0], "page")).toBe(`/api/desktop/download?url=${encodeURIComponent(EXE)}`);
    expect(downloadHref(files[0], "browser")).toBe(EXE);

    const refused = await GET(new Request("http://site/api/desktop/download?url=https://evil.example/x.exe"));
    expect(refused.status).toBe(400);

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(upstream(206, new Uint8Array(3), { "content-range": "bytes 0-2/10", "content-length": "3", "accept-ranges": "bytes", "content-type": "application/octet-stream" }));
    const res = await GET(new Request(`http://site/api/desktop/download?url=${encodeURIComponent(EXE)}`, { headers: { Range: "bytes=0-2" } }));
    expect(fetchSpy).toHaveBeenCalledWith(EXE, expect.objectContaining({ redirect: "follow" }));
    const sent = (fetchSpy.mock.calls[0][1] as RequestInit).headers as Headers;
    expect(sent.get("range")).toBe("bytes=0-2");
    expect(res.status).toBe(206);
    expect(res.headers.get("content-range")).toBe("bytes 0-2/10");
    expect(res.headers.get("content-disposition")).toBe('attachment; filename="Kiungo-0.11.0-win-x64.exe"');
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(new Uint8Array(await res.arrayBuffer())).toHaveLength(3);
  });

  it("tells a missing file from a host that failed, and a host it couldn't reach", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    fetchSpy.mockResolvedValueOnce(upstream(404));
    expect((await GET(new Request(`http://site/api/desktop/download?url=${encodeURIComponent(EXE)}`))).status).toBe(404);
    fetchSpy.mockResolvedValueOnce(upstream(500));
    const failed = await GET(new Request(`http://site/api/desktop/download?url=${encodeURIComponent(EXE)}`));
    expect(failed.status).toBe(502);
    expect(await failed.json()).toEqual({ error: "upstream", upstream: 500 });
    fetchSpy.mockRejectedValueOnce(new TypeError("fetch failed"));
    const down = await GET(new Request(`http://site/api/desktop/download?url=${encodeURIComponent(EXE)}`));
    expect(down.status).toBe(502);
    expect(await down.json()).toEqual({ error: "unreachable" });
  });
});

describe("the download on the page, and the notice in the corner", () => {
  const STATUS = DESKTOP.download.status;
  let clicks: string[];

  beforeEach(() => {
    clicks = [];
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(WINDOWS_UA);
    Object.assign(URL, { createObjectURL: vi.fn(() => "blob:kiungo"), revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      clicks.push(`${this.getAttribute("download") ?? ""}|${this.getAttribute("href")}`);
    });
  });

  /** A download that answers the way the test says: progress, then the result or the problem. */
  function stub(plan: (opts: DownloadOptions, call: number) => Promise<Downloaded>) {
    let call = 0;
    return vi.fn((opts: DownloadOptions) => plan(opts, (call += 1)));
  }
  const done = (bytes: number, verified = true): Downloaded => ({ blob: new Blob([new Uint8Array(8)]), bytes, verified });

  it("the button downloads the file here, shows how far it is, and says when it's done and what to do next", async () => {
    const downloader = stub(async (opts) => {
      opts.onProgress?.(37 * 1024 * 1024, 148 * 1024 * 1024);
      return done(148 * 1024 * 1024);
    });
    render(
      <DownloadProvider release={release} mode="page" downloader={downloader}>
        <DownloadBlock release={release} />
      </DownloadProvider>,
    );
    const main = screen.getByTestId("download-main");
    expect(main).toHaveAttribute("href", downloadHref(files[0], "page"));
    expect(main).toHaveTextContent("Download for Windows");

    await act(async () => {
      fireEvent.click(main);
    });
    expect(downloader).toHaveBeenCalledTimes(1);
    expect(downloader.mock.calls[0][0]).toMatchObject({ url: downloadHref(files[0], "page"), size: files[0].size, sha512: files[0].sha512, resume: null });

    const notice = await screen.findByTestId("download-notice");
    expect(notice).toHaveAttribute("data-phase", "done");
    expect(notice).toHaveAttribute("role", "status");
    expect(screen.getByTestId("download-notice-title")).toHaveTextContent(STATUS.done.title("Windows"));
    expect(notice).toHaveTextContent("Kiungo-0.11.0-win-x64.exe (148 MB) is in your downloads, and matches the release's checksum.");
    expect(notice).toHaveTextContent(STATUS.done.next.windows);
    expect(notice).toHaveTextContent("SmartScreen");
    expect(clicks).toEqual(["Kiungo-0.11.0-win-x64.exe|blob:kiungo"]);
    expect(main).toHaveTextContent("Download for Windows");

    fireEvent.click(screen.getByTestId("download-close"));
    expect(screen.queryByTestId("download-notice")).toBeNull();
  });

  it("while it runs, the buttons say so and a second click waits; Cancel stops it", async () => {
    let abort: AbortSignal | undefined;
    const downloader = stub(
      (opts) =>
        new Promise<Downloaded>((_, reject) => {
          abort = opts.signal;
          opts.onProgress?.(10 * 1024 * 1024, 148 * 1024 * 1024);
          opts.signal?.addEventListener("abort", () => reject(new DOMException("cancelled", "AbortError")));
        }),
    );
    render(
      <DownloadProvider release={release} mode="page" downloader={downloader}>
        <DesktopCta release={release} />
        <DownloadBlock release={release} />
      </DownloadProvider>,
    );
    const cta = screen.getByTestId("hybrid-cta");
    expect(cta).toHaveTextContent("Download for Windows");
    expect(cta).toHaveAttribute("href", downloadHref(files[0], "page"));
    await act(async () => {
      fireEvent.click(cta);
    });
    expect(screen.getByTestId("download-notice")).toHaveAttribute("data-phase", "downloading");
    expect(screen.getByTestId("download-progress")).toHaveTextContent("10 MB of 148 MB");
    expect(screen.getByTestId("download-progress")).toHaveTextContent("6%");
    expect(screen.getByTestId("download-main")).toHaveTextContent("Downloading 6%");
    expect(screen.getByTestId("download-main")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "6");

    await act(async () => {
      fireEvent.click(screen.getByTestId("download-main"));
    });
    expect(downloader).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.click(screen.getByTestId("download-cancel"));
    });
    expect(abort?.aborted).toBe(true);
    await waitFor(() => expect(screen.queryByTestId("download-notice")).toBeNull());
    expect(screen.getByTestId("download-main")).toHaveTextContent("Download for Windows");
    expect(clicks).toEqual([]);
  });

  it("a problem names the cause and the fix; Try again carries on from the bytes that arrived", async () => {
    const partial = { buffer: new Uint8Array(148 * 1024 * 1024 > 1 ? 16 : 0), received: 34 * 1024 * 1024, total: 148 * 1024 * 1024 };
    const downloader = stub(async (opts, call) => {
      if (call === 1) throw new DownloadProblem("dropped", partial.received, partial.total, undefined, partial);
      expect(opts.resume).toBe(partial);
      return done(partial.total);
    });
    render(
      <DownloadProvider release={release} mode="page" downloader={downloader}>
        <DownloadBlock release={release} />
      </DownloadProvider>,
    );
    await act(async () => {
      fireEvent.click(screen.getByTestId("download-main"));
    });
    const notice = screen.getByTestId("download-notice");
    expect(notice).toHaveAttribute("data-phase", "problem");
    expect(notice).toHaveAttribute("data-kind", "dropped");
    expect(notice).toHaveAttribute("role", "alert");
    expect(screen.getByTestId("download-notice-title")).toHaveTextContent("The connection dropped at 34 MB of 148 MB.");
    expect(notice).toHaveTextContent(STATUS.problems.dropped("", "").fix);

    await act(async () => {
      fireEvent.click(screen.getByTestId("download-retry"));
    });
    expect(downloader).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("download-notice")).toHaveAttribute("data-phase", "done");
  });

  it("each kind of problem has its own words, with the status in them", async () => {
    const cases: Array<[DownloadProblem, string, string]> = [
      [new DownloadProblem("missing", 0, null, 404), "The file isn't on the release page any more (404).", "download-reload"],
      [new DownloadProblem("busy", 0, null, 429), "Too many downloads at once (429).", "download-retry"],
      [new DownloadProblem("server", 5, null, 503), "The download server couldn't send the file (HTTP 503).", "download-retry"],
      [new DownloadProblem("refused", 0, null, 403), "The download was refused (403).", "download-retry"],
      [new DownloadProblem("offline", 0, null), "You're offline.", "download-retry"],
      [new DownloadProblem("damaged", 1, 1), "The file arrived damaged: its checksum doesn't match the release's.", "download-retry"],
      [new DownloadProblem("memory", 0, null), "Your browser couldn't hold the file (148 MB) in memory.", "download-browser"],
    ];
    for (const [problem, title, action] of cases) {
      const downloader = stub(async () => {
        throw problem;
      });
      const view = render(
        <DownloadProvider release={release} mode="page" downloader={downloader}>
          <DownloadBlock release={release} />
        </DownloadProvider>,
      );
      await act(async () => {
        fireEvent.click(screen.getByTestId("download-main"));
      });
      expect(screen.getByTestId("download-notice")).toHaveAttribute("data-kind", problem.kind);
      expect(screen.getByTestId("download-notice-title")).toHaveTextContent(title);
      expect(screen.getByTestId(action)).toBeInTheDocument();
      view.unmount();
    }
  });

  it("when the download server itself is down before anything arrived, the browser fetches the file instead, and the notice says why", async () => {
    const downloader = stub(async () => {
      throw new DownloadProblem("server", 0, null, 502);
    });
    render(
      <DownloadProvider release={release} mode="page" downloader={downloader}>
        <DownloadBlock release={release} />
      </DownloadProvider>,
    );
    await act(async () => {
      fireEvent.click(screen.getByTestId("download-main"));
    });
    expect(clicks).toEqual([`|${EXE}`]);
    const notice = screen.getByTestId("download-notice");
    expect(notice).toHaveAttribute("data-phase", "browser");
    expect(notice).toHaveTextContent(STATUS.browser.because(502));
    expect(notice).toHaveTextContent(STATUS.browser.title("Kiungo-0.11.0-win-x64.exe"));
  });

  it("in browser mode the links are the files themselves, and a click hands the file to the browser", async () => {
    const downloader = stub(async () => done(1));
    render(
      <DownloadProvider release={release} mode="browser" downloader={downloader}>
        <DownloadBlock release={release} />
      </DownloadProvider>,
    );
    const main = screen.getByTestId("download-main");
    expect(main).toHaveAttribute("href", EXE);
    await act(async () => {
      fireEvent.click(main);
    });
    expect(downloader).not.toHaveBeenCalled();
    expect(clicks).toEqual([`|${EXE}`]);
    expect(screen.getByTestId("download-notice")).toHaveAttribute("data-phase", "browser");
  });

  it("the hybrid beat's button goes to the release section when there's nothing to download here", () => {
    const { unmount } = render(
      <DownloadProvider release={null} mode="page">
        <DesktopCta release={null} />
      </DownloadProvider>,
    );
    expect(screen.getByTestId("hybrid-cta")).toHaveAttribute("href", "/#desktop");
    expect(screen.getByTestId("hybrid-cta")).toHaveTextContent("Get the desktop app");
    unmount();

    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(PHONE_UA);
    render(
      <DownloadProvider release={release} mode="page">
        <DesktopCta release={release} />
      </DownloadProvider>,
    );
    expect(screen.getByTestId("hybrid-cta")).toHaveAttribute("href", "/#desktop");
  });
});
