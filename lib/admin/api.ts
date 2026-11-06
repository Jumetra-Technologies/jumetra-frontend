import { API_BASE } from "@/lib/api-client";

/**
 * The admin portal's calls. The password is checked by the server, which
 * answers with a 30-minute admin token; this browser keeps it for the tab
 * only (sessionStorage), so closing the tab signs out of the portal.
 */

const KEY = "kiungo.admin.session";
const EVENT = "kiungo-admin-session";

export type AdminSession = { token: string; expiresAt: string };

export type OverviewAccount = {
  id: string;
  name: string;
  email: string;
  created_at: string | null;
  sign_in: string[];
  last_seen: string | null;
  online: boolean;
  seconds_total: number;
  seconds_range: number;
  seconds_web: number;
  seconds_desktop: number;
  active_days: number;
  projects: number;
  desktop_projects?: number;
  lab_sessions: number;
};

export type Overview = {
  generated_at: string;
  days: number;
  range: { start: string; end: string };
  tracked_since: string | null;
  totals: {
    accounts: number;
    accounts_new_range: number;
    projects: number;
    desktop_projects?: number;
    lab_sessions: number;
    experiments: number;
    desktop_devices: number;
    online_accounts: number;
    online_visitors: number;
    seconds_range: number;
    active_accounts_range: number;
  };
  online: Array<{ user_id: string; name: string; email: string; client: "web" | "desktop"; page: string; since: string; last_seen: string; app_version: string | null }>;
  online_visitors: { web: number; desktop: number };
  accounts: OverviewAccount[];
  pages: Array<{ page: string; views: number; seconds: number; web: number; desktop: number }>;
  daily: Array<{ day: string; active_accounts: number; visitors: number; seconds: number; new_accounts: number }>;
  clients: { web: number; desktop: number };
  admin_sign_ins: Array<{ at: string; ok: boolean; from: string }>;
};

export class AdminError extends Error {
  constructor(
    readonly kind: "wrong" | "locked" | "expired" | "offline" | "server",
    message: string,
  ) {
    super(message);
  }
}

function read(): AdminSession | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as AdminSession;
    return s.token && Date.parse(s.expiresAt) > Date.now() ? s : null;
  } catch {
    return null;
  }
}

let cachedRaw: string | null | undefined;
let cached: AdminSession | null = null;

/** The session in this tab, or null. Stable between calls, for useSyncExternalStore. */
export function currentSession(): AdminSession | null {
  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(KEY);
  } catch {
    raw = null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = read();
  }
  if (cached && Date.parse(cached.expiresAt) <= Date.now()) cached = null;
  return cached;
}

export function subscribeSession(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function save(session: AdminSession | null) {
  try {
    if (session) window.sessionStorage.setItem(KEY, JSON.stringify(session));
    else window.sessionStorage.removeItem(KEY);
  } catch {
    // Storage blocked: the portal still opens, for as long as this page stays open.
  }
  window.dispatchEvent(new Event(EVENT));
}

async function call(path: string, init: RequestInit = {}, fetchImpl: typeof fetch = fetch): Promise<Response> {
  try {
    return await fetchImpl(`${API_BASE}${path}`, { ...init, credentials: "omit", cache: "no-store" });
  } catch {
    throw new AdminError("offline", "Kiungo's servers can't be reached. Check the connection and try again.");
  }
}

async function detail(res: Response): Promise<string | null> {
  const body = (await res.json().catch(() => null)) as { detail?: unknown } | null;
  return typeof body?.detail === "string" ? body.detail : null;
}

export async function signIn(password: string, fetchImpl: typeof fetch = fetch): Promise<AdminSession> {
  const res = await call("/admin/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) }, fetchImpl);
  if (res.status === 401) throw new AdminError("wrong", "That password isn't right.");
  if (res.status === 429) throw new AdminError("locked", (await detail(res)) ?? "Too many wrong passwords. Try again later.");
  if (res.status === 404 || res.status === 405) throw new AdminError("server", "The admin portal isn't switched on for this site yet: its server doesn't have the admin routes.");
  if (!res.ok) throw new AdminError("server", `Kiungo's servers answered ${res.status}. Try again in a minute.`);
  const body = (await res.json()) as { token: string; expires_at: string };
  const session = { token: body.token, expiresAt: body.expires_at };
  save(session);
  return session;
}

export async function signOut(session: AdminSession | null, fetchImpl: typeof fetch = fetch): Promise<void> {
  save(null);
  if (!session) return;
  await call("/admin/session", { method: "DELETE", headers: { Authorization: `Bearer ${session.token}` } }, fetchImpl).catch(() => undefined);
}

export async function getOverview(session: AdminSession, days: number, fetchImpl: typeof fetch = fetch): Promise<Overview> {
  const res = await call(`/admin/overview?days=${days}`, { headers: { Authorization: `Bearer ${session.token}` } }, fetchImpl);
  if (res.status === 401) {
    save(null);
    throw new AdminError("expired", "Your admin session ended. Enter the password again.");
  }
  if (!res.ok) throw new AdminError("server", `Kiungo's servers answered ${res.status}.`);
  return (await res.json()) as Overview;
}
