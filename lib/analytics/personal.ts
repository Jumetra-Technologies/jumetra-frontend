/**
 * The signed-in person's analytics, computed from what Kiungo already keeps:
 * lab sessions (parts, wires, the activity log, run time), projects,
 * experiment records and Learning Center progress. Pure functions, so every
 * figure on the Advanced Analytics page is tested apart from the UI.
 *
 * The design follows the research brief (project doc
 * claude/advanced-analytics-research.md): people are compared with their own
 * past and the goal they set, never with other people; every insight has an
 * action; a day is a local calendar day.
 */

import type { LabSession, LogKind } from "@kiungo/core/lab/types";
import type { PartGroupId, PartModel } from "@kiungo/core/parts/types";

import type { ExperimentRecord, ProjectCategory, RoboticsProject } from "@/lib/robotics-data";

export type RangeId = "30d" | "90d" | "12m" | "all";

export const RANGES: Array<{ id: RangeId; label: string; days: number | null }> = [
  { id: "30d", label: "30 days", days: 30 },
  { id: "90d", label: "90 days", days: 90 },
  { id: "12m", label: "12 months", days: 365 },
  { id: "all", label: "All time", days: null },
];

const DAY = 86_400_000;

export interface Period {
  from: Date | null;
  to: Date;
  /** The period of the same length just before, for "up from" comparisons. */
  previous: { from: Date; to: Date } | null;
}

export function periodFor(range: RangeId, now: Date): Period {
  const days = RANGES.find((r) => r.id === range)?.days ?? null;
  if (days === null) return { from: null, to: now, previous: null };
  const from = startOfDay(new Date(now.getTime() - (days - 1) * DAY));
  const previousFrom = new Date(from.getTime() - days * DAY);
  return { from, to: now, previous: { from: previousFrom, to: new Date(from.getTime() - 1) } };
}

// ----- days -----

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** A local calendar day as YYYY-MM-DD. */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parse(iso: string | undefined | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function within(d: Date, from: Date | null, to: Date): boolean {
  return (from === null || d >= from) && d <= to;
}

// ----- events -----

export type EventKind = LogKind | "project" | "experiment";

export interface ActivityEvent {
  at: Date;
  kind: EventKind;
  text: string;
  sessionId?: string;
  projectId?: string;
}

/** Kinds that count as doing lab work for the calendar and the weekly goal. */
const WORK: ReadonlySet<EventKind> = new Set<EventKind>(["build", "wire", "run", "state", "fault", "fix", "session", "project", "experiment", "note"]);

export function collectEvents(input: { sessions: LabSession[]; projects: RoboticsProject[]; experiments: ExperimentRecord[] }): ActivityEvent[] {
  const events: ActivityEvent[] = [];
  for (const s of input.sessions) {
    const logged = Array.isArray(s.log) ? s.log : [];
    for (const entry of logged) {
      const at = parse(entry.at);
      if (at) events.push({ at, kind: entry.kind, text: entry.text, sessionId: s.id, projectId: s.projectId ?? undefined });
    }
    // A session saved without a log still counts as work on the day it was made.
    if (logged.length === 0) {
      const at = parse(s.createdAt);
      if (at) events.push({ at, kind: "session", text: `Started ${s.name}`, sessionId: s.id, projectId: s.projectId ?? undefined });
    }
  }
  for (const p of input.projects) {
    const at = parse(p.createdAt);
    if (at) events.push({ at, kind: "project", text: `Created the project ${p.name}`, projectId: p.id });
  }
  for (const e of input.experiments) {
    const at = parse(e.createdAt);
    if (at) events.push({ at, kind: "experiment", text: `Recorded ${e.title}`, projectId: e.projectId });
  }
  return events.sort((a, b) => a.at.getTime() - b.at.getTime());
}

// ----- the calendar and the weekly goal -----

export interface CalendarDay {
  key: string;
  date: Date;
  count: number;
  /** 0 to 4: how brightly the day's hole lights up. */
  level: 0 | 1 | 2 | 3 | 4;
  inRange: boolean;
}

/**
 * Weeks of days (Monday first), ending this week, covering the period
 * (at most 53 weeks; "All time" shows the last 53). Levels are relative to
 * the person's own busiest day, so a quiet month still shows its shape.
 */
export function calendar(events: ActivityEvent[], period: Period, now: Date): CalendarDay[][] {
  const counts = new Map<string, number>();
  for (const e of events) {
    if (!WORK.has(e.kind)) continue;
    const k = dayKey(e.at);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const today = startOfDay(now);
  const mondayOffset = (today.getDay() + 6) % 7;
  const thisMonday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - mondayOffset);
  const spanDays = period.from ? Math.round((today.getTime() - startOfDay(period.from).getTime()) / DAY) + 1 : 371;
  const weeks = Math.min(53, Math.max(5, Math.ceil((spanDays + mondayOffset) / 7)));
  const first = new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() - (weeks - 1) * 7);

  const days: CalendarDay[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const date = new Date(first.getFullYear(), first.getMonth(), first.getDate() + i);
    const key = dayKey(date);
    days.push({ key, date, count: counts.get(key) ?? 0, level: 0, inRange: date <= today && within(date, period.from ? startOfDay(period.from) : null, now) });
  }
  const max = Math.max(0, ...days.filter((d) => d.inRange).map((d) => d.count));
  for (const d of days) {
    if (!d.inRange || d.count === 0 || max === 0) continue;
    const ratio = d.count / max;
    d.level = ratio > 0.75 ? 4 : ratio > 0.5 ? 3 : ratio > 0.25 ? 2 : 1;
  }
  const out: CalendarDay[][] = [];
  for (let w = 0; w < weeks; w++) out.push(days.slice(w * 7, w * 7 + 7));
  return out;
}

export interface GoalWeek {
  /** Monday of the week. */
  start: Date;
  activeDays: number;
  met: boolean;
  current: boolean;
}

export interface GoalSummary {
  target: number;
  weeks: GoalWeek[];
  /** Weeks in a row the goal was met, counting back from last week; this week joins once it's met. */
  run: number;
  thisWeek: GoalWeek;
}

/** The last `count` weeks against a goal of `target` active days a week. */
export function weeklyGoal(events: ActivityEvent[], target: number, now: Date, count = 12): GoalSummary {
  const activeDays = new Set(events.filter((e) => WORK.has(e.kind)).map((e) => dayKey(e.at)));
  const today = startOfDay(now);
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7));
  const weeks: GoalWeek[] = [];
  for (let w = count - 1; w >= 0; w--) {
    const start = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - w * 7);
    let active = 0;
    for (let d = 0; d < 7; d++) {
      const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + d);
      if (day > today) break;
      if (activeDays.has(dayKey(day))) active++;
    }
    weeks.push({ start, activeDays: active, met: active >= target, current: w === 0 });
  }
  const thisWeek = weeks[weeks.length - 1];
  let run = thisWeek.met ? 1 : 0;
  for (let i = weeks.length - 2; i >= 0 && weeks[i].met; i--) run++;
  return { target, weeks, run, thisWeek };
}

// ----- headline -----

export interface Headline {
  id: "projects" | "sessions" | "runs" | "parts" | "modules";
  label: string;
  value: number;
  /** Out of how many, when it's a share (parts in the catalog, modules in the path). */
  of?: number;
  /** The same figure for the previous period, when the range has one. */
  previous?: number;
  /** Weekly values across the period, for the small trend line. */
  trend: number[];
}

function activeSessions(sessions: LabSession[], from: Date | null, to: Date): LabSession[] {
  return sessions.filter((s) => {
    const times = [parse(s.createdAt), parse(s.updatedAt), ...(s.log ?? []).map((e) => parse(e.at))].filter((d): d is Date => d !== null);
    return times.some((d) => within(d, from, to));
  });
}

function weeklyTrend(dates: Date[], period: Period, now: Date): number[] {
  const start = period.from ?? (dates.length ? startOfDay(dates[0]) : startOfDay(now));
  const weeks = Math.max(2, Math.min(53, Math.ceil((now.getTime() - start.getTime() + 1) / (7 * DAY))));
  const out = new Array<number>(weeks).fill(0);
  for (const d of dates) {
    if (!within(d, start, now)) continue;
    const i = Math.min(weeks - 1, Math.floor((d.getTime() - start.getTime()) / (7 * DAY)));
    out[i]++;
  }
  return out;
}

function partsIn(sessions: LabSession[]): Set<string> {
  return new Set(sessions.flatMap((s) => (s.nodes ?? []).map((n) => n.partId)));
}

export function headline(input: {
  sessions: LabSession[];
  projects: RoboticsProject[];
  events: ActivityEvent[];
  completed: Set<string>;
  moduleCount: number;
  catalogSize: number;
  period: Period;
  now: Date;
}): Headline[] {
  const { sessions, projects, events, period, now } = input;
  const prev = period.previous;
  const projectDates = projects.map((p) => parse(p.createdAt)).filter((d): d is Date => d !== null);
  const countIn = (dates: Date[], from: Date | null, to: Date) => dates.filter((d) => within(d, from, to)).length;
  const runDates = events.filter((e) => e.kind === "run").map((e) => e.at);
  const sessionStarts = sessions.map((s) => parse(s.createdAt)).filter((d): d is Date => d !== null);
  const current = activeSessions(sessions, period.from, now);

  return [
    {
      id: "projects",
      label: "Projects",
      value: countIn(projectDates, period.from, now),
      previous: prev ? countIn(projectDates, prev.from, prev.to) : undefined,
      trend: weeklyTrend(projectDates, period, now),
    },
    {
      id: "sessions",
      label: "Lab sessions",
      value: current.length,
      previous: prev ? activeSessions(sessions, prev.from, prev.to).length : undefined,
      trend: weeklyTrend(sessionStarts, period, now),
    },
    {
      id: "runs",
      label: "Runs",
      value: countIn(runDates, period.from, now),
      previous: prev ? countIn(runDates, prev.from, prev.to) : undefined,
      trend: weeklyTrend(runDates, period, now),
    },
    {
      id: "parts",
      label: "Parts explored",
      value: partsIn(current).size,
      of: input.catalogSize,
      previous: prev ? partsIn(activeSessions(sessions, prev.from, prev.to)).size : undefined,
      trend: [],
    },
    {
      id: "modules",
      label: "Modules completed",
      value: input.completed.size,
      of: input.moduleCount,
      trend: [],
    },
  ];
}

// ----- parts -----

export interface PartUse {
  partId: string;
  name: string;
  group: PartGroupId | "unknown";
  /** Lab sessions in the period that use it. */
  sessions: number;
  /** Parts of this kind placed across those sessions. */
  placed: number;
  sessionIds: string[];
}

export function partUsage(sessions: LabSession[], catalog: PartModel[], period: Period, now: Date): PartUse[] {
  const byId = new Map(catalog.map((p) => [p.id, p]));
  const uses = new Map<string, PartUse>();
  for (const s of activeSessions(sessions, period.from, now)) {
    const seen = new Set<string>();
    for (const n of s.nodes ?? []) {
      const model = byId.get(n.partId);
      const use = uses.get(n.partId) ?? { partId: n.partId, name: model?.name ?? n.partId, group: model?.group ?? "unknown", sessions: 0, placed: 0, sessionIds: [] };
      use.placed++;
      if (!seen.has(n.partId)) {
        seen.add(n.partId);
        use.sessions++;
        use.sessionIds.push(s.id);
      }
      uses.set(n.partId, use);
    }
  }
  return [...uses.values()].sort((a, b) => b.sessions - a.sessions || b.placed - a.placed || a.name.localeCompare(b.name));
}

/** Catalog parts never used in any session, by group, most common first. */
export function untriedParts(sessions: LabSession[], catalog: PartModel[]): Map<PartGroupId, PartModel[]> {
  const used = partsIn(sessions);
  const out = new Map<PartGroupId, PartModel[]>();
  for (const p of catalog) {
    if (used.has(p.id)) continue;
    const list = out.get(p.group) ?? [];
    list.push(p);
    out.set(p.group, list);
  }
  for (const list of out.values()) list.sort((a, b) => a.rank - b.rank);
  return out;
}

// ----- how they build, and debugging -----

export interface ModeMix {
  virtual: number;
  physical: number;
  hybrid: number;
}

export function modeMix(sessions: LabSession[], period: Period, now: Date): ModeMix {
  const mix: ModeMix = { virtual: 0, physical: 0, hybrid: 0 };
  for (const s of activeSessions(sessions, period.from, now)) for (const n of s.nodes ?? []) if (n.mode in mix) mix[n.mode]++;
  return mix;
}

export interface Debugging {
  runs: number;
  faults: number;
  fixes: number;
  /** The fault messages met most often, without their part labels' numbers. */
  common: Array<{ text: string; count: number }>;
  /** Simulated time across sessions active in the period (each session's total). */
  runMs: number;
  wires: number;
}

/** "LED1 has no resistor" and "LED2 has no resistor" are the same fault. */
export function faultKey(text: string): string {
  // Only a whole word that is letters then a number (LED1, Servo2): part names like HC-SR04 or ESP32-C3 stay.
  return text.replace(/(^|\s)([A-Za-z]+)\d{1,3}(?=[\s.,:;]|$)/g, "$1$2").replace(/\s+/g, " ").trim();
}

export function debugging(sessions: LabSession[], events: ActivityEvent[], period: Period, now: Date): Debugging {
  const inRange = events.filter((e) => within(e.at, period.from, now));
  const faultTexts = new Map<string, number>();
  for (const e of inRange) if (e.kind === "fault") faultTexts.set(faultKey(e.text), (faultTexts.get(faultKey(e.text)) ?? 0) + 1);
  const active = activeSessions(sessions, period.from, now);
  return {
    runs: inRange.filter((e) => e.kind === "run").length,
    faults: inRange.filter((e) => e.kind === "fault").length,
    fixes: inRange.filter((e) => e.kind === "fix").length,
    common: [...faultTexts.entries()].map(([text, count]) => ({ text, count })).sort((a, b) => b.count - a.count || a.text.localeCompare(b.text)).slice(0, 3),
    runMs: active.reduce((sum, s) => sum + (Number.isFinite(s.runMs) && s.runMs > 0 ? s.runMs : 0), 0),
    wires: active.reduce((sum, s) => sum + (s.wires?.length ?? 0), 0),
  };
}

// ----- learning -----

export interface TopicProgress<T extends string = string> {
  topic: T;
  done: number;
  total: number;
}

export interface LearningSummary<M> {
  topics: TopicProgress[];
  next: M | null;
  done: number;
  total: number;
  /** Minutes left in the path. */
  minutesLeft: number;
}

export function learning<M extends { slug: string; order: number; topic: string; minutes: number }>(modules: M[], completed: Set<string>, topicOrder: string[]): LearningSummary<M> {
  const ordered = [...modules].sort((a, b) => a.order - b.order);
  const topics = topicOrder
    .map((topic) => {
      const inTopic = ordered.filter((m) => m.topic === topic);
      return { topic, done: inTopic.filter((m) => completed.has(m.slug)).length, total: inTopic.length };
    })
    .filter((t) => t.total > 0);
  const next = ordered.find((m) => !completed.has(m.slug)) ?? null;
  return {
    topics,
    next,
    done: ordered.filter((m) => completed.has(m.slug)).length,
    total: ordered.length,
    minutesLeft: ordered.filter((m) => !completed.has(m.slug)).reduce((sum, m) => sum + m.minutes, 0),
  };
}

// ----- projects and records -----

export const RECORD_STEPS = ["objective", "procedure", "observations", "results"] as const;
export type RecordStep = (typeof RECORD_STEPS)[number];

export function recordSteps(record: ExperimentRecord): Record<RecordStep, boolean> {
  return Object.fromEntries(RECORD_STEPS.map((k) => [k, Boolean(record[k]?.trim())])) as Record<RecordStep, boolean>;
}

export interface ProjectsSummary {
  byCategory: Array<{ category: ProjectCategory; count: number }>;
  records: number;
  complete: number;
  /** Records missing a step, most recent first. */
  incomplete: Array<{ record: ExperimentRecord; missing: RecordStep[] }>;
  withTeammates: number;
}

export function projectsSummary(projects: RoboticsProject[], experiments: ExperimentRecord[], period: Period, now: Date): ProjectsSummary {
  const inRange = projects.filter((p) => {
    const d = parse(p.createdAt);
    return d ? within(d, period.from, now) : period.from === null;
  });
  const counts = new Map<ProjectCategory, number>();
  for (const p of inRange) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
  const records = experiments.filter((e) => {
    const d = parse(e.createdAt);
    return d ? within(d, period.from, now) : period.from === null;
  });
  const incomplete = records
    .map((record) => ({ record, missing: RECORD_STEPS.filter((s) => !recordSteps(record)[s]) }))
    .filter((r) => r.missing.length > 0)
    .sort((a, b) => b.record.updatedAt.localeCompare(a.record.updatedAt));
  return {
    byCategory: [...counts.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count),
    records: records.length,
    complete: records.length - incomplete.length,
    incomplete,
    withTeammates: inRange.filter((p) => (p.teammates?.length ?? 0) > 0).length,
  };
}

// ----- insights -----

export interface Insight {
  id: string;
  text: string;
  action?: { label: string; href: string };
}

const WEEKDAYS = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];

/**
 * Up to four sentences, each a real finding with something to do about it.
 * A sentence only appears when the data supports it: no finding, no sentence.
 */
export function insights(input: {
  parts: PartUse[];
  sessionsInRange: number;
  debug: Debugging;
  records: ProjectsSummary;
  next: { title: string; minutes: number; href: string } | null;
  untried: Map<PartGroupId, PartModel[]>;
  groupTitles: Record<PartGroupId, string>;
  events: ActivityEvent[];
  period: Period;
  now: Date;
  /** Most-used parts across the community, best first, when known. */
  communityParts?: string[];
  partHref: (id: string) => string;
}): Insight[] {
  const out: Insight[] = [];
  const { parts, sessionsInRange, debug, records, period, now } = input;

  const top = parts[0];
  if (top && sessionsInRange >= 2 && top.sessions >= 2 && top.sessions / sessionsInRange >= 0.4) {
    out.push({
      id: "favorite-part",
      text: `The ${top.name} is in ${top.sessions} of your ${sessionsInRange} lab sessions.`,
      action: { label: `See the ${top.name}`, href: input.partHref(top.partId) },
    });
  }

  if (records.incomplete.length > 0) {
    const first = records.incomplete[0];
    const n = records.incomplete.length;
    out.push({
      id: "incomplete-records",
      text: n === 1 ? `Your record "${first.record.title}" has no ${first.missing[0]} yet.` : `${n} experiment records are missing a step, like ${first.missing[0]}.`,
      action: { label: "Finish the record", href: `/experiments?project=${encodeURIComponent(first.record.projectId)}&record=${encodeURIComponent(first.record.id)}` },
    });
  }

  if (debug.faults >= 3) {
    out.push({
      id: "fix-rate",
      text: debug.fixes >= debug.faults ? `You fixed every one of the ${debug.faults} faults you met.` : `You fixed ${debug.fixes} of the ${debug.faults} faults you met.${debug.common[0] ? ` The most common: ${debug.common[0].text.replace(/\.$/, "")}.` : ""}`,
      action: debug.fixes < debug.faults ? { label: "Read about common faults", href: "/docs" } : undefined,
    });
  }

  // Consistency against their own past, not against anyone else.
  if (period.previous) {
    const days = (from: Date, to: Date) => new Set(input.events.filter((e) => WORK.has(e.kind) && within(e.at, from, to)).map((e) => dayKey(e.at))).size;
    const nowDays = days(period.from!, now);
    const before = days(period.previous.from, period.previous.to);
    if (nowDays >= 3 && before >= 1 && nowDays >= before * 1.5) {
      out.push({ id: "more-active", text: `You worked on ${nowDays} days in this period, up from ${before} the period before.` });
    }
  }

  // An untried kind of part, picking what the community reaches for first when we know it.
  const groups: PartGroupId[] = ["sensors", "outputs", "displays", "radios"];
  for (const group of groups) {
    const list = input.untried.get(group);
    if (!list || list.length === 0) continue;
    const usedAny = parts.some((p) => p.group === group);
    if (usedAny) continue;
    const pick = input.communityParts?.map((id) => list.find((p) => p.id === id)).find(Boolean) ?? list[0];
    out.push({
      id: `try-${group}`,
      text: `You haven't used any ${input.groupTitles[group].toLowerCase()} yet. A good first one: ${pick.name}.`,
      action: { label: `Open ${pick.name}`, href: input.partHref(pick.id) },
    });
    break;
  }

  if (input.next) {
    out.push({
      id: "next-module",
      text: `Next in the learning path: ${input.next.title}, about ${input.next.minutes} minutes.`,
      action: { label: "Start the module", href: input.next.href },
    });
  }

  // When most work lands on one weekday, say so (useful for planning a weekly goal).
  const work = input.events.filter((e) => WORK.has(e.kind) && within(e.at, period.from, now));
  if (work.length >= 12) {
    const byDay = new Array<number>(7).fill(0);
    for (const e of work) byDay[e.at.getDay()]++;
    const best = byDay.indexOf(Math.max(...byDay));
    if (byDay[best] / work.length >= 0.35) out.push({ id: "weekday", text: `Most of your lab work happens on ${WEEKDAYS[best]}.` });
  }

  return out.slice(0, 4);
}
