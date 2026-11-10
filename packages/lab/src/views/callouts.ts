/**
 * Where the pin labels go on the 2D view: each pin's name in a chip outside
 * the part, on the side the pin is nearest, joined to the pin by a line.
 * Chips on the left and right read across; chips above and below stand on
 * end, as on a printed pinout card, so a row of pins 2.54 mm apart still
 * fits a label each.
 */
import type { PinSpot } from "@kiungo/core/parts/types";

export type Side = "left" | "right" | "top" | "bottom";

export interface Callout {
  spot: PinSpot;
  side: Side;
  /** The middle of the chip. */
  cx: number;
  cy: number;
  /** The chip's length along its text, and its thickness. */
  length: number;
  thickness: number;
  /** The line from the pin to the chip. */
  line: Array<{ x: number; y: number }>;
}

export interface CalloutLayout {
  callouts: Callout[];
  /** Room the labels need beyond the part's box, per side. */
  margins: Record<Side, number>;
  /** Text height, in mm. */
  font: number;
}

export interface Box {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const WIDTH_PER_CHAR = 0.62;

/** The text height that lets neighboring labels sit side by side: capped by the tightest pin spacing. */
function fontFor(spots: PinSpot[], sides: Side[], extent: number): number {
  const base = Math.max(1.05, Math.min(2.3, extent * 0.03));
  let tightest = Infinity;
  for (const side of ["left", "right", "top", "bottom"] as const) {
    const along = spots
      .filter((_, i) => sides[i] === side)
      .map((s) => (side === "left" || side === "right" ? s.y : s.x))
      .sort((a, b) => a - b);
    for (let i = 1; i < along.length; i++) {
      const gap = along[i] - along[i - 1];
      if (gap > 0.6 && gap < tightest) tightest = gap;
    }
  }
  return Math.max(0.9, Math.min(base, tightest / 1.62));
}

/**
 * Lays the labels out round a box. `clear` is the gap to leave between the
 * box and the labels (for the dimension lines).
 */
export function layoutCallouts(spots: PinSpot[], box: Box, extent: number, clear: number): CalloutLayout {
  const margins: Record<Side, number> = { left: 0, right: 0, top: 0, bottom: 0 };
  if (!spots.length) return { callouts: [], margins, font: 1.4 };
  const sides = spots.map((s): Side => {
    const d: Array<[Side, number]> = [
      ["left", s.x - box.x1],
      ["right", box.x2 - s.x],
      ["top", s.y - box.y1],
      ["bottom", box.y2 - s.y],
    ];
    return d.reduce((best, cur) => (cur[1] < best[1] ? cur : best))[0];
  });
  const font = fontFor(spots, sides, extent);
  const thickness = font * 1.55;
  const step = thickness + font * 0.22;
  const pad = font * 0.7;
  const callouts: Callout[] = [];

  for (const side of ["left", "right", "top", "bottom"] as const) {
    const group = spots.filter((_, i) => sides[i] === side);
    if (!group.length) continue;
    const across = side === "left" || side === "right";
    const sorted = [...group].sort((a, b) => (across ? a.y - b.y : a.x - b.x));
    // Each label wants to sit level with its pin; push apart the ones that would overlap, then re-center the run.
    const want = sorted.map((s) => (across ? s.y : s.x));
    const at = [...want];
    for (let i = 1; i < at.length; i++) at[i] = Math.max(at[i], at[i - 1] + step);
    const drift = at.reduce((sum, p, i) => sum + (p - want[i]), 0) / at.length;
    for (let i = 0; i < at.length; i++) at[i] -= drift;

    const lengths = sorted.map((s) => Math.max(thickness, s.label.length * font * WIDTH_PER_CHAR + pad * 2));
    const longest = Math.max(...lengths);
    margins[side] = clear + longest + font * 0.6;
    sorted.forEach((spot, i) => {
      const length = lengths[i];
      const near = side === "left" ? box.x1 - clear : side === "right" ? box.x2 + clear : side === "top" ? box.y1 - clear : box.y2 + clear;
      const dir = side === "left" || side === "top" ? -1 : 1;
      const mid = near + dir * (length / 2);
      const cx = across ? mid : at[i];
      const cy = across ? at[i] : mid;
      // Straight out from the pin to just short of the labels, then across to its own.
      const knee = near - dir * Math.min(clear * 0.45, font * 1.2);
      const line = across
        ? [
            { x: spot.x, y: spot.y },
            { x: knee, y: spot.y },
            { x: near, y: at[i] },
          ]
        : [
            { x: spot.x, y: spot.y },
            { x: spot.x, y: knee },
            { x: at[i], y: near },
          ];
      callouts.push({ spot, side, cx, cy, length, thickness, line });
    });
  }
  return { callouts, margins, font };
}
