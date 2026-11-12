"use client";

import { useId, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@kiungo/ui/button";
import { SOURCE_AUTO, SOURCE_KEY, SOURCE_SET, controlsFor, inputOf, readoutsFor, type Control, type NumberControl } from "@kiungo/core/lab/controls";
import { QUANTITIES, formatQuantity, formatRange, isE24, parseQuantity } from "@kiungo/core/lab/units";
import { e24Decade, formatOhms, resistorBandsFor } from "@kiungo/core/parts/models/passives";
import { useLab } from "./store";
import type { LabNode, NodeInputs } from "@kiungo/core/lab/types";
import { cn } from "@kiungo/ui/cn";
import { useLabContext } from "./lab-context";

/**
 * The part's inputs in the Inspector: a sensor's surroundings, an actuator's
 * command or a board's sketch settings. Values go to the session, so the
 * next frame of the simulation reads them, running or not.
 */
export function InputsPanel({ node }: { node: LabNode }) {
  const { session, analysis, frame } = useLabContext();
  const setInput = useLab((s) => s.setInput);
  const clearInputs = useLab((s) => s.clearInputs);
  const values: NodeInputs = session.inputs?.[node.id] ?? {};
  const { title, controls, note } = controlsFor(node, session.nodes, analysis);
  const touched = Object.keys(values).length > 0;
  const held = inputOf(session.inputs, node.id, SOURCE_KEY, SOURCE_AUTO) === SOURCE_SET;
  const hasSource = controls.some((c) => c.key === SOURCE_KEY);

  if (!controls.length && !note) return null;

  return (
    <section className="border-b border-border px-4 py-4 last:border-0" data-testid="inputs-panel">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{title}</h3>
        {touched ? (
          <button type="button" onClick={() => clearInputs(node.id)} className="inline-flex items-center gap-1 text-[11px] font-medium text-muted hover:text-foreground" data-testid="inputs-reset">
            <RotateCcw className="size-3" aria-hidden /> Defaults
          </button>
        ) : null}
      </div>
      {note ? <p className="text-[12px] leading-5 text-muted">{note}</p> : null}
      <div className="space-y-3">
        {controls.map((control) => (
          <Field key={control.key} control={control} value={values[control.key]} dimmed={hasSource && control.key !== SOURCE_KEY && !held} onChange={(v) => setInput(node.id, control.key, v, frame.t)} />
        ))}
        {node.partId === "stepper-motor" ? <StepperCommands nodeId={node.id} t={frame.t} /> : null}
      </div>
      <Readouts partId={node.partId} values={values} />
      {hasSource && !held ? <p className="mt-2 text-[11px] leading-4 text-muted">Showing the lab&apos;s simulated signal. Change a value to take over.</p> : null}
    </section>
  );
}

function Field({ control, value, dimmed, onChange }: { control: Control; value: number | string | boolean | undefined; dimmed: boolean; onChange: (v: number | string | boolean) => void }) {
  const id = `input-${control.key}`;
  if (control.kind === "select") {
    const current = typeof value === "string" ? value : control.default;
    return (
      <label className="flex items-center justify-between gap-3 text-[13px]" htmlFor={id}>
        <span className="text-foreground">{control.label}</span>
        <select id={id} value={current} onChange={(e) => onChange(e.target.value)} className="h-8 max-w-[11rem] rounded-[8px] border border-border bg-surface px-2 text-[12.5px]" data-testid={`input-${control.key}`}>
          {control.options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    );
  }
  if (control.kind === "toggle") {
    const current = typeof value === "boolean" ? value : control.default;
    return (
      <div className={cn("flex items-center justify-between gap-3 text-[13px]", dimmed && "opacity-70")}>
        <span className="text-foreground">{control.label}</span>
        <div role="radiogroup" aria-label={control.label} className="inline-flex rounded-[8px] border border-border p-0.5" data-testid={`input-${control.key}`}>
          {[
            [true, control.on],
            [false, control.off],
          ].map(([v, label]) => (
            <button
              key={String(v)}
              type="button"
              role="radio"
              aria-checked={current === v}
              onClick={() => onChange(v as boolean)}
              className={cn("rounded-[6px] px-2.5 py-1 text-[12px] font-medium transition-colors", current === v ? "bg-primary text-primary-foreground" : "text-muted hover:text-foreground")}
            >
              {label as string}
            </button>
          ))}
        </div>
      </div>
    );
  }
  return <NumberField control={control} value={typeof value === "number" ? value : undefined} dimmed={dimmed} onChange={onChange} />;
}

/** A slider's position (0–1) for a value, and back: linear, or log for quantities spanning decades. */
function sliderPos(control: NumberControl, v: number): number {
  if (control.slider === "log") {
    const lo = Math.log10(Math.max(1, control.min));
    const hi = Math.log10(control.max);
    return (Math.log10(Math.max(1, v)) - lo) / (hi - lo);
  }
  return (v - control.min) / (control.max - control.min || 1);
}
function sliderValue(control: NumberControl, pos: number): number {
  if (control.slider === "log") {
    const lo = Math.log10(Math.max(1, control.min));
    const hi = Math.log10(control.max);
    return Number((10 ** (lo + pos * (hi - lo))).toPrecision(2));
  }
  const raw = control.min + pos * (control.max - control.min);
  return Number((Math.round(raw / control.step) * control.step).toPrecision(12));
}

/**
 * A number in SI, typed with or without a prefix and unit ("4.7k", "4k7",
 * "300 mm", "45°"). It's kept when Enter is pressed or the field is left; a
 * value that isn't a number, or is outside the part's range, is refused with
 * a message under the field, never clamped silently.
 */
export function NumberField({ control, value, dimmed, onChange }: { control: NumberControl; value: number | undefined; dimmed: boolean; onChange: (v: number) => void }) {
  const id = useId();
  const current = value ?? control.default;
  const shownText = formatQuantity(current, control.quantity);
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const q = QUANTITIES[control.quantity];
  const range = formatRange(control.min, control.max, control.quantity);

  const commit = (text: string) => {
    const parsed = parseQuantity(text, control.quantity);
    if (!parsed.ok) return setError(parsed.error);
    // Tolerate rounding at the ends of the range (0.1 Ω typed as "100m"…).
    const v = parsed.value;
    const eps = Math.abs(control.max - control.min) * 1e-9;
    if (v < control.min - eps || v > control.max + eps) return setError(`${formatQuantity(v, control.quantity)} is outside ${range}.`);
    setError(null);
    setDraft(null);
    onChange(control.digits ? Number(v.toPrecision(control.digits)) : v);
  };

  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const isResistance = control.quantity === "resistance" && control.key === "ohms";
  const bands = isResistance ? resistorBandsFor(current) : null;
  const decade = Math.floor(Math.log10(Math.max(current, 0.1)) + 1e-9);

  return (
    <div className={cn(dimmed && "opacity-70")} data-testid={`field-${control.key}`}>
      <div className="flex items-center justify-between gap-3 text-[13px]">
        <label htmlFor={id} className="text-foreground" title={q.note}>
          {control.label}
        </label>
        <span className="inline-flex items-center gap-1">
          <input
            id={id}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            value={draft ?? shownText}
            aria-invalid={error ? true : undefined}
            aria-describedby={`${helpId}${error ? ` ${errorId}` : ""}`}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => {
              setDraft(e.target.value);
              if (error) setError(null);
            }}
            onBlur={() => {
              if (draft !== null && draft !== shownText) commit(draft);
              else setDraft(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit(draft ?? shownText);
              } else if (e.key === "Escape" && (draft !== null || error)) {
                e.stopPropagation();
                setDraft(null);
                setError(null);
              }
            }}
            className={cn("h-7 w-28 rounded-[8px] border bg-surface px-2 text-right font-mono text-[12.5px] tabular-nums", error ? "border-danger" : "border-border")}
            data-testid={`input-${control.key}`}
          />
          <button
            type="button"
            onClick={() => {
              setDraft(null);
              setError(null);
              onChange(control.default);
            }}
            disabled={value === undefined || value === control.default}
            aria-label={`Reset ${control.label} to ${formatQuantity(control.default, control.quantity)}`}
            title={`Reset to ${formatQuantity(control.default, control.quantity)}`}
            className="grid size-6 place-items-center rounded-[6px] text-muted hover:bg-muted-bg hover:text-foreground disabled:opacity-30"
            data-testid={`reset-${control.key}`}
          >
            <RotateCcw className="size-3" aria-hidden />
          </button>
        </span>
      </div>
      {control.slider ? (
        <input
          type="range"
          aria-label={`${control.label} slider`}
          aria-valuetext={shownText}
          min={0}
          max={1000}
          step={1}
          value={Math.round(Math.min(1, Math.max(0, sliderPos(control, current))) * 1000)}
          onChange={(e) => {
            setDraft(null);
            setError(null);
            onChange(sliderValue(control, Number(e.target.value) / 1000));
          }}
          className="mt-1.5 w-full accent-[var(--primary)]"
        />
      ) : null}
      {control.presets?.length ? (
        <div className="mt-1.5 flex flex-wrap gap-1" role="group" aria-label={`Common ${control.label.toLowerCase()} values`}>
          {[...control.presets, ...(isResistance ? e24Decade(decade).filter((v) => !control.presets!.includes(v) && v >= control.min && v <= control.max) : [])].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => {
                setDraft(null);
                setError(null);
                onChange(v);
              }}
              aria-pressed={v === current}
              className={cn("rounded-full border px-2 py-0.5 font-mono text-[11px] tabular-nums", v === current ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted hover:text-foreground")}
            >
              {formatQuantity(v, control.quantity)}
            </button>
          ))}
        </div>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="mt-1 text-[11px] leading-4 text-danger" data-testid={`error-${control.key}`}>
          {error}
        </p>
      ) : null}
      <p id={helpId} className="mt-0.5 text-[11px] leading-4 text-muted">
        {range}
        {control.help ? `. ${control.help}` : ""}
      </p>
      {bands && !bands.exact ? (
        <p className="mt-0.5 text-[11px] leading-4 text-muted" data-testid="resistor-shown-as">
          Bands show {formatOhms(bands.shownOhms)}, the nearest standard (E24) value{isE24(current) ? "" : `; the circuit uses ${formatOhms(current)}`}.
        </p>
      ) : null}
    </div>
  );
}

/** What the settings come to, read-only: an LDR's resistance, a potentiometer's wiper. */
function Readouts({ partId, values }: { partId: string; values: NodeInputs }) {
  const rows = readoutsFor(partId, values);
  if (!rows.length) return null;
  return (
    <dl className="mt-3 space-y-1 rounded-[10px] bg-canvas px-2.5 py-2 text-[12px]" data-testid="inputs-readouts">
      {rows.map((r) => (
        <div key={r.label} className="flex justify-between gap-2">
          <dt className="text-muted">{r.label}</dt>
          <dd className="font-mono tabular-nums text-foreground">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Move the stepper by a number of steps from where it is now. */
function StepperCommands({ nodeId, t }: { nodeId: string; t: number }) {
  const commandStepper = useLab((s) => s.commandStepper);
  const zeroStepper = useLab((s) => s.zeroStepper);
  const [steps, setSteps] = useState(512);
  return (
    <div className="rounded-[10px] border border-border bg-canvas p-2.5" data-testid="stepper-commands">
      <div className="flex items-center gap-2 text-[13px]">
        <label htmlFor="input-steps" className="text-foreground">
          Move
        </label>
        <input id="input-steps" type="number" inputMode="numeric" step={1} value={steps} onChange={(e) => setSteps(Math.round(Number(e.target.value) || 0))} className="h-7 w-20 rounded-[8px] border border-border bg-surface px-2 text-right font-mono text-[12.5px] tabular-nums" data-testid="input-steps" />
        <span className="text-[11px] text-muted">steps</span>
        <Button size="sm" className="ml-auto h-7 text-[11px]" onClick={() => commandStepper(nodeId, steps, t)} data-testid="stepper-go">
          Go
        </Button>
      </div>
      <p className="mt-1 text-[11px] leading-4 text-muted">Positive is clockwise. 2048 steps is one turn of the shaft.</p>
      <div className="mt-2 flex gap-1.5">
        <Button size="sm" variant="secondary" className="h-7 text-[11px]" onClick={() => commandStepper(nodeId, 0, t)} data-testid="stepper-stop">
          Stop
        </Button>
        <Button size="sm" variant="secondary" className="h-7 text-[11px]" onClick={() => zeroStepper(nodeId, t)} data-testid="stepper-zero">
          Zero position
        </Button>
      </div>
    </div>
  );
}
