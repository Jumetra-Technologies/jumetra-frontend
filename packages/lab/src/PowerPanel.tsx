"use client";

import { BatteryMedium, Flame, Zap } from "lucide-react";
import type { Rail } from "@kiungo/core/lab/power";
import { cn } from "@kiungo/ui/cn";
import { useLabContext } from "./lab-context";

const amps = (ma: number) => (ma >= 1000 ? `${Math.round(ma / 10) / 100} A` : `${Math.round(ma)} mA`);
const watts = (w: number) => (w >= 1 ? `${Math.round(w * 10) / 10} W` : `${Math.round(w * 1000)} mW`);
const lasts = (hours: number) => (hours >= 48 ? `${Math.round(hours / 24)} days` : hours >= 1 ? `${Math.round(hours * 10) / 10} h` : `${Math.max(1, Math.round(hours * 60))} min`);

/** How full a supply is: green with room to spare, amber when a stall would tip it over, red when it is asked for more than it has. */
function tone(rail: Rail): "ok" | "tight" | "over" | "unknown" {
  if (rail.capacityMa === undefined) return "unknown";
  if (rail.typicalMa > rail.capacityMa) return "over";
  if (rail.peakMa > rail.capacityMa) return "tight";
  return "ok";
}
const BAR: Record<ReturnType<typeof tone>, string> = { ok: "bg-success", tight: "bg-warning", over: "bg-danger", unknown: "bg-primary" };
const TEXT: Record<ReturnType<typeof tone>, string> = { ok: "text-success", tight: "text-warning", over: "text-danger", unknown: "text-muted" };

/**
 * The build's power budget: every supply with what hangs on it against what
 * it can give, how long a battery lasts, and the parts that run warm. Each
 * row jumps to its part. Nothing is shown until something draws power.
 */
export function PowerPanel() {
  const { session, analysis, focusNode, select } = useLabContext();
  const nameOf = (id: string) => session.nodes.find((n) => n.id === id)?.label ?? id;
  const show = (id: string) => {
    focusNode(id);
    select([id], null);
  };
  const rails = analysis.power.rails.filter((rail) => rail.loads.length > 0);
  const heat = Object.entries(analysis.power.heat)
    .map(([id, h]) => ({ id, ...h }))
    .filter((h) => h.watts >= 0.05)
    .sort((a, b) => b.tempC - a.tempC);
  if (!rails.length && !heat.length) return null;
  return (
    <div className="space-y-3" data-testid="power-panel">
      {rails.map((rail) => {
        const state = tone(rail);
        const share = rail.capacityMa ? Math.min(1, rail.typicalMa / rail.capacityMa) : 0;
        const peak = rail.capacityMa ? Math.min(1, rail.peakMa / rail.capacityMa) : 0;
        const isBattery = rail.hours !== undefined;
        const Icon = isBattery ? BatteryMedium : Zap;
        return (
          <div key={rail.net} data-testid="power-rail" data-state={state}>
            <button type="button" onClick={() => show(rail.source.node)} className="flex w-full items-baseline justify-between gap-2 rounded-[8px] text-left hover:bg-muted-bg" title="Show this supply">
              <span className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-foreground">
                <Icon className={cn("size-3.5 shrink-0", TEXT[state])} aria-hidden />
                <span className="truncate">{rail.label}</span>
              </span>
              <span className="shrink-0 font-mono text-[12px] tabular-nums text-muted">
                {amps(rail.typicalMa)}
                {rail.capacityMa !== undefined ? ` of ${amps(rail.capacityMa)}` : ""}
              </span>
            </button>
            {rail.capacityMa !== undefined ? (
              <div className="relative mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted-bg" role="meter" aria-valuemin={0} aria-valuemax={rail.capacityMa} aria-valuenow={Math.round(rail.typicalMa)} aria-label={`${rail.label}: ${amps(rail.typicalMa)} of ${amps(rail.capacityMa)}`}>
                {/* The lighter bar is the worst case (a stalled motor); the solid one is normal running. */}
                <span className={cn("absolute inset-y-0 left-0 rounded-full opacity-30", BAR[state])} style={{ width: `${peak * 100}%` }} />
                <span className={cn("absolute inset-y-0 left-0 rounded-full", BAR[state])} style={{ width: `${share * 100}%` }} />
              </div>
            ) : null}
            <p className="mt-1 text-[11.5px] leading-[1.45] text-muted">
              {rail.loads
                .slice(0, 3)
                .map((load) => `${nameOf(load.node)} ${amps(load.typicalMa)}`)
                .join(" · ")}
              {rail.loads.length > 3 ? ` · ${rail.loads.length - 3} more` : ""}
              {rail.peakMa > rail.typicalMa * 1.2 ? `. Up to ${amps(rail.peakMa)} at worst.` : ""}
              {isBattery ? ` Lasts about ${lasts(rail.hours!)}.` : ""}
            </p>
          </div>
        );
      })}
      {heat.length ? (
        <ul className="space-y-1.5" data-testid="power-heat">
          {heat.map((h) => (
            <li key={h.id}>
              <button type="button" onClick={() => show(h.id)} className="flex w-full items-baseline justify-between gap-2 rounded-[8px] text-left hover:bg-muted-bg" title="Show this part">
                <span className="flex min-w-0 items-center gap-1.5 text-[13px] text-foreground">
                  <Flame className={cn("size-3.5 shrink-0", h.over ? "text-danger" : h.tempC >= 60 ? "text-warning" : "text-muted")} aria-hidden />
                  <span className="truncate">{nameOf(h.id)}</span>
                </span>
                <span className={cn("shrink-0 font-mono text-[12px] tabular-nums", h.over ? "text-danger" : "text-muted")}>
                  {watts(h.watts)} · {Math.round(h.tempC)} °C
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
