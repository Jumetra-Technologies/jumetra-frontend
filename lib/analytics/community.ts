/**
 * What the Kiungo community has built: GET /community/stats on the backend
 * (jumetra-backend docs/community-api.md). Platform-wide figures only. A
 * breakdown row needs `privacy.min_group` people or it is folded into
 * `other`; the page says so rather than inventing a number.
 */

import { API_BASE } from "@/lib/api-client";

export interface CommunityRow {
  key: string;
  count: number;
  people: number;
}

export interface CommunityBreakdown {
  rows: CommunityRow[];
  other: { count: number; people: number } | null;
}

export interface CommunityMonth {
  month: string;
  projects: number;
  lab_sessions: number;
  projects_to_date: number;
  lab_sessions_to_date: number;
  builders: number | null;
}

export interface CommunityStats {
  generated_at: string;
  totals: {
    builders: number;
    active_builders_30d: number;
    projects: number;
    lab_sessions: number;
    experiments: number;
    parts_placed: number;
    wires: number;
    runs: number;
    faults_fixed: number;
    simulated_hours: number;
    modules_completed: number;
  };
  parts: CommunityBreakdown;
  project_hardware: CommunityBreakdown;
  categories: CommunityBreakdown;
  modes: CommunityBreakdown;
  monthly: CommunityMonth[];
  privacy: { min_group: number; cache_seconds: number };
}

export type CommunityState =
  | { status: "loading" }
  | { status: "ready"; stats: CommunityStats }
  /** The backend this site talks to doesn't have the route yet (it isn't deployed there). */
  | { status: "unavailable" }
  | { status: "error"; message: string };

function isStats(value: unknown): value is CommunityStats {
  const v = value as CommunityStats;
  return Boolean(v && typeof v === "object" && v.totals && typeof v.totals.projects === "number" && Array.isArray(v.monthly) && v.parts && Array.isArray(v.parts.rows));
}

/** Public and unauthenticated, so it doesn't go through the signed-in request layer. */
export async function loadCommunityStats(fetchImpl: typeof fetch = fetch, base = API_BASE, timeoutMs = 10_000): Promise<CommunityState> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`${base}/community/stats`, { signal: controller.signal, headers: { Accept: "application/json" } });
    if (res.status === 404 || res.status === 405) return { status: "unavailable" };
    if (!res.ok) return { status: "error", message: `The community service answered ${res.status}.` };
    const body: unknown = await res.json();
    if (!isStats(body)) return { status: "unavailable" };
    return { status: "ready", stats: body };
  } catch (err) {
    if ((err as Error)?.name === "AbortError") return { status: "error", message: "The community service didn't answer in time." };
    return { status: "error", message: "Couldn't reach the community service." };
  } finally {
    clearTimeout(timer);
  }
}

/** "2026-03" as "Mar", with the year on January and on the first month shown. */
export function monthLabel(month: string, showYear = false): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("en-US", { month: "short", ...(showYear || m === 1 ? { year: "numeric" } : {}) });
}
