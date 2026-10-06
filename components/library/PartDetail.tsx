"use client";

import Link from "next/link";
import { useState } from "react";
import { Box, Grid2x2, Power, Zap } from "lucide-react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { PART_GROUPS } from "@/lib/parts";
import type { PartModel, PinRole } from "@/lib/parts/types";
import { cn } from "@/lib/utils";
import { StartExperimentButton } from "./StartExperimentButton";
import { PartFlowView } from "./views/PartFlowView";
import { PartModel3D } from "./views/PartModel3D";
import { KIND_LABEL, PartPlanView } from "./views/PartPlanView";

export type ViewId = "model" | "plan" | "flow";

export const VIEW_OPTIONS: Array<{ id: ViewId; label: string; description: string; icon: React.ReactNode }> = [
  { id: "model", label: "3D model", description: "the part as it sits on the bench, to scale", icon: <Box className="size-4" aria-hidden /> },
  { id: "plan", label: "Top view", description: "every pin, port and LED, labelled, on a millimetre grid", icon: <Grid2x2 className="size-4" aria-hidden /> },
  { id: "flow", label: "Current flow", description: "what is inside and where the current goes", icon: <Zap className="size-4" aria-hidden /> },
];

const ROLE_LABEL: Record<PinRole, string> = {
  power: "Power",
  ground: "Ground",
  digital: "Digital",
  analog: "Analog",
  pwm: "PWM",
  data: "Data",
  clock: "Clock",
  uart: "UART",
  spi: "SPI",
  i2c: "I2C",
  mechanical: "Mechanical",
  other: "Other",
};

const ROLE_TONE: Record<PinRole, string> = {
  power: "var(--warning)",
  ground: "var(--muted)",
  digital: "var(--primary)",
  analog: "var(--success)",
  pwm: "var(--primary)",
  data: "#8b5cf6",
  clock: "#8b5cf6",
  uart: "#8b5cf6",
  spi: "#8b5cf6",
  i2c: "#8b5cf6",
  mechanical: "var(--muted)",
  other: "var(--muted)",
};

function PowerSwitch({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={cn(
        "inline-flex items-center gap-2 rounded-[10px] border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]",
        on ? "border-[color-mix(in_srgb,var(--success)_50%,var(--border))] bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-foreground" : "border-border bg-surface text-muted hover:text-foreground",
      )}
      data-testid="power-switch"
    >
      <Power className="size-4" aria-hidden style={{ color: on ? "var(--success)" : undefined }} />
      {on ? "Power on" : "Power off"}
    </button>
  );
}

export function PartDetail({ part, compatible }: { part: PartModel; compatible?: string[] }) {
  const [view, setView] = useState<ViewId>("model");
  const [powered, setPowered] = useState(true);
  const [feature, setFeature] = useState<string | null>(null);
  const group = PART_GROUPS.find((item) => item.id === part.group);
  const activeFeature = part.features.find((item) => item.id === feature) ?? null;

  return (
    <article aria-labelledby="part-title" data-testid="part-detail">
      <header>
        <p className="text-sm font-medium text-muted">{group?.title}</p>
        <h2 id="part-title" className="mt-1 text-3xl font-bold tracking-tight">
          {part.name}
        </h2>
        {part.aka?.length ? <p className="mt-1 font-mono text-xs text-muted">Also called {part.aka.join(", ")}</p> : null}
        <p className="mt-3 max-w-2xl text-base leading-7 text-muted">{part.summary}</p>
      </header>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl value={view} options={VIEW_OPTIONS} onChange={setView} label="View" />
        <PowerSwitch on={powered} onChange={setPowered} />
      </div>

      <div className="mt-4 overflow-hidden rounded-[var(--radius)] border border-border bg-canvas shadow-[var(--shadow-sm)]">
        {view === "model" ? (
          <div className="h-[340px] sm:h-[400px]">
            <PartModel3D model={part} powered={powered} />
          </div>
        ) : null}
        {view === "plan" ? (
          <div className="h-[340px] sm:h-[400px]">
            <PartPlanView model={part} powered={powered} activeFeature={feature} onFeature={setFeature} className="h-full" />
          </div>
        ) : null}
        {view === "flow" ? (
          <div className="p-4">
            <PartFlowView model={part} powered={powered} className="min-h-[340px]" />
          </div>
        ) : null}
      </div>

      {view === "model" ? (
        <p className="mt-2 font-mono text-xs leading-5 text-muted">
          Drag to turn, arrow keys to nudge. {part.animate?.lit?.length || part.animate?.spin?.length || part.animate?.sweep?.length ? "Switch the power off and on to see what changes." : ""} Drawn to scale from the real part&apos;s dimensions.
        </p>
      ) : null}

      {view === "plan" ? (
        <div className="mt-4">
          <p className="text-sm font-semibold">Point at any part of it</p>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2" aria-label="Features">
            {part.features.map((item) => {
              const active = item.id === feature;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setFeature(item.id)}
                    onFocus={() => setFeature(item.id)}
                    onClick={() => setFeature(active ? null : item.id)}
                    aria-pressed={active}
                    className={cn(
                      "flex w-full items-start gap-2.5 rounded-[10px] border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]",
                      active ? "border-primary bg-accent" : "border-border hover:bg-muted-bg",
                    )}
                  >
                    <span className="mt-1 font-mono text-[10px] uppercase tracking-wide text-muted">{KIND_LABEL[item.kind]}</span>{" "}
                    <span className="font-medium">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 min-h-[3rem] text-sm leading-6 text-muted" aria-live="polite">
            {activeFeature ? (
              <>
                <span className="font-semibold text-foreground">{activeFeature.label}.</span> {activeFeature.note}
              </>
            ) : (
              "Hover or tap a feature, on the drawing or in this list."
            )}
          </p>
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap items-start gap-x-6 gap-y-4">
        <div>
          <StartExperimentButton part={part} />
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
            <span className="font-medium text-foreground">{part.experiment.title}.</span> {part.experiment.idea}
          </p>
        </div>
        {part.docs ? (
          <Link href={part.docs} className="pt-2.5 text-sm font-medium text-primary underline-offset-4 hover:underline">
            Reference page
          </Link>
        ) : null}
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3" aria-label="At a glance">
        {part.facts.map((fact) => (
          <div key={fact.label}>
            <dt className="text-xs text-muted">{fact.label}</dt>
            <dd className="mt-0.5 text-sm font-medium">{fact.value}</dd>
          </div>
        ))}
      </dl>

      {compatible?.length ? (
        <p className="mt-6 text-sm leading-6 text-muted">
          <span className="font-medium text-foreground">Works with</span> {compatible.join(", ")}.
        </p>
      ) : null}

      <section className="mt-8" aria-labelledby="pins-heading">
        <h3 id="pins-heading" className="text-sm font-semibold">
          Pins
        </h3>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="py-1.5 pr-3 font-medium">Pin</th>
              <th className="py-1.5 pr-3 font-medium">Role</th>
              <th className="py-1.5 font-medium">What it does</th>
            </tr>
          </thead>
          <tbody>
            {part.pins.map((pin) => (
              <tr key={pin.name} className="border-t border-border align-top">
                <td className="py-2 pr-3 font-mono text-[13px]">{pin.name}</td>
                <td className="py-2 pr-3">
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium">
                    <span aria-hidden className="size-1.5 rounded-full" style={{ background: ROLE_TONE[pin.role] }} />
                    {ROLE_LABEL[pin.role]}
                  </span>
                </td>
                <td className="py-2 leading-6 text-muted">{pin.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </article>
  );
}
