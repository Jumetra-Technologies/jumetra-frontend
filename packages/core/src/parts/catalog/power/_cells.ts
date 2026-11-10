import { MATERIAL, roundedRect, type Solid } from "../../sdk";

/** Where a lead's bare tinned end finishes: the last point, pushed on by `strip` mm along the last segment. This is the pin. */
export function leadEnd(points: Array<[number, number, number]>, strip: number): { x: number; y: number } {
  const a = points[points.length - 2];
  const b = points[points.length - 1];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) || 1;
  const k = strip / len;
  return { x: Math.round((b[0] + (b[0] - a[0]) * k) * 100) / 100, y: Math.round((b[1] + (b[1] - a[1]) * k) * 100) / 100 };
}

/**
 * A cylindrical cell lying along x. `xa` is the left end of the whole cell,
 * `plus` is the end its raised + cap is on. Wrap color, a band, a steel base
 * on the + end and a flat steel disc on the - end.
 */
export function cellLying(opts: {
  xa: number;
  cy: number;
  z: number;
  length: number;
  r: number;
  plus: "left" | "right";
  wrap: string;
  band?: string;
  /** Fraction of the body the band covers (default 0.52). */
  bandFrac?: number;
  stripe?: string;
  /** Raised + button: radius and height. Flat-top cells leave it out. */
  nipple?: { r: number; len: number };
  id?: string;
}): Solid[] {
  const { xa, cy, z, length, r, plus, wrap, band, bandFrac = 0.52, stripe, nipple, id } = opts;
  const nip = nipple?.len ?? 0;
  const bodyLen = length - nip;
  const bodyX0 = plus === "left" ? xa + nip : xa;
  const cx = bodyX0 + bodyLen / 2;
  const plusX = plus === "left" ? bodyX0 : bodyX0 + bodyLen;
  const dir = plus === "left" ? 1 : -1;
  const out: Solid[] = [{ kind: "cyl", id, cx, cy, r, d: bodyLen, z, axis: "x", top: wrap, finish: "plastic" }];
  if (band) out.push({ kind: "cyl", cx: cx - dir * bodyLen * 0.05, cy, r: r + 0.04, d: bodyLen * bandFrac, z: z - 0.04, axis: "x", top: band, finish: "paper" });
  if (stripe) out.push({ kind: "cyl", cx: cx - dir * bodyLen * 0.05, cy, r: r + 0.07, d: 1.2, z: z - 0.07, axis: "x", top: stripe, finish: "paper" });
  // The - end: a flat steel disc.
  const minusX = plus === "left" ? xa + length : xa;
  out.push({ kind: "cyl", cx: minusX + (plus === "left" ? -0.2 : 0.2), cy, r: r - 0.5, d: 0.5, z: z + 0.5, axis: "x", top: "#b9bdc3", finish: "metal" });
  // The + end: a steel cap, and the raised button on it.
  out.push({ kind: "cyl", cx: plusX + dir * 0.25, cy, r: r - 0.35, d: 0.6, z: z + 0.35, axis: "x", top: "#c9ccd1", finish: "metal" });
  if (nipple) out.push({ kind: "cyl", cx: plus === "left" ? xa + nip / 2 : xa + length - nip / 2, cy, r: nipple.r, d: nip, z: z + r - nipple.r, axis: "x", top: "#d4d7dc", finish: "metal" });
  return out;
}

/** The tray: a floor and walls with a cavity per row of cells. */
export function tray(opts: { w: number; h: number; rows: Array<[number, number]>; x0: number; x1: number; floor: number; wallD: number; color: string; radius?: number }): Solid[] {
  const { w, h, rows, x0, x1, floor, wallD, color, radius = 1.5 } = opts;
  const path = [roundedRect(0, 0, w, h, radius), ...rows.map(([y0, y1]) => roundedRect(x0, y0, x1 - x0, y1 - y0, 0.8))].join(" ");
  return [
    { kind: "box", x: 0, y: 0, w, h, d: floor, top: color, side: "#0b0b0d", radius, finish: "plastic" },
    { kind: "extrude", path, d: wallD, z: 0, top: color, side: "#0b0b0d", finish: "plastic" },
  ];
}

/** A flat spring plate: the + contact a cell's button presses on. */
export function plate(x: number, cy: number, z: number, wide: number, tall: number): Solid {
  return { kind: "box", x, y: cy - wide / 2, w: 0.6, h: wide, d: tall, z, top: "#c9ccd1", finish: "metal" };
}

/** A coil spring: the - contact. `side` is which end of the cavity it is on. */
export function spring(x: number, cy: number, z: number, r: number, len: number): Solid[] {
  const out: Solid[] = [];
  for (let i = 0; i < 4; i++) out.push({ kind: "cyl", cx: x + (len / 4) * (i + 0.5), cy, r: r - i * 0.0, d: len / 8, z: z - r, axis: "x", top: "#a7acb3", finish: "metal" });
  out.push({ kind: "cyl", cx: x + len - 0.15, cy, r: r + 0.2, d: 0.3, z: z - r - 0.2, axis: "x", top: "#c9ccd1", finish: "metal" });
  return out;
}

export const COPPER_LEAD = MATERIAL.copper;
