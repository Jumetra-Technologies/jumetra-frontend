"use client";

import { useMemo } from "react";
import { BookOpen, Cable, ChevronRight, Copy, Scissors, Trash2, Wand2, X } from "lucide-react";
import { Button } from "@kiungo/ui/button";
import { getPart } from "@kiungo/core/parts";
import { getPinout, pinTone } from "@kiungo/core/lab/pinout";
import { breadboardUse } from "@kiungo/core/lab/breadboard";
import { useLab } from "./store";
import type { DeviceMode } from "@kiungo/core/lab/types";
import { cn } from "@kiungo/ui/cn";
import { FaultList } from "./FaultList";
import { InputsPanel } from "./InputsPanel";
import { PowerPanel } from "./PowerPanel";
import { useLabContext, useLabHost } from "./lab-context";
import { STATUS_TEXT, TONE_VAR } from "./PartNode";

/*
 * What the properties popover (B3) shows. The old right-hand inspector's
 * sections moved here: the name and delete into the header, the knobs into
 * the body, device mode into "Runs on" (boards only), live readings into
 * "Now", pins and faults into a collapsed "Pins and checks", the library link
 * into the footer. The three-view thumbnails are gone (the canvas shows the
 * part already); the overview is "Circuit summary" in the ⋮ menu.
 */

const STATUS_PILL = {
  idle: "bg-muted-bg text-muted",
  unpowered: "bg-warning/15 text-warning",
  partial: "bg-warning/15 text-warning",
  ready: "bg-success/12 text-success",
  fault: "bg-danger/12 text-danger",
} as const;

function Section({ title, children, action, testId }: { title: string; children: React.ReactNode; action?: React.ReactNode; testId?: string }) {
  return (
    <section className="border-b border-border px-4 py-3 last:border-0" data-testid={testId}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

const iconButton = "flex size-8 shrink-0 items-center justify-center rounded-[8px] text-muted hover:bg-muted-bg hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary";

/** One part's properties: name, knobs, where it runs, what it reads now, its pins and problems. */
export function PartProperties({ id, onClose }: { id: string; onClose: () => void }) {
  const { session, analysis, frame, autowireNode, select } = useLabContext();
  const host = useLabHost();
  const renameNode = useLab((s) => s.renameNode);
  const removeNodes = useLab((s) => s.removeNodes);
  const removeWires = useLab((s) => s.removeWires);
  const duplicateNodes = useLab((s) => s.duplicateNodes);
  const setNodeMode = useLab((s) => s.setNodeMode);
  const node = session.nodes.find((n) => n.id === id);
  const part = node ? getPart(node.partId) : undefined;
  const pinout = node ? getPinout(node.partId) : null;
  const report = analysis.nodes[id];
  const live = frame.nodes[id];
  const wiresOf = useMemo(() => session.wires.filter((w) => w.from.node === id || w.to.node === id), [session.wires, id]);
  if (!node || !pinout) return null;

  const otherEnd = (pin: string) =>
    wiresOf
      .filter((w) => (w.from.node === id && w.from.pin === pin) || (w.to.node === id && w.to.pin === pin))
      .map((w) => {
        const end = w.from.node === id && w.from.pin === pin ? w.to : w.from;
        const other = session.nodes.find((n) => n.id === end.node);
        const p = other ? getPinout(other.partId).pins.find((x) => x.id === end.pin) : undefined;
        return `${other?.label ?? "?"} ${p?.label ?? end.pin}`;
      });

  const status = report?.status ?? "idle";
  const faults = report?.faults ?? [];
  const breadboard = pinout.passive && pinout.strips;
  return (
    <div data-testid="node-inspector">
      <header className="flex items-start gap-1 border-b border-border py-2.5 pl-3 pr-2">
        <div className="min-w-0 flex-1">
          <input
            key={node.id + node.label}
            defaultValue={node.label}
            aria-label="Part name"
            onBlur={(e) => renameNode(node.id, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            className="w-full rounded-md border border-transparent bg-transparent px-1 py-0.5 text-[15px] font-semibold text-foreground outline-none hover:border-border focus:border-primary"
          />
          <p className="flex items-center gap-2 px-1 text-xs text-muted">
            <span className="truncate">{part?.name}</span>
            <span className={cn("shrink-0 rounded-full px-1.5 py-px text-[10.5px] font-semibold", STATUS_PILL[status])}>{STATUS_TEXT[status]}</span>
          </p>
        </div>
        <button type="button" className={iconButton} onClick={() => select(duplicateNodes([node.id]).map((n) => n.id), null)} aria-label={`Duplicate ${node.label}`} title="Duplicate (⌘D)">
          <Copy className="size-4" aria-hidden />
        </button>
        {wiresOf.length ? (
          <button type="button" className={iconButton} onClick={() => removeWires(wiresOf.map((w) => w.id))} aria-label={`Remove ${node.label}'s wires`} title={`Remove ${wiresOf.length} wire${wiresOf.length === 1 ? "" : "s"}`}>
            <Scissors className="size-4" aria-hidden />
          </button>
        ) : null}
        <button type="button" className={cn(iconButton, "hover:text-danger")} onClick={() => removeNodes([node.id])} aria-label={`Delete ${node.label}`} title="Delete (⌫)">
          <Trash2 className="size-4" aria-hidden />
        </button>
        <button type="button" className={iconButton} onClick={onClose} aria-label="Close properties" title="Close (Esc)">
          <X className="size-4" aria-hidden />
        </button>
      </header>

      {!pinout.controller && status !== "ready" && !breadboard ? (
        <div className="border-b border-border px-4 py-2.5">
          <Button size="sm" onClick={() => autowireNode(node.id)} data-testid="inspector-autowire">
            <Wand2 className="size-3.5" aria-hidden /> Auto-wire
          </Button>
        </div>
      ) : null}

      <InputsPanel node={node} />

      {breadboard ? (
        <Section title="Strips in use">
          <BreadboardStrips nodeId={node.id} />
        </Section>
      ) : null}

      {pinout.controller ? (
        <Section title="Runs on" testId="runs-on">
          <label className="flex items-center justify-between gap-3 text-[13px]">
            <span className="text-foreground">Mode</span>
            <select value={node.mode} onChange={(e) => setNodeMode(node.id, e.target.value as DeviceMode)} className="h-8 rounded-[8px] border border-border bg-surface px-2 text-[13px]" aria-label="Device mode">
              <option value="virtual">Virtual (simulated)</option>
              <option value="hybrid">Hybrid (real + simulated)</option>
              <option value="physical">Physical (real hardware)</option>
            </select>
          </label>
          <p className="mt-2 text-[11.5px] leading-4 text-muted">{host.modeNote?.(node) ?? "Physical and hybrid parts use a real board when it is plugged in and Kiungo is online."}</p>
        </Section>
      ) : null}

      {live?.readings.length ? (
        <Section title="Now" testId="readings-now">
          <dl className="grid grid-cols-2 gap-1.5">
            {live.readings.map((r) => (
              <div key={r.label} className="rounded-[8px] bg-muted-bg px-2 py-1.5">
                <dt className="text-[10.5px] text-muted">{r.label}</dt>
                <dd className="truncate font-mono text-[12px] font-semibold tabular-nums text-foreground">{r.value}</dd>
              </div>
            ))}
          </dl>
        </Section>
      ) : null}

      {!breadboard ? (
        <details className="group border-b border-border px-4 py-2.5 last:border-0" data-testid="pins-and-checks">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[12.5px] font-medium text-foreground marker:hidden">
            <ChevronRight className="size-3.5 text-muted transition-transform group-open:rotate-90" aria-hidden />
            Pins and checks
            {faults.length ? <span className={cn("ml-auto rounded-full px-1.5 text-[10.5px] font-semibold", status === "fault" ? "bg-danger/12 text-danger" : "bg-warning/15 text-warning")}>{faults.length === 1 ? "1 problem" : `${faults.length} problems`}</span> : null}
          </summary>
          <div className="mt-2">
            <FaultList faults={faults} empty={status === "idle" ? "Not wired yet. Drag from a pin, or use Auto-wire." : "No problems with this part."} />
            <ul className="mt-2 divide-y divide-border/70 text-[12.5px]" data-testid="pin-table">
              {pinout.pins.map((pin) => {
                const ends = otherEnd(pin.id);
                return (
                  <li key={pin.id} className="flex items-start gap-2 py-1.5" title={pin.note}>
                    <span className="mt-1 size-2.5 shrink-0 rounded-full border-2" style={{ borderColor: TONE_VAR[pinTone(pin)], background: ends.length ? TONE_VAR[pinTone(pin)] : "transparent" }} aria-hidden />
                    <span className="w-20 shrink-0 font-mono text-[11.5px] text-foreground">{pin.label}</span>
                    <span className={cn("min-w-0 flex-1 truncate", ends.length ? "text-foreground" : pin.required ? "text-warning" : "text-muted")}>{ends.length ? ends.join(", ") : pin.required ? "Needs a wire" : (pin.note ?? "—")}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </details>
      ) : null}

      {part && host.renderPartLink ? (
        <footer className="px-4 py-2.5">
          {host.renderPartLink(
            part.id,
            <>
              <BookOpen className="size-3.5" aria-hidden /> Open in Component library
            </>,
            "inline-flex items-center gap-1.5 text-[12.5px] font-medium text-primary hover:underline",
          )}
        </footer>
      ) : null}
    </div>
  );
}

/** A breadboard's wired strips: what each carries and what else is on it. 400 holes would make a useless pin table. */
function BreadboardStrips({ nodeId }: { nodeId: string }) {
  const { analysis, session } = useLabContext();
  const use = useMemo(() => breadboardUse(nodeId, analysis, session.nodes), [nodeId, analysis, session.nodes]);
  if (!use.length) {
    return <p className="text-[12.5px] leading-5 text-muted">Nothing wired yet. Run the board&apos;s 5V and GND to the top + and − rails, then take each part&apos;s VCC and GND from the rails.</p>;
  }
  const tone = (kind: string) => (kind === "power" ? TONE_VAR.power : kind === "ground" ? TONE_VAR.ground : kind === "short" || kind === "conflict" ? "var(--lab-fault)" : kind === "open" ? TONE_VAR.muted : TONE_VAR.digital);
  return (
    <ul className="divide-y divide-border/70 text-[12.5px]" data-testid="strip-table">
      {use.map((u) => (
        <li key={u.id} className="flex items-start gap-2 py-1.5">
          <span className="mt-1 size-2.5 shrink-0 rounded-full" style={{ background: tone(u.kind) }} aria-hidden />
          <span className="w-28 shrink-0 text-foreground">
            {u.name}
            <span className="block font-mono text-[10.5px] text-muted">{u.kind === "power" ? u.net : u.kind === "ground" ? "GND" : u.kind === "open" ? "No other end" : u.net}</span>
          </span>
          <span className="min-w-0 flex-1 text-muted">{u.ends.length ? u.ends.join(", ") : "Only this strip"}</span>
        </li>
      ))}
    </ul>
  );
}

/** Jumper-wire colors people actually have in the box. */
export const WIRE_COLORS = [
  { id: "red", label: "Red", value: "#d62828" },
  { id: "black", label: "Black", value: "#262626" },
  { id: "orange", label: "Orange", value: "#ef7d1a" },
  { id: "yellow", label: "Yellow", value: "#e0b100" },
  { id: "green", label: "Green", value: "#2a9d4b" },
  { id: "blue", label: "Blue", value: "#2f6fdd" },
  { id: "white", label: "White", value: "#f2f2f2" },
] as const;

/** A wire's properties: its two ends, its color, the net, what it carries now, and delete. */
export function WireProperties({ id, onClose }: { id: string; onClose: () => void }) {
  const { session, analysis, frame, select } = useLabContext();
  const removeWires = useLab((s) => s.removeWires);
  const setWireColor = useLab((s) => s.setWireColor);
  const wire = session.wires.find((w) => w.id === id);
  if (!wire) return null;
  const end = (ref: { node: string; pin: string }) => {
    const n = session.nodes.find((x) => x.id === ref.node);
    const p = n ? getPinout(n.partId).pins.find((x) => x.id === ref.pin) : undefined;
    return { node: n, pin: p };
  };
  const a = end(wire.from);
  const b = end(wire.to);
  const net = analysis.nets.find((n) => n.id === analysis.netOfWire.get(wire.id));
  const live = frame.wires[wire.id];
  const faults = analysis.faults.filter((f) => f.wires.includes(wire.id));
  const flowText = !live ? "—" : live.flow === "fault" ? "Faulty" : live.level > 0.05 ? (live.flow === "power" ? "Carrying current" : live.flow === "ground" ? "Returning current" : live.flow === "data" ? "Data moving" : "Signal high") : live.flow === "power" || live.flow === "ground" ? "No load yet" : "Low / idle";
  const swatch = "flex size-6 items-center justify-center rounded-full border-2 transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
  return (
    <div data-testid="wire-inspector">
      <header className="flex items-center gap-1 border-b border-border py-2.5 pl-4 pr-2">
        <p className="flex flex-1 items-center gap-2 text-[15px] font-semibold text-foreground">
          <Cable className="size-4 text-muted" aria-hidden /> Wire
        </p>
        <button type="button" className={cn(iconButton, "hover:text-danger")} onClick={() => removeWires([wire.id])} aria-label="Delete wire" title="Delete (⌫)">
          <Trash2 className="size-4" aria-hidden />
        </button>
        <button type="button" className={iconButton} onClick={onClose} aria-label="Close properties" title="Close (Esc)">
          <X className="size-4" aria-hidden />
        </button>
      </header>
      <div className="space-y-1.5 border-b border-border px-4 py-3 text-[13px]">
        {[a, b].map((e, i) => (
          <button key={i} type="button" onClick={() => e.node && select([e.node.id], null)} className="flex w-full items-center gap-2 rounded-[8px] bg-muted-bg px-2.5 py-1.5 text-left hover:bg-accent">
            <span className="size-2.5 rounded-full" style={{ background: e.pin ? TONE_VAR[pinTone(e.pin)] : "var(--muted)" }} aria-hidden />
            <span className="font-medium text-foreground">{e.node?.label}</span>
            <span className="ml-auto font-mono text-[12px] text-muted">{e.pin?.label}</span>
          </button>
        ))}
      </div>
      <Section title="Color">
        <div role="radiogroup" aria-label="Wire color" className="flex flex-wrap items-center gap-1" data-testid="wire-colors">
          <button type="button" role="radio" aria-checked={!wire.color} onClick={() => setWireColor(wire.id, undefined)} className={cn("mr-1 h-6 rounded-full border-2 px-2 text-[11.5px] font-medium", !wire.color ? "border-primary text-foreground" : "border-border text-muted hover:text-foreground")} title="The color of what it carries">
            Auto
          </button>
          {WIRE_COLORS.map((c) => (
            <button key={c.id} type="button" role="radio" aria-checked={wire.color === c.value} aria-label={c.label} title={c.label} onClick={() => setWireColor(wire.id, c.value)} className={cn(swatch, wire.color === c.value ? "border-primary" : "border-border")}>
              <span className="size-3.5 rounded-full border border-black/10" style={{ background: c.value }} aria-hidden />
            </button>
          ))}
        </div>
      </Section>
      <dl className="grid grid-cols-2 gap-2 px-4 py-3 text-[12.5px]">
        <div className="rounded-[8px] border border-border px-2.5 py-1.5">
          <dt className="text-[11px] text-muted">Net</dt>
          <dd className="font-medium text-foreground">{net?.label ?? "—"}</dd>
        </div>
        <div className="rounded-[8px] border border-border px-2.5 py-1.5">
          <dt className="text-[11px] text-muted">Carries now</dt>
          <dd className="font-medium text-foreground">{flowText}</dd>
        </div>
      </dl>
      {faults.length ? (
        <Section title="Problems">
          <FaultList faults={faults} />
        </Section>
      ) : null}
    </div>
  );
}

/** The whole circuit at a glance: what used to show in the inspector with nothing selected. ⋮ → Circuit summary. */
export function CircuitSummary() {
  const { session, analysis } = useLabContext();
  const host = useLabHost();
  const counts = { ready: 0, attention: 0, fault: 0 };
  for (const n of session.nodes) {
    const s = analysis.nodes[n.id]?.status;
    if (s === "ready") counts.ready++;
    else if (s === "fault") counts.fault++;
    else counts.attention++;
  }
  const errors = analysis.faults.filter((f) => f.severity === "error").length;
  return (
    <div data-testid="overview-inspector" className="-mx-4">
      <div className="border-b border-border px-4 pb-4">
        <p className="text-[12.5px] text-muted">Click a part or a wire on the canvas to see its properties.</p>
        <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-[10px] bg-success/10 px-2 py-2">
            <dd className="text-lg font-semibold tabular-nums text-success">{counts.ready}</dd>
            <dt className="text-[11px] text-muted">Ready</dt>
          </div>
          <div className="rounded-[10px] bg-warning/12 px-2 py-2">
            <dd className="text-lg font-semibold tabular-nums text-warning">{counts.attention}</dd>
            <dt className="text-[11px] text-muted">To wire</dt>
          </div>
          <div className="rounded-[10px] bg-danger/10 px-2 py-2">
            <dd className="text-lg font-semibold tabular-nums text-danger">{counts.fault}</dd>
            <dt className="text-[11px] text-muted">Faults</dt>
          </div>
        </dl>
      </div>
      <Section title={`Problems${analysis.faults.length ? ` · ${analysis.faults.length}` : ""}`}>
        <FaultList faults={analysis.faults} />
        {errors ? <p className="mt-2 text-[11.5px] text-muted">Switch to Trace to see where current stops.</p> : null}
      </Section>
      {analysis.power.rails.some((rail) => rail.loads.length) || Object.keys(analysis.power.heat).length ? (
        <Section title="Power">
          <PowerPanel />
        </Section>
      ) : null}
      {host.realHardware ? <Section title="Real hardware">{host.realHardware}</Section> : null}
      <Section title="Legend">
        <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px] text-foreground">
          {(
            [
              ["power", "Power"],
              ["ground", "Ground"],
              ["digital", "Digital"],
              ["pwm", "PWM"],
              ["analog", "Analog"],
              ["bus", "I²C / SPI / UART"],
            ] as const
          ).map(([tone, label]) => (
            <li key={tone} className="flex items-center gap-2">
              <span className="h-1 w-5 rounded-full" style={{ background: TONE_VAR[tone] }} aria-hidden />
              {label}
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
