"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Cable, CircleDot, Clock3, Cpu, FlaskConical, Hammer, Play, Plus, ScrollText, Wrench } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { shortName, useLab } from "@/lib/lab/store";
import type { LabSession, LogKind } from "@/lib/lab/types";
import type { RoboticsProject } from "@/lib/robotics-data";
import { cn } from "@/lib/utils";
import { LabSessionCard, labHref } from "./LabSessionCard";

const KIND: Record<LogKind, { icon: typeof Activity; tone: string }> = {
  session: { icon: CircleDot, tone: "text-muted" },
  build: { icon: Hammer, tone: "text-primary" },
  wire: { icon: Cable, tone: "text-[#8b5cf6]" },
  run: { icon: Play, tone: "text-success" },
  state: { icon: Activity, tone: "text-success" },
  fault: { icon: AlertTriangle, tone: "text-danger" },
  fix: { icon: Wrench, tone: "text-success" },
  note: { icon: ScrollText, tone: "text-muted" },
};

const FILTERS: Array<{ id: string; label: string; kinds: LogKind[] }> = [
  { id: "highlights", label: "Highlights", kinds: ["run", "state", "fix", "fault"] },
  { id: "all", label: "Everything", kinds: [] },
  { id: "build", label: "Build", kinds: ["build", "wire", "state"] },
  { id: "runs", label: "Runs", kinds: ["run"] },
  { id: "faults", label: "Faults", kinds: ["fault", "fix"] },
];

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

export function useProjectSessions(projectId: string): { ready: boolean; sessions: LabSession[] } {
  const ready = useLab((s) => s.hydrated);
  const all = useLab((s) => s.sessions);
  useEffect(() => {
    if (!useLab.getState().hydrated) useLab.getState().hydrate();
  }, []);
  const sessions = useMemo(() => all.filter((s) => s.projectId === projectId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [all, projectId]);
  return { ready, sessions };
}

/** Parts used across a project's lab sessions, for its hardware list. */
export function labHardware(sessions: LabSession[]): string[] {
  return [...new Set(sessions.flatMap((s) => s.nodes.map((n) => shortName(n.partId))))];
}

export function ProjectLabActivity({ project, projects }: { project: RoboticsProject; projects: RoboticsProject[] }) {
  const { ready, sessions } = useProjectSessions(project.id);
  const [filter, setFilter] = useState("highlights");
  const kinds = FILTERS.find((f) => f.id === filter)!.kinds;

  const entries = useMemo(
    () =>
      sessions
        .flatMap((s) => s.log.map((e) => ({ ...e, session: s })))
        .filter((e) => !kinds.length || kinds.includes(e.kind))
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, 120),
    [sessions, kinds],
  );

  const stats = useMemo(() => {
    const runs = sessions.reduce((n, s) => n + s.log.filter((e) => e.kind === "run" && e.text.startsWith("Run stopped")).length, 0);
    const ms = sessions.reduce((n, s) => n + s.runMs, 0);
    const fixed = sessions.reduce((n, s) => n + s.log.filter((e) => e.kind === "fix").length, 0);
    const parts = new Set(sessions.flatMap((s) => s.nodes.map((n) => n.partId))).size;
    return { runs, seconds: Math.round(ms / 1000), fixed, parts };
  }, [sessions]);

  const groups = useMemo(() => {
    const out: Array<{ day: string; items: typeof entries }> = [];
    for (const e of entries) {
      const day = dayLabel(e.at);
      const last = out[out.length - 1];
      if (last?.day === day) last.items.push(e);
      else out.push({ day, items: [e] });
    }
    return out;
  }, [entries]);

  if (!ready) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-40 w-full rounded-[var(--radius)]" />
      </div>
    );
  }

  return (
    <section aria-labelledby="project-lab-heading" className="space-y-4" data-testid="project-lab">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 id="project-lab-heading" className="text-lg font-semibold">
            Engineering Lab
          </h3>
          <p className="text-sm text-muted">Sessions for this project, and a log the lab writes as you build and run.</p>
        </div>
        <Link href={`/laboratory/workspace?project=${encodeURIComponent(project.id)}`} className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90" data-testid="new-project-session">
          <Plus className="size-4" aria-hidden /> New lab session
        </Link>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Lab sessions", value: sessions.length, icon: FlaskConical },
          { label: "Parts used", value: stats.parts, icon: Cpu },
          { label: "Runs", value: stats.runs, icon: Play, sub: stats.seconds ? `${stats.seconds} s simulated` : undefined },
          { label: "Faults fixed", value: stats.fixed, icon: Wrench },
        ].map((s) => (
          <div key={s.label} className="rounded-[var(--radius)] border border-border bg-surface px-4 py-3">
            <dt className="flex items-center gap-1.5 text-xs text-muted">
              <s.icon className="size-3.5" aria-hidden /> {s.label}
            </dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums text-foreground">{s.value}</dd>
            {s.sub ? <dd className="text-[11px] text-muted">{s.sub}</dd> : null}
          </div>
        ))}
      </dl>

      {sessions.length === 0 ? (
        <Card className="flex flex-col items-start gap-3 py-7">
          <FlaskConical className="size-5 text-muted" aria-hidden />
          <div>
            <p className="font-medium">No lab sessions for this project yet</p>
            <p className="mt-1 text-sm text-muted">Start one and the lab suggests parts from this project&apos;s objectives and hardware list, then logs your progress here.</p>
          </div>
          <Link href={`/laboratory/workspace?project=${encodeURIComponent(project.id)}`} className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-border bg-surface px-4 text-sm font-medium hover:bg-muted-bg">
            <FlaskConical className="size-4" aria-hidden /> Start a lab session
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div className="rounded-[var(--radius)] border border-border bg-surface">
            <div className="flex flex-wrap items-center gap-1 border-b border-border px-3 py-2">
              <span className="mr-2 text-sm font-semibold">Progress log</span>
              {FILTERS.map((f) => (
                <button key={f.id} type="button" onClick={() => setFilter(f.id)} aria-pressed={filter === f.id} className={cn("rounded-full px-2.5 py-0.5 text-[12px] font-medium transition-colors", filter === f.id ? "bg-foreground text-background" : "text-muted hover:bg-muted-bg hover:text-foreground")}>
                  {f.label}
                </button>
              ))}
            </div>
            <div className="hhip-scroll max-h-[28rem] overflow-y-auto px-4 py-3" data-testid="project-log">
              {groups.length === 0 ? <p className="py-6 text-center text-sm text-muted">Nothing here yet for this filter.</p> : null}
              {groups.map((g) => (
                <div key={g.day} className="mb-3 last:mb-0">
                  <p className="sticky top-0 z-[1] bg-surface py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{g.day}</p>
                  <ol className="relative ml-1.5 border-l border-border pl-4">
                    {g.items.map((e) => {
                      const meta = KIND[e.kind];
                      const Icon = meta.icon;
                      return (
                        <li key={`${e.session.id}-${e.id}`} className="relative py-1.5">
                          <span className="absolute -left-[1.4rem] top-2 flex size-[18px] items-center justify-center rounded-full border border-border bg-surface">
                            <Icon className={cn("size-3", meta.tone)} aria-hidden />
                          </span>
                          <p className="text-[13.5px] leading-5 text-foreground">{e.text}</p>
                          <p className="mt-0.5 flex items-center gap-2 text-[11.5px] text-muted">
                            <Clock3 className="size-3" aria-hidden />
                            {new Date(e.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            <span aria-hidden>·</span>
                            <Link href={labHref(e.session.id)} className="truncate hover:text-primary hover:underline">
                              {e.session.name}
                            </Link>
                          </p>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            {sessions.map((s) => (
              <LabSessionCard key={s.id} session={s} projects={projects} showProject={false} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
