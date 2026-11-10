/**
 * Resistor values: the ones a kit has, how they are written, their color
 * bands, and the library's resistor recolored for a value set in the lab.
 * The part itself is `catalog/prototyping/resistor.ts`.
 */

import { shade } from "../build";
import type { PartModel } from "../types";

/** Values a kit has, in ohms. */
export const RESISTOR_VALUES = [100, 220, 330, 470, 1000, 2200, 4700, 10000] as const;
export const DEFAULT_OHMS = 220;

const DIGIT_COLORS = ["#1b1b1b", "#7a4a1e", "#d32f2f", "#f28c28", "#f4d03f", "#2e8b57", "#2f6fd6", "#7d3cb5", "#8a8f96", "#f4f4f4"];
const GOLD = "#c9a646";

/** "220 Ω", "4.7 kΩ", "10 kΩ". */
export function formatOhms(ohms: number): string {
  if (ohms >= 1000) {
    const k = ohms / 1000;
    return `${Number.isInteger(k) ? k : k.toFixed(1)} kΩ`;
  }
  return `${ohms} Ω`;
}

/** The four bands of a 5 % resistor: two digits, a multiplier, gold. */
export function resistorBands(ohms: number): [string, string, string, string] {
  const digits = String(Math.round(ohms));
  const first = Number(digits[0]);
  const second = Number(digits[1] ?? 0);
  const zeros = Math.max(0, digits.length - 2);
  return [DIGIT_COLORS[first], DIGIT_COLORS[second], DIGIT_COLORS[Math.min(9, zeros)], GOLD];
}

const valueCache = new Map<number, PartModel>();

/** The resistor model with bands and name for `ohms`. */
export function withResistorValue(model: PartModel, ohms: number): PartModel {
  if (model.id !== "resistor") return model;
  const cached = valueCache.get(ohms);
  if (cached) return cached;
  const colors = resistorBands(ohms);
  const next: PartModel = {
    ...model,
    name: `Resistor (${formatOhms(ohms)})`,
    solids: model.solids.map((s) => {
      if ((s.kind !== "box" && s.kind !== "cyl") || !s.id?.startsWith("band-")) return s;
      const color = colors[Number(s.id.slice(5)) - 1];
      return { ...s, top: color, side: shade(color, 0.75), fill: color };
    }),
  };
  valueCache.set(ohms, next);
  return next;
}

