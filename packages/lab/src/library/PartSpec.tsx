"use client";

import type { ReactNode } from "react";
import { ArrowUpRight, Flame, Ruler, ShoppingBag, TriangleAlert, Zap } from "lucide-react";
import { getPart } from "@kiungo/core/parts";
import { bridgeDrop, bridgeLoss, converterEfficiency, converterLoss, typicalHeat } from "@kiungo/core/parts/power";
import type { PartModel, PartSpec as Spec } from "@kiungo/core/parts/types";
import { vendorLinksFor } from "@kiungo/core/parts/vendor-links";
import { cn } from "@kiungo/ui/cn";
import { LIFECYCLE_LABEL, MOUNT_LABEL, current, lawLabel, price, voltRange, volts, watts } from "./format";

function Card({ title, icon, children, testId }: { title: string; icon: ReactNode; children: ReactNode; testId: string }) {
  return (
    <section className="rounded-[12px] border border-border bg-surface p-4" data-testid={testId}>
      <h4 className="flex items-center gap-2 text-sm font-semibold">
        <span aria-hidden className="text-muted">
          {icon}
        </span>
        {title}
      </h4>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Rows({ rows }: { rows: Array<[string, ReactNode] | null | false | undefined> }) {
  const shown = rows.filter((row): row is [string, ReactNode] => !!row);
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
      {shown.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted">{label}</dt>
          <dd className="font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Idle, working and worst-case current as three bars to one scale. */
function DrawBars({ draw }: { draw: NonNullable<Spec["power"]["draw"]> }) {
  const items: Array<[string, number]> = [
    ["Idle", draw.idle],
    ["Working", draw.active],
    ...(draw.peak !== undefined ? ([["Peak", draw.peak]] as Array<[string, number]>) : []),
  ];
  const top = Math.max(...items.map((item) => item[1]), 0.001);
  return (
    <ul className="mt-3 space-y-1.5" aria-label="Current it draws">
      {items.map(([label, ma], i) => (
        <li key={label} className="grid grid-cols-[4.2rem_minmax(0,1fr)_4.6rem] items-center gap-2 text-xs">
          <span className="text-muted">{label}</span>
          <span className="h-2 overflow-hidden rounded-full bg-muted-bg" aria-hidden>
            <span className="block h-full rounded-full" style={{ width: `${Math.max(3, (ma / top) * 100)}%`, background: i === 2 ? "var(--warning)" : "var(--primary)" }} />
          </span>
          <span className="text-right font-mono tabular-nums">{current(ma)}</span>
        </li>
      ))}
    </ul>
  );
}

function PowerCard({ spec }: { spec: Spec }) {
  const p = spec.power;
  return (
    <Card title="Power" icon={<Zap className="size-4" />} testId="spec-power">
      <Rows
        rows={[
          p.supply && ["Supply", `${voltRange(p.supply.min, p.supply.max)}${p.supply.typ !== undefined && p.supply.min !== p.supply.max ? `, usually ${volts(p.supply.typ)}` : ""}`],
          p.logic !== undefined && ["Signals", `${volts(p.logic)}${p.tolerant5V === undefined ? "" : p.tolerant5V ? ", inputs take 5 V" : p.logic < 5 ? ", inputs do not take 5 V" : ""}`],
          p.source && ["Gives", `${volts(p.source.volts)}, up to ${current(p.source.maxMa)}`],
          p.source?.capacityMah !== undefined && ["Holds", `${p.source.capacityMah} mAh${p.source.chemistry ? ` (${p.source.chemistry})` : ""}`],
          p.source?.ohms !== undefined && ["Sags", `${volts(p.source.ohms)} for every amp drawn`],
          p.converter && ["Type", lawLabel(p.converter.law)],
          p.converter && ["Output", `${volts(p.converter.volts)}${p.converter.adjustable ? ` (set between ${voltRange(...p.converter.adjustable)})` : ""}, up to ${current(p.converter.maxMa)}`],
          p.converter?.law !== undefined && p.converter.law !== "linear" && p.converter.efficiency !== undefined && ["Efficiency", `about ${Math.round(p.converter.efficiency * 100)} %`],
          p.converter?.dropout !== undefined && ["Needs", `${volts(p.converter.dropout)} more at its input than it gives`],
          p.bridge && ["Passes", `${current(p.bridge.maxMa)}${p.bridge.channels > 1 ? ` per channel, ${p.bridge.channels} channels` : ""}${p.bridge.peakMa ? `; ${current(p.bridge.peakMa)} for a moment` : ""}`],
          p.bridge && (p.bridge.ohms || p.bridge.dropV) ? ["Loses", `${volts(bridgeDrop(p.bridge, Math.min(1, p.bridge.maxMa / 1000)))} at ${current(Math.min(1000, p.bridge.maxMa))}`] : null,
          p.motor && ["Rated", `${volts(p.motor.ratedV)}${p.motor.rpm ? `, ${p.motor.rpm} rpm with no load` : ""}`],
          p.motor && ["Running", current(p.motor.runMa)],
          p.motor && ["Stalled", current(p.motor.stallMa)],
          p.motor?.torque ? ["Torque", p.motor.torque] : null,
          p.gpio && ["Each pin", `${current(p.gpio.maxMa)}${p.gpio.totalMa ? `, ${current(p.gpio.totalMa)} for all pins together` : ""}`],
          p.interface ? ["Talks by", p.interface] : null,
        ]}
      />
      {p.rails?.length ? (
        <ul className="mt-3 space-y-1 text-sm" aria-label="What its supply pins give">
          {p.rails.map((rail) => (
            <li key={rail.pin} className="flex items-baseline justify-between gap-3">
              <span className="font-mono text-[13px]">{rail.pin}</span>
              <span className="text-muted">
                {volts(rail.volts)}, up to <span className="font-medium text-foreground">{current(rail.maxMa)}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {p.draw ? <DrawBars draw={p.draw} /> : null}
      {p.note ? <p className="mt-3 text-xs leading-5 text-muted">{p.note}</p> : null}
    </Card>
  );
}

function HeatCard({ spec }: { spec: Spec }) {
  const thermal = spec.thermal!;
  const heat = typicalHeat(spec);
  const share = heat ? Math.min(1, heat.tempC / thermal.maxC) : 0;
  return (
    <Card title="Heat" icon={<Flame className="size-4" />} testId="spec-heat">
      {heat ? (
        <>
          <p className="flex items-baseline gap-2">
            <span className={cn("text-2xl font-bold tabular-nums", heat.over ? "text-danger" : "")}>≈ {Math.round(heat.tempC)} °C</span>
            <span className="text-xs text-muted">limit {thermal.maxC} °C</span>
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted-bg" role="img" aria-label={`About ${Math.round(heat.tempC)} degrees of a ${thermal.maxC} degree limit`}>
            <span className="block h-full rounded-full" style={{ width: `${share * 100}%`, background: heat.over ? "var(--danger)" : share > 0.7 ? "var(--warning)" : "var(--success)" }} />
          </div>
          <p className="mt-2 text-sm leading-6 text-muted">
            {watts(heat.watts)} lost as heat {heat.condition}, in a 25 °C room.
          </p>
        </>
      ) : null}
      <Rows rows={[["Warms by", `${thermal.thetaCW} °C for every watt it loses`], !heat && ["Limit", `${thermal.maxC} °C`]]} />
      {thermal.note ? <p className="mt-3 text-xs leading-5 text-muted">{thermal.note}</p> : null}
    </Card>
  );
}

function FormCard({ part, spec }: { part: PartModel; spec: Spec }) {
  const f = spec.form;
  const holes = f.holes ?? [];
  const sizes = [...new Set(holes.map((hole) => hole.d))];
  return (
    <Card title="Form factor" icon={<Ruler className="size-4" />} testId="spec-form">
      <Rows
        rows={[
          ["Size", `${part.size.w} × ${part.size.h} × ${part.size.d} mm`],
          f.mass !== undefined && ["Weighs", `${f.mass} g`],
          ["Joins by", MOUNT_LABEL[f.mount]],
          f.pitch !== undefined && ["Pin pitch", `${f.pitch} mm`],
          holes.length > 0 && ["Mounting", `${holes.length} hole${holes.length === 1 ? "" : "s"}, ${sizes.map((d) => `${d} mm`).join(" and ")} across`],
        ]}
      />
      {f.note ? <p className="mt-3 text-xs leading-5 text-muted">{f.note}</p> : null}
    </Card>
  );
}

function SourcingCard({ part, spec, onOpenLink }: { part: PartModel; spec: Spec; onOpenLink?: (url: string) => void }) {
  const s = spec.sourcing;
  const links = vendorLinksFor(part);
  return (
    <Card title="Sourcing" icon={<ShoppingBag className="size-4" />} testId="spec-sourcing">
      <Rows
        rows={[
          ["Ask for", <span key="mpn" className="font-mono text-[13px]">{s.mpn}</span>],
          s.maker ? ["Made by", s.maker] : null,
          [
            "Status",
            <span key="life" className={cn(s.lifecycle === "nrnd" || s.lifecycle === "obsolete" ? "text-warning" : "")} data-lifecycle={s.lifecycle}>
              {LIFECYCLE_LABEL[s.lifecycle]}
            </span>,
          ],
          s.usd && ["Costs about", price(s.usd)],
        ]}
      />
      {s.note ? <p className="mt-3 text-xs leading-5 text-muted">{s.note}</p> : null}
      <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm">
        <span className="text-muted">Find it at</span>
        {links.map((link) =>
          onOpenLink ? (
            <button key={link.vendor} type="button" onClick={() => onOpenLink(link.url)} className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-[var(--ring)]">
              {link.vendor}
            </button>
          ) : (
            <a key={link.vendor} href={link.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline-offset-4 hover:underline">
              {link.vendor}
            </a>
          ),
        )}
      </p>
    </Card>
  );
}

/** The same job done by this part and by the better one, in numbers, when both specs say enough. */
function comparison(part: PartModel, other: PartModel): string | null {
  const a = part.spec?.power;
  const b = other.spec?.power;
  if (!a || !b) return null;
  if (a.bridge && b.bridge) {
    const ma = Math.min(1000, a.bridge.maxMa, b.bridge.maxMa);
    const amps = ma / 1000;
    return `At ${current(ma)}: this part loses ${volts(bridgeDrop(a.bridge, amps))} (${watts(bridgeLoss(a.bridge, amps))} of heat); the ${other.name} loses ${volts(bridgeDrop(b.bridge, amps))} (${watts(bridgeLoss(b.bridge, amps))}).`;
  }
  if (a.converter && b.converter && a.converter.law !== "pass" && b.converter.law !== "pass" && Math.abs(a.converter.volts - b.converter.volts) < 0.6) {
    const vin = a.converter.volts + 4;
    const ma = Math.min(300, a.converter.maxMa, b.converter.maxMa);
    return `Giving ${current(ma)} at ${volts(a.converter.volts)} from ${volts(vin)}: this part wastes ${watts(converterLoss(a.converter, vin, ma / 1000))} (${Math.round(converterEfficiency(a.converter, vin) * 100)} % efficient); the ${other.name} wastes ${watts(converterLoss(b.converter, vin, ma / 1000))} (${Math.round(converterEfficiency(b.converter, vin) * 100)} %).`;
  }
  if (a.source && b.source) {
    const sag = (ohms?: number) => (ohms !== undefined ? volts(ohms) : null);
    const mine = sag(a.source.ohms);
    const theirs = sag(b.source.ohms);
    if (mine && theirs) return `Drawing 1 A: this pack sags by ${mine}; the ${other.name} by ${theirs}.`;
  }
  if (a.draw && b.draw && a.supply && b.supply) return `Working, this part draws ${current(a.draw.active)}; the ${other.name} draws ${current(b.draw.active)}.`;
  return null;
}

/**
 * The engineering data behind a part: what it needs and draws, how warm it
 * gets, how it mounts, what to ask for when buying it, where it falls short
 * and what to use instead.
 */
export function PartSpecPanel({ part, onOpenPart, onOpenLink }: { part: PartModel; onOpenPart?: (id: string) => void; onOpenLink?: (url: string) => void }) {
  const spec = part.spec;
  if (!spec) return null;
  return (
    <section className="mt-10" aria-labelledby="spec-heading" data-testid="part-spec">
      <h3 id="spec-heading" className="text-sm font-semibold">
        Engineering data
      </h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <PowerCard spec={spec} />
        {spec.thermal ? <HeatCard spec={spec} /> : null}
        <FormCard part={part} spec={spec} />
        <SourcingCard part={part} spec={spec} onOpenLink={onOpenLink} />
      </div>

      {spec.limits?.length ? (
        <div className="mt-6" data-testid="spec-limits">
          <h4 className="flex items-center gap-2 text-sm font-semibold">
            <TriangleAlert className="size-4 text-warning" aria-hidden />
            Know its limits
          </h4>
          <ul className="mt-2 space-y-1.5 text-sm leading-6 text-muted">
            {spec.limits.map((limit) => (
              <li key={limit} className="flex gap-2.5">
                <span aria-hidden className="mt-[0.6rem] size-1.5 shrink-0 rounded-full bg-[var(--warning)]" />
                <span>{limit}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {spec.upgrade?.length ? (
        <div className="mt-6" data-testid="spec-upgrade">
          <h4 className="text-sm font-semibold">Better for a new build</h4>
          <ul className="mt-2 grid gap-3 sm:grid-cols-2">
            {spec.upgrade.map((upgrade) => {
              const other = upgrade.part ? getPart(upgrade.part) : undefined;
              const numbers = other ? comparison(part, other) : null;
              return (
                <li key={upgrade.name} className="rounded-[12px] border border-[color-mix(in_srgb,var(--success)_40%,var(--border))] bg-[color-mix(in_srgb,var(--success)_6%,var(--surface))] p-4">
                  {other && onOpenPart ? (
                    <button type="button" onClick={() => onOpenPart(other.id)} className="inline-flex items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-[var(--ring)]" data-upgrade={other.id}>
                      {upgrade.name}
                      <ArrowUpRight className="size-3.5" aria-hidden />
                    </button>
                  ) : (
                    <p className="text-sm font-semibold">{upgrade.name}</p>
                  )}
                  <p className="mt-1.5 text-sm leading-6 text-muted">{upgrade.why}</p>
                  {numbers ? <p className="mt-2 rounded-[8px] bg-surface px-3 py-2 font-mono text-xs leading-5">{numbers}</p> : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
