import { ADMIN_API_BASE } from "@/lib/api-client";

/**
 * How the website tells Kiungo's server someone is using it, for the admin
 * portal: a "view" on each page, a "beat" every BEAT_MS while the tab is
 * visible and the person has moved, typed or scrolled in the last IDLE_MS, and
 * a "leave" when the tab is hidden or closed. The server credits the time
 * between them (at most 75 seconds each) and keeps only daily totals; see
 * jumetra-backend docs/admin-portal.md.
 *
 * Nothing is sent until the person allows it (the banner, or Settings,
 * Privacy: lib/consent/usage.ts). It goes to the admin portal's server
 * (ADMIN_API_BASE), which doesn't hold Kiungo's accounts, so usage counts for
 * a random id this browser made, which the server hashes, signed in or not.
 */

export const BEAT_MS = 30_000;
export const IDLE_MS = 5 * 60_000;
const VISITOR_KEY = "kiungo.visitor";

export type HeartbeatEvent = "view" | "beat" | "leave";

/** Pages that aren't counted: the admin portal itself. */
export function counted(path: string): boolean {
  return !/^\/admin(\/|$)/.test(path);
}

/** This browser's random visitor id, made on first use. Null when storage is blocked. */
export function visitorId(): string | null {
  try {
    let id = window.localStorage.getItem(VISITOR_KEY);
    if (!id || !/^[A-Za-z0-9_-]{8,64}$/.test(id)) {
      id = (crypto.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9_-]/g, "");
      window.localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

/** Whether heartbeats may be sent: only after a yes. Not asked counts as no. */
export function mayTrack(consent: { allowed: boolean } | null | undefined): boolean {
  return consent?.allowed === true;
}

export function heartbeatBody(event: HeartbeatEvent, path: string, _signedIn: boolean): string {
  const body: Record<string, string> = { client: "web", page: path, event };
  const visitor = visitorId();
  if (visitor) body.visitor = visitor;
  return JSON.stringify(body);
}

const URL_PATH = "/telemetry/heartbeat";

/**
 * Sends one heartbeat. A leave goes by sendBeacon, which survives the tab
 * closing. All of it is text/plain, so the browser sends it without asking
 * first, and failures are ignored: nobody should notice it.
 */
export function sendHeartbeat(event: HeartbeatEvent, path: string, signedIn: boolean, base = ADMIN_API_BASE): void {
  const url = `${base}${URL_PATH}`;
  const body = heartbeatBody(event, path, signedIn);
  try {
    if (event === "leave" && typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      if (navigator.sendBeacon(url, new Blob([body], { type: "text/plain" }))) return;
    }
    void fetch(url, { method: "POST", body, headers: { "Content-Type": "text/plain" }, credentials: "include", keepalive: true }).catch(() => undefined);
  } catch {
    // Nothing to do: a missed heartbeat only means a little less time counted.
  }
}
