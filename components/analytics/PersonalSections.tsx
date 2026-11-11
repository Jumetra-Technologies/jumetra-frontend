"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  CalendarDays,
  Cpu,
  FlaskConical,
  GraduationCap,
  Lightbulb,
  Minus,
  Plus,
  TrendingUp,
  Wrench,
} from "lucide-react";

import type { LabSession } from "@kiungo/core/lab/types";
import type { PartGroupId, PartModel } from "@kiungo/core/parts/types";
import type {
  ActivityEvent,
  Debugging,
  GoalSummary,
  Headline,
  Insight,
  LearningSummary,
  ModeMix,
  PartUse,
  ProjectsSummary,
  RecordStep,
} from "@/lib/analytics/personal";
import { RECORD_STEPS, recordSteps } from "@/lib/analytics/personal";
import { cn } from "@/lib/utils";
import { labHref } from "@/components/projects/LabSessionCard";

import styles from "./analytics.module.css";
import { describeDay, longDate } from "./BreadboardCalendar";
import {
  BarList,
  ChartFrame,
  Sparkline,
  formatCount,
  formatDuration,
  plural,
} from "./ChartFrame";

// ----- headline -----

function change(
  h: Headline,
  rangeLabel: string,
): { text: string; tone: "up" | "down" | "same" } | null {
  if (h.previous === undefined) return null;
  const diff = h.value - h.previous;
  if (diff === 0)
    return { text: `Same as the ${rangeLabel} before`, tone: "same" };
  return {
    text: `${diff > 0 ? "+" : "−"}${formatCount(Math.abs(diff))} on the ${rangeLabel} before`,
    tone: diff > 0 ? "up" : "down",
  };
}

export function HeadlineStrip({
  items,
  rangeLabel,
}: {
  items: Headline[];
  rangeLabel: string | null;
}) {
  return (
    <dl className={styles.strip} data-testid="analytics-headline">
      {items.map((h) => {
        const c = rangeLabel ? change(h, rangeLabel) : null;
        const share = h.of
          ? Math.round((h.value / Math.max(1, h.of)) * 100)
          : null;
        return (
          <div
            key={h.id}
            className="flex min-w-0 flex-col justify-between gap-3 p-4 sm:p-5"
          >
            <div>
              <dt className="text-[13px] font-medium text-muted">{h.label}</dt>
              <dd className="mt-1 flex items-baseline gap-1.5">
                <span className="text-[28px] font-semibold leading-8 tracking-[-0.02em] tabular-nums text-foreground">
                  {formatCount(h.value)}
                </span>
                {h.of ? (
                  <span className="text-sm tabular-nums text-muted">
                    of {h.of}
                  </span>
                ) : null}
              </dd>
            </div>
            <div className="flex items-end justify-between gap-2">
              {share !== null ? (
                <span
                  className="block h-1.5 w-full max-w-[96px] overflow-hidden rounded-full bg-muted-bg"
                  aria-hidden
                >
                  <span
                    className="block h-full rounded-full bg-[var(--analytics-teal)]"
                    style={{ width: `${share}%` }}
                  />
                </span>
              ) : (
                <Sparkline values={h.trend} />
              )}
            </div>
            {c ? (
              <p
                className={cn(
                  "text-xs",
                  c.tone === "up" ? "text-[var(--success)]" : "text-muted",
                )}
              >
                {c.text}
              </p>
            ) : h.of ? (
              <p className="text-xs text-muted">
                {share}%{" "}
                {h.id === "modules"
                  ? "of the learning path"
                  : "of the parts library"}
              </p>
            ) : (
              <p className="text-xs text-muted">Since you started</p>
            )}
          </div>
        );
      })}
    </dl>
  );
}

// ----- insights -----

const INSIGHT_ICON: Array<[RegExp, typeof Lightbulb]> = [
  [/part|try-/, Cpu],
  [/record/, FlaskConical],
  [/fix/, Wrench],
  [/module/, GraduationCap],
  [/weekday/, CalendarDays],
  [/active/, TrendingUp],
];

export function InsightList({ items }: { items: Insight[] }) {
  if (items.length === 0) return null;
  return (
    <section
      aria-labelledby="insights-title"
      className="rounded-[14px] border border-border bg-surface"
    >
      <h3 id="insights-title" className="sr-only">
        What stands out
      </h3>
      <ul className="divide-y divide-border" data-testid="analytics-insights">
        {items.map((i) => {
          const Icon =
            INSIGHT_ICON.find(([re]) => re.test(i.id))?.[1] ?? Lightbulb;
          return (
            <li
              key={i.id}
              className="grid grid-cols-[16px_minmax(0,1fr)] items-center gap-x-3 gap-y-1 px-4 py-3 sm:flex sm:gap-x-4 sm:px-5"
            >
              <Icon
                className="size-4 shrink-0 text-[var(--analytics-teal)]"
                aria-hidden
              />
              <p className="min-w-0 text-sm text-foreground sm:flex-1">{i.text}</p>
              {i.action ? (
                <Link
                  href={i.action.href}
                  className="col-start-2 -ml-2.5 justify-self-start shrink-0 rounded-[8px] px-2.5 py-1.5 text-[13px] font-medium text-[var(--analytics-teal)] sm:ml-0 hover:bg-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                >
                  {i.action.label}
                </Link>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ----- weekly goal -----

export function WeeklyGoal({
  goal,
  onTarget,
}: {
  goal: GoalSummary;
  onTarget: (n: number) => void;
}) {
  const { target, thisWeek, run, weeks } = goal;
  const left = Math.max(0, target - thisWeek.activeDays);
  const met = weeks.filter((w) => w.met).length;
  return (
    <div data-testid="analytics-goal">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[15px] font-semibold text-foreground">
          Weekly goal
        </h3>
        <div
          className="flex items-center gap-1"
          role="group"
          aria-label="Days a week"
        >
          <button
            type="button"
            onClick={() => onTarget(target - 1)}
            disabled={target <= 1}
            aria-label="One day fewer"
            className="inline-flex size-7 items-center justify-center rounded-[8px] text-muted hover:bg-muted-bg hover:text-foreground disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            <Minus className="size-3.5" aria-hidden />
          </button>
          <output
            className="min-w-[96px] whitespace-nowrap px-1 text-center text-sm tabular-nums text-foreground"
            aria-live="polite"
          >
            {target} {target === 1 ? "day" : "days"} a week
          </output>
          <button
            type="button"
            onClick={() => onTarget(target + 1)}
            disabled={target >= 7}
            aria-label="One day more"
            className="inline-flex size-7 items-center justify-center rounded-[8px] text-muted hover:bg-muted-bg hover:text-foreground disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            <Plus className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>

      <p className="mt-3 text-sm text-foreground">
        {thisWeek.met ? (
          <>
            <span className="font-semibold">Goal met this week</span>,{" "}
            {plural(thisWeek.activeDays, "day")} so far.
          </>
        ) : (
          <>
            {plural(thisWeek.activeDays, "day")} this week.{" "}
            <span className="font-semibold">
              {left} more {left === 1 ? "day" : "days"}
            </span>{" "}
            to meet it.
          </>
        )}
      </p>
      <p className="mt-1 text-xs text-muted">
        {run >= 2 ? `Met ${run} weeks in a row. ` : ""}Met in {met} of the last{" "}
        {weeks.length} weeks. Your goal is kept in this browser.
      </p>

      <div className="relative mt-4">
        <div className={styles.weeks} aria-hidden>
          {weeks.map((w) => (
            <div
              key={w.start.toISOString()}
              className={styles.week}
              data-met={w.met}
              data-current={w.current}
            >
              {Array.from({ length: 7 }, (_, d) => (
                <span
                  key={d}
                  className={styles.weekDay}
                  data-on={d < w.activeDays}
                />
              ))}
              <span
                className={styles.goalLine}
                style={{ bottom: `calc(${(target / 7) * 100}% - 1px)` }}
              />
            </div>
          ))}
        </div>
        <div
          className="mt-1.5 flex justify-between text-[11px] text-muted"
          aria-hidden
        >
          <span>
            {weeks[0].start.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
          <span>This week</span>
        </div>
        <p className="sr-only">
          {weeks
            .map(
              (w) =>
                `Week of ${w.start.toLocaleDateString("en-US", { month: "long", day: "numeric" })}: ${w.activeDays} days${w.met ? ", goal met" : ""}.`,
            )
            .join(" ")}
        </p>
      </div>
    </div>
  );
}

// ----- one day -----

export function DayDetail({
  day,
  events,
  sessions,
  onClose,
}: {
  day: Date;
  events: ActivityEvent[];
  sessions: Map<string, LabSession>;
  onClose: () => void;
}) {
  const bySession = new Map<string, ActivityEvent[]>();
  const other: ActivityEvent[] = [];
  for (const e of events) {
    if (e.sessionId)
      bySession.set(e.sessionId, [...(bySession.get(e.sessionId) ?? []), e]);
    else other.push(e);
  }
  return (
    <div
      className="mt-4 rounded-[12px] border border-border bg-[var(--canvas)] p-4"
      data-testid="analytics-day"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-foreground">
            {longDate(day)}
          </h4>
          <p className="mt-0.5 text-[13px] text-muted">
            {events.length
              ? describeDay(events)
              : "Nothing recorded on this day."}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-[8px] px-2 py-1 text-[13px] text-muted hover:bg-muted-bg hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          Close
        </button>
      </div>
      {events.length ? (
        <ul className="mt-3 space-y-3">
          {[...bySession.entries()].map(([id, list]) => {
            const s = sessions.get(id);
            return (
              <li key={id}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {s?.name ?? "A lab session"}
                  </span>
                  {s ? (
                    <Link
                      href={labHref(id)}
                      className="text-[13px] font-medium text-[var(--analytics-teal)] hover:underline"
                    >
                      Open in the lab
                    </Link>
                  ) : null}
                </div>
                <ul className="mt-1 space-y-0.5 text-[13px] text-muted">
                  {list.slice(0, 6).map((e, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="w-12 shrink-0 tabular-nums">
                        {e.at.toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="min-w-0">{e.text}</span>
                    </li>
                  ))}
                  {list.length > 6 ? (
                    <li className="pl-14">and {list.length - 6} more</li>
                  ) : null}
                </ul>
              </li>
            );
          })}
          {other.map((e, i) => (
            <li key={`o${i}`} className="text-[13px] text-muted">
              {e.text}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

// ----- parts -----

export function PartsPanel({
  uses,
  sessions,
  untried,
  groupTitles,
  communityRank,
  partHref,
  selected,
  onSelect,
}: {
  uses: PartUse[];
  sessions: Map<string, LabSession>;
  untried: Map<PartGroupId, PartModel[]>;
  groupTitles: Record<PartGroupId, string>;
  /** Part ids the community uses most, best first, when known. */
  communityRank: string[];
  partHref: (id: string) => string;
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const top = uses.slice(0, 8);
  const groups: PartGroupId[] = [
    "sensors",
    "motors",
    "drivers",
    "power",
    "controls",
    "outputs",
    "displays",
    "radios",
    "boards",
    "prototyping",
  ];
  const suggestions = groups
    .map((g) => {
      const list = [...(untried.get(g) ?? [])];
      if (communityRank.length)
        list.sort(
          (a, b) =>
            rank(communityRank, a.id) - rank(communityRank, b.id) ||
            a.rank - b.rank,
        );
      return [g, list.slice(0, 4)] as const;
    })
    .filter(([, list]) => list.length > 0);

  return (
    <ChartFrame
      title="Parts you use"
      summary={
        top.length
          ? `${top[0].name} leads, in ${plural(top[0].sessions, "session")}. Pick a part to see where you used it.`
          : "Parts appear here once they're on a lab canvas."
      }
      table={{
        columns: ["Part", "Sessions", "Placed"],
        rows: uses.map((u) => [u.name, u.sessions, u.placed]),
      }}
    >
      {top.length ? (
        <BarList
          items={top.map((u) => ({
            key: u.partId,
            label: u.name,
            value: u.sessions,
            valueLabel: plural(u.sessions, "session"),
          }))}
          selected={selected}
          onSelect={onSelect}
          renderDetail={(id) => {
            const use = uses.find((u) => u.partId === id);
            if (!use) return null;
            return (
              <div className="space-y-1.5 text-[13px]">
                <p className="text-muted">
                  {plural(use.placed, "placed", "placed")} across these
                  sessions:
                </p>
                <ul className="flex flex-wrap gap-1.5">
                  {use.sessionIds.slice(0, 8).map((sid) => (
                    <li key={sid}>
                      <Link
                        href={labHref(sid)}
                        className="inline-flex rounded-[8px] border border-border bg-surface px-2 py-1 text-foreground hover:border-[var(--analytics-teal)]"
                      >
                        {sessions.get(sid)?.name ?? "Lab session"}
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  href={partHref(id)}
                  className="inline-block font-medium text-[var(--analytics-teal)] hover:underline"
                >
                  Open the {use.name} in the parts library
                </Link>
              </div>
            );
          }}
        />
      ) : (
        <Empty
          text="Place a part on the lab canvas and it shows up here."
          action={{ label: "Open the lab", href: "/laboratory/workspace" }}
        />
      )}

      {suggestions.length ? (
        <div className="mt-5 border-t border-border pt-4">
          <h4 className="text-[13px] font-semibold text-foreground">
            Parts to try next
          </h4>
          <p className="mt-0.5 text-xs text-muted">
            {communityRank.length
              ? "Ordered by what the community uses most."
              : "The most common part of each kind first."}
          </p>
          <div className="mt-3 space-y-2.5">
            {suggestions.slice(0, 4).map(([g, list]) => (
              <div
                key={g}
                className="grid grid-cols-[88px_1fr] items-baseline gap-2"
              >
                <span className="text-xs text-muted">
                  {groupTitles[g].replace(
                    "Breadboards and resistors",
                    "Prototyping",
                  )}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {list.slice(0, 2).map((p) => (
                    <Link
                      key={p.id}
                      href={partHref(p.id)}
                      className="rounded-full border border-border bg-surface px-2.5 py-1 text-[13px] text-foreground transition-colors hover:border-[var(--analytics-teal)] hover:text-[var(--analytics-teal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                    >
                      {p.name}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </ChartFrame>
  );
}

function rank(list: string[], id: string): number {
  const i = list.indexOf(id);
  return i === -1 ? 999 : i;
}

// ----- how they build -----

const MODES: Array<{
  key: keyof ModeMix;
  label: string;
  color: string;
  hint: string;
}> = [
  {
    key: "virtual",
    label: "Virtual",
    color: "var(--analytics-teal)",
    hint: "simulated",
  },
  {
    key: "hybrid",
    label: "Hybrid",
    color: "var(--analytics-amber)",
    hint: "real board, virtual parts",
  },
  {
    key: "physical",
    label: "Physical",
    color: "var(--analytics-navy)",
    hint: "real parts",
  },
];

export function BuildPanel({ mix, debug }: { mix: ModeMix; debug: Debugging }) {
  const total = mix.virtual + mix.physical + mix.hybrid;
  const fixedShare = debug.faults
    ? Math.min(100, Math.round((debug.fixes / debug.faults) * 100))
    : 0;
  return (
    <div className="space-y-6">
      <ChartFrame
        title="How you build"
        summary={
          total
            ? `${Math.round((mix.virtual / total) * 100)}% of the parts you placed were virtual${mix.hybrid ? `, and ${plural(mix.hybrid, "part")} ran in Hybrid mode` : ""}.`
            : "Virtual, Hybrid and Physical parts will show here."
        }
        table={
          total
            ? {
                columns: ["Mode", "Parts", "Share"],
                rows: MODES.map((m) => [
                  m.label,
                  mix[m.key],
                  `${Math.round((mix[m.key] / total) * 100)}%`,
                ]),
              }
            : undefined
        }
      >
        {total ? (
          <>
            <div
              className="flex h-3 w-full overflow-hidden rounded-full bg-muted-bg"
              aria-hidden
            >
              {MODES.map((m) =>
                mix[m.key] ? (
                  <span
                    key={m.key}
                    style={{
                      width: `${(mix[m.key] / total) * 100}%`,
                      background: m.color,
                    }}
                  />
                ) : null,
              )}
            </div>
            <ul className="mt-3 grid grid-cols-3 gap-2 text-[13px]">
              {MODES.map((m) => (
                <li key={m.key}>
                  <span className="flex items-center gap-1.5 text-foreground">
                    <span
                      className="size-2 rounded-full"
                      style={{ background: m.color }}
                      aria-hidden
                    />
                    {m.label}
                  </span>
                  <span className="block tabular-nums text-muted">
                    {formatCount(mix[m.key])}
                  </span>
                  <span className="block text-[11px] text-muted">{m.hint}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <Empty text="No parts placed in this range." />
        )}
      </ChartFrame>

      <ChartFrame
        title="Runs and fixes"
        summary={
          debug.faults
            ? `You met ${plural(debug.faults, "fault")} and fixed ${debug.fixes}.`
            : debug.runs
              ? `${plural(debug.runs, "run")} and no faults.`
              : "Runs, faults and fixes from your lab sessions."
        }
      >
        <dl className="grid grid-cols-3 gap-3">
          {[
            ["Runs", formatCount(debug.runs)],
            ["Faults met", formatCount(debug.faults)],
            ["Fixed", formatCount(debug.fixes)],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-[13px] text-muted">{k}</dt>
              <dd className="text-xl font-semibold tabular-nums text-foreground">
                {v}
              </dd>
            </div>
          ))}
        </dl>
        {debug.faults ? (
          <div className="mt-3">
            <span
              className="block h-2 w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--danger)_16%,var(--surface))]"
              aria-hidden
            >
              <span
                className="block h-full rounded-full bg-[var(--success)]"
                style={{ width: `${fixedShare}%` }}
              />
            </span>
            {debug.common.length ? (
              <div className="mt-3">
                <p className="text-[13px] font-medium text-foreground">
                  Faults you met most
                </p>
                <ul className="mt-1 space-y-1 text-[13px] text-muted">
                  {debug.common.map((c) => (
                    <li key={c.text} className="flex justify-between gap-3">
                      <span className="min-w-0">{c.text}</span>
                      <span className="shrink-0 tabular-nums">{c.count}×</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
        <p className="mt-3 text-xs text-muted">
          {formatDuration(debug.runMs)} simulated, {plural(debug.wires, "wire")}{" "}
          across these sessions.
        </p>
      </ChartFrame>
    </div>
  );
}

// ----- learning -----

export function LearningPanel({
  summary,
  topicLabels,
  nextHref,
}: {
  summary: LearningSummary<{
    slug: string;
    title: string;
    minutes: number;
    order: number;
    topic: string;
  }>;
  topicLabels: Record<string, string>;
  nextHref: string | null;
}) {
  return (
    <ChartFrame
      title="Learning path"
      summary={
        summary.done === summary.total
          ? `You've finished all ${summary.total} modules.`
          : `${summary.done} of ${summary.total} modules done, about ${formatDuration(summary.minutesLeft * 60_000)} to go.`
      }
      table={{
        columns: ["Topic", "Done", "Modules"],
        rows: summary.topics.map((t) => [
          topicLabels[t.topic] ?? t.topic,
          t.done,
          t.total,
        ]),
      }}
    >
      <ul className="space-y-3">
        {summary.topics.map((t) => (
          <li key={t.topic}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-foreground">
                {topicLabels[t.topic] ?? t.topic}
              </span>
              <span className="tabular-nums text-[13px] text-muted">
                {t.done} of {t.total}
              </span>
            </div>
            <div className="mt-1.5 flex gap-1" aria-hidden>
              {Array.from({ length: t.total }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-2 flex-1 rounded-full",
                    i < t.done ? "bg-[var(--analytics-teal)]" : "bg-muted-bg",
                  )}
                />
              ))}
            </div>
          </li>
        ))}
      </ul>
      {summary.next && nextHref ? (
        <Link
          href={nextHref}
          className="mt-5 flex items-center justify-between gap-3 rounded-[12px] border border-border bg-[var(--canvas)] px-4 py-3 transition-colors hover:border-[var(--analytics-teal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          <span className="min-w-0">
            <span className="block text-xs text-muted">Next module</span>
            <span className="block truncate text-sm font-medium text-foreground">
              {summary.next.title}
            </span>
          </span>
          <span className="shrink-0 text-[13px] text-muted">
            {summary.next.minutes} min
          </span>
        </Link>
      ) : null}
    </ChartFrame>
  );
}

// ----- projects -----

const CATEGORY_LABELS: Record<string, string> = {
  robotics: "Robotics",
  embedded: "Embedded",
  autonomy: "Autonomy",
  iot: "IoT",
  other: "Other",
};
const STEP_LABELS: Record<RecordStep, string> = {
  objective: "Objective",
  procedure: "Procedure",
  observations: "Observations",
  results: "Results",
};

export function ProjectsPanel({
  summary,
  signedIn,
  onSignIn,
}: {
  summary: ProjectsSummary | null;
  signedIn: boolean;
  onSignIn: () => void;
}) {
  // Signed out, the projects made in this tab are charted. With none, the ways to some are offered:
  // make one (no account needed), or sign in for the account's.
  if (!summary) {
    return (
      <ChartFrame
        title="Projects and records"
        summary={
          signedIn
            ? "Projects and experiment records are kept in your account."
            : "Your projects by category, and which experiment records still need a step."
        }
      >
        <Empty
          text={
            signedIn
              ? "Loading your projects."
              : "No projects yet. Make one and it is counted here; sign in to add the ones saved to your account."
          }
          action={
            signedIn ? undefined : { label: "Create a project", href: "/workspace?new=1" }
          }
          button={
            signedIn ? undefined : { label: "Sign in", onClick: onSignIn }
          }
        />
      </ChartFrame>
    );
  }
  const total = summary.byCategory.reduce((s, c) => s + c.count, 0);
  const recent = summary.incomplete.slice(0, 4);
  return (
    <ChartFrame
      title="Projects and records"
      summary={
        total
          ? `${plural(total, "project")}${summary.withTeammates ? `, ${summary.withTeammates} with teammates` : ""}. ${summary.records ? `${summary.complete} of ${plural(summary.records, "experiment record")} have every step.` : "No experiment records yet."}`
          : "No projects in this range."
      }
      table={
        total
          ? {
              columns: ["Category", "Projects"],
              rows: summary.byCategory.map((c) => [
                CATEGORY_LABELS[c.category] ?? c.category,
                c.count,
              ]),
            }
          : undefined
      }
    >
      {total ? (
        <BarList
          tone="navy"
          items={summary.byCategory.map((c) => ({
            key: c.category,
            label: CATEGORY_LABELS[c.category] ?? c.category,
            value: c.count,
            valueLabel: plural(c.count, "project"),
          }))}
        />
      ) : (
        <Empty
          text="Projects collect your lab sessions and experiment records."
          action={{ label: "Create a project", href: "/projects" }}
        />
      )}
      {recent.length ? (
        <div className="mt-5 border-t border-border pt-4">
          <h4 className="text-[13px] font-semibold text-foreground">
            Records to finish
          </h4>
          <ul className="mt-2 space-y-2">
            {recent.map(({ record }) => {
              const steps = recordSteps(record);
              return (
                <li key={record.id}>
                  <Link
                    href={`/experiments?project=${encodeURIComponent(record.projectId)}&record=${encodeURIComponent(record.id)}`}
                    className="block rounded-[10px] px-3 py-2 hover:bg-muted-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                    aria-label={`${record.title}: ${RECORD_STEPS.filter(
                      (s) => !steps[s],
                    )
                      .map((s) => STEP_LABELS[s].toLowerCase())
                      .join(" and ")} missing`}
                  >
                    <span className="block truncate text-sm text-foreground">
                      {record.title}
                    </span>
                    <span className="mt-1.5 grid grid-cols-4 gap-1" aria-hidden>
                      {RECORD_STEPS.map((s) => (
                        <span key={s} className="block">
                          <span
                            className={cn(
                              "block h-1.5 rounded-full",
                              steps[s]
                                ? "bg-[var(--analytics-navy)]"
                                : "bg-muted-bg",
                            )}
                          />
                          <span
                            className={cn(
                              "mt-1 block text-[11px]",
                              steps[s] ? "text-muted" : "text-foreground",
                            )}
                          >
                            {STEP_LABELS[s]}
                          </span>
                        </span>
                      ))}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </ChartFrame>
  );
}

// ----- shared -----

export function Empty({
  text,
  action,
  button,
}: {
  text: string;
  action?: { label: string; href: string };
  button?: { label: string; onClick: () => void };
}) {
  return (
    <div className="rounded-[12px] border border-dashed border-border px-4 py-5 text-sm text-muted">
      <p>{text}</p>
      {action ? (
        <Link
          href={action.href}
          className="mr-4 mt-2 inline-block font-medium text-[var(--analytics-teal)] hover:underline"
        >
          {action.label}
        </Link>
      ) : null}
      {button ? (
        <button
          type="button"
          onClick={button.onClick}
          className="mt-2 inline-block font-medium text-[var(--analytics-teal)] hover:underline"
        >
          {button.label}
        </button>
      ) : null}
    </div>
  );
}

export function Section({
  id,
  title,
  description,
  children,
  aside,
}: {
  id: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id={`${id}-title`}
            className="text-lg font-semibold tracking-[-0.01em] text-foreground"
          >
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 max-w-prose text-sm text-muted">
              {description}
            </p>
          ) : null}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}
