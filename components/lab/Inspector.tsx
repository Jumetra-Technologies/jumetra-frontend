"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BookOpen, Box, Cable, Copy, Grid2x2, Scissors, Trash2, Wand2, Zap } from "lucide-react";
import { PartModel3D } from "@/components/library/views/PartModel3D";
import { PartPlanView } from "@/components/library/views/PartPlanView";
import { PartFlowView } from "@/components/library/views/PartFlowView";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Button } from "@/components/ui/button";
import { getPart, partHref } from "@/lib/parts";
import { getPinout, pinTone } from "@/lib/lab/pinout";
import { useLab } from "@/lib/lab/store";
import type { DeviceMode } from "@/lib/lab/types";
import { cn } from "@/lib/utils";
import { FaultList } from "./FaultList";
import { RealHardware } from "./RealHardware";
import { useLabContext } from "./lab-context";
import { STATUS_TEXT, TONE_VAR } from "./PartNode";

type PreviewView = "model" | "plan" | "flow";

const STATUS_PILL = {
  idle: "bg-muted-bg text-muted",
  unpowered: "bg-warning/15 text-warning",
  partial: "bg-warning/15 text-warning",
  ready: "bg-success/12 text-success",
  fault: "bg-danger/12 text-danger",
} as const;

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="border-b border-border px-4 py-4 last:border-0">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function NodeInspector({ id }: { id: string }) {
  const { session, analysis, frame, autowireNode, select } = useLabContext();
  const renameNode = useLab((s) => s.renameNode);
  const removeNodes = useLab((s) => s.removeNodes);
  const removeWires = useLab((s) => s.removeWires);
  const duplicateNodes = useLab((s) => s.duplicateNodes);
  const setNodeMode = useLab((s) => s.setNodeMode);
  const [preview, setPreview] = useState<PreviewView>("model");
  const [feature, setFeature] = useState<string | null>(null);
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
  return (
    <div data-testid="node-inspector">
      <div className="border-b border-border px-4 pb-4 pt-4">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <input
              key={node.id + node.label}
              defaultValue={node.label}
              aria-label="Part name"
              onBlur={(e) => renameNode(node.id, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
              className="w-full rounded-md border border-transparent bg-transparent px-1 py-0.5 text-base font-semibold text-foreground outline-none hover:border-border focus:border-primary"
            />
            <p className="px-1 text-xs text-muted">{part?.name}</p>
          </div>
          <span className={cn("mt-1 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS_PILL[status])}>{STATUS_TEXT[status]}</span>
        </div>
        {part ? (
          <>
            <SegmentedControl
              value={preview}
              onChange={setPreview}
              label="Preview"
              size="sm"
              className="mt-3 w-full"
              options={[
                { id: "model", label: "3D", icon: <Box className="size-3.5" aria-hidden />, description: "3D model" },
                { id: "plan", label: "Top", icon: <Grid2x2 className="size-3.5" aria-hidden />, description: "Top view" },
                { id: "flow", label: "Flow", icon: <Zap className="size-3.5" aria-hidden />, description: "Current flow" },
              ]}
            />
            <div className="mt-2 h-52 overflow-hidden rounded-[12px] border border-border bg-canvas">
              {preview === "model" ? <PartModel3D model={part} powered={!!live?.on || (pinout.controller && !!report?.powered)} /> : preview === "plan" ? <PartPlanView model={part} powered={!!live?.on} activeFeature={feature} onFeature={setFeature} className="h-full" /> : <PartFlowView model={part} powered={!!live?.on || (pinout.controller && !!report?.powered)} className="h-full" />}
            </div>
          </>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {!pinout.controller && status !== "ready" ? (
            <Button size="sm" onClick={() => autowireNode(node.id)} data-testid="inspector-autowire">
              <Wand2 className="size-3.5" aria-hidden /> Auto-wire
            </Button>
          ) : null}
          <Button size="sm" variant="secondary" onClick={() => select(duplicateNodes([node.id]).map((n) => n.id), null)}>
            <Copy className="size-3.5" aria-hidden /> Duplicate
          </Button>
          {wiresOf.length ? (
            <Button size="sm" variant="secondary" onClick={() => removeWires(wiresOf.map((w) => w.id))}>
              <Scissors className="size-3.5" aria-hidden /> Unwire
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" className="text-danger" onClick={() => removeNodes([node.id])} aria-label={`Delete ${node.label}`}>
            <Trash2 className="size-3.5" aria-hidden /> Delete
          </Button>
        </div>
      </div>

      {live?.readings.length ? (
        <Section title="Live">
          <dl className="grid grid-cols-2 gap-2">
            {live.readings.map((r) => (
              <div key={r.label} className="rounded-[10px] bg-muted-bg px-2.5 py-2">
                <dt className="text-[11px] text-muted">{r.label}</dt>
                <dd className="truncate font-mono text-[13px] font-semibold tabular-nums text-foreground">{r.value}</dd>
              </div>
            ))}
          </dl>
        </Section>
      ) : null}

      <Section title={`Problems${report?.faults.length ? ` · ${report.faults.length}` : ""}`}>
        <FaultList faults={report?.faults ?? []} empty={status === "idle" ? "Not wired yet. Drag from a pin, or use Auto-wire." : "No problems with this part."} />
      </Section>

      <Section title="Pins">
        <ul className="divide-y divide-border/70 text-[12.5px]" data-testid="pin-table">
          {pinout.pins.map((pin) => {
            const ends = otherEnd(pin.id);
            return (
              <li key={pin.id} className="flex items-start gap-2 py-1.5" title={pin.note}>
                <span className="mt-1 size-2.5 shrink-0 rounded-full border-2" style={{ borderColor: TONE_VAR[pinTone(pin)], background: ends.length ? TONE_VAR[pinTone(pin)] : "transparent" }} aria-hidden />
                <span className="w-24 shrink-0 font-mono text-[11.5px] text-foreground">{pin.label}</span>
                <span className={cn("min-w-0 flex-1 truncate", ends.length ? "text-foreground" : pin.required ? "text-warning" : "text-muted")}>{ends.length ? ends.join(", ") : pin.required ? "Needs a wire" : pin.note ?? "—"}</span>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title="Device">
        <label className="flex items-center justify-between gap-3 text-[13px]">
          <span className="text-foreground">Mode</span>
          <select value={node.mode} onChange={(e) => setNodeMode(node.id, e.target.value as DeviceMode)} className="h-8 rounded-[8px] border border-border bg-surface px-2 text-[13px]" aria-label="Device mode">
            <option value="virtual">Virtual (simulated)</option>
            <option value="hybrid">Hybrid (real + simulated)</option>
            <option value="physical">Physical (real hardware)</option>
          </select>
        </label>
        <p className="mt-2 text-[11.5px] leading-4 text-muted">Physical and hybrid parts bind to real hardware through the Kiungo runtime when it is connected.</p>
        {part ? (
          <Link href={partHref(part.id)} className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline">
            <BookOpen className="size-3.5" aria-hidden /> Open in Component library
          </Link>
        ) : null}
      </Section>
    </div>
  );
}

function WireInspector({ id }: { id: string }) {
  const { session, analysis, frame, select } = useLabContext();
  const removeWires = useLab((s) => s.removeWires);
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
  return (
    <div data-testid="wire-inspector">
      <div className="border-b border-border px-4 py-4">
        <p className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Cable className="size-4 text-muted" aria-hidden /> Wire
        </p>
        <div className="mt-3 space-y-2 text-[13px]">
          {[a, b].map((e, i) => (
            <button key={i} type="button" onClick={() => e.node && select([e.node.id], null)} className="flex w-full items-center gap-2 rounded-[10px] bg-muted-bg px-3 py-2 text-left hover:bg-accent">
              <span className="size-2.5 rounded-full" style={{ background: e.pin ? TONE_VAR[pinTone(e.pin)] : "var(--muted)" }} aria-hidden />
              <span className="font-medium text-foreground">{e.node?.label}</span>
              <span className="ml-auto font-mono text-[12px] text-muted">{e.pin?.label}</span>
            </button>
          ))}
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-[12.5px]">
          <div className="rounded-[10px] border border-border px-2.5 py-2">
            <dt className="text-[11px] text-muted">Net</dt>
            <dd className="font-medium text-foreground">{net?.label ?? "—"}</dd>
          </div>
          <div className="rounded-[10px] border border-border px-2.5 py-2">
            <dt className="text-[11px] text-muted">Right now</dt>
            <dd className="font-medium text-foreground">{flowText}</dd>
          </div>
        </dl>
        <Button size="sm" variant="ghost" className="mt-3 text-danger" onClick={() => removeWires([wire.id])}>
          <Trash2 className="size-3.5" aria-hidden /> Delete wire
        </Button>
      </div>
      {faults.length ? (
        <Section title="Problems">
          <FaultList faults={faults} />
        </Section>
      ) : null}
    </div>
  );
}

function Overview() {
  const { session, analysis } = useLabContext();
  const counts = { ready: 0, attention: 0, fault: 0 };
  for (const n of session.nodes) {
    const s = analysis.nodes[n.id]?.status;
    if (s === "ready") counts.ready++;
    else if (s === "fault") counts.fault++;
    else counts.attention++;
  }
  const errors = analysis.faults.filter((f) => f.severity === "error").length;
  return (
    <div data-testid="overview-inspector">
      <div className="border-b border-border px-4 py-4">
        <p className="text-base font-semibold text-foreground">Circuit check</p>
        <p className="mt-0.5 text-[12.5px] text-muted">Select a part or wire to inspect it.</p>
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
        {errors ? <p className="mt-2 text-[11.5px] text-muted">Switch to Current flow to see where current stops.</p> : null}
      </Section>
      <Section title="Real hardware">
        <RealHardware />
      </Section>
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

export function Inspector() {
  const { selectedNodes, selectedWire } = useLabContext();
  if (selectedNodes.length === 1) return <NodeInspector id={selectedNodes[0]} />;
  if (selectedWire && !selectedNodes.length) return <WireInspector id={selectedWire} />;
  return <Overview />;
}
