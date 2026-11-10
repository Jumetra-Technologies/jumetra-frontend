"use client";

import { useState, type ReactNode } from "react";
import { Box, Grid2x2, Power, Zap } from "lucide-react";
import { PART_GROUPS } from "@kiungo/core/parts";
import type { PartModel } from "@kiungo/core/parts/types";
import { cn } from "@kiungo/ui/cn";
import { SegmentedControl } from "@kiungo/ui/segmented-control";
import { VIEW_COPY } from "@kiungo/ui/views";
import { PartFlowView } from "../views/PartFlowView";
import { PartModel3D } from "../views/PartModel3D";
import { KIND_LABEL, PartPlanView } from "../views/PartPlanView";
import { ROLE_COLOR, ROLE_LABEL, rolesOf } from "../views/pin-roles";
import { PartSpecPanel } from "./PartSpec";

export type ViewId = "model" | "plan" | "flow";

export const VIEW_OPTIONS: Array<{ id: ViewId; label: string; description: string; info: string; icon: ReactNode }> = [
  { id: "model", label: VIEW_COPY["3d"].label, description: VIEW_COPY["3d"].description, info: "The part as it sits on the bench, drawn to scale. Drag to turn it and see how it's built.", icon: <Box className="size-4" aria-hidden /> },
  { id: "plan", label: VIEW_COPY["2d"].label, description: VIEW_COPY["2d"].description, info: "A flat view from above with every pin named where it is, on a millimeter grid. Point at a pin or a feature to read what it does.", icon: <Grid2x2 className="size-4" aria-hidden /> },
  { id: "flow", label: VIEW_COPY.trace.label, description: "Trace: what is inside and where the current goes", info: "The current and signals drawn over the part itself, beside a diagram of what each block does. Use it to understand how the part works before you wire it.", icon: <Zap className="size-4" aria-hidden /> },
];

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

/**
 * One part, in full: its three views, what it does, the engineering data
 * behind it and its pins. Shared by the website's Component library and the
 * desktop app's. The host passes what differs: its buttons (`actions`), a
 * link to its reference page, and how to open another part or a shop link.
 */
export function PartDetail({
  part,
  compatible,
  actions,
  reference,
  onOpenPart,
  onOpenLink,
}: {
  part: PartModel;
  compatible?: string[];
  /** The host's buttons, shown under the views beside the suggested experiment. */
  actions?: ReactNode;
  /** A link to the part's reference page, when the host has one. */
  reference?: ReactNode;
  /** Opens another part: the better alternative its spec names. */
  onOpenPart?: (id: string) => void;
  /** Opens a shop link. Without it, shop links open in a new tab. */
  onOpenLink?: (url: string) => void;
}) {
  const [view, setView] = useState<ViewId>("model");
  const [powered, setPowered] = useState(true);
  const [feature, setFeature] = useState<string | null>(null);
  const [pin, setPin] = useState<string | null>(null);
  const group = PART_GROUPS.find((item) => item.id === part.group);
  const activeFeature = part.features.find((item) => item.id === feature) ?? null;
  const spots = part.pinSpots ?? [];
  const activePin = spots.find((item) => item.id === pin) ?? null;
  const moves = part.animate?.lit?.length || part.animate?.spin?.length || part.animate?.sweep?.length;

  return (
    <article aria-labelledby="part-title" data-testid="part-detail" data-part={part.id}>
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
          <div className="h-[360px] sm:h-[440px]">
            <PartPlanView model={part} powered={powered} activeFeature={feature} onFeature={setFeature} activePin={pin} onPin={setPin} className="h-full" />
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
          Drag to turn, arrow keys to nudge. {moves ? "Switch the power off and on to see what changes." : ""} Drawn to scale from the real part&apos;s dimensions.
        </p>
      ) : null}

      {view === "plan" ? (
        <div className="mt-3">
          {spots.length ? (
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted" aria-label="Pin colors">
              {rolesOf(spots).map((role) => (
                <li key={role} className="inline-flex items-center gap-1.5">
                  <span aria-hidden className="size-2 rounded-full" style={{ background: ROLE_COLOR[role] }} />
                  {ROLE_LABEL[role]}
                </li>
              ))}
            </ul>
          ) : null}
          <p className="mt-3 min-h-[3rem] rounded-[10px] border border-border bg-surface px-4 py-2.5 text-sm leading-6 text-muted" aria-live="polite">
            {activePin ? (
              <>
                <span className="font-mono font-semibold text-foreground">{activePin.label}.</span> {activePin.note}
              </>
            ) : activeFeature ? (
              <>
                <span className="font-semibold text-foreground">{activeFeature.label}.</span> {activeFeature.note}
              </>
            ) : (
              "Point at a pin's label or at any part of the drawing to read what it does."
            )}
          </p>
          <p className="mt-4 text-sm font-semibold">Point at any part of it</p>
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
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap items-start gap-x-6 gap-y-4">
        <div>
          {actions}
          <p className={cn("max-w-sm text-sm leading-6 text-muted", actions ? "mt-2" : "")}>
            <span className="font-medium text-foreground">{part.experiment.title}.</span> {part.experiment.idea}
          </p>
        </div>
        {reference ? <div className="pt-2.5">{reference}</div> : null}
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

      <PartSpecPanel part={part} onOpenPart={onOpenPart} onOpenLink={onOpenLink} />

      <section className="mt-10" aria-labelledby="pins-heading">
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
            {part.pins.map((item) => (
              <tr key={item.name} className="border-t border-border align-top">
                <td className="py-2 pr-3 font-mono text-[13px]">{item.name}</td>
                <td className="py-2 pr-3">
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium">
                    <span aria-hidden className="size-1.5 rounded-full" style={{ background: ROLE_COLOR[item.role] }} />
                    {ROLE_LABEL[item.role]}
                  </span>
                </td>
                <td className="py-2 leading-6 text-muted">{item.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </article>
  );
}
