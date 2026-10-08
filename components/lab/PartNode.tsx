"use client";

import { memo, useMemo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { AlertTriangle, Cpu, Lightbulb, Monitor, Radio, Thermometer, Usb, Zap } from "lucide-react";
import { PartModel3D } from "@/components/library/views/PartModel3D";
import { PartPlanGraphic } from "@/components/library/views/PartPlanView";
import { getPart } from "@/lib/parts";
import { getPinout, pinTone, type LabPin, type PinTone } from "@/lib/lab/pinout";
import { NODE, nodeLayout, pinY } from "@/lib/lab/layout";
import type { PartStatus } from "@/lib/lab/circuit";
import type { LabNode } from "@/lib/lab/types";
import { cn } from "@/lib/utils";
import { useLabContext } from "./lab-context";

export type PartNodeData = { node: LabNode };

export const TONE_VAR: Record<PinTone, string> = {
  power: "var(--lab-power)",
  ground: "var(--lab-ground)",
  digital: "var(--lab-digital)",
  analog: "var(--lab-analog)",
  pwm: "var(--lab-pwm)",
  bus: "var(--lab-bus)",
  muted: "var(--lab-muted)",
};

export const STATUS_TEXT: Record<PartStatus, string> = {
  idle: "Not wired",
  unpowered: "No power",
  partial: "Needs wiring",
  ready: "Ready",
  fault: "Fault",
};

const STATUS_DOT: Record<PartStatus, string> = {
  idle: "bg-[var(--lab-muted)]",
  unpowered: "bg-warning",
  partial: "bg-warning",
  ready: "bg-success",
  fault: "bg-danger",
};

const GROUP_ICON = { boards: Cpu, sensors: Thermometer, outputs: Lightbulb, displays: Monitor, radios: Radio } as const;

function PinRow({ pin, index, side, nodeId, connected, faulty, live, w, partLabel }: { pin: LabPin; index: number; side: "left" | "right"; nodeId: string; connected: string | null; faulty: boolean; live: boolean; w: number; partLabel: string }) {
  const tone = pinTone(pin);
  const color = TONE_VAR[tone];
  const y = pinY(index);
  const title = [`${partLabel} ${pin.label}`, pin.note, connected ? `Wired to ${connected}` : "Not wired: drag from here to another pin"].filter(Boolean).join("\n");
  return (
    <>
      <Handle
        id={pin.id}
        type="source"
        position={side === "left" ? Position.Left : Position.Right}
        title={title}
        aria-label={`${pin.label} pin`}
        data-pin={pin.id}
        data-node={nodeId}
        className={cn("!size-[11px] !rounded-full !border-2 transition-transform hover:!scale-150", faulty && "hhip-fault-pulse")}
        style={{
          top: y,
          left: side === "left" ? 0 : undefined,
          right: side === "right" ? 0 : undefined,
          background: connected ? color : "var(--surface)",
          borderColor: faulty ? "var(--lab-fault)" : color,
          boxShadow: live ? `0 0 0 3px color-mix(in srgb, ${color} 30%, transparent)` : undefined,
        }}
      />
      <span
        className={cn(
          "pointer-events-none absolute truncate font-mono text-[10px] leading-none",
          connected ? "text-foreground" : "text-muted",
          faulty && "text-danger",
        )}
        style={{ top: y - 5, width: NODE.railLabel - 14, ...(side === "left" ? { left: 10 } : { left: w - NODE.railLabel + 4, textAlign: "right" }) }}
      >
        {pin.label}
      </span>
    </>
  );
}

function FlowBody({ node, slot, status, badge, on, left, right, live }: { node: LabNode; slot: { x: number; y: number; w: number; h: number }; status: PartStatus; badge?: string; on: boolean; left: LabPin[]; right: LabPin[]; live: (pin: string) => boolean }) {
  const part = getPart(node.partId);
  const pinout = getPinout(node.partId);
  const Icon = pinout.controller ? Cpu : GROUP_ICON[part?.group ?? "sensors"];
  const bx = slot.x + 18;
  const bw = slot.w - 36;
  const by = slot.y + 12;
  const bh = slot.h - 24;
  const w = nodeLayout(node.partId).w;
  return (
    <svg className="pointer-events-none absolute inset-0 overflow-visible" width={w} height={slot.y + slot.h + 10} aria-hidden>
      {/* Traces from each pin into the part */}
      {left.map((pin, i) => {
        const y = pinY(i);
        const color = TONE_VAR[pinTone(pin)];
        const ty = Math.max(by + 8, Math.min(by + bh - 8, y));
        const d = `M 7 ${y} H ${slot.x - 4} C ${slot.x + 8} ${y}, ${bx - 12} ${ty}, ${bx} ${ty}`;
        return (
          <g key={pin.id}>
            <path d={d} fill="none" stroke={color} strokeOpacity={0.35} strokeWidth={1.5} />
            {live(pin.id) ? <path d={d} fill="none" stroke={color} strokeWidth={2} strokeDasharray="4 8" className="hhip-live-dash" /> : null}
          </g>
        );
      })}
      {right.map((pin, i) => {
        const y = pinY(i);
        const color = TONE_VAR[pinTone(pin)];
        const ty = Math.max(by + 8, Math.min(by + bh - 8, y));
        const rx = w - NODE.railLabel + 4;
        const d = `M ${w - 7} ${y} H ${rx} C ${rx - 12} ${y}, ${bx + bw + 12} ${ty}, ${bx + bw} ${ty}`;
        return (
          <g key={pin.id}>
            <path d={d} fill="none" stroke={color} strokeOpacity={0.35} strokeWidth={1.5} />
            {live(pin.id) ? <path d={d} fill="none" stroke={color} strokeWidth={2} strokeDasharray="4 8" className="hhip-live-dash" /> : null}
          </g>
        );
      })}
      <rect
        x={bx}
        y={by}
        width={bw}
        height={bh}
        rx={10}
        fill={on ? "color-mix(in srgb, var(--success) 10%, var(--surface))" : "var(--surface)"}
        stroke={status === "fault" ? "var(--lab-fault)" : on ? "var(--success)" : "var(--border)"}
        strokeWidth={status === "fault" || on ? 1.6 : 1}
        className={status === "fault" ? "hhip-fault-pulse" : undefined}
      />
      <foreignObject x={bx} y={by} width={bw} height={bh}>
        <div className="flex h-full flex-col items-center justify-center gap-1 px-2 text-center">
          <Icon className={cn("size-5", on ? "text-success" : status === "fault" ? "text-danger" : "text-muted")} />
          <span className="max-w-full truncate text-[11px] font-semibold text-foreground">{pinout.controller ? `MCU · ${pinout.logic} V logic` : (part?.group ?? "part").replace(/s$/, "")}</span>
          {badge ? <span className={cn("max-w-full truncate font-mono text-sm font-semibold tabular-nums", on ? "text-success" : "text-muted")}>{badge}</span> : null}
          {pinout.controller ? (
            <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-muted">
              <Usb className="size-3" /> USB 5 V in
            </span>
          ) : pinout.supply ? (
            <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-muted">
              <Zap className="size-3" /> {pinout.supply[0]}–{pinout.supply[1]} V
            </span>
          ) : null}
        </div>
      </foreignObject>
    </svg>
  );
}

function PartNodeView({ id, data, selected }: NodeProps & { data: PartNodeData }) {
  const { analysis, frame, view, flash, session } = useLabContext();
  const node = data.node;
  const part = getPart(node.partId);
  const pinout = getPinout(node.partId);
  const layout = nodeLayout(node.partId);
  const report = analysis.nodes[id];
  const status: PartStatus = report?.status ?? "idle";
  const live = frame.nodes[id];
  const on = !!live?.on;

  // Who each pin is wired to, for labels and tooltips.
  const connections = useMemo(() => {
    const map = new Map<string, string>();
    const label = (nid: string, pid: string) => {
      const other = session.nodes.find((n) => n.id === nid);
      const pin = other ? getPinout(other.partId).pins.find((p) => p.id === pid) : undefined;
      return other ? `${other.label} ${pin?.label ?? pid}` : pid;
    };
    for (const w of session.wires) {
      if (w.from.node === id) map.set(w.from.pin, [map.get(w.from.pin), label(w.to.node, w.to.pin)].filter(Boolean).join(", "));
      if (w.to.node === id) map.set(w.to.pin, [map.get(w.to.pin), label(w.from.node, w.from.pin)].filter(Boolean).join(", "));
    }
    return map;
  }, [session.wires, session.nodes, id]);

  const faultyPins = useMemo(() => {
    const set = new Set<string>();
    for (const f of report?.faults ?? []) {
      if (f.severity === "tip") continue;
      for (const pin of pinout.pins) if (f.id.includes(`:${pin.id}:`)) set.add(pin.id);
    }
    return set;
  }, [report, pinout.pins]);

  const pinLive = (pin: string) => {
    if (!frame.running && view !== "flow") return false;
    const net = analysis.nets.find((n) => n.id === analysis.netOfPin.get(`${id}:${pin}`));
    if (!net || !net.wires.length) return false;
    return net.wires.some((w) => (frame.wires[w]?.level ?? 0) > 0.05);
  };

  const errors = report?.faults.filter((f) => f.severity === "error").length ?? 0;
  const warnings = report?.faults.filter((f) => f.severity === "warning").length ?? 0;
  const lit = on || (pinout.controller && report?.powered);
  const litIds = useMemo(() => {
    if (!part?.animate?.lit) return undefined;
    if (pinout.controller) {
      // Power LED whenever powered; the user LED ("L", GPIO2, PC13, ACT) only while it blinks.
      const power = part.animate.lit.filter((sid) => /pwr|^led-on$/.test(sid));
      const user = part.animate.lit.filter((sid) => !power.includes(sid));
      return [...power, ...((live?.level ?? 0) > 0 ? user : [])];
    }
    return part.animate.lit;
  }, [part, pinout.controller, live?.level]);

  return (
    <div
      className={cn(
        "group relative rounded-[14px] border bg-surface text-foreground shadow-[var(--shadow-sm)] transition-[box-shadow,border-color] duration-200",
        selected ? "border-primary shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_22%,transparent),var(--shadow-md)]" : status === "fault" ? "border-danger/70" : "border-border hover:border-[color-mix(in_srgb,var(--primary)_45%,var(--border))]",
        flash.includes(id) && "ring-4 ring-warning/60",
      )}
      style={{ width: layout.w, height: layout.h }}
      data-testid="lab-node"
      data-part={node.partId}
      data-status={status}
    >
      {/* Header */}
      <div className="flex h-[46px] items-center gap-2 border-b border-border px-3">
        <span className={cn("size-2.5 shrink-0 rounded-full", STATUS_DOT[status], status === "ready" && on && "shadow-[0_0_0_3px_color-mix(in_srgb,var(--success)_25%,transparent)]")} title={STATUS_TEXT[status]} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold leading-4">{node.label}</p>
          <p className="truncate text-[10.5px] leading-4 text-muted">
            {STATUS_TEXT[status]}
            {node.mode !== "virtual" ? ` · ${node.mode}` : ""}
          </p>
        </div>
        {errors || warnings ? (
          <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold", errors ? "bg-danger/12 text-danger" : "bg-warning/15 text-warning")} title={`${errors} errors, ${warnings} warnings`}>
            <AlertTriangle className="size-3" aria-hidden />
            {errors + warnings}
          </span>
        ) : null}
        {live?.badge ? (
          <span className={cn("max-w-[7.5rem] shrink-0 truncate rounded-full px-2 py-0.5 font-mono text-[10.5px] font-semibold tabular-nums transition-colors", on ? "bg-success/12 text-success" : "bg-muted-bg text-muted")} data-testid="node-badge">
            {live.badge}
          </span>
        ) : null}
      </div>

      {/* Body by view */}
      {part ? (
        view === "flow" ? (
          <FlowBody node={node} slot={layout.slot} status={status} badge={live?.badge} on={on || (pinout.controller && !!report?.powered)} left={layout.left} right={layout.right} live={pinLive} />
        ) : (
          <div className="pointer-events-none absolute overflow-hidden rounded-[10px]" style={{ left: layout.slot.x, top: layout.slot.y, width: layout.slot.w, height: layout.slot.h }}>
            {view === "reality" ? (
              <PartModel3D model={part} powered={!!lit} lit={litIds} still={{ spin: -24, tilt: 50 }} className="!h-full !w-full" />
            ) : (
              <div className="flex h-full w-full items-center justify-center p-1.5" style={{ backgroundImage: "linear-gradient(var(--canvas-grid) 1px, transparent 1px), linear-gradient(90deg, var(--canvas-grid) 1px, transparent 1px)", backgroundSize: "10px 10px" }}>
                <PartPlanGraphic model={part} powered={!!lit} lit={litIds} rotate={pinout.controller} className="h-full w-full drop-shadow-[0_3px_6px_rgba(15,23,42,0.18)]" />
              </div>
            )}
            {(node.partId === "led" || node.partId === "rgb-led") && on ? (
              <span
                className="absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full blur-xl"
                style={{ background: live?.rgb ? `rgb(${live.rgb.map((c) => Math.round(c * 255)).join(",")})` : "#ff3b30", opacity: 0.55 * (live?.level ?? 1) }}
                aria-hidden
              />
            ) : null}
            {live?.text?.length ? (
              <span className="absolute inset-x-2 bottom-2 rounded-md bg-black/80 px-2 py-1 font-mono text-[10px] leading-4 text-[#9df59b] shadow">{live.text.map((t) => <span key={t} className="block truncate">{t}</span>)}</span>
            ) : null}
          </div>
        )
      ) : null}

      {/* Pin rails */}
      {layout.left.map((pin, i) => (
        <PinRow key={pin.id} pin={pin} index={i} side="left" nodeId={id} connected={connections.get(pin.id) ?? null} faulty={faultyPins.has(pin.id)} live={pinLive(pin.id)} w={layout.w} partLabel={node.label} />
      ))}
      {layout.right.map((pin, i) => (
        <PinRow key={pin.id} pin={pin} index={i} side="right" nodeId={id} connected={connections.get(pin.id) ?? null} faulty={faultyPins.has(pin.id)} live={pinLive(pin.id)} w={layout.w} partLabel={node.label} />
      ))}
    </div>
  );
}

export const PartNode = memo(PartNodeView);
