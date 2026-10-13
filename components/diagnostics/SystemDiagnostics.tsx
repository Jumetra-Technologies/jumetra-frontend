"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Activity, AlertTriangle, BarChart3, Boxes, CheckCircle2, Copy, FileText, Gauge, Lock, Network, RefreshCw, ShieldAlert, Trash2, Users, XCircle } from "lucide-react";
import NotFound from "@/app/not-found";
import { ReportCenter } from "@/components/reports/ReportCenter";
import { Button } from "@/components/ui/button";
import { API_BASE, ApiError, api, getWsUrl } from "@/lib/api-client";
import { LAYERS } from "@/lib/architecture/model";
import { useAuthStore } from "@/lib/auth-store";
import { adminAccess, isUnlocked, lock } from "@/lib/diagnostics/access";
import { clearDiagnostics, endpointStats, percentile, readDiagnostics, serverDiagnosticsSnapshot, subscribeDiagnostics, type DiagnosticsData } from "@/lib/diagnostics/store";
import { copyText } from "@/lib/ui/clipboard";
import type { AnalyticsOverview, DashboardOverview } from "@/lib/types";
import { cn } from "@/lib/utils";
import { APP_VERSION } from "@/lib/version";

type Check = { state: "checking" | "ok" | "down"; ms?: number; note?: string };
type Remote<T> = { state: "loading" } | { state: "ok"; data: T } | { state: "missing" } | { state: "error"; note: string };

const TABS = [
  { id: "overview", label: "Overview", icon: Gauge },
  { id: "health", label: "Health", icon: Activity },
  { id: "performance", label: "Performance", icon: BarChart3 },
  { id: "usage", label: "Usage", icon: Users },
  { id: "errors", label: "Errors", icon: AlertTriangle },
  { id: "architecture", label: "Architecture", icon: Network },
  { id: "reports", label: "Reports", icon: FileText },
] as const;
type TabId = (typeof TABS)[number]["id"];

const fmtMs = (ms?: number) => (ms === undefined ? "—" : ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${Math.round(ms)} ms`);
const fmtTime = (at: number) => new Date(at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });

/** Ping the backend's /health a few times and keep the median. */
async function checkApi(): Promise<Check> {
  const times: number[] = [];
  for (let i = 0; i < 3; i++) {
    const t0 = performance.now();
    try {
      await api.getHealth();
      times.push(performance.now() - t0);
    } catch (err) {
      return { state: "down", note: err instanceof ApiError ? `HTTP ${err.status}` : err instanceof Error ? err.message : "Unreachable" };
    }
  }
  return { state: "ok", ms: percentile(times, 50) };
}

/** Open the live-updates socket and close it again. */
function checkSocket(timeoutMs = 6000): Promise<Check> {
  return new Promise((resolve) => {
    if (typeof WebSocket === "undefined") return resolve({ state: "down", note: "WebSockets unavailable in this browser" });
    const t0 = performance.now();
    let done = false;
    let socket: WebSocket;
    const finish = (c: Check) => {
      if (done) return;
      done = true;
      try {
        socket?.close();
      } catch {
        /* ignore */
      }
      resolve(c);
    };
    try {
      socket = new WebSocket(getWsUrl());
    } catch (err) {
      return resolve({ state: "down", note: err instanceof Error ? err.message : "Couldn't open" });
    }
    socket.onopen = () => finish({ state: "ok", ms: performance.now() - t0 });
    socket.onerror = () => finish({ state: "down", note: "Connection refused or closed" });
    setTimeout(() => finish({ state: "down", note: `No answer in ${timeoutMs / 1000} s` }), timeoutMs);
  });
}

async function remote<T>(fn: () => Promise<T>): Promise<Remote<T>> {
  try {
    return { state: "ok", data: await fn() };
  } catch (err) {
    if (err instanceof ApiError && [404, 405, 501].includes(err.status)) return { state: "missing" };
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) return { state: "error", note: "Refused: needs an administrator's sign-in" };
    return { state: "error", note: err instanceof ApiError ? `HTTP ${err.status}` : "Unreachable" };
  }
}

/** The page's own load timings, from the browser. */
function pageTimings() {
  if (typeof performance === "undefined" || !performance.getEntriesByType) return null;
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  const paint = performance.getEntriesByType("paint").find((p) => p.name === "first-contentful-paint");
  if (!nav) return null;
  return { ttfb: nav.responseStart - nav.requestStart, fcp: paint?.startTime, domReady: nav.domContentLoadedEventEnd - nav.startTime, load: nav.loadEventEnd ? nav.loadEventEnd - nav.startTime : undefined, transfer: nav.transferSize };
}

function Stat({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: "ok" | "warn" | "bad" }) {
  return (
    <div className="rounded-[12px] border border-border bg-surface p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className={cn("mt-1 text-xl font-semibold tabular-nums", tone === "ok" && "text-success", tone === "warn" && "text-warning", tone === "bad" && "text-danger")}>{value}</p>
      {note ? <p className="mt-0.5 text-xs leading-5 text-muted">{note}</p> : null}
    </div>
  );
}

function CheckRow({ name, what, check }: { name: string; what: string; check: Check }) {
  const Icon = check.state === "ok" ? CheckCircle2 : check.state === "down" ? XCircle : RefreshCw;
  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <Icon className={cn("size-4.5 shrink-0", check.state === "ok" ? "text-success" : check.state === "down" ? "text-danger" : "animate-spin text-muted")} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{name}</p>
        <p className="truncate font-mono text-xs text-muted">{what}</p>
      </div>
      <p className="text-right text-sm tabular-nums">
        {check.state === "checking" ? "Checking…" : check.state === "ok" ? `Up · ${fmtMs(check.ms)}` : "Down"}
        {check.note ? <span className="block text-xs text-muted">{check.note}</span> : null}
      </p>
    </li>
  );
}

function NeedsEndpoint({ endpoint, what }: { endpoint: string; what: string }) {
  return (
    <p className="mt-1 text-xs leading-5 text-muted">
      Needs <code className="rounded bg-muted-bg px-1 font-mono">{endpoint}</code> on the backend ({what}). See <code className="font-mono">docs/system-diagnostics.md</code>.
    </p>
  );
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-[14px] border border-border bg-surface p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

const noopSubscribe = () => () => {};

export function SystemDiagnostics() {
  // Read after hydration: the server can't know, so it renders nothing either way.
  const unlocked = useSyncExternalStore(noopSubscribe, isUnlocked, () => null);
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.isLoading);
  const access = adminAccess(user);

  if (unlocked === null) return null;
  if (!unlocked) return <NotFound />;
  if (authLoading) return <p className="text-sm text-muted">Checking your access…</p>;
  if (access === "signed-out" || access === "denied") {
    return (
      <div className="mx-auto flex min-h-[60svh] max-w-md flex-col items-center justify-center text-center" data-testid="diagnostics-denied">
        <Lock className="size-10 text-muted" aria-hidden />
        <h2 className="mt-4 text-xl font-semibold">Administrators only</h2>
        <p className="mt-2 text-sm leading-6 text-muted">{access === "signed-out" ? "Sign in with an administrator account to open System Diagnostics." : "Your account doesn't have administrator access."}</p>
        <Link href="/" className="mt-5 text-sm font-medium text-primary hover:underline">
          Go home
        </Link>
      </div>
    );
  }
  return <Dashboard roleUnknown={access === "unknown"} />;
}

function Dashboard({ roleUnknown }: { roleUnknown: boolean }) {
  const [tab, setTab] = useState<TabId>("overview");
  const data = useSyncExternalStore(subscribeDiagnostics, readDiagnostics, serverDiagnosticsSnapshot);
  const [apiCheck, setApiCheck] = useState<Check>({ state: "checking" });
  const [wsCheck, setWsCheck] = useState<Check>({ state: "checking" });
  const [stats, setStats] = useState<Remote<Awaited<ReturnType<typeof api.getAdminStats>>>>({ state: "loading" });
  const [dash, setDash] = useState<Remote<DashboardOverview>>({ state: "loading" });
  const [analytics, setAnalytics] = useState<Remote<AnalyticsOverview>>({ state: "loading" });
  const [checkedAt, setCheckedAt] = useState(0);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [storage, setStorage] = useState<{ usage?: number; quota?: number }>({});
  const [timings] = useState(pageTimings);

  /** Run every check; results arrive as they come in. */
  const runChecks = useCallback(() => {
    void checkApi().then(setApiCheck);
    void checkSocket().then(setWsCheck);
    void remote(api.getAdminStats).then(setStats);
    void remote(api.getDashboardOverview).then(setDash);
    void remote(api.getAnalytics).then(setAnalytics);
    void Promise.resolve().then(() => setCheckedAt(Date.now()));
  }, []);

  const refresh = () => {
    setApiCheck({ state: "checking" });
    setWsCheck({ state: "checking" });
    setStats({ state: "loading" });
    runChecks();
  };

  useEffect(() => {
    runChecks();
    void navigator.storage?.estimate?.().then((e) => setStorage({ usage: e.usage, quota: e.quota }));
    const on = () => setOnline(navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
    };
  }, [runChecks]);

  const day = checkedAt - 24 * 3600 * 1000;
  const recentErrors = data.errors.filter((e) => e.at > day);
  const failedRequests = data.requests.filter((r) => r.status < 200 || r.status >= 400);
  const health = apiCheck.state === "checking" ? undefined : apiCheck.state === "ok" && wsCheck.state === "ok" ? "Healthy" : apiCheck.state === "ok" ? "Degraded" : "Down";

  return (
    <div data-testid="system-diagnostics">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Administrators</p>
          <h2 className="mt-1 text-2xl font-bold">System Diagnostics</h2>
          <p className="mt-1 text-sm text-muted">The state of the Kiungo platform: health, performance, usage, errors and architecture.{checkedAt ? ` Checked ${fmtTime(checkedAt)}.` : ""}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={refresh}>
            <RefreshCw className="size-3.5" aria-hidden /> Check again
          </Button>
          <Link href="/" onClick={() => lock()}>
            <Button size="sm" variant="ghost">
              <Lock className="size-3.5" aria-hidden /> Lock
            </Button>
          </Link>
        </div>
      </div>

      {roleUnknown ? (
        <p role="status" className="mb-5 flex items-start gap-2 rounded-[12px] border border-warning/30 bg-warning/10 px-4 py-3 text-sm" data-testid="role-unknown">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          <span>
            The server doesn&apos;t report platform roles yet, so this page can&apos;t confirm you are an administrator. Platform-wide data stays behind the server&apos;s admin check once it exists; what shows here today comes from public endpoints and this browser.
          </span>
        </p>
      ) : null}

      <div role="tablist" aria-label="Diagnostics sections" className="mb-5 flex flex-wrap gap-1 border-b border-border">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={cn("-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors", tab === id ? "border-primary text-foreground" : "border-transparent text-muted hover:text-foreground")}>
            <Icon className="size-3.5" aria-hidden />
            {label}
            {id === "errors" && recentErrors.length ? <span className="rounded-full bg-danger/12 px-1.5 text-[11px] font-semibold text-danger">{recentErrors.length}</span> : null}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="space-y-5">
        {tab === "overview" ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Stat label="System health" value={health ?? "Checking…"} tone={health === "Healthy" ? "ok" : health === "Degraded" ? "warn" : health === "Down" ? "bad" : undefined} note={dash.state === "ok" ? `Backend reports ${dash.data.system_health.toFixed(1)} %` : undefined} />
              <Stat label="Registered users" value={stats.state === "ok" ? String(stats.data.registered_users) : "—"} note={stats.state === "ok" && stats.data.signups_7d !== undefined ? `${stats.data.signups_7d} in the last 7 days` : stats.state === "loading" ? "Loading…" : "Needs the admin stats endpoint"} />
              <Stat label="Online now" value={stats.state === "ok" ? String(stats.data.online_users) : "—"} note={stats.state === "ok" ? "Active in the last 5 minutes" : "Needs the admin stats endpoint"} />
              <Stat label="Errors, last 24 h" value={String(recentErrors.length)} tone={recentErrors.length ? "warn" : "ok"} note="Seen in this browser" />
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <Section title="Services">
                <ul className="divide-y divide-border">
                  <CheckRow name="Backend" what={API_BASE} check={apiCheck} />
                  <CheckRow name="Live updates" what={getWsUrl()} check={wsCheck} />
                </ul>
              </Section>
              <Section title="Activity">
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted">Active experiments</dt>
                    <dd className="font-semibold">{dash.state === "ok" ? `${dash.data.active_experiments} of ${dash.data.total_experiments}` : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Connected devices</dt>
                    <dd className="font-semibold">{dash.state === "ok" ? dash.data.connected_devices : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Sync accuracy</dt>
                    <dd className="font-semibold">{dash.state === "ok" ? `${dash.data.synchronization_accuracy.toFixed(1)} %` : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Requests failed (this browser)</dt>
                    <dd className="font-semibold">
                      {failedRequests.length} of {data.requests.length}
                    </dd>
                  </div>
                </dl>
              </Section>
            </div>
          </>
        ) : null}

        {tab === "health" ? (
          <>
            <Section title="Services">
              <ul className="divide-y divide-border">
                <CheckRow name="Backend (Firebase function)" what={`${API_BASE}/health`} check={apiCheck} />
                <CheckRow name="Live updates (WebSocket)" what={getWsUrl()} check={wsCheck} />
                <CheckRow name="Admin statistics" what={`${API_BASE}/admin/stats`} check={stats.state === "loading" ? { state: "checking" } : stats.state === "ok" ? { state: "ok" } : { state: "down", note: stats.state === "missing" ? "Not built yet" : stats.note }} />
                <CheckRow name="Experiment analytics" what={`${API_BASE}/analytics`} check={analytics.state === "loading" ? { state: "checking" } : analytics.state === "ok" ? { state: "ok" } : { state: "down", note: analytics.state === "missing" ? "Not found" : analytics.note }} />
              </ul>
            </Section>
            <div className="grid gap-5 lg:grid-cols-2">
              <Section title="This build">
                <dl className="grid grid-cols-[9rem_1fr] gap-y-2 text-sm">
                  <dt className="text-muted">Frontend</dt>
                  <dd className="font-mono">v{APP_VERSION}</dd>
                  <dt className="text-muted">Environment</dt>
                  <dd className="font-mono">{process.env.NODE_ENV}</dd>
                  <dt className="text-muted">Backend URL</dt>
                  <dd className="break-all font-mono text-xs">{API_BASE}</dd>
                  <dt className="text-muted">Live updates URL</dt>
                  <dd className="break-all font-mono text-xs">{getWsUrl()}</dd>
                </dl>
              </Section>
              <Section title="This browser">
                <dl className="grid grid-cols-[9rem_1fr] gap-y-2 text-sm">
                  <dt className="text-muted">Network</dt>
                  <dd>{online ? "Online" : "Offline"}</dd>
                  <dt className="text-muted">Storage used</dt>
                  <dd>{storage.usage !== undefined ? `${(storage.usage / 1024 / 1024).toFixed(1)} MB of ${((storage.quota ?? 0) / 1024 / 1024 / 1024).toFixed(1)} GB` : "—"}</dd>
                  <dt className="text-muted">Recording since</dt>
                  <dd>{data.since ? fmtTime(data.since) : "—"}</dd>
                  <dt className="text-muted">Browser</dt>
                  <dd className="truncate text-xs" title={typeof navigator !== "undefined" ? navigator.userAgent : ""}>
                    {typeof navigator !== "undefined" ? navigator.userAgent : "—"}
                  </dd>
                </dl>
              </Section>
            </div>
          </>
        ) : null}

        {tab === "performance" ? <Performance data={data} timings={timings} analytics={analytics} dash={dash} /> : null}
        {tab === "usage" ? <Usage data={data} stats={stats} /> : null}
        {tab === "errors" ? <Errors data={data} /> : null}
        {tab === "architecture" ? <Architecture apiCheck={apiCheck} wsCheck={wsCheck} /> : null}
        {tab === "reports" ? (
          <Section title="Reports">
            <ReportCenter embedded />
          </Section>
        ) : null}
      </div>
    </div>
  );
}

function Performance({ data, timings, analytics, dash }: { data: DiagnosticsData; timings: ReturnType<typeof pageTimings>; analytics: Remote<AnalyticsOverview>; dash: Remote<DashboardOverview> }) {
  const endpoints = useMemo(() => endpointStats(data.requests), [data.requests]);
  const all = data.requests.map((r) => r.ms);
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Requests, median" value={fmtMs(percentile(all, 50))} note={`${all.length} recorded in this browser`} />
        <Stat label="Requests, 95th pct" value={fmtMs(percentile(all, 95))} tone={percentile(all, 95) > 3000 ? "warn" : undefined} />
        <Stat label="Page first paint" value={fmtMs(timings?.fcp)} note={timings ? `Server answered in ${fmtMs(timings.ttfb)}` : undefined} />
        <Stat label="Backend latency p95" value={dash.state === "ok" ? fmtMs(dash.data.latency.p95) : "—"} note={dash.state === "ok" ? `Median ${fmtMs(dash.data.latency.p50)}` : "From the backend's own figures"} />
      </div>
      <Section title="Slowest endpoints (this browser)">
        {endpoints.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="py-1.5 pr-3 font-medium">Endpoint</th>
                  <th className="py-1.5 pr-3 text-right font-medium">Calls</th>
                  <th className="py-1.5 pr-3 text-right font-medium">Failed</th>
                  <th className="py-1.5 pr-3 text-right font-medium">Median</th>
                  <th className="py-1.5 text-right font-medium">95th pct</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {endpoints.slice(0, 12).map((e) => (
                  <tr key={e.key}>
                    <td className="py-1.5 pr-3 font-mono text-xs">{e.key}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{e.count}</td>
                    <td className={cn("py-1.5 pr-3 text-right tabular-nums", e.failed && "text-danger")}>{e.failed}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{fmtMs(e.p50)}</td>
                    <td className="py-1.5 text-right tabular-nums">{fmtMs(e.p95)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted">No requests recorded yet. Use the app and come back.</p>
        )}
      </Section>
      {analytics.state === "ok" ? (
        <Section title="Synchronization (all experiments)">
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {[
              ["Average sync error", fmtMs(analytics.data.average_sync_error)],
              ["Offset stability", analytics.data.offset_stability.toFixed(3)],
              ["Correction success", `${(analytics.data.correction_success_rate * 100).toFixed(1)} %`],
              ["Rollbacks", `${(analytics.data.rollback_frequency * 100).toFixed(1)} %`],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-muted">{k}</dt>
                <dd className="font-semibold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        </Section>
      ) : null}
    </>
  );
}

function Usage({ data, stats }: { data: DiagnosticsData; stats: Remote<Awaited<ReturnType<typeof api.getAdminStats>>> }) {
  const local = Object.entries(data.views).sort((a, b) => b[1] - a[1]);
  const max = local[0]?.[1] ?? 1;
  const platform = stats.state === "ok" ? stats.data.top_pages : undefined;
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Registered users" value={stats.state === "ok" ? String(stats.data.registered_users) : "—"} />
        <Stat label="Online now" value={stats.state === "ok" ? String(stats.data.online_users) : "—"} />
        <Stat label="Active, last 24 h" value={stats.state === "ok" && stats.data.active_users_24h !== undefined ? String(stats.data.active_users_24h) : "—"} />
        <Stat label="New, last 7 days" value={stats.state === "ok" && stats.data.signups_7d !== undefined ? String(stats.data.signups_7d) : "—"} />
      </div>
      {stats.state !== "ok" ? <NeedsEndpoint endpoint="GET /admin/stats" what="user counts and presence, admins only" /> : null}
      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Most visited pages (all users)">
          {platform?.length ? (
            <ol className="space-y-1.5 text-sm">
              {platform.map((p) => (
                <li key={p.path} className="flex justify-between gap-3">
                  <span className="font-mono text-xs">{p.path}</span>
                  <span className="tabular-nums">{p.views}</span>
                </li>
              ))}
            </ol>
          ) : (
            <>
              <p className="text-sm text-muted">Not collected yet.</p>
              <NeedsEndpoint endpoint="POST /telemetry/page-view" what="each visit, anonymous" />
            </>
          )}
        </Section>
        <Section title="Most visited pages (this browser)" action={local.length ? <button type="button" onClick={() => clearDiagnostics("views")} className="text-xs text-muted hover:text-foreground">Clear</button> : undefined}>
          {local.length ? (
            <ol className="space-y-2 text-sm" data-testid="local-views">
              {local.slice(0, 12).map(([path, n]) => (
                <li key={path}>
                  <div className="flex justify-between gap-3">
                    <span className="font-mono text-xs">{path}</span>
                    <span className="tabular-nums">{n}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted-bg">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(n / max) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted">No visits recorded yet.</p>
          )}
        </Section>
      </div>
    </>
  );
}

function Errors({ data }: { data: DiagnosticsData }) {
  const errors = [...data.errors].reverse();
  return (
    <Section
      title={`Errors (this browser) · ${errors.length}`}
      action={
        errors.length ? (
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => void copyText(JSON.stringify(errors, null, 2))}>
              <Copy className="size-3.5" aria-hidden /> Copy as JSON
            </Button>
            <Button size="sm" variant="ghost" onClick={() => clearDiagnostics("errors")}>
              <Trash2 className="size-3.5" aria-hidden /> Clear
            </Button>
          </div>
        ) : undefined
      }
    >
      {errors.length ? (
        <ul className="divide-y divide-border" data-testid="error-log">
          {errors.map((e) => (
            <li key={e.id} className="py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium">{e.message}</p>
                <span className="text-xs text-muted">{fmtTime(e.at)}</span>
              </div>
              <p className="mt-0.5 text-xs text-muted">
                <span className="rounded bg-muted-bg px-1.5 py-0.5 font-medium">{e.source}</span> on <span className="font-mono">{e.page}</span>
                {e.shown ? <> · user saw “{e.shown}”</> : null}
              </p>
              {e.detail ? (
                <details className="mt-1">
                  <summary className="cursor-pointer text-xs text-muted">Details</summary>
                  <pre className="mt-1 max-h-48 overflow-auto rounded-[8px] bg-muted-bg p-2 text-[11px] leading-4">{e.detail}</pre>
                </details>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">No errors recorded in this browser.</p>
      )}
      <NeedsEndpoint endpoint="POST /telemetry/error, GET /admin/errors" what="errors from every user's browser in one place" />
    </Section>
  );
}

function Architecture({ apiCheck, wsCheck }: { apiCheck: Check; wsCheck: Check }) {
  const STATUS: Record<string, string> = { live: "Live", prototype: "Prototype", experimental: "Experimental", "not-started": "Not started" };
  return (
    <>
      <Section title="Deployment">
        <ol className="grid gap-3 md:grid-cols-4">
          {[
            { name: "Browser", text: "Kiungo web app, this device", ok: true },
            { name: "Frontend", text: `Vercel · v${APP_VERSION}`, ok: true },
            { name: "Backend", text: "Firebase Cloud Function (FastAPI), europe-west4", ok: apiCheck.state === "ok" },
            { name: "Live updates", text: "Cloud Run WebSocket service", ok: wsCheck.state === "ok" },
          ].map((n, i) => (
            <li key={n.name} className="relative rounded-[12px] border border-border p-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <span className={cn("size-2 rounded-full", n.ok ? "bg-success" : "bg-danger")} aria-hidden />
                {n.name}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted">{n.text}</p>
              {i < 3 ? <span className="absolute -right-2.5 top-1/2 hidden -translate-y-1/2 text-muted md:block" aria-hidden>→</span> : null}
            </li>
          ))}
        </ol>
      </Section>
      <Section title="Layers" action={<Link href="/docs/architecture" className="text-xs font-medium text-primary hover:underline">Open the architecture explorer</Link>}>
        <ul className="divide-y divide-border text-sm">
          {LAYERS.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="flex items-center gap-2 font-medium">
                <Boxes className="size-3.5 text-muted" aria-hidden />
                {l.name}
              </span>
              <span className="text-xs text-muted">{l.code ? STATUS[l.code.status] : "—"}</span>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
