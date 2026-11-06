"use client";

import { Download, LogOut, Monitor, RefreshCw, Search, Globe } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { Button } from "@kiungo/ui/button";
import { SegmentedControl } from "@kiungo/ui/segmented-control";
import { BarList, ChartFrame, formatCount } from "@/components/analytics/ChartFrame";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { AdminError, currentSession, getOverview, signOut, subscribeSession, type Overview, type OverviewAccount } from "@/lib/admin/api";
import { cn } from "@/lib/utils";

import styles from "./admin.module.css";
import { PasswordForm } from "./PasswordForm";

const REFRESH_MS = 30_000;
const RANGES = [
  { id: "1", label: "Today" },
  { id: "7", label: "7 days" },
  { id: "30", label: "30 days" },
  { id: "90", label: "90 days" },
] as const;
type RangeId = (typeof RANGES)[number]["id"];

/** 0 min, 45 min, 3 h 20 min, 120 h. */
export function hoursMinutes(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h >= 100 || m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** "just now", "4 min ago", "3 h ago", "2 days ago", or the date. */
export function ago(iso: string | null, now: number): string {
  if (!iso) return "never";
  const s = Math.max(0, (now - Date.parse(iso)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86_400 * 14) return `${Math.floor(s / 86_400)} day${s < 172_800 ? "" : "s"} ago`;
  return shortDate(iso);
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const csvCell = (v: string | number) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));

/** The accounts table as a CSV file: one row per account, minutes rounded. */
export function accountsCsv(accounts: OverviewAccount[], days: number): string {
  const head = ["Name", "Email", "Sign-in", "Online", `Minutes (last ${days} days)`, "Minutes on web", "Minutes on desktop", "Minutes all time", "Active days", "Projects", "Lab sessions", "Last seen", "Joined"];
  const rows = accounts.map((a) => [a.name, a.email, a.sign_in.join(" "), a.online ? "yes" : "no", Math.round(a.seconds_range / 60), Math.round(a.seconds_web / 60), Math.round(a.seconds_desktop / 60), Math.round(a.seconds_total / 60), a.active_days, a.projects, a.lab_sessions, a.last_seen ?? "", a.created_at ?? ""]);
  return [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
}

type SortId = "time" | "total" | "seen" | "joined" | "name";
const SORTS: Array<{ id: SortId; label: string }> = [
  { id: "time", label: "Time in range" },
  { id: "total", label: "Time all time" },
  { id: "seen", label: "Last seen" },
  { id: "joined", label: "Newest" },
  { id: "name", label: "Name" },
];

function sortAccounts(list: OverviewAccount[], by: SortId): OverviewAccount[] {
  const t = (iso: string | null) => (iso ? Date.parse(iso) : 0);
  const out = [...list];
  out.sort((a, b) => {
    if (a.online !== b.online && by === "seen") return a.online ? -1 : 1;
    switch (by) {
      case "total":
        return b.seconds_total - a.seconds_total;
      case "seen":
        return t(b.last_seen) - t(a.last_seen);
      case "joined":
        return t(b.created_at) - t(a.created_at);
      case "name":
        return a.name.localeCompare(b.name);
      default:
        return b.seconds_range - a.seconds_range || b.seconds_total - a.seconds_total;
    }
  });
  return out;
}

/** Names people know pages by: the sidebar's, plus the desktop app's screens. */
const PAGE_NAMES: Record<string, string> = {
  ...Object.fromEntries(NAV_ITEMS.map((item) => [item.href, item.label])),
  "/settings": "Settings",
  "/desktop": "Desktop download page",
  "/desktop/home": "Desktop app: Home",
  "/desktop/project": "Desktop app: a project",
};

export function pageName(page: string): string {
  return PAGE_NAMES[page] ?? page;
}

export function AdminPortal() {
  const session = useSyncExternalStore(subscribeSession, currentSession, () => null);
  const [range, setRange] = useState<RangeId>("7");
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const onData = useCallback((next: Overview) => {
    setData(next);
    setError(null);
    setNow(Date.now());
  }, []);
  const onError = useCallback((e: unknown) => {
    if (e instanceof AdminError && e.kind === "expired") {
      setNotice(e.message);
      setData(null);
    } else setError(e instanceof Error ? e.message : "Couldn't load the figures.");
  }, []);
  /** Asks for the figures; the state changes when the answer arrives. */
  const request = useCallback((): Promise<void> => {
    const s = currentSession();
    return s ? getOverview(s, Number(range)).then(onData, onError) : Promise.resolve();
  }, [range, onData, onError]);

  const refresh = () => {
    setLoading(true);
    void request().finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!session) return;
    void request();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void request();
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [session, request]);

  if (!session) {
    return (
      <div className="mx-auto max-w-[400px] py-10" data-testid="admin-locked">
        <h2 className="text-2xl font-bold text-foreground">Admin portal</h2>
        <p className="mt-1 text-sm text-muted">{"Enter the admin password to see what's happening across Kiungo."}</p>
        <div className="mt-6 rounded-[14px] border border-border bg-surface p-5">
          <PasswordForm onSignedIn={() => setNotice(null)} notice={notice} />
        </div>
      </div>
    );
  }

  return (
    <div className={cn(styles.page, "space-y-6 pb-10")} data-testid="admin-portal">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Admin portal</h2>
          <p className="mt-1 text-sm text-muted">
            Kiungo on the website and the desktop app.{" "}
            {data ? <span>Updated {new Date(data.generated_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" })}, and every 30 seconds.</span> : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl label="Time range" size="sm" value={range} options={RANGES.map((r) => ({ id: r.id, label: r.label }))} onChange={(v) => setRange(v)} />
          <Button size="sm" variant="secondary" className="gap-1.5" onClick={refresh} disabled={loading} data-testid="admin-refresh">
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} aria-hidden /> Refresh
          </Button>
          <Button size="sm" variant="secondary" className="gap-1.5" onClick={() => void signOut(session)} data-testid="admin-sign-out">
            <LogOut className="size-3.5" aria-hidden /> Sign out
          </Button>
        </div>
      </header>

      {error ? (
        <p role="alert" className="rounded-[12px] border border-[var(--warning)] bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] px-4 py-3 text-sm text-foreground">
          {error}
        </p>
      ) : null}

      {data ? <Dashboard data={data} now={now} /> : <Loading />}
    </div>
  );
}

function Loading() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5" aria-busy="true" aria-label="Loading the figures">
      {[0, 1, 2, 3, 4].map((k) => (
        <div key={k} className="h-[104px] animate-pulse rounded-[14px] bg-muted-bg" />
      ))}
    </div>
  );
}

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("min-w-0 rounded-[14px] border border-border bg-surface p-5", className)}>{children}</section>;
}

function Stat({ label, value, note, testId }: { label: string; value: string; note?: React.ReactNode; testId?: string }) {
  return (
    <div className="min-w-0 rounded-[14px] border border-border bg-surface px-4 py-4" data-testid={testId}>
      <p className="text-[13px] text-muted">{label}</p>
      <p className="mt-1 text-[28px] font-semibold leading-8 tabular-nums text-foreground">{value}</p>
      {note ? <p className="mt-1.5 text-xs leading-4 text-muted">{note}</p> : null}
    </div>
  );
}

function Dashboard({ data, now }: { data: Overview; now: number }) {
  const t = data.totals;
  const rangeWords = data.days === 1 ? "today" : `in the last ${data.days} days`;
  const webShare = t.seconds_range ? Math.round((data.clients.web / t.seconds_range) * 100) : 0;
  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat testId="admin-accounts" label="Accounts" value={formatCount(t.accounts)} note={t.accounts_new_range ? `${t.accounts_new_range} new ${rangeWords}` : `None new ${rangeWords}`} />
        <Stat testId="admin-projects" label="Projects" value={formatCount(t.projects)} note={`${formatCount(t.lab_sessions)} lab sessions, ${formatCount(t.experiments)} experiment records`} />
        <Stat
          testId="admin-online"
          label="Online now"
          value={formatCount(t.online_accounts)}
          note={
            <span className="inline-flex items-center gap-1.5">
              {t.online_accounts ? <span className={styles.live} aria-hidden /> : null}
              {t.online_visitors ? `and ${t.online_visitors} signed-out visitor${t.online_visitors === 1 ? "" : "s"}` : "accounts with a window open"}
            </span>
          }
        />
        <Stat testId="admin-time" label={`Time in Kiungo, ${data.days === 1 ? "today" : `${data.days} days`}`} value={hoursMinutes(t.seconds_range)} note={t.seconds_range ? `${webShare}% website, ${100 - webShare}% desktop app` : "Nobody has used it yet in this range"} />
        <Stat testId="admin-active" label="Active accounts" value={formatCount(t.active_accounts_range)} note={`${desktopNote(t.desktop_devices)}`} />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <OnlineNow data={data} now={now} />
        <Pages data={data} />
      </div>

      <Daily data={data} />
      <Accounts data={data} now={now} />
      <SignIns data={data} now={now} />

      <p className="text-xs leading-5 text-muted">
        Time counts while a Kiungo window is open and in use: the website while its tab is visible and someone has moved, typed or scrolled in the last five minutes, the desktop app
        while its window is shown and the computer is in use. Days are in UTC.{" "}
        {data.tracked_since ? `Recorded since ${shortDate(data.tracked_since)}.` : "Nothing has been recorded yet."}
      </p>
    </>
  );
}

function desktopNote(devices: number): string {
  return devices ? `${devices} desktop app${devices === 1 ? "" : "s"} signed in` : "No desktop apps signed in";
}

function ClientChip({ client }: { client: "web" | "desktop" }) {
  const Icon = client === "web" ? Globe : Monitor;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11.5px] text-muted">
      <Icon className="size-3" aria-hidden />
      {client === "web" ? "Website" : "Desktop app"}
    </span>
  );
}

function OnlineNow({ data, now }: { data: Overview; now: number }) {
  const visitors = data.online_visitors.web + data.online_visitors.desktop;
  return (
    <Panel>
      <h3 className="text-[15px] font-semibold text-foreground">Online now</h3>
      <p className="mt-1 text-sm text-muted">Accounts with Kiungo open in the last two minutes.</p>
      {data.online.length === 0 ? (
        <p className="mt-6 text-sm text-muted">Nobody signed in is online right now{visitors ? `, but ${visitors} signed-out visitor${visitors === 1 ? " is" : "s are"} on the website` : ""}.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border" data-testid="admin-online-list">
          {data.online.map((o) => (
            <li key={`${o.user_id}-${o.client}`} className="flex items-start gap-3 py-2.5">
              <span className={cn(styles.live, "mt-1.5")} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <span className="font-medium text-foreground">{o.name}</span>
                  <ClientChip client={o.client} />
                </p>
                <p className="truncate text-xs text-muted">{o.email}</p>
              </div>
              <div className="shrink-0 text-right text-xs text-muted">
                <p className="text-foreground">{pageName(o.page)}</p>
                <p>for {hoursMinutes((now - Date.parse(o.since)) / 1000)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {data.online.length > 0 && visitors ? <p className="mt-3 text-xs text-muted">Plus {visitors} signed-out visitor{visitors === 1 ? "" : "s"} on the website.</p> : null}
    </Panel>
  );
}

function Pages({ data }: { data: Overview }) {
  const top = data.pages.slice(0, 10);
  const first = top[0];
  return (
    <Panel>
      <ChartFrame
        title="Most active pages"
        summary={first ? `${pageName(first.page)} had the most time ${data.days === 1 ? "today" : `in the last ${data.days} days`}: ${hoursMinutes(first.seconds)} over ${formatCount(first.views)} views.` : "No pages visited in this range yet."}
        table={{ columns: ["Page", "Time", "Views", "Website", "Desktop app"], rows: data.pages.map((p) => [pageName(p.page), hoursMinutes(p.seconds), p.views, hoursMinutes(p.web), hoursMinutes(p.desktop)]) }}
      >
        {top.length ? (
          <BarList
            items={top.map((p) => ({
              key: p.page,
              label: pageName(p.page),
              value: p.seconds || p.views,
              valueLabel: `${hoursMinutes(p.seconds)}, ${formatCount(p.views)} view${p.views === 1 ? "" : "s"}`,
            }))}
          />
        ) : (
          <p className="text-sm text-muted">Pages show up here once people use Kiungo.</p>
        )}
      </ChartFrame>
    </Panel>
  );
}

function Daily({ data }: { data: Overview }) {
  const max = Math.max(1, ...data.daily.map((d) => d.seconds));
  const busiest = data.daily.reduce((a, b) => (b.seconds > a.seconds ? b : a), data.daily[0]);
  const label = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const step = data.daily.length > 31 ? 14 : data.daily.length > 8 ? 7 : 1;
  return (
    <Panel>
      <ChartFrame
        title="Each day"
        summary={busiest && busiest.seconds ? `The busiest day was ${label(busiest.day)}: ${hoursMinutes(busiest.seconds)} across ${busiest.active_accounts} account${busiest.active_accounts === 1 ? "" : "s"} and ${busiest.visitors} signed-out visitor${busiest.visitors === 1 ? "" : "s"}.` : "No time recorded in this range yet."}
        table={{ columns: ["Day", "Time", "Active accounts", "Signed-out visitors", "New accounts"], rows: data.daily.map((d) => [label(d.day), hoursMinutes(d.seconds), d.active_accounts, d.visitors, d.new_accounts]) }}
      >
        <div className="flex h-40 items-end gap-[3px]" data-testid="admin-daily">
          {data.daily.map((d) => (
            <div key={d.day} className="group relative flex h-full min-w-0 flex-1 flex-col justify-end" title={`${label(d.day)}: ${hoursMinutes(d.seconds)}, ${d.active_accounts} accounts, ${d.visitors} visitors, ${d.new_accounts} new`}>
              <div className="w-full rounded-t-[3px] bg-[var(--analytics-teal)] transition-opacity group-hover:opacity-80" style={{ height: `${d.seconds ? Math.max(3, (d.seconds / max) * 100) : 0}%` }} />
              {d.new_accounts ? <span className="absolute -top-1 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-[var(--analytics-navy)]" aria-hidden /> : null}
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-muted" aria-hidden>
          {data.daily
            .filter((_, i) => i % step === 0 || i === data.daily.length - 1)
            .map((d) => (
              <span key={d.day}>{label(d.day)}</span>
            ))}
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
          <span className="inline-block size-1.5 rounded-full bg-[var(--analytics-navy)]" aria-hidden /> A dot marks a day someone made an account.
        </p>
      </ChartFrame>
    </Panel>
  );
}

function Accounts({ data, now }: { data: Overview; now: number }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortId>("time");
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? data.accounts.filter((a) => a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q)) : data.accounts;
    return sortAccounts(list, sort);
  }, [data.accounts, query, sort]);
  const download = () => {
    const blob = new Blob([accountsCsv(shown, data.days)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kiungo-accounts-${data.range.end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const rangeHead = data.days === 1 ? "Today" : `Last ${data.days} days`;
  return (
    <Panel className="p-0">
      <div className="flex flex-wrap items-end justify-between gap-3 px-5 pt-5">
        <div>
          <h3 className="text-[15px] font-semibold text-foreground">Accounts</h3>
          <p className="mt-1 text-sm text-muted">
            {formatCount(data.accounts.length)} account{data.accounts.length === 1 ? "" : "s"}, with the time each has spent in Kiungo.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <span className="sr-only">Search accounts</span>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name or email"
              className="h-8 w-48 rounded-[8px] border border-border bg-background pl-8 pr-2 text-[13px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              data-testid="admin-search"
            />
          </label>
          <label className="flex items-center gap-1.5 text-[13px] text-muted">
            Sort by
            <select value={sort} onChange={(e) => setSort(e.target.value as SortId)} className="h-8 rounded-[8px] border border-border bg-background px-2 text-[13px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]" data-testid="admin-sort">
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <Button size="sm" variant="secondary" className="gap-1.5" onClick={download} disabled={!shown.length} data-testid="admin-csv">
            <Download className="size-3.5" aria-hidden /> Export CSV
          </Button>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm" data-testid="admin-accounts-table">
          <thead className="border-y border-border bg-muted-bg/60 text-xs text-muted">
            <tr>
              <th scope="col" className="px-5 py-2 font-medium">Account</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">{rangeHead}</th>
              <th scope="col" className="px-3 py-2 font-medium">Website / desktop</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">All time</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Active days</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Projects</th>
              <th scope="col" className="px-3 py-2 font-medium">Last seen</th>
              <th scope="col" className="px-5 py-2 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {shown.map((a) => {
              const split = a.seconds_range ? Math.round((a.seconds_web / a.seconds_range) * 100) : 0;
              return (
                <tr key={a.id} className="align-top hover:bg-muted-bg/40">
                  <td className="px-5 py-2.5">
                    <p className="flex items-center gap-2 font-medium text-foreground">
                      {a.online ? <span className={styles.live} title="Online now" aria-label="Online now" role="img" /> : null}
                      {a.name}
                    </p>
                    <p className="text-xs text-muted">
                      {a.email}
                      {a.sign_in.length ? ` · ${a.sign_in.map((p) => (p === "google" ? "Google" : p === "github" ? "GitHub" : p)).join(", ")}` : ""}
                    </p>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-foreground">{hoursMinutes(a.seconds_range)}</td>
                  <td className="px-3 py-2.5">
                    {a.seconds_range ? (
                      <div className="w-32">
                        <div className="flex h-1.5 overflow-hidden rounded-full bg-muted-bg" aria-hidden>
                          <span style={{ width: `${split}%`, background: "var(--analytics-teal)" }} />
                          <span style={{ width: `${100 - split}%`, background: "var(--analytics-navy)" }} />
                        </div>
                        <p className="mt-1 text-[11.5px] text-muted">
                          {hoursMinutes(a.seconds_web)} / {hoursMinutes(a.seconds_desktop)}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-muted">None</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-muted">{hoursMinutes(a.seconds_total)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-muted">{a.active_days}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-muted" title={`${a.lab_sessions} lab sessions`}>
                    {a.projects}
                  </td>
                  <td className="px-3 py-2.5 text-muted">{a.online ? <span className="text-[var(--success)]">Online now</span> : ago(a.last_seen, now)}</td>
                  <td className="px-5 py-2.5 text-muted">{a.created_at ? shortDate(a.created_at) : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {shown.length === 0 ? <p className="px-5 py-6 text-sm text-muted">{query ? `No account matches “${query}”.` : "No accounts yet."}</p> : null}
      </div>
      <p className="px-5 py-3 text-xs text-muted">The website / desktop bar is the split of time in the range: teal for the website, navy for the desktop app.</p>
    </Panel>
  );
}

function SignIns({ data, now }: { data: Overview; now: number }) {
  if (!data.admin_sign_ins.length) return null;
  const failed = data.admin_sign_ins.filter((a) => !a.ok).length;
  return (
    <Panel>
      <h3 className="text-[15px] font-semibold text-foreground">Admin sign-ins</h3>
      <p className="mt-1 text-sm text-muted">
        The last {data.admin_sign_ins.length} tries at the admin password{failed ? `, ${failed} of them wrong` : ""}. Each address is shown as a short code, never the address itself; five wrong
        tries from one lock it out for 15 minutes.
      </p>
      <ul className="mt-3 max-w-xl divide-y divide-border text-sm">
        {data.admin_sign_ins.map((a, i) => (
          <li key={`${a.at}-${i}`} className="flex items-center justify-between gap-3 py-1">
            <span className={a.ok ? "text-foreground" : "text-[var(--danger)]"}>{a.ok ? "Signed in" : "Wrong password"}</span>
            <span className="text-xs tabular-nums text-muted">
              {ago(a.at, now)} · from {a.from}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
