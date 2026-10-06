import { NextRequest } from "next/server";

const BACKEND_URL =
  process.env.JUMETRA_BACKEND_URL ?? "https://api-aoxa3kagvq-ez.a.run.app";
const STRIP_RESPONSE_HEADERS = ["connection", "content-encoding", "content-length", "transfer-encoding"];

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function proxy(request: NextRequest, context: RouteContext): Promise<Response> {
  const { path } = await context.params;
  const target = new URL(`/${path.map(encodeURIComponent).join("/")}`, BACKEND_URL);
  target.search = request.nextUrl.search;

  const headers = new Headers(request.headers);
  for (const name of ["connection", "content-length", "host", "origin", "x-forwarded-origin"]) {
    headers.delete(name);
  }
  headers.set("x-forwarded-origin", request.nextUrl.origin);
  // Ensure Authorization / refresh tokens survive the App Hosting proxy to Cloud Functions.
  const authorization = request.headers.get("authorization");
  const refresh = request.headers.get("x-refresh-token");
  if (authorization) headers.set("authorization", authorization);
  if (refresh) headers.set("x-refresh-token", refresh);

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer(),
      cache: "no-store",
      redirect: "manual",
    });
    const responseHeaders = new Headers(upstream.headers);
    for (const name of STRIP_RESPONSE_HEADERS) {
      responseHeaders.delete(name);
    }
    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return Response.json({ detail: "Backend unavailable" }, { status: 502 });
  }
}

export const GET = proxy;
export const HEAD = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;