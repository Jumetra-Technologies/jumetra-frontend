/**
 * Resistor values: how they are written, their color bands, and the
 * library's resistor recolored for a value set in the lab. The part itself
 * is `catalog/prototyping/resistor.ts`.
 */

import { shade } from "../build";
import type { PartModel } from "../types";
import { E24, formatQuantity, isE24, nearestE24 } from "../../lab/units";
import { LED_SERIES_OHMS } from "../../lab/constants";

/** Values most kits have, in ohms: offered first as quick picks. */
export const RESISTOR_VALUES = [100, 220, 330, 470, 1000, 2200, 4700, 10000] as const;
/** The quick picks shown before the E24 chips: what an LED, a pull-up and a divider usually need. */
export const RESISTOR_PRESETS = [220, 1000, 10000] as const;
export const DEFAULT_OHMS = LED_SERIES_OHMS;
/** The range a resistor can be set to in the lab (decision D-3). */
export const MIN_OHMS = 0.1;
export const MAX_OHMS = 10e6;

/** Tolerances a resistor can be set to, in percent. ±5 % parts are the E24 series; ±1 % the default for metal film. */
export const TOLERANCES = [5, 1] as const;
export type Tolerance = (typeof TOLERANCES)[number];
export const DEFAULT_TOLERANCE: Tolerance = 5;

/** The E24 chips for a decade: 1.0 Ω … 9.1 Ω times 10^decade. */
export const e24Decade = (decade: number) => E24.map((m) => Number((m * 10 ** decade).toPrecision(2)));

const DIGIT_COLORS = ["#1b1b1b", "#7a4a1e", "#d32f2f", "#f28c28", "#f4d03f", "#2e8b57", "#2f6fd6", "#7d3cb5", "#8a8f96", "#f4f4f4"];
const GOLD = "#c9a646";
const SILVER = "#b8bcc2";
const TOLERANCE_COLOR: Record<Tolerance, string> = { 5: GOLD, 1: DIGIT_COLORS[1] };

/** "220 Ω", "4.7 kΩ", "10 MΩ", "4.7 Ω". */
export function formatOhms(ohms: number): string {
  return formatQuantity(ohms, "resistance");
}

export interface ResistorBands {
  /** Two digits, a multiplier, a tolerance. */
  colors: [string, string, string, string];
  /** The value the bands spell: `ohms` rounded to the nearest E24 value. */
  shownOhms: number;
  /** False when the value set isn't on the E24 series, so the bands spell `shownOhms` instead. */
  exact: boolean;
}

/**
 * The bands of a four-band resistor: two significant digits and a multiplier
 * (gold is ×0.1, silver ×0.01), then the tolerance (gold ±5 %, brown ±1 %).
 * A value off the E24 series is shown as the nearest E24 value, and says so.
 */
export function resistorBandsFor(ohms: number, tolerance: Tolerance = DEFAULT_TOLERANCE): ResistorBands {
  const value = Math.min(MAX_OHMS, Math.max(MIN_OHMS, ohms > 0 ? ohms : DEFAULT_OHMS));
  const shown = nearestE24(value);
  // shown = d1.d2 × 10^e, so the two digits are d1 d2 and the multiplier is 10^(e − 1).
  const exponent = Math.floor(Math.log10(shown) + 1e-9);
  const digits = Math.round(shown / 10 ** (exponent - 1));
  const multiplier = exponent - 1;
  const multiplierColor = multiplier === -1 ? GOLD : multiplier === -2 ? SILVER : DIGIT_COLORS[multiplier];
  return {
    colors: [DIGIT_COLORS[Math.floor(digits / 10)], DIGIT_COLORS[digits % 10], multiplierColor, TOLERANCE_COLOR[tolerance] ?? GOLD],
    shownOhms: shown,
    exact: isE24(value) && value === ohms,
  };
}

/** The four band colors for `ohms` (see `resistorBandsFor`). */
export function resistorBands(ohms: number, tolerance: Tolerance = DEFAULT_TOLERANCE): [string, string, string, string] {
  return resistorBandsFor(ohms, tolerance).colors;
}

/** Recolored resistors, most recently used last; bounded so typing values can't grow it without end. */
const CACHE_SIZE = 64;
const valueCache = new Map<string, PartModel>();

/** How many recolored resistors are kept (for tests). */
export const resistorCacheSize = () => valueCache.size;

/** The resistor model with bands and name for `ohms`. */
export function withResistorValue(model: PartModel, ohms: number, tolerance: Tolerance = DEFAULT_TOLERANCE): PartModel {
  if (model.id !== "resistor") return model;
  const key = `${ohms}|${tolerance}`;
  const cached = valueCache.get(key);
  if (cached) {
    valueCache.delete(key);
    valueCache.set(key, cached);
    return cached;
  }
  const { colors } = resistorBandsFor(ohms, tolerance);
  const next: PartModel = {
    ...model,
    name: `Resistor (${formatOhms(ohms)})`,
    solids: model.solids.map((s) => {
      if ((s.kind !== "box" && s.kind !== "cyl") || !s.id?.startsWith("band-")) return s;
      const color = colors[Number(s.id.slice(5)) - 1];
      return { ...s, top: color, side: shade(color, 0.75), fill: color };
    }),
  };
  valueCache.set(key, next);
  if (valueCache.size > CACHE_SIZE) valueCache.delete(valueCache.keys().next().value!);
  return next;
}
