"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Box, Cpu, FlaskConical, Play, Plug, Search, SkipForward, Square, Waypoints } from "lucide-react";
import { AnimatedCircuitCanvas } from "@/components/laboratory/animated-circuit-canvas";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api-client";
import type { ComponentSearchHit, ControllerSpec, HybridExperiment } from "@/lib/types";
import { cn } from "@/lib/utils";

/** The four ways a part can take part in a hybrid experiment (the backend's HybridDeviceMode). */
export const MODES = [
  { id: "virtual", label: "Virtual", icon: Box, text: "A software model that gives readings and takes commands. No hardware needed." },
  { id: "physical", label: "Physical", icon: Plug, text: "A real part on a board connected to this computer, for example over USB." },
  { id: "simulated", label: "Simulator", icon: Waypoints, text: "A part run by an external circuit simulator. Wokwi and Proteus are planned." },
  { id: "hybrid", label: "Hybrid", icon: Cpu, text: "Real and virtual together: a real reading feeds a virtual part, or the other way round." },
] as const;

type ModeId = (typeof MODES)[number]["id"];
const MODE_LABEL: Record<string, string> = Object.fromEntries(MODES.map((m) => [m.id, m.label]));

const STATUS_TEXT: Record<string, { label: string; tone: string }> = {
  created: { label: "Ready to start", tone: "bg-muted-bg text-foreground" },
  running: { label: "Running", tone: "bg-success/12 text-success" },
  paused: { label: "Paused", tone: "bg-warning/15 text-warning" },
  stopped: { label: "Stopped", tone: "bg-muted-bg text-muted" },
};

/** A device or assignment from the experiment's availability, as the backend sends it. */
interface AvailabilityItem {
  name?: string;
  component_id?: string;
  available?: boolean;
  adapter?: string | null;
  mode?: string;
}

const FRIENDLY_ERROR = {
  create: "The experiment couldn't be created. Check your connection and try again.",
  start: "The experiment couldn't start. Try again in a moment.",
  step: "The experiment couldn't move forward. Try again in a moment.",
  stop: "The experiment couldn't be stopped. Try again in a moment.",
} as const;

function StepHeading({ n, title, hint }: { n: number; title: string; hint?: string }) {
  return (
    <div className="mb-3 flex items-start gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[12px] font-semibold text-primary-foreground">{n}</span>
      <div>
        <h3 className="text-sm font-semibold leading-6">{title}</h3>
        {hint ? <p className="text-xs leading-5 text-muted">{hint}</p> : null}
      </div>
    </div>
  );
}

export function HybridPanel({ controllers, componentHits }: { controllers: ControllerSpec[]; componentHits: ComponentSearchHit[] }) {
  const [name, setName] = useState("Hybrid Greenhouse");
  const [controllerId, setControllerId] = useState(controllers[0]?.controller_id ?? "esp32");
  const [selected, setSelected] = useState<string[]>(["dht22", "led", "relay"]);
  const [modes, setModes] = useState<Record<string, ModeId>>({ dht22: "virtual", led: "physical", relay: "simulated" });
  const [filter, setFilter] = useState("");
  const [experiment, setExperiment] = useState<HybridExperiment | null>(null);
  const [state, setState] = useState<Record<string, unknown> | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"" | "create" | "start" | "step" | "stop">("");

  const offline = controllers.length === 0 && componentHits.length === 0;
  const names = useMemo(() => new Map(componentHits.map((h) => [h.component.component_id, h.component.name])), [componentHits]);
  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? componentHits.filter((h) => `${h.component.name} ${h.component.component_id}`.toLowerCase().includes(q)) : componentHits;
  }, [componentHits, filter]);
  const chosen = selected.filter((id) => names.has(id));
  const countByMode = MODES.map((m) => ({ ...m, count: chosen.filter((id) => (modes[id] ?? "virtual") === m.id).length }));

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setModes((m) => ({ ...m, [id]: m[id] ?? "virtual" }));
  }

  async function act(kind: "create" | "start" | "step" | "stop", fn: () => Promise<void>) {
    setBusy(kind);
    setError("");
    try {
      await fn();
    } catch {
      setError(FRIENDLY_ERROR[kind]);
    } finally {
      setBusy("");
    }
  }

  const onCreate = (e: FormEvent) => {
    e.preventDefault();
    void act("create", async () => {
      const result = await api.createHybridExperiment({ name, controller_id: controllerId, component_ids: chosen, device_modes: Object.fromEntries(chosen.map((id) => [id, modes[id] ?? "virtual"])) });
      setExperiment(result);
      setState(null);
      setStatus(result.status || "created");
    });
  };
  const run = (kind: "start" | "step" | "stop") =>
    act(kind, async () => {
      if (!experiment) return;
      const call = kind === "start" ? api.startHybridExperiment : kind === "step" ? api.advanceHybridExperiment : api.stopHybridExperiment;
      const result = await call(experiment.experiment_id);
      setStatus(result.status);
      setState(result.state ?? null);
    });

  const circuit = (experiment?.circuit ?? state?.circuit) as { nodes?: Array<Record<string, unknown>>; edges?: Array<Record<string, unknown>> } | undefined;
  const missing = (state?.missing_components as string[] | undefined) ?? experiment?.missing_components ?? [];
  const availability = (state?.hardware_availability ?? experiment?.hardware_availability) as Record<string, AvailabilityItem[] | undefined> | undefined;
  const statusInfo = STATUS_TEXT[status] ?? (status ? { label: status[0].toUpperCase() + status.slice(1), tone: "bg-muted-bg text-foreground" } : null);
  const running = status === "running";
  const itemName = (item: AvailabilityItem) => item.name || names.get(item.component_id ?? "") || item.component_id || "Part";

  return (
    <div className="space-y-8">
      {/* The four modes */}
      <section aria-labelledby="modes-heading">
        <h3 id="modes-heading" className="sr-only">
          Device modes
        </h3>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {MODES.map(({ id, label, icon: Icon, text }) => (
            <li key={id} className="flex gap-3 rounded-[14px] border border-border bg-surface p-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
                <Icon className="size-4.5" aria-hidden />
              </span>
              <span>
                <span className="block text-sm font-semibold">{label}</span>
                <span className="mt-0.5 block text-xs leading-5 text-muted">{text}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted">
          More in{" "}
          <Link href="/docs/technical-guides/device-modes" className="font-medium text-primary hover:underline">
            Device modes and simulation limits
          </Link>
          .
        </p>
      </section>

      {offline ? (
        <div className="flex flex-wrap items-center gap-4 rounded-[14px] border border-warning/30 bg-warning/5 p-5" role="status" data-testid="hybrid-offline">
          <AlertTriangle className="size-5 shrink-0 text-warning" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">The hardware service isn&apos;t available right now</p>
            <p className="mt-0.5 text-xs leading-5 text-muted">Boards and parts for hybrid experiments couldn&apos;t be loaded. You can still build and simulate the same circuit in the Engineering Lab.</p>
          </div>
          <Link href="/laboratory/workspace">
            <Button size="sm" variant="secondary">
              Open the Engineering Lab <ArrowRight className="size-3.5" aria-hidden />
            </Button>
          </Link>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* Build */}
        <Card className="p-5">
          <h3 className="mb-5 text-base font-semibold">Create a hybrid experiment</h3>
          <form onSubmit={onCreate} className="space-y-6">
            <div>
              <StepHeading n={1} title="Name it and pick the board" />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs text-muted">
                  Experiment name
                  <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-sm text-foreground" />
                </label>
                <label className="block text-xs text-muted">
                  Board
                  <select value={controllerId} onChange={(e) => setControllerId(e.target.value)} disabled={!controllers.length} className="mt-1 w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-sm text-foreground disabled:opacity-60">
                    {controllers.length ? (
                      controllers.map((c) => (
                        <option key={c.controller_id} value={c.controller_id}>
                          {c.name}
                        </option>
                      ))
                    ) : (
                      <option>No boards available</option>
                    )}
                  </select>
                </label>
              </div>
            </div>

            <div>
              <StepHeading n={2} title="Choose parts and how each one joins" hint="Tick a part, then say whether it is virtual, real, simulated or hybrid." />
              <label className="relative block">
                <span className="sr-only">Filter parts</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" aria-hidden />
                <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter parts" className="w-full rounded-[10px] border border-border bg-surface py-2 pl-8 pr-3 text-sm" />
              </label>
              <ul className="mt-2 max-h-72 space-y-1.5 overflow-y-auto pr-1" aria-label="Parts">
                {visible.map((hit) => {
                  const id = hit.component.component_id;
                  const checked = selected.includes(id);
                  return (
                    <li key={id} className={cn("flex flex-wrap items-center gap-2 rounded-[10px] border px-3 py-2 text-sm transition-colors", checked ? "border-primary/40 bg-primary/5" : "border-border")}>
                      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                        <input type="checkbox" checked={checked} onChange={() => toggle(id)} className="accent-[var(--primary)]" />
                        <span className="truncate">{hit.component.name}</span>
                      </label>
                      {checked ? (
                        <select value={modes[id] ?? "virtual"} onChange={(e) => setModes((m) => ({ ...m, [id]: e.target.value as ModeId }))} aria-label={`${hit.component.name} mode`} className="rounded-[8px] border border-border bg-surface px-2 py-1 text-xs">
                          {MODES.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                      ) : null}
                    </li>
                  );
                })}
                {!visible.length ? <li className="px-1 py-2 text-xs text-muted">{componentHits.length ? "No parts match." : "No parts to choose from yet."}</li> : null}
              </ul>
              <p className="mt-2 flex flex-wrap gap-1.5 text-xs" aria-live="polite">
                <span className="text-muted">{chosen.length ? `${chosen.length} chosen:` : "Nothing chosen yet"}</span>
                {countByMode
                  .filter((m) => m.count)
                  .map((m) => (
                    <span key={m.id} className="rounded-full bg-muted-bg px-2 py-0.5 font-medium">
                      {m.count} {m.label.toLowerCase()}
                    </span>
                  ))}
              </p>
            </div>

            <div>
              <StepHeading n={3} title="Create, then run it" />
              <Button type="submit" disabled={!!busy || chosen.length === 0 || offline}>
                <FlaskConical className="size-4" aria-hidden /> {busy === "create" ? "Creating…" : "Create Hybrid Experiment"}
              </Button>
            </div>
          </form>
          {error ? (
            <p role="alert" className="mt-4 flex items-start gap-2 rounded-[10px] bg-danger/10 px-3 py-2 text-sm text-danger">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              {error}
            </p>
          ) : null}
        </Card>

        {/* Run */}
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-base font-semibold">{experiment ? experiment.name : "Your experiment"}</h3>
              <p className="mt-0.5 text-xs text-muted">{experiment ? `${chosen.length} parts on ${controllers.find((c) => c.controller_id === experiment.controller_id)?.name ?? "the board"}` : "Create an experiment to run it here."}</p>
            </div>
            {statusInfo ? <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold", statusInfo.tone)}>{statusInfo.label}</span> : null}
          </div>

          {experiment ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => void run("start")} disabled={!!busy || running}>
                <Play className="size-3.5" aria-hidden /> Start
              </Button>
              <Button size="sm" variant="secondary" onClick={() => void run("step")} disabled={!!busy} title="Move the experiment forward by 100 ms">
                <SkipForward className="size-3.5" aria-hidden /> Step 100 ms
              </Button>
              <Button size="sm" variant="secondary" onClick={() => void run("stop")} disabled={!!busy || !running}>
                <Square className="size-3.5" aria-hidden /> Stop
              </Button>
            </div>
          ) : null}

          <h4 className="mt-6 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Hardware Availability</h4>
          {availability ? (
            <dl className="mt-2 space-y-2.5 text-sm">
              {Object.entries(availability)
                .filter(([mode]) => mode !== "missing")
                .map(([mode, items]) => (
                  <div key={mode} className="flex flex-wrap items-baseline gap-2">
                    <dt className="w-20 shrink-0 text-xs font-medium text-muted">{MODE_LABEL[mode] ?? mode}</dt>
                    <dd className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                      {items?.length ? (
                        items.map((item, i) => (
                          <span key={`${item.component_id}-${i}`} className={cn("rounded-full px-2 py-0.5 text-xs font-medium", item.available === false ? "bg-warning/15 text-warning" : "bg-success/12 text-success")}>
                            {itemName(item)}
                            {item.available === false ? " (not found)" : ""}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted">None</span>
                      )}
                    </dd>
                  </div>
                ))}
            </dl>
          ) : (
            <p className="mt-2 text-sm text-muted">Which parts are available, by mode, shows here once the experiment exists.</p>
          )}

          {missing.length ? (
            <div className="mt-4 rounded-[10px] border border-warning/30 bg-warning/10 p-3 text-sm" role="status">
              <p className="flex items-center gap-1.5 font-medium text-warning">
                <AlertTriangle className="size-4" aria-hidden /> Missing components
              </p>
              <p className="mt-1 text-xs leading-5 text-foreground/80">
                {missing.map((id) => names.get(id) ?? id).join(", ")}. Connect them, or switch them to Virtual and create the experiment again.
              </p>
            </div>
          ) : null}
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-base font-semibold">Hybrid Circuit</h3>
          <p className="text-xs text-muted">Parts light up while they take part in a run.</p>
        </div>
        {circuit?.nodes?.length ? (
          <AnimatedCircuitCanvas
            nodes={circuit.nodes}
            edges={circuit.edges ?? []}
            activeNodeIds={((state?.devices as Array<{ instance_id?: string; device_id?: string }>) ?? []).map((d) => String(d.instance_id || d.device_id || "")).filter(Boolean)}
          />
        ) : (
          <div className="flex h-40 items-center justify-center rounded-[12px] border border-dashed border-border text-sm text-muted">The circuit appears here when you create an experiment.</div>
        )}
      </Card>
    </div>
  );
}
