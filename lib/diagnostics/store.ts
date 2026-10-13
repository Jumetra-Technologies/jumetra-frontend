/**
 * What this browser has seen of the platform, for System Diagnostics: server
 * requests (path, status, time), errors, and page visits.
 *
 * It lives in localStorage, capped, so it never grows without bound. It is
 * one browser's view: platform-wide numbers (all users' visits and errors)
 * need the backend endpoints in docs/system-diagnostics.md.
 */

export const DIAGNOSTICS_KEY = "kiungo-diagnostics";
const MAX_REQUESTS = 300;
const MAX_ERRORS = 150;

export interface RequestEntry {
  at: number;
  method: string;
  /** Path with ids replaced by ":id", so the same endpoint groups together. */
  path: string;
  /** HTTP status; 0 when the server couldn't be reached; -1 on timeout. */
  status: number;
  ms: number;
}

export type ErrorSource = "request" | "page" | "promise" | "render" | "action";

export interface ErrorEntry {
  id: string;
  at: number;
  source: ErrorSource;
  /** The technical message: for admins only, never shown to users. */
  message: string;
  /** The page the person was on. */
  page: string;
  /** What the person was told, if anything. */
  shown?: string;
  detail?: string;
}

export interface DiagnosticsData {
  requests: RequestEntry[];
  errors: ErrorEntry[];
  /** Visits per page path. */
  views: Record<string, number>;
  since: number;
}

const EMPTY: DiagnosticsData = { requests: [], errors: [], views: {}, since: 0 };
const listeners = new Set<() => void>();
let cache: DiagnosticsData | null = null;

const browser = () => typeof window !== "undefined";

export function readDiagnostics(): DiagnosticsData {
  if (!browser()) return EMPTY;
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(DIAGNOSTICS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<DiagnosticsData>) : null;
    cache = {
      requests: Array.isArray(parsed?.requests) ? parsed.requests : [],
      errors: Array.isArray(parsed?.errors) ? parsed.errors : [],
      views: parsed?.views && typeof parsed.views === "object" ? parsed.views : {},
      since: typeof parsed?.since === "number" ? parsed.since : Date.now(),
    };
  } catch {
    cache = { ...EMPTY, since: Date.now() };
  }
  return cache;
}

export const serverDiagnosticsSnapshot = (): DiagnosticsData => EMPTY;

export function subscribeDiagnostics(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== DIAGNOSTICS_KEY) return;
    cache = null;
    listener();
  };
  if (browser()) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (browser()) window.removeEventListener("storage", onStorage);
  };
}

let flushTimer: ReturnType<typeof setTimeout> | null = null;

function update(fn: (d: DiagnosticsData) => DiagnosticsData) {
  if (!browser()) return;
  cache = fn(readDiagnostics());
  for (const l of listeners) l();
  // Writes are batched: a burst of requests costs one localStorage write.
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    try {
      window.localStorage.setItem(DIAGNOSTICS_KEY, JSON.stringify(cache));
    } catch {
      /* Storage full or blocked: keep the in-memory copy. */
    }
  }, 250);
}

/** Replace ids in a path (long hex, uuids, numbers, Kiungo ids like n_abc123) with ":id". */
export function normalizePath(path: string): string {
  const [bare] = path.split("?");
  return bare
    .split("/")
    .map((seg) => (/^\d+$/.test(seg) || /^[0-9a-f-]{8,}$/i.test(seg) || /^[a-z]{1,4}[_-][a-z0-9]{5,}$/i.test(seg) || /^[A-Z]{2,4}\d{2,}$/.test(seg) ? ":id" : seg))
    .join("/");
}

export function recordRequest(entry: Omit<RequestEntry, "at" | "path"> & { path: string }): void {
  update((d) => ({ ...d, requests: [...d.requests, { ...entry, path: normalizePath(entry.path), at: Date.now() }].slice(-MAX_REQUESTS) }));
}

export function recordError(entry: Omit<ErrorEntry, "id" | "at" | "page"> & { page?: string }): ErrorEntry {
  const full: ErrorEntry = {
    id: `e${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    at: Date.now(),
    page: entry.page ?? (browser() ? window.location.pathname : ""),
    ...entry,
    message: entry.message.slice(0, 500),
    detail: entry.detail?.slice(0, 2000),
  };
  update((d) => ({ ...d, errors: [...d.errors, full].slice(-MAX_ERRORS) }));
  return full;
}

export function recordPageView(path: string): void {
  update((d) => ({ ...d, views: { ...d.views, [path]: (d.views[path] ?? 0) + 1 } }));
}

export function clearDiagnostics(part: "errors" | "requests" | "views" | "all" = "all"): void {
  update((d) =>
    part === "all"
      ? { ...EMPTY, since: Date.now() }
      : part === "views"
        ? { ...d, views: {} }
        : { ...d, [part]: [] },
  );
}

/** Percentile of a list of numbers (p in 0–100). */
export function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[i];
}

/** Request stats per endpoint: count, failures, median and 95th-percentile time. */
export function endpointStats(requests: RequestEntry[]) {
  const by = new Map<string, RequestEntry[]>();
  for (const r of requests) {
    const key = `${r.method} ${r.path}`;
    by.set(key, [...(by.get(key) ?? []), r]);
  }
  return [...by.entries()]
    .map(([key, list]) => ({ key, count: list.length, failed: list.filter((r) => r.status < 200 || r.status >= 400).length, p50: percentile(list.map((r) => r.ms), 50), p95: percentile(list.map((r) => r.ms), 95) }))
    .sort((a, b) => b.p95 - a.p95);
}

/** For tests: forget the in-memory copy. */
export function resetDiagnosticsCache(): void {
  cache = null;
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = null;
}
