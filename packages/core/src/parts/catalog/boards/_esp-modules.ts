import { MATERIAL, PCB_TOP, shade, silk, sot223, type Solid } from "../../sdk";

/** The top of an ESP module's own black board, sitting on the dev board. */
export const MODULE_TOP = PCB_TOP + 0.8;

const TRACE = "#c2b184";
const SHIELD = "#cfd2d7";

/**
 * The bare end of an ESP module: a black board with the printed antenna on it,
 * a meander of bare tinned copper that runs up and down in legs, and a ground
 * strip along the edge. (x, y, w, h) is the antenna area.
 */
export function antennaTrace(x: number, y: number, w: number, h: number, legs: number): Solid[] {
  const pitch = (w - 1.8) / (legs - 1);
  const bottom = y + h - 1.9;
  const top = y + 1.1;
  let d = `M ${x + 0.2} ${bottom} L ${x + 0.9} ${bottom}`;
  for (let i = 0; i < legs; i++) {
    const cx = x + 0.9 + i * pitch;
    d += i % 2 === 0 ? ` L ${cx} ${top}` : ` L ${cx} ${bottom}`;
    if (i < legs - 1) d += i % 2 === 0 ? ` L ${cx + pitch} ${top}` : ` L ${cx + pitch} ${bottom}`;
  }
  return [
    { kind: "path", d, color: TRACE, width: 0.5, z: MODULE_TOP + 0.01 },
    { kind: "path", d: `M ${x + 0.3} ${y + h - 0.7} L ${x + w - 0.4} ${y + h - 0.7}`, color: TRACE, width: 0.7, z: MODULE_TOP + 0.01 },
    { kind: "path", d: `M ${x + 0.9} ${bottom} L ${x + 0.9} ${y + h - 0.7}`, color: TRACE, width: 0.45, z: MODULE_TOP + 0.01 },
  ];
}

/** A row of gold half-round pads on a module's edge. (cx, cy) is the first pad's center. */
export function padRow(cx: number, cy: number, count: number, pitch: number, dir: "x" | "y", size = 0.7): Solid {
  return { kind: "pins", x: dir === "x" ? cx - pitch / 2 : cx - pitch / 2, y: cy - pitch / 2, count, pitch, dir, len: 0.12, z: MODULE_TOP, size, color: MATERIAL.gold, finish: "gold" };
}

/** The stamped steel shield over an ESP module's chip, with its laser-marked lines. */
export function shieldCan(x: number, y: number, w: number, h: number, lines: Array<{ text: string; size: number }>): Solid[] {
  const d = 2.3;
  const top = MODULE_TOP + d;
  const out: Solid[] = [
    { kind: "box", id: "shield", x, y, w, h, d, z: MODULE_TOP, top: SHIELD, side: "#8f949b", radius: 0.4, finish: "metal" },
    // The folded edge of the lid.
    { kind: "path", d: `M ${x + 0.5} ${y + 0.5} L ${x + w - 0.5} ${y + 0.5} L ${x + w - 0.5} ${y + h - 0.5} L ${x + 0.5} ${y + h - 0.5} Z`, color: "#b4b8be", width: 0.18, z: top + 0.01 },
  ];
  const gap = 1.35;
  const first = y + h / 2 - ((lines.length - 1) * gap) / 2 + 0.3;
  lines.forEach((line, i) => out.push(silk(x + w / 2, first + i * gap, line.text, line.size, "#4b5059", { anchor: "middle", z: top + 0.02, weight: i === 0 ? 700 : 400 })));
  return out;
}

/** A molded tantalum capacitor (3528): a tan body with a dark bar at the positive end. */
export function tantalum(cx: number, cy: number, dir: "x" | "y" = "x"): Solid[] {
  const w = dir === "x" ? 3.5 : 2.8;
  const h = dir === "x" ? 2.8 : 3.5;
  const bar = dir === "x" ? { x: cx - w / 2, y: cy - h / 2, w: 0.7, h } : { x: cx - w / 2, y: cy - h / 2, w, h: 0.7 };
  return [
    { kind: "box", x: cx - w / 2, y: cy - h / 2, w, h, d: 1.9, z: PCB_TOP, top: "#d9a441", side: shade("#d9a441", 0.7), radius: 0.2, finish: "plastic" },
    { kind: "box", ...bar, d: 1.92, z: PCB_TOP, top: "#7a5516", radius: 0.1, finish: "plastic" },
  ];
}

/**
 * The AMS1117 3.3 V regulator: a SOT-223 with its wide tab (the output) toward
 * the board's edge, and a tantalum capacitor on its input and output.
 * (x, y) is the top-left of the package, tab at the top.
 */
export function regulator1117(x: number, y: number, input: { cx: number; cy: number }, output: { cx: number; cy: number }): Solid[] {
  return [...sot223(x, y, "AMS1117"), ...tantalum(input.cx, input.cy), ...tantalum(output.cx, output.cy)];
}

/** Pin labels along a header row, one printed beside each pin. */
export function pinLabels(ids: readonly string[], x: number, y: number, pitch = 2.54, size = 0.9): Solid[] {
  return ids.map((text, i) => silk(x + i * pitch, y, text, size, MATERIAL.silk, { anchor: "middle" }));
}
