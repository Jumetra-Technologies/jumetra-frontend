"use client";

import { useEffect, useId, useRef, useState } from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";

import type { PartModel } from "@kiungo/core/parts/types";
import { SegmentedControl } from "@kiungo/ui/segmented-control";
import type { CommunityMonth, CommunityState, CommunityStats } from "@/lib/analytics/community";
import { monthLabel } from "@/lib/analytics/community";
import { cn } from "@/lib/utils";

import { BarList, ChartFrame, formatCount, plural } from "./ChartFrame";
import { Empty, Section } from "./PersonalSections";

const CATEGORY_LABELS: Record<string, string> = { robotics: "Robotics", embedded: "Embedded", autonomy: "Autonomy", iot: "IoT", other: "Other" };

type Series = "total" | "new";

/** Projects and lab sessions by month: the running total, or what was new that month. */
function GrowthChart({ months, series }: { months: CommunityMonth[]; series: Series }) {
  const [active, setActive] = useState<number | null>(null);
  const titleId = useId();
  // Drawn at the size it's shown, so text stays 11px and the chart keeps its height on any screen.
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(640);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => setW(Math.max(280, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const h = 220;
  const pad = { l: 36, r: 92, t: 14, b: 26 };
  const a = months.map((m) => (series === "total" ? m.projects_to_date : m.projects));
  const b = months.map((m) => (series === "total" ? m.lab_sessions_to_date : m.lab_sessions));
  const max = Math.max(1, ...a, ...b);
  const nice = niceMax(max);
  const x = (i: number) => pad.l + (i * (w - pad.l - pad.r)) / Math.max(1, months.length - 1);
  const y = (v: number) => h - pad.b - (v / nice) * (h - pad.t - pad.b);
  const path = (vals: number[]) => vals.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const ticks = [0, nice / 2, nice];
  const i = active;
  // Every second month on a wide chart, every third on a phone; the last is shown unless it would touch the one before.
  const step = w < 480 ? 3 : 2;
  const last = months.length - 1;
  const showMonth = (k: number) => (k === last ? last % step === 0 || (last % step) * ((w - pad.l - pad.r) / Math.max(1, last)) >= 44 : k % step === 0);
  // The two names sit just right of their line ends, pushed apart when the lines end close together.
  const labelY = (() => {
    const ya = y(a[a.length - 1] ?? 0) + 4;
    const yb = y(b[b.length - 1] ?? 0) + 4;
    if (Math.abs(ya - yb) >= 14) return [ya, yb];
    const mid = (ya + yb) / 2;
    return ya <= yb ? [mid - 7, mid + 7] : [mid + 7, mid - 7];
  })();

  return (
    <div ref={box} className="relative">
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="block max-w-full" role="img" aria-labelledby={titleId}>
        <title id={titleId}>{series === "total" ? "Projects and lab sessions built so far, by month" : "New projects and lab sessions each month"}</title>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeDasharray={t === 0 ? undefined : "3 4"} />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">
              {formatCount(t)}
            </text>
          </g>
        ))}
        {months.map((m, k) =>
          showMonth(k) ? (
            <text key={m.month} x={x(k)} y={h - 8} textAnchor={k === 0 ? "start" : k === months.length - 1 ? "end" : "middle"} fontSize="11" fill="var(--muted)">
              {monthLabel(m.month, k === 0 && w >= 480)}
            </text>
          ) : null,
        )}
        <path d={path(b)} fill="none" stroke="var(--analytics-navy)" strokeWidth="2" strokeLinejoin="round" strokeDasharray="5 4" />
        <path d={path(a)} fill="none" stroke="var(--analytics-teal)" strokeWidth="2.5" strokeLinejoin="round" />
        {/* Series names at the line ends, so the chart doesn't depend on a legend or on color. */}
        <text x={x(months.length - 1) + 10} y={labelY[0]} fontSize="11.5" fontWeight="600" fill="var(--analytics-teal)">
          Projects
        </text>
        <text x={x(months.length - 1) + 10} y={labelY[1]} fontSize="11.5" fill="var(--analytics-navy)">
          Lab sessions
        </text>
        {i !== null ? <line x1={x(i)} x2={x(i)} y1={pad.t} y2={h - pad.b} stroke="var(--foreground)" strokeOpacity="0.25" /> : null}
        {months.map((m, k) => (
          <g key={m.month}>
            <circle cx={x(k)} cy={y(a[k])} r={i === k ? 4.5 : 3} fill="var(--surface)" stroke="var(--analytics-teal)" strokeWidth="2" />
            {/* A wide invisible target per month for pointer and keyboard. */}
            <rect
              x={x(k) - (w - pad.l - pad.r) / months.length / 2}
              y={pad.t}
              width={(w - pad.l - pad.r) / months.length}
              height={h - pad.t - pad.b}
              fill="transparent"
              tabIndex={0}
              role="button"
              aria-label={`${monthLabel(m.month, true)}: ${a[k]} projects, ${b[k]} lab sessions${series === "total" ? " so far" : " new"}`}
              onMouseEnter={() => setActive(k)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(k)}
              onBlur={() => setActive(null)}
              style={{ outline: "none" }}
            />
          </g>
        ))}
      </svg>
      {i !== null ? (
        <div
          className="pointer-events-none absolute top-1 rounded-[8px] bg-[var(--analytics-navy)] px-2.5 py-1.5 text-xs text-white shadow-md"
          style={{ left: `${(x(i) / w) * 100}%`, transform: `translateX(${i > months.length / 2 ? "-105%" : "5%"})` }}
          role="status"
        >
          <strong className="font-semibold">{monthLabel(months[i].month, true)}</strong>
          <br />
          {plural(a[i], "project")}, {plural(b[i], "lab session")}
          {series === "total" ? " so far" : " new"}
          {months[i].builders !== null ? (
            <>
              <br />
              {plural(months[i].builders!, "builder")} active
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function niceMax(v: number): number {
  if (v <= 5) return 5;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

export function CommunitySection({ state, catalog, myParts, onRetry }: { state: CommunityState; catalog: PartModel[]; myParts: Set<string>; onRetry: () => void }) {
  const [series, setSeries] = useState<Series>("total");
  const names = new Map(catalog.map((p) => [p.id, p.name]));

  return (
    <Section
      id="community"
      title="The Kiungo community"
      description="Everyone's work, counted together. No names and no rankings: a part or category only shows once 10 or more people use it."
    >
      {state.status === "loading" ? (
        <div className="grid gap-4 sm:grid-cols-3" aria-busy="true" aria-label="Loading community figures">
          {[0, 1, 2].map((k) => (
            <div key={k} className="h-24 animate-pulse rounded-[14px] bg-muted-bg" />
          ))}
        </div>
      ) : state.status === "unavailable" ? (
        <Empty text="Community figures will appear here once the community service is switched on for this site. Your own figures above don't depend on it." />
      ) : state.status === "error" ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-dashed border-border px-4 py-4 text-sm text-muted">
          <p>{`${state.message} Your own figures above aren't affected.`}</p>
          <button type="button" onClick={onRetry} className="inline-flex items-center gap-1.5 rounded-[8px] px-2.5 py-1.5 font-medium text-[var(--analytics-teal)] hover:bg-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]">
            <RefreshCw className="size-3.5" aria-hidden /> Try again
          </button>
        </div>
      ) : (
        <CommunityReady stats={state.stats} names={names} myParts={myParts} series={series} setSeries={setSeries} />
      )}
    </Section>
  );
}

function CommunityReady({ stats, names, myParts, series, setSeries }: { stats: CommunityStats; names: Map<string, string>; myParts: Set<string>; series: Series; setSeries: (s: Series) => void }) {
  const t = stats.totals;
  const k = stats.privacy.min_group;
  const first = stats.monthly.find((m) => m.projects_to_date > 0 || m.lab_sessions_to_date > 0);
  const growth = stats.monthly.length ? stats.monthly[stats.monthly.length - 1].projects_to_date - (stats.monthly[0].projects_to_date - stats.monthly[0].projects) : 0;
  const totals: Array<[string, number, string?]> = [
    ["Robotics projects", t.projects],
    ["Lab sessions", t.lab_sessions],
    ["Runs", t.runs],
    ["Parts placed", t.parts_placed],
    ["Builders", t.builders, `${formatCount(t.active_builders_30d)} active in 30 days`],
  ];
  const parts = stats.parts.rows.map((r) => ({
    key: r.key,
    label: names.get(r.key) ?? r.key,
    value: r.count,
    valueLabel: plural(r.count, "session"),
    note: myParts.has(r.key) ? "You've used it" : undefined,
  }));
  const categories = stats.categories.rows.map((r) => ({ key: r.key, label: CATEGORY_LABELS[r.key] ?? r.key, value: r.count, valueLabel: plural(r.count, "project") }));

  return (
    <div className="space-y-6" data-testid="analytics-community">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-[14px] border border-border bg-surface p-5 sm:grid-cols-3 lg:grid-cols-5">
        {totals.map(([label, value, note]) => (
          <div key={label}>
            <dt className="text-[13px] text-muted">{label}</dt>
            <dd className="mt-0.5 text-2xl font-semibold tabular-nums tracking-[-0.02em] text-foreground">{formatCount(value)}</dd>
            {note ? <dd className="text-xs text-muted">{note}</dd> : null}
          </div>
        ))}
      </dl>

      <div className="rounded-[14px] border border-border bg-surface p-5">
        <ChartFrame
          title="Growth"
          summary={
            t.projects
              ? `${plural(growth, "project")} built in the last 12 months${first ? `, starting ${monthLabel(first.month, true)}` : ""}. Point at a month for its numbers.`
              : "Projects and lab sessions by month, once people start building."
          }
          table={{
            columns: ["Month", "New projects", "New lab sessions", "Projects so far"],
            rows: stats.monthly.map((m) => [monthLabel(m.month, true), m.projects, m.lab_sessions, m.projects_to_date]),
          }}
          actions={
            <SegmentedControl<Series>
              size="sm"
              label="Show"
              value={series}
              onChange={setSeries}
              options={[
                { id: "total", label: "So far" },
                { id: "new", label: "New each month" },
              ]}
            />
          }
        >
          <GrowthChart months={stats.monthly} series={series} />
        </ChartFrame>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[14px] border border-border bg-surface p-5">
          <ChartFrame
            title="Most-used parts"
            summary={parts.length ? `${parts[0].label} is in the most lab sessions.` : `Parts show once ${k} or more people use them.`}
            table={parts.length ? { columns: ["Part", "Lab sessions", "People"], rows: stats.parts.rows.map((r) => [names.get(r.key) ?? r.key, r.count, r.people]) } : undefined}
          >
            {parts.length ? <BarList items={parts} /> : <Empty text={`Not enough people share a part yet. Rows appear at ${k} people.`} />}
            {stats.parts.other ? <p className="mt-3 px-3 text-xs text-muted">Plus {plural(stats.parts.other.count, "use")} of parts fewer than {k} people have tried.</p> : null}
          </ChartFrame>
        </div>
        <div className="rounded-[14px] border border-border bg-surface p-5">
          <ChartFrame
            title="What people build"
            summary={categories.length ? `${categories[0].label} projects are the most common.` : `Categories show once ${k} or more people build them.`}
            table={categories.length ? { columns: ["Category", "Projects"], rows: categories.map((c) => [c.label, c.value]) } : undefined}
          >
            {categories.length ? <BarList tone="navy" items={categories} /> : <Empty text={`Not enough people share a category yet. Rows appear at ${k} people.`} />}
          </ChartFrame>
          <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-4 text-[13px]">
            {[
              ["Experiment records", t.experiments],
              ["Faults fixed", t.faults_fixed],
              ["Hours simulated", t.simulated_hours],
            ].map(([label, value]) => (
              <div key={label as string}>
                <dt className="text-muted">{label}</dt>
                <dd className="text-lg font-semibold tabular-nums text-foreground">{formatCount(Number(value))}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <p className={cn("flex items-start gap-2 text-xs text-muted")}>
        <ShieldCheck className="mt-px size-3.5 shrink-0" aria-hidden />
        <span>
          Counted across every Kiungo account, without names or anything that points at one person. Updated every {Math.round(stats.privacy.cache_seconds / 60)} minutes; last counted{" "}
          {new Date(stats.generated_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}.
        </span>
      </p>
    </div>
  );
}
