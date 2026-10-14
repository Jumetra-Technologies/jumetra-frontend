/**
 * A half-size solderless breadboard: 400 points, laid out as the real one is.
 *
 * 30 columns of terminal strips (rows a–e above the center channel, f–j
 * below; the five holes of one half-column are one strip) and four power
 * rails of 25 holes, a + and a − along the top and the bottom edge. Each rail
 * is one strip along its whole length. Everything sits on the 0.1" (2.54 mm)
 * grid, so chips straddle the channel and module headers drop straight in.
 *
 * The lab wires to every hole (`canvas`) and joins the holes of a strip into
 * one net (`BREADBOARD_STRIPS`, used by `lib/lab/pinout.ts`). That is what a
 * breadboard is for: one 5 V pin on the board feeds the + rail, and every
 * part takes its supply from the rail.
 */

import type { CanvasSpec, PartModel, Solid } from "../types";

export const BREADBOARD_SIZE = { w: 82.5, h: 54.6, d: 8.5 } as const;

/** 0.1" pitch. */
const P = 2.54;
export const BREADBOARD_COLUMNS = 30;
export const RAIL_HOLES = 25;
/** Center of column 1. */
const X0 = 4.42;
/** Terminal rows top to bottom; the channel runs between e and f. */
export const TERMINAL_ROWS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"] as const;
const ROW_Y: Record<(typeof TERMINAL_ROWS)[number], number> = {
  a: 13.33,
  b: 15.87,
  c: 18.41,
  d: 20.95,
  e: 23.49,
  f: 31.11,
  g: 33.65,
  h: 36.19,
  i: 38.73,
  j: 41.27,
};

export type RailId = "TP" | "TN" | "BN" | "BP";
/** The four rails: + outermost at the top and the bottom, − on the inside, as most half-size boards print them. */
export const RAILS: Record<RailId, { y: number; sign: "+" | "−"; edge: "top" | "bottom"; label: string }> = {
  TP: { y: 4.44, sign: "+", edge: "top", label: "Top +" },
  TN: { y: 6.98, sign: "−", edge: "top", label: "Top −" },
  BN: { y: 47.62, sign: "−", edge: "bottom", label: "Bottom −" },
  BP: { y: 50.16, sign: "+", edge: "bottom", label: "Bottom +" },
};
export const RAIL_IDS = Object.keys(RAILS) as RailId[];

const colX = (col: number) => X0 + (col - 1) * P;
/** Rail holes come in five groups of five, with a one-hole gap between groups, centered on the terminal columns. */
const railX = (n: number) => X0 + P / 2 + (n - 1 + Math.floor((n - 1) / 5)) * P;

export interface BreadboardHole {
  id: string;
  label: string;
  x: number;
  y: number;
  /** Strip id: holes with the same strip are joined inside the board. */
  strip: string;
  rail?: RailId;
}

function buildHoles(): BreadboardHole[] {
  const holes: BreadboardHole[] = [];
  for (const rail of RAIL_IDS) {
    if (RAILS[rail].edge !== "top") continue;
    for (let n = 1; n <= RAIL_HOLES; n++) holes.push({ id: `${rail}${n}`, label: `${RAILS[rail].label} ${n}`, x: railX(n), y: RAILS[rail].y, strip: rail, rail });
  }
  for (const row of TERMINAL_ROWS) {
    for (let col = 1; col <= BREADBOARD_COLUMNS; col++) {
      const half = "abcde".includes(row) ? "top" : "bottom";
      holes.push({ id: `${row}${col}`, label: `${row}${col}`, x: colX(col), y: ROW_Y[row], strip: `${half === "top" ? "a-e" : "f-j"}:${col}` });
    }
  }
  for (const rail of RAIL_IDS) {
    if (RAILS[rail].edge !== "bottom") continue;
    for (let n = 1; n <= RAIL_HOLES; n++) holes.push({ id: `${rail}${n}`, label: `${RAILS[rail].label} ${n}`, x: railX(n), y: RAILS[rail].y, strip: rail, rail });
  }
  return holes;
}

/** Every hole, top rails first, then rows a–j, then the bottom rails. */
export const BREADBOARD_HOLES: readonly BreadboardHole[] = buildHoles();

/** Groups of hole ids joined by one metal clip inside the board. */
export const BREADBOARD_STRIPS: readonly string[][] = (() => {
  const by = new Map<string, string[]>();
  for (const h of BREADBOARD_HOLES) by.set(h.strip, [...(by.get(h.strip) ?? []), h.id]);
  return [...by.values()];
})();

/** A readable name for a strip: "Top + rail", "Column 12, a–e". */
export function stripName(stripId: string): string {
  if (stripId in RAILS) return `${RAILS[stripId as RailId].label} rail`;
  const [half, col] = stripId.split(":");
  return `Column ${col}, ${half === "a-e" ? "a–e" : "f–j"}`;
}

const BODY = "#f3f0e7";
const BODY_SIDE = "#bdb6a3";
const HOLE = "#3c3e42";
const PRINT = "#8a8577";
const RED = "#d64545";
const BLUE = "#3567c9";

function holesPath(): string {
  const s = 1.05;
  return BREADBOARD_HOLES.map((h) => `M${(h.x - s / 2).toFixed(2)} ${(h.y - s / 2).toFixed(2)}h${s}v${s}h-${s}z`).join("");
}

function line(y: number, color: string): Solid {
  return { kind: "path", d: `M 3.2 ${y} L 79.3 ${y}`, color, width: 0.38 };
}

function text(x: number, y: number, t: string, color = PRINT, size = 1.25, anchor: "start" | "middle" | "end" = "middle"): Solid {
  return { kind: "text", x, y, text: t, size, color, weight: 600, anchor };
}

function canvasSpec(): CanvasSpec {
  return {
    pins: Object.fromEntries(BREADBOARD_HOLES.map((h) => [h.id, { x: h.x, y: h.y }])),
    // Square on and gently tilted, so 0.1" holes stay far enough apart to aim a wire at.
    view: { spin: 0, tilt: 35 },
    pinZ: BREADBOARD_SIZE.d,
    trace: true,
  };
}

export const BREADBOARD: PartModel = {
  id: "breadboard",
  name: "Breadboard (400 points)",
  aka: ["solderless breadboard", "half-size breadboard", "half breadboard", "protoboard", "400-point breadboard", "power rail"],
  group: "prototyping",
  rank: 1,
  summary:
    "A half-size solderless breadboard: 30 columns of five-hole strips either side of a center channel, and a + and − power rail along each edge. Wire the board's 5 V and GND to one pair of rails once, and every part takes its power from the rail.",
  size: BREADBOARD_SIZE,
  solids: [
    { kind: "box", id: "pcb", x: 0, y: 0, w: BREADBOARD_SIZE.w, h: BREADBOARD_SIZE.h, d: BREADBOARD_SIZE.d, top: BODY, side: BODY_SIDE, radius: 1.2 },
    // The center channel: a groove a DIP chip straddles.
    { kind: "path", d: "M 1.4 25.9 L 81.1 25.9 L 81.1 28.7 L 1.4 28.7 Z", color: "#c7c1b1", width: 0.15, fill: "#dcd7c8" },
    // The seams where the rail strips clip on.
    { kind: "path", d: "M 0.6 10.2 L 81.9 10.2 M 0.6 44.4 L 81.9 44.4", color: "#ddd8ca", width: 0.35 },
    // Printed rail stripes: red beside +, blue beside −.
    line(2.6, RED),
    line(8.8, BLUE),
    line(45.8, BLUE),
    line(52.0, RED),
    { kind: "path", d: holesPath(), color: "none", width: 0, fill: HOLE },
    // + and − at both ends of every rail.
    ...RAIL_IDS.flatMap((r) => {
      const { y, sign } = RAILS[r];
      const c = sign === "+" ? RED : BLUE;
      return [text(1.7, y + 0.5, sign, c, 1.7), text(80.8, y + 0.5, sign, c, 1.7)];
    }),
    // Row letters at both ends.
    ...TERMINAL_ROWS.flatMap((row) => [text(2.0, ROW_Y[row] + 0.45, row), text(80.5, ROW_Y[row] + 0.45, row)]),
    // Column numbers above row a and below row j.
    ...[1, 5, 10, 15, 20, 25, 30].flatMap((col) => [text(colX(col), 11.6, String(col), PRINT, 1.15), text(colX(col), 43.75, String(col), PRINT, 1.15)]),
  ],
  features: [
    { id: "rails-top", label: "Power rails, top", kind: "power", x: 3, y: 3.2, w: 76.5, h: 5, note: "A + and a − rail, 25 holes each. Each rail is one strip end to end: wire the board's 5 V to + and GND to −, and the whole row carries it." },
    { id: "rails-bottom", label: "Power rails, bottom", kind: "power", x: 3, y: 46.4, w: 76.5, h: 5, note: "A second pair of rails. Bridge them to the top pair with two short wires, or put a different supply (3.3 V) on them." },
    { id: "strips-top", label: "Terminal strips a–e", kind: "connector", x: 3.2, y: 12.1, w: 76.1, h: 12.6, note: "Each column's five holes, a to e, are one strip: everything pushed into the same column is connected." },
    { id: "channel", label: "Center channel", kind: "mechanical", x: 1.4, y: 25.9, w: 79.7, h: 2.8, note: "Separates a–e from f–j, so a chip straddling it has each pin on its own strip." },
    { id: "strips-bottom", label: "Terminal strips f–j", kind: "connector", x: 3.2, y: 29.9, w: 76.1, h: 12.6, note: "A second set of 30 five-hole strips, not joined to the ones above the channel." },
  ],
  pins: [
    { name: "+ rails", role: "power", note: "Two rails, one per edge, each one strip of 25 holes. Feed them from the board's 5 V or 3.3 V pin." },
    { name: "− rails", role: "ground", note: "Two ground rails beside the + rails. Feed them from a GND pin." },
    { name: "Strips a–e, f–j", role: "other", note: "60 strips of five holes. Put a part's leg and a jumper in the same strip to connect them." },
    { name: "Center channel", role: "mechanical", note: "Not connected; it splits each column in two." },
  ],
  circuit: {
    blocks: [
      { id: "board", label: "Board", sub: "5V and GND pins", kind: "power", col: 0, row: 1, note: "One supply pin and one ground pin on the microcontroller." },
      { id: "plus", label: "+ rail", sub: "25 holes, one strip", kind: "power", col: 1, row: 0, note: "Every hole on the rail is the same 5 V." },
      { id: "minus", label: "− rail", sub: "25 holes, one strip", kind: "ground", col: 1, row: 2, note: "Every hole on the rail is ground." },
      { id: "strip", label: "Terminal strip", sub: "5 holes per column", kind: "connector", col: 2, row: 1, note: "A part's leg and a jumper in the same five-hole strip are joined." },
      { id: "parts", label: "Your parts", sub: "VCC, GND, signals", kind: "sensor", col: 3, row: 1, note: "Each takes its supply from the rails and sends its signal to a board pin." },
    ],
    links: [
      { from: "board", to: "plus", kind: "power", label: "5 V" },
      { from: "board", to: "minus", kind: "ground", label: "GND" },
      { from: "plus", to: "parts", kind: "power", label: "VCC" },
      { from: "parts", to: "minus", kind: "ground", label: "GND" },
      { from: "parts", to: "strip", kind: "signal", both: true },
      { from: "strip", to: "board", kind: "signal", label: "to a pin", both: true },
    ],
    steps: [
      "One jumper takes the board's 5 V to the + rail and another takes GND to the − rail. Now every hole on those rails carries 5 V or ground.",
      "Each part's VCC goes to any hole on the + rail and its GND to any hole on the − rail, so one 5 V pin powers as many parts as it can supply.",
      "Inside, a metal clip joins the five holes of each half-column. A part's leg and a jumper pushed into the same strip are connected.",
      "Signals still go to their own board pins: a jumper from the part's strip to D2, A0 and so on.",
    ],
  },
  facts: [
    { label: "Points", value: "400 (300 terminal, 100 rail)" },
    { label: "Strips", value: "60 × 5 holes, 4 rails × 25" },
    { label: "Pitch", value: "2.54 mm (0.1\")" },
    { label: "Wire", value: "Solid core, 20–29 AWG" },
    { label: "Contacts", value: "Phosphor bronze, about 1 A" },
    { label: "Size", value: "82.5 × 54.6 mm" },
  ],
  experiment: {
    title: "One 5 V pin, three sensors",
    idea: "Wire the Uno's 5 V and GND to the top rails, then power a DHT11, an ultrasonic sensor and a PIR from the rails while each signal goes to its own pin.",
  },
  tags: ["breadboard", "prototyping", "solderless", "power rail", "5v", "gnd", "jumper wires", "beginner"],
  canvas: canvasSpec(),
};

export const PROTOTYPING: PartModel[] = [BREADBOARD];
