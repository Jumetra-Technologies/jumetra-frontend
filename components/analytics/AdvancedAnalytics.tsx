"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { PARTS, PART_GROUPS } from "@kiungo/core/parts";
import type { PartGroupId } from "@kiungo/core/parts/types";
import { useLab } from "@kiungo/lab/store";
import { SegmentedControl } from "@kiungo/ui/segmented-control";
import { useLearningProgress } from "@/components/learning/useLearningProgress";
import { openAuth } from "@/lib/account-dialogs";
import { loadCommunityStats, type CommunityState } from "@/lib/analytics/community";
import {
  RANGES,
  calendar,
  collectEvents,
  dayKey,
  debugging,
  headline,
  insights,
  learning,
  modeMix,
  partUsage,
  periodFor,
  projectsSummary,
  untriedParts,
  weeklyGoal,
  type ActivityEvent,
  type RangeId,
} from "@/lib/analytics/personal";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { MODULES, moduleHref } from "@/lib/learning";
import { TOPIC_LABELS, TOPIC_ORDER } from "@/lib/learning/categories";
import type { ExperimentRecord, RoboticsProject } from "@/lib/robotics-data";

import styles from "./analytics.module.css";
import { BreadboardCalendar } from "./BreadboardCalendar";
import { CommunitySection } from "./CommunitySection";
import { BuildPanel, DayDetail, HeadlineStrip, InsightList, LearningPanel, PartsPanel, ProjectsPanel, Section, WeeklyGoal } from "./PersonalSections";

const RANGE_KEY = "kiungo.analytics.range";
const GOAL_KEY = "kiungo.analytics.goal";

function readLocal(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
const CHOICE_EVENT = "kiungo-analytics-choice";
function writeLocal(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private windows and blocked storage: the choice just isn't remembered.
  }
  window.dispatchEvent(new Event(CHOICE_EVENT));
}
function subscribeChoices(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHOICE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHOICE_EVENT, onChange);
  };
}
/** A choice kept in this browser; the server render, and a browser that can't store it, get the default. */
function useStoredChoice(key: string): string | null {
  return useSyncExternalStore(subscribeChoices, () => readLocal(key), () => null);
}

const partHref = (id: string) => `/components?part=${encodeURIComponent(id)}`;
const GROUP_TITLES = Object.fromEntries(PART_GROUPS.map((g) => [g.id, g.title])) as Record<PartGroupId, string>;

type AccountData = { status: "idle" | "loading" | "ready" | "error"; projects: RoboticsProject[]; experiments: ExperimentRecord[] };
const NO_ACCOUNT: AccountData = { status: "idle", projects: [], experiments: [] };
const LOADING_ACCOUNT: AccountData = { status: "loading", projects: [], experiments: [] };

/** Projects, then each project's records, a few at a time. */
async function loadAccount(): Promise<{ projects: RoboticsProject[]; experiments: ExperimentRecord[] }> {
  const projects = await api.getMyProjects();
  const experiments: ExperimentRecord[] = [];
  const queue = [...projects].slice(0, 60);
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      for (let p = queue.shift(); p; p = queue.shift()) {
        try {
          experiments.push(...(await api.getMyProjectExperiments(p.id)));
        } catch {
          // One project's records failing shouldn't hide the rest.
        }
      }
    }),
  );
  return { projects, experiments };
}

export function AdvancedAnalytics({ now: fixedNow }: { now?: Date } = {}) {
  const [now] = useState(() => fixedNow ?? new Date());
  const storedRange = useStoredChoice(RANGE_KEY);
  const range: RangeId = RANGES.some((x) => x.id === storedRange) ? (storedRange as RangeId) : "90d";
  const storedGoal = Number(useStoredChoice(GOAL_KEY));
  const target = storedGoal >= 1 && storedGoal <= 7 ? storedGoal : 3;
  const [day, setDay] = useState<string | null>(null);
  const [part, setPart] = useState<string | null>(null);
  const [community, setCommunity] = useState<CommunityState>({ status: "loading" });
  // Whose figures these are, so switching account never shows the last one's.
  const [loaded, setLoaded] = useState<{ user: string; data: AccountData } | null>(null);

  const signedIn = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => (s.isAuthenticated ? (s.user?.id ?? null) : null));
  const account: AccountData = !userId ? NO_ACCOUNT : loaded?.user === userId ? loaded.data : LOADING_ACCOUNT;
  const authLoading = useAuthStore((s) => s.isLoading);
  const sessions = useLab((s) => s.sessions);
  const labReady = useLab((s) => s.hydrated);
  const { completed } = useLearningProgress();

  useEffect(() => {
    if (!useLab.getState().hydrated) useLab.getState().hydrate();
  }, []);

  useEffect(() => {
    let live = true;
    void loadCommunityStats().then((next) => live && setCommunity(next));
    return () => {
      live = false;
    };
  }, []);
  const fetchCommunity = useCallback(() => {
    setCommunity({ status: "loading" });
    void loadCommunityStats().then(setCommunity);
  }, []);

  useEffect(() => {
    if (!userId) return;
    let live = true;
    loadAccount()
      .then((d) => live && setLoaded({ user: userId, data: { status: "ready", ...d } }))
      .catch(() => live && setLoaded({ user: userId, data: { status: "error", projects: [], experiments: [] } }));
    return () => {
      live = false;
    };
  }, [userId]);

  const chooseRange = (r: RangeId) => {
    setDay(null);
    writeLocal(RANGE_KEY, r);
  };
  const chooseTarget = (n: number) => {
    const v = Math.max(1, Math.min(7, n));
    writeLocal(GOAL_KEY, String(v));
  };

  const period = useMemo(() => periodFor(range, now), [range, now]);
  const events = useMemo(() => collectEvents({ sessions, projects: account.projects, experiments: account.experiments }), [sessions, account.projects, account.experiments]);
  const eventsByDay = useMemo(() => {
    const map = new Map<string, ActivityEvent[]>();
    for (const e of events) {
      const k = dayKey(e.at);
      map.set(k, [...(map.get(k) ?? []), e]);
    }
    return map;
  }, [events]);
  const sessionById = useMemo(() => new Map(sessions.map((s) => [s.id, s])), [sessions]);

  const head = useMemo(
    () => headline({ sessions, projects: account.projects, events, completed, moduleCount: MODULES.length, catalogSize: PARTS.length, period, now }),
    [sessions, account.projects, events, completed, period, now],
  );
  const weeks = useMemo(() => calendar(events, period, now), [events, period, now]);
  const goal = useMemo(() => weeklyGoal(events, target, now), [events, target, now]);
  const uses = useMemo(() => partUsage(sessions, PARTS, period, now), [sessions, period, now]);
  const untried = useMemo(() => untriedParts(sessions, PARTS), [sessions]);
  const mix = useMemo(() => modeMix(sessions, period, now), [sessions, period, now]);
  const debug = useMemo(() => debugging(sessions, events, period, now), [sessions, events, period, now]);
  const path = useMemo(() => learning(MODULES, completed, TOPIC_ORDER), [completed]);
  const records = useMemo(() => (account.status === "ready" ? projectsSummary(account.projects, account.experiments, period, now) : null), [account, period, now]);
  const communityRank = community.status === "ready" ? community.stats.parts.rows.map((r) => r.key) : [];
  const myParts = useMemo(() => new Set(sessions.flatMap((s) => s.nodes.map((n) => n.partId))), [sessions]);

  const found = useMemo(
    () =>
      insights({
        parts: uses,
        sessionsInRange: head.find((h) => h.id === "sessions")?.value ?? 0,
        debug,
        records: records ?? { byCategory: [], records: 0, complete: 0, incomplete: [], withTeammates: 0 },
        next: path.next ? { title: path.next.title, minutes: path.next.minutes, href: moduleHref(path.next) } : null,
        untried,
        groupTitles: GROUP_TITLES,
        events,
        period,
        now,
        communityParts: communityRank,
        partHref,
      }),
    // communityRank is derived from `community`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [uses, head, debug, records, path, untried, events, period, now, community],
  );

  const rangeLabel = RANGES.find((r) => r.id === range)!;
  const activeDays = weeks.flat().filter((d) => d.inRange && d.count > 0).length;
  const nothingYet = labReady && sessions.length === 0 && completed.size === 0 && account.projects.length === 0;
  const selectedDay = day ? weeks.flat().find((d) => d.key === day) ?? null : null;

  return (
    <div className={styles.page} data-testid="advanced-analytics">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold tracking-[-0.01em] text-foreground">Advanced Analytics</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">What you&apos;ve built, tested and learned in Kiungo, and what the community is building.</p>
          <nav aria-label="On this page" className="mt-3 flex gap-4 text-[13px]">
            <a href="#you" className="font-medium text-foreground hover:text-[var(--analytics-teal)]">
              Your work
            </a>
            <a href="#community" className="font-medium text-muted hover:text-[var(--analytics-teal)]">
              Community
            </a>
          </nav>
        </div>
        <SegmentedControl<RangeId> label="Time range" value={range} onChange={chooseRange} options={RANGES.map((r) => ({ id: r.id, label: r.label }))} />
      </header>

      {!signedIn && !authLoading ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-border bg-[var(--accent)] px-4 py-3 text-sm text-foreground" data-testid="analytics-signin">
          <p className="min-w-0">Your lab sessions and learning progress below come from this browser. Sign in to add your projects and experiment records.</p>
          <button type="button" onClick={() => openAuth("login")} className="rounded-[8px] bg-[var(--analytics-teal)] px-3 py-1.5 text-[13px] font-medium text-[var(--primary-foreground)] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2">
            Sign in
          </button>
        </div>
      ) : null}
      {account.status === "error" ? (
        <p className="mb-6 rounded-[12px] border border-dashed border-border px-4 py-3 text-sm text-muted">Couldn&apos;t load your projects just now, so they&apos;re left out below. Reload the page to try again.</p>
      ) : null}

      <div className="space-y-10">
        <Section id="you" title="Your work" description={range === "all" ? "Everything since you started." : `The last ${rangeLabel.label.toLowerCase()}, compared with the ${rangeLabel.label.toLowerCase()} before.`}>
          {nothingYet ? (
            <div className="mb-6 rounded-[14px] border border-border bg-surface p-5" data-testid="analytics-start">
              <h3 className="text-[15px] font-semibold text-foreground">This page fills in as you build</h3>
              <p className="mt-1 max-w-prose text-sm text-muted">Each part of it comes from something you do in Kiungo. Three ways to start:</p>
              <ul className="mt-4 grid gap-3 sm:grid-cols-3">
                {[
                  { href: "/laboratory/workspace", title: "Build a circuit", text: "Your days, parts and runs show up here." },
                  { href: path.next ? moduleHref(path.next) : "/learn", title: "Start module 1", text: "Your learning path fills in." },
                  { href: "/projects", title: "Create a project", text: "Projects and experiment records are counted." },
                ].map((c) => (
                  <li key={c.href}>
                    <Link href={c.href} className="block h-full rounded-[12px] border border-border px-4 py-3 transition-colors hover:border-[var(--analytics-teal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]">
                      <span className="block text-sm font-medium text-[var(--analytics-teal)]">{c.title}</span>
                      <span className="mt-0.5 block text-[13px] text-muted">{c.text}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {nothingYet ? null : <HeadlineStrip items={head} rangeLabel={range === "all" ? null : rangeLabel.label.toLowerCase()} />}

          {found.length ? (
            <div className="mt-4">
              <InsightList items={found} />
            </div>
          ) : null}

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 rounded-[14px] border border-border bg-surface p-5">
              <h3 className="text-[15px] font-semibold text-foreground">Your days in the lab</h3>
              <p className="mt-1 text-sm text-muted">
                {activeDays
                  ? `You worked on ${activeDays} ${activeDays === 1 ? "day" : "days"} in this range. Each hole is a day: the brighter it glows, the more you built, ran and fixed. Pick a day to see what you did.`
                  : "Each hole is a day. Build, run or fix something in the lab and that day lights up."}
              </p>
              <div className="mt-4">
                <BreadboardCalendar weeks={weeks} eventsByDay={eventsByDay} selected={day} onSelect={setDay} today={now} />
              </div>
              {selectedDay ? <DayDetail day={selectedDay.date} events={eventsByDay.get(selectedDay.key) ?? []} sessions={sessionById} onClose={() => setDay(null)} /> : null}
            </div>
            <div className="rounded-[14px] border border-border bg-surface p-5">
              <WeeklyGoal goal={goal} onTarget={chooseTarget} />
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="min-w-0 rounded-[14px] border border-border bg-surface p-5">
              <PartsPanel uses={uses} sessions={sessionById} untried={untried} groupTitles={GROUP_TITLES} communityRank={communityRank} partHref={partHref} selected={part} onSelect={setPart} />
            </div>
            <div className="min-w-0 rounded-[14px] border border-border bg-surface p-5">
              <BuildPanel mix={mix} debug={debug} />
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="min-w-0 rounded-[14px] border border-border bg-surface p-5">
              <LearningPanel summary={path} topicLabels={TOPIC_LABELS} nextHref={path.next ? moduleHref(path.next) : null} />
            </div>
            <div className="min-w-0 rounded-[14px] border border-border bg-surface p-5">
              <ProjectsPanel summary={records} signedIn={signedIn} onSignIn={() => openAuth("login")} />
            </div>
          </div>
        </Section>

        <CommunitySection state={community} catalog={PARTS} myParts={myParts} onRetry={fetchCommunity} />
      </div>
    </div>
  );
}
