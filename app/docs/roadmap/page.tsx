import type { Metadata } from "next";
import Link from "next/link";
import { Check, CircleDot, Clock3, Compass, Flag } from "lucide-react";
import { Breadcrumbs } from "@/components/learning/Navigation";
import { GOALS, HISTORY, PHASES, RENAME, STATUS_LABEL, type GoalId, type RoadmapStatus } from "@/lib/roadmap";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Roadmap and development phases · Kiungo Documentation",
  description: "What Kiungo is for, the three development phases that get it there, what is done, what is being built now and what comes next.",
};

const STATUS_STYLE: Record<RoadmapStatus, { icon: typeof Check; pill: string }> = {
  done: { icon: Check, pill: "bg-success/12 text-success" },
  active: { icon: CircleDot, pill: "bg-primary/12 text-primary" },
  next: { icon: Compass, pill: "bg-warning/15 text-warning" },
  planned: { icon: Clock3, pill: "bg-muted-bg text-muted" },
};

function StatusPill({ status }: { status: RoadmapStatus }) {
  const { icon: Icon, pill } = STATUS_STYLE[status];
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", pill)}>
      <Icon className="size-3" aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  );
}

const goalNumber = (id: GoalId) => GOALS.findIndex((g) => g.id === id) + 1;

export default function RoadmapPage() {
  const current = PHASES.find((p) => p.status === "active") ?? PHASES[0];
  const currentMilestone = current.milestones.find((m) => m.status === "active");
  const nextMilestone = current.milestones.find((m) => m.status === "next");

  return (
    <>
      <Breadcrumbs items={[{ label: "Documentation", href: "/docs" }, { label: "Roadmap" }]} />
      <div className="mb-8 max-w-3xl">
        <h2 className="text-3xl font-bold tracking-tight">Roadmap and development phases</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          What Kiungo is for, the phases that get it there, and where each one stands. Each phase names the goals it serves and the conditions
          that mark it finished.
        </p>
      </div>

      {/* Where we are */}
      <section aria-labelledby="now-heading" className="mb-12 grid gap-3 md:grid-cols-3">
        <h3 id="now-heading" className="sr-only">
          Where we are
        </h3>
        {[
          { label: "Current phase", value: current.name, note: current.outcome },
          { label: "Building now", value: currentMilestone?.title ?? "—", note: currentMilestone?.items.slice(0, 2).join(" · ") },
          { label: "Up next", value: nextMilestone?.title ?? "—", note: nextMilestone?.items[0] },
        ].map((card) => (
          <div key={card.label} className="rounded-[14px] border border-border bg-surface p-4 shadow-[var(--shadow-sm)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{card.label}</p>
            <p className="mt-1 text-sm font-semibold">{card.value}</p>
            {card.note ? <p className="mt-1 text-xs leading-5 text-muted">{card.note}</p> : null}
          </div>
        ))}
      </section>

      {/* Goals */}
      <section aria-labelledby="goals-heading" className="mb-12">
        <h3 id="goals-heading" className="text-lg font-semibold">
          Project goals
        </h3>
        <p className="mt-1 max-w-3xl text-sm text-muted">Every phase moves one or more of these forward.</p>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {GOALS.map((goal, i) => (
            <li key={goal.id} id={`goal-${goal.id}`} className="rounded-[14px] border border-border bg-surface p-4">
              <span className="font-mono text-xs font-semibold text-primary">G{i + 1}</span>
              <p className="mt-1 text-sm font-semibold">{goal.title}</p>
              <p className="mt-1 text-xs leading-5 text-muted">{goal.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Phases */}
      <section aria-labelledby="phases-heading" className="mb-12">
        <h3 id="phases-heading" className="text-lg font-semibold">
          Development phases
        </h3>
        <ol className="mt-4 space-y-5">
          {PHASES.map((phase) => (
            <li key={phase.id} id={phase.id} className={cn("rounded-[16px] border bg-surface p-5 shadow-[var(--shadow-sm)]", phase.status === "active" ? "border-primary/50" : "border-border")} data-testid="roadmap-phase">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="max-w-3xl">
                  <h4 className="text-base font-semibold">{phase.name}</h4>
                  <p className="mt-1 text-sm leading-6 text-muted">{phase.outcome}</p>
                </div>
                <StatusPill status={phase.status} />
              </div>
              <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                Serves
                {phase.goals.map((g) => (
                  <a key={g} href={`#goal-${g}`} className="rounded-full border border-border px-2 py-0.5 font-medium text-foreground hover:border-primary">
                    G{goalNumber(g)} {GOALS[goalNumber(g) - 1].title}
                  </a>
                ))}
              </p>
              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                {phase.milestones.map((m) => (
                  <div key={m.title} className="rounded-[12px] bg-muted-bg/60 p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{m.title}</p>
                      <StatusPill status={m.status} />
                    </div>
                    <ul className="mt-2 space-y-1.5 text-xs leading-5 text-muted">
                      {m.items.map((item) => (
                        <li key={item} className="border-l-2 border-border pl-2.5">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                  <Flag className="size-3.5" aria-hidden /> Done when
                </p>
                <ul className="mt-1.5 grid gap-1 text-sm sm:grid-cols-2">
                  {phase.exit.map((e) => (
                    <li key={e} className="flex gap-2 text-foreground/90">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                      {e}
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* History */}
      <section aria-labelledby="history-heading" className="mb-10 max-w-3xl">
        <h3 id="history-heading" className="text-lg font-semibold">
          How we got here
        </h3>
        <ol className="mt-4 border-l border-border">
          {HISTORY.map((h) => {
            const rename = h.version === RENAME.version;
            return (
              <li key={h.version} className="relative pb-5 pl-5 last:pb-0" data-testid={rename ? "history-rename" : undefined}>
                <span className={cn("absolute -left-[5px] top-1.5 size-2.5 rounded-full border-2 border-background", rename ? "bg-primary" : "bg-border")} aria-hidden />
                <p className="text-xs text-muted">
                  <time dateTime={h.date}>{new Date(`${h.date}T00:00:00Z`).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}</time> · <span className="font-mono">{h.version}</span>
                </p>
                <p className={cn("mt-0.5 text-sm leading-6", rename && "font-medium")}>{h.text}</p>
              </li>
            );
          })}
        </ol>
      </section>

      <p className="max-w-3xl border-t border-border pt-5 text-xs leading-relaxed text-muted">
        Statuses: <strong>Done</strong> is in a release, <strong>In progress</strong> is being built, <strong>Next</strong> is agreed and not started,{" "}
        <strong>Planned</strong> is direction and open to change. Every release is listed in the{" "}
        <a href="https://github.com/Jumetra-Technologies/jumetra-frontend/blob/main/CHANGELOG.md" className="text-primary hover:underline">
          CHANGELOG
        </a>
        . See also <Link href="/docs/system-overview/development-phases" className="text-primary hover:underline">Development phases</Link> and the{" "}
        <Link href="/docs/architecture" className="text-primary hover:underline">architecture</Link>.
      </p>
    </>
  );
}
