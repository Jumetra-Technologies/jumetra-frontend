/**
 * The desktop installer, passed through the website's own origin.
 *
 * GitHub's release downloads carry no CORS headers, so a page can't read them:
 * a plain link hands the file to the browser and the page never learns whether
 * it arrived. This route streams the asset from GitHub (or the backend) to the
 * page instead, so the home page's download can show progress, check the file
 * against the release's checksum, and say what went wrong when something does.
 *
 * Only this project's release assets are fetched (lib/releases isReleaseFileUrl).
 * Range requests pass through, so the page downloads in pieces that each stay
 * well inside a function's time limit and can resume where a connection dropped.
 * The body is streamed, never buffered, so size isn't limited.
 */
import { contentDisposition, fileName, isReleaseFileUrl } from "@/lib/releases";

export const dynamic = "force-dynamic";

/** Request headers worth passing to the asset host. */
const FORWARD_REQUEST = ["range", "if-range"] as const;
/** How long the installer's host has to start answering. */
const UPSTREAM_ANSWER_MS = 30_000;
/** Response headers the page needs: how big, which part, and whether pieces are allowed. */
const FORWARD_RESPONSE = ["content-type", "content-length", "content-range", "accept-ranges", "etag", "last-modified"] as const;

const extraOrigins = () =>
  (process.env.KIUNGO_DOWNLOAD_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

function problem(error: string, status: number, upstream?: number): Response {
  return Response.json({ error, ...(upstream ? { upstream } : {}) }, { status, headers: { "cache-control": "no-store" } });
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url).searchParams.get("url") ?? "";
  if (!isReleaseFileUrl(url, extraOrigins())) return problem("not-a-release-file", 400);

  const headers = new Headers({ "user-agent": "kiungo-website" });
  for (const name of FORWARD_REQUEST) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  // The host has 30 s to start answering (audit WEB-003); the download itself can take as long as
  // it needs, so the timer stops once the headers arrive.
  const answer = new AbortController();
  const timer = setTimeout(() => answer.abort(new DOMException("No answer in time", "TimeoutError")), UPSTREAM_ANSWER_MS);
  let upstream: Response;
  try {
    upstream = await fetch(url, { headers, redirect: "follow", cache: "no-store", signal: AbortSignal.any([request.signal, answer.signal]) });
  } catch (error) {
    if (request.signal.aborted) return problem("cancelled", 499);
    return problem(answer.signal.aborted || (error instanceof Error && error.name === "TimeoutError") ? "timeout" : "unreachable", 502);
  } finally {
    clearTimeout(timer);
  }

  if (!upstream.ok) {
    await upstream.body?.cancel().catch(() => undefined);
    // The page tells these apart: a file that's gone, too many at once, and a host that didn't answer.
    const status = upstream.status === 404 || upstream.status === 410 ? 404 : upstream.status === 429 ? 429 : upstream.status === 416 ? 416 : 502;
    return problem("upstream", status, upstream.status);
  }

  const out = new Headers();
  for (const name of FORWARD_RESPONSE) {
    const value = upstream.headers.get(name);
    if (value) out.set(name, value);
  }
  // A body fetch decodes on the way in: a declared compressed length would then be wrong.
  if (upstream.headers.get("content-encoding")) out.delete("content-length");
  if (!out.has("content-type")) out.set("content-type", "application/octet-stream");
  out.set("content-disposition", contentDisposition(fileName({ url })));
  out.set("cache-control", "no-store");
  out.set("x-content-type-options", "nosniff");
  return new Response(upstream.body, { status: upstream.status, headers: out });
}
