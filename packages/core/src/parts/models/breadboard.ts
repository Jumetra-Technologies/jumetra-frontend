/**
 * Solderless breadboards, laid out as the real ones are: a mini (170 points),
 * a half-size (400) and a full-size (830).
 *
 * Columns of terminal strips (rows a–e above the center channel, f–j below;
 * the five holes of one half-column are one strip), and on the half and full
 * sizes four power rails, a + and a − along the top and the bottom edge,
 * each one strip along its whole length. Everything sits on the 0.1"
 * (2.54 mm) grid, so chips straddle the channel and module headers drop in.
 *
 * The lab wires to every hole (`canvas`) and joins the holes of a strip into
 * one net (`strips`, used by `lib/lab/pinout.ts`). That is what a breadboard
 * is for: one 5 V pin on the board feeds the + rail, and every part takes its
 * supply from the rail.
 */

import type { PartDef, PinDef } from "../define";
import type { CanvasSpec, PartModel, PartSpec, PinSpot, Solid } from "../types";

/** 0.1" pitch. */
const P = 2.54;
/** Terminal rows top to bottom; the channel runs between e and f. */
export const TERMINAL_ROWS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"] as const;
type Row = (typeof TERMINAL_ROWS)[number];

export type RailId = "TP" | "TN" | "BN" | "BP";
export interface RailInfo {
  y: number;
  sign: "+" | "−";
  edge: "top" | "bottom";
  label: string;
}

export interface BreadboardHole {
  id: string;
  label: string;
  x: number;
  y: number;
  /** Strip id: holes with the same strip are joined inside the board. */
  strip: string;
  rail?: RailId;
}

/** Everything the lab needs to know about one breadboard's holes. */
export interface BreadboardSpec {
  partId: string;
  columns: number;
  /** Center of column 1, from the left edge. */
  x0: number;
  /** Holes per rail; 0 for a mini board with no rails. */
  railHoles: number;
  rails: Partial<Record<RailId, RailInfo>>;
  size: { w: number; h: number; d: number };
  holes: BreadboardHole[];
  strips: string[][];
}

const ROW_STEP: Record<Row, number> = { a: 0, b: 1, c: 2, d: 3, e: 4, f: 7, g: 8, h: 9, i: 10, j: 11 };

/**
 * `x0` is the margin to the first column, which sets the board's width:
 * 82.5 mm for the 400-point, 165.1 mm for the 830-point and 47 mm for the
 * 170-point, as the real ones measure.
 */
function makeSpec(partId: string, columns: number, railHoles: number, x0: number): BreadboardSpec {
  const X0 = x0;
  const withRails = railHoles > 0;
  // Rails take the first 10 mm; a mini starts with row a near the edge.
  const rowA = withRails ? 13.33 : 3.53;
  const rowY = (row: Row) => rowA + ROW_STEP[row] * P;
  const h = withRails ? 54.6 : rowY("j") + 3.53;
  const w = X0 * 2 + (columns - 1) * P;
  const rails: Partial<Record<RailId, RailInfo>> = withRails
    ? {
        TP: { y: 4.44, sign: "+", edge: "top", label: "Top +" },
        TN: { y: 6.98, sign: "−", edge: "top", label: "Top −" },
        BN: { y: 47.62, sign: "−", edge: "bottom", label: "Bottom −" },
        BP: { y: 50.16, sign: "+", edge: "bottom", label: "Bottom +" },
      }
    : {};
  const colX = (col: number) => X0 + (col - 1) * P;
  // Rail holes come in groups of five with a one-hole gap, centered on the terminal columns.
  const slots = railHoles + Math.floor((railHoles - 1) / 5);
  const railX = (n: number) => X0 + (((columns - 1) - (slots - 1)) / 2) * P + (n - 1 + Math.floor((n - 1) / 5)) * P;
  const holes: BreadboardHole[] = [];
  const railRow = (edge: "top" | "bottom") => {
    for (const rail of Object.keys(rails) as RailId[]) {
      const info = rails[rail]!;
      if (info.edge !== edge) continue;
      for (let n = 1; n <= railHoles; n++) holes.push({ id: `${rail}${n}`, label: `${info.label} ${n}`, x: railX(n), y: info.y, strip: rail, rail });
    }
  };
  railRow("top");
  for (const row of TERMINAL_ROWS) {
    for (let col = 1; col <= columns; col++) {
      holes.push({ id: `${row}${col}`, label: `${row}${col}`, x: colX(col), y: rowY(row), strip: `${"abcde".includes(row) ? "a-e" : "f-j"}:${col}` });
    }
  }
  railRow("bottom");
  const by = new Map<string, string[]>();
  for (const hole of holes) by.set(hole.strip, [...(by.get(hole.strip) ?? []), hole.id]);
  return { partId, columns, x0, railHoles, rails, size: { w: Number(w.toFixed(2)), h: Number(h.toFixed(2)), d: 8.5 }, holes, strips: [...by.values()] };
}

/** Every breadboard the lab knows, by part id. */
export const BREADBOARD_SPECS: Record<string, BreadboardSpec> = {
  "breadboard-mini": makeSpec("breadboard-mini", 17, 0, 3.18),
  breadboard: makeSpec("breadboard", 30, 25, 4.42),
  "breadboard-full": makeSpec("breadboard-full", 63, 50, 3.81),
};

export function breadboardSpec(partId: string): BreadboardSpec | undefined {
  return BREADBOARD_SPECS[partId];
}

const HALF = BREADBOARD_SPECS.breadboard;
/** The half-size board's layout (kept for code written before the other sizes). */
export const BREADBOARD_SIZE = HALF.size;
export const BREADBOARD_COLUMNS = HALF.columns;
export const RAIL_HOLES = HALF.railHoles;
export const RAILS = HALF.rails as Record<RailId, RailInfo>;
export const RAIL_IDS = Object.keys(RAILS) as RailId[];
export const BREADBOARD_HOLES: readonly BreadboardHole[] = HALF.holes;
export const BREADBOARD_STRIPS: readonly string[][] = HALF.strips;

/** A readable name for a strip: "Top + rail", "Column 12, a–e". */
export function stripName(stripId: string): string {
  if (stripId in RAILS) return `${RAILS[stripId as RailId].label} rail`;
  const [half, col] = stripId.split(":");
  return `Column ${col}, ${half === "a-e" ? "a–e" : "f–j"}`;
}

const BODY = "#f3f0e7";
const BODY_SIDE = "#bdb6a3";
const HOLE = "#3c3e42";
const FUNNEL = "#d6d0c0";
const PRINT = "#8a8577";
const RED = "#d64545";
const BLUE = "#3567c9";

function text(x: number, y: number, t: string, color = PRINT, size = 1.25, anchor: "start" | "middle" | "end" = "middle"): Solid {
  return { kind: "text", x, y, text: t, size, color, weight: 600, anchor };
}

const n2 = (n: number) => Number(n.toFixed(2));

/** Where the dovetails sit along an edge of this length: every 40 mm or so, never fewer than two. */
function dovetailCenters(length: number): number[] {
  const count = Math.max(2, Math.round(length / 41));
  return Array.from({ length: count }, (_, i) => n2((length * (2 * i + 1)) / (2 * count)));
}

/**
 * The body's outline, seen from above: rounded corners, dovetail tabs on the
 * right and bottom edges and matching notches on the left and top, which is
 * how two boards snap together.
 */
function outline(w: number, h: number): string {
  const r = 1.2;
  const t = 1.2; // how far a tab sticks out and a notch cuts in
  const across = dovetailCenters(w);
  const down = dovetailCenters(h);
  const parts: string[] = [`M ${r} 0`];
  // Top edge, left to right: notches, narrow at the edge and wider inside.
  for (const cx of across) parts.push(`L ${n2(cx - 1.3)} 0 L ${n2(cx - 1.8)} ${t} L ${n2(cx + 1.8)} ${t} L ${n2(cx + 1.3)} 0`);
  parts.push(`L ${n2(w - r)} 0 Q ${w} 0 ${w} ${r}`);
  // Right edge, top to bottom: tabs, narrow at the body and wider at the tip.
  for (const cy of down) parts.push(`L ${w} ${n2(cy - 1.2)} L ${n2(w + t)} ${n2(cy - 1.7)} L ${n2(w + t)} ${n2(cy + 1.7)} L ${w} ${n2(cy + 1.2)}`);
  parts.push(`L ${w} ${n2(h - r)} Q ${w} ${h} ${n2(w - r)} ${h}`);
  // Bottom edge, right to left: tabs.
  for (const cx of [...across].reverse()) parts.push(`L ${n2(cx + 1.2)} ${h} L ${n2(cx + 1.7)} ${n2(h + t)} L ${n2(cx - 1.7)} ${n2(h + t)} L ${n2(cx - 1.2)} ${h}`);
  parts.push(`L ${r} ${h} Q 0 ${h} 0 ${n2(h - r)}`);
  // Left edge, bottom to top: notches.
  for (const cy of [...down].reverse()) parts.push(`L 0 ${n2(cy + 1.3)} L ${t} ${n2(cy + 1.8)} L ${t} ${n2(cy - 1.8)} L 0 ${n2(cy - 1.3)}`);
  parts.push(`L 0 ${r} Q 0 0 ${r} 0 Z`);
  return parts.join(" ");
}

/** The y of the top of the center channel, and its width. */
const CHANNEL_W = 2.8;
function channelTop(spec: BreadboardSpec): number {
  return spec.holes.find((x) => x.id === "e1")!.y + 2.41;
}

function solidsFor(spec: BreadboardSpec): Solid[] {
  const { w, h, d } = spec.size;
  const s = 1.05;
  const X0 = spec.x0;
  const rowY = (row: Row) => spec.holes.find((x) => x.id === `${row}1`)!.y;
  const top = channelTop(spec);
  const line = (y: number, color: string): Solid => ({ kind: "path", d: `M 3.2 ${y} L ${(w - 3.2).toFixed(2)} ${y}`, color, width: 0.38 });
  const numbers: number[] = [1];
  for (let c = 5; c <= spec.columns; c += 5) numbers.push(c);
  if (numbers[numbers.length - 1] !== spec.columns) numbers.push(spec.columns);
  const withRails = spec.railHoles > 0;
  const squares = (side: number) => spec.holes.map((x) => `M${(x.x - side / 2).toFixed(2)} ${(x.y - side / 2).toFixed(2)}h${side}v${side}h-${side}z`).join("");
  return [
    // The molded body, with the center channel cut right through it: the groove a DIP chip straddles.
    { kind: "extrude", id: "pcb", path: `${outline(w, h)} M 1.4 ${n2(top)} L 1.4 ${n2(top + CHANNEL_W)} L ${n2(w - 1.4)} ${n2(top + CHANNEL_W)} L ${n2(w - 1.4)} ${n2(top)} Z`, d, top: BODY, side: BODY_SIDE, finish: "plastic" },
    // The channel's floor, 3 mm down.
    { kind: "box", x: 1.4, y: n2(top), w: n2(w - 2.8), h: CHANNEL_W, d: n2(d - 3), top: "#cfc9b8", side: BODY_SIDE, finish: "plastic" },
    // The peel-off backing under the board.
    { kind: "box", x: 0.6, y: 0.6, w: n2(w - 1.2), h: n2(h - 1.2), d: 0.5, z: -0.5, top: "#efe6c8", side: "#e3d9b6", finish: "paper" },
    ...(withRails
      ? [
          // The seams where the rail strips clip on, and the printed stripes: red beside +, blue beside −.
          { kind: "path", d: `M 0.6 10.2 L ${(w - 0.6).toFixed(2)} 10.2 M 0.6 44.4 L ${(w - 0.6).toFixed(2)} 44.4`, color: "#cfc9b8", width: 0.3 } as Solid,
          line(2.6, RED),
          line(8.8, BLUE),
          line(45.8, BLUE),
          line(52.0, RED),
        ]
      : []),
    // Each hole is a small funnel that guides a wire into the clip below it.
    { kind: "path", d: squares(1.75), color: "none", width: 0, fill: FUNNEL },
    { kind: "path", d: squares(s), color: "none", width: 0, fill: HOLE },
    // + and − at both ends of every rail.
    ...(Object.values(spec.rails) as RailInfo[]).flatMap(({ y, sign }) => {
      const c = sign === "+" ? RED : BLUE;
      return [text(1.7, y + 0.5, sign, c, 1.7), text(w - 1.7, y + 0.5, sign, c, 1.7)];
    }),
    // Row letters at both ends, and column numbers above row a and below row j.
    ...TERMINAL_ROWS.flatMap((row) => [text(X0 - 2.3, rowY(row) + 0.45, row), text(w - X0 + 2.3, rowY(row) + 0.45, row)]),
    ...(withRails ? numbers.flatMap((col) => [text(X0 + (col - 1) * P, rowY("a") - 1.73, String(col), PRINT, 1.15), text(X0 + (col - 1) * P, rowY("j") + 2.48, String(col), PRINT, 1.15)]) : []),
  ];
}

function canvasSpec(spec: BreadboardSpec): CanvasSpec {
  return {
    pins: Object.fromEntries(spec.holes.map((x) => [x.id, { x: x.x, y: x.y }])),
    // Square on and gently tilted, so 0.1" holes stay far enough apart to aim a wire at.
    view: { spin: 0, tilt: 35 },
    pinZ: spec.size.d,
    trace: true,
  };
}

const TAGS = ["breadboard", "prototyping", "solderless", "power rail", "5v", "gnd", "jumper wires", "beginner"];

/** What every breadboard gets wrong, with the numbers. */
const LIMITS = [
  "About 1 A per strip. A motor or an LED strip drawing several amps heats the clips until the plastic softens: give those their own wires.",
  "Each contact adds about 0.01 Ω new and 0.05 Ω worn, so a supply sags about 0.05 V for every amp that crosses an old board.",
  "Neighboring strips act as small capacitors and long jumpers as coils: fine for audio and Arduino speeds, unreliable above about 10 MHz.",
  "Leads thicker than 0.8 mm, like some module header pins, spread the clips for good. After that, thin legs sit loose.",
  "Rated to about 36 V. Never for mains.",
];
const UPGRADE = [{ name: "Solder protoboard or a custom PCB", why: "A soldered joint is about 0.001 Ω and a trace carries 3 A or more. Nothing works loose when the robot bumps into a wall." }];
const REFS = [
  "https://protosupplies.com/product/breadboard-mb102-830-tie-points/",
  "https://www.adafruit.com/products/64",
  "https://www.pololu.com/product/1488/specs",
  "https://www.electrokit.com/en/solderless-breadboard-830-tie-points",
];

function features(spec: BreadboardSpec): PartModel["features"] {
  const { w, h } = spec.size;
  const rowY = (row: Row) => spec.holes.find((x) => x.id === `${row}1`)!.y;
  const list: PartModel["features"] = [
    { id: "strips-top", label: "Terminal strips a–e", kind: "connector", x: 3.2, y: rowY("a") - 1.2, w: w - 6.4, h: 12.6, note: "Each column's five holes, a to e, are one strip: everything pushed into the same column is connected." },
    { id: "channel", label: "Center channel", kind: "mechanical", x: 1.4, y: channelTop(spec), w: w - 2.8, h: CHANNEL_W, note: "Separates a–e from f–j, so a chip straddling it has each pin on its own strip." },
    { id: "strips-bottom", label: "Terminal strips f–j", kind: "connector", x: 3.2, y: rowY("f") - 1.2, w: w - 6.4, h: 12.6, note: `A second set of ${spec.columns} five-hole strips, not joined to the ones above the channel.` },
    { id: "dovetails", label: "Dovetails", kind: "mechanical", x: w - 1.2, y: h / 4 - 2.2, w: 2.6, h: 4.4, note: "Tabs on two edges and notches on the other two: boards slide together side by side or end to end." },
  ];
  if (spec.railHoles) {
    list.unshift({ id: "rails-top", label: "Power rails, top", kind: "power", x: 3, y: 3.2, w: w - 6, h: 5, note: `A + and a − rail, ${spec.railHoles} holes each. Each rail is one strip end to end: wire the board's 5 V to + and GND to −, and the whole row carries it.` });
    list.push({ id: "rails-bottom", label: "Power rails, bottom", kind: "power", x: 3, y: 46.4, w: w - 6, h: 5, note: "A second pair of rails. Bridge them to the top pair with two short wires, or put a different supply (3.3 V) on them." });
  }
  return list;
}

/** How power and signals move through a board with rails. */
function railCircuit(spec: BreadboardSpec): PartModel["circuit"] {
  const hole = (id: string) => {
    const x = spec.holes.find((item) => item.id === id)!;
    return { x: x.x, y: x.y };
  };
  const mid = Math.ceil(spec.columns / 2);
  return {
    blocks: [
      { id: "board", label: "Board", sub: "5V and GND pins", kind: "power", col: 0, row: 1, note: "One supply pin and one ground pin on the microcontroller." },
      { id: "plus", label: "+ rail", sub: "one strip", kind: "power", col: 1, row: 0, at: hole("TP3"), note: "Every hole on the rail is the same 5 V." },
      { id: "minus", label: "− rail", sub: "one strip", kind: "ground", col: 1, row: 2, at: hole(`TN${spec.railHoles - 2}`), note: "Every hole on the rail is ground." },
      { id: "strip", label: "Terminal strip", sub: "5 holes per column", kind: "connector", col: 2, row: 1, at: hole(`c${mid}`), note: "A part's leg and a jumper in the same five-hole strip are joined." },
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
  };
}

/** A mini board has no rails: two of its strips do that job. */
function miniCircuit(spec: BreadboardSpec): PartModel["circuit"] {
  const hole = (id: string) => {
    const x = spec.holes.find((item) => item.id === id)!;
    return { x: x.x, y: x.y };
  };
  return {
    blocks: [
      { id: "board", label: "Board", sub: "5V and GND pins", kind: "power", col: 0, row: 1, note: "One supply pin and one ground pin on the microcontroller." },
      { id: "plus", label: "A strip for 5 V", sub: "column 1, a–e", kind: "power", col: 1, row: 0, at: hole("c1"), note: "Pick one strip and feed it 5 V: its five holes are your + rail." },
      { id: "minus", label: "A strip for GND", sub: "column 1, f–j", kind: "ground", col: 1, row: 2, at: hole("h1"), note: "Pick another for ground. Four holes are left on each for parts." },
      { id: "strip", label: "Terminal strip", sub: "5 holes per column", kind: "connector", col: 2, row: 1, at: hole(`c${Math.ceil(spec.columns / 2)}`), note: "A part's leg and a jumper in the same five-hole strip are joined." },
      { id: "parts", label: "Your parts", sub: "VCC, GND, signals", kind: "sensor", col: 3, row: 1, note: "Each takes its supply from your two strips and sends its signal to a board pin." },
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
      "There are no rails, so two strips stand in: a jumper takes the board's 5 V to one strip and another takes GND to a second strip.",
      "Each of those strips has four holes left. That is four parts' worth of power before you need to chain a second strip.",
      "Inside, a metal clip joins the five holes of each half-column. A part's leg and a jumper pushed into the same strip are connected.",
      "Signals go to their own board pins: a jumper from the part's strip to D2, A0 and so on.",
    ],
  };
}

const PIN_TABLE = [
  { name: "+ rails", role: "power" as const, note: "Two rails, one per edge, each one strip end to end. Feed them from the board's 5 V or 3.3 V pin." },
  { name: "− rails", role: "ground" as const, note: "Two ground rails beside the + rails. Feed them from a GND pin." },
  { name: "Strips a–e, f–j", role: "other" as const, note: "Strips of five holes. Put a part's leg and a jumper in the same strip to connect them." },
  { name: "Center channel", role: "mechanical" as const, note: "Not connected; it splits each column in two." },
];

function terminalNote(id: string): string {
  const col = id.slice(1);
  const [first, last] = "abcde".includes(id[0]) ? ["a", "e"] : ["f", "j"];
  return `Joined to ${first}${col}–${last}${col}: one five-hole strip`;
}

/** Every hole is a pin; the strips say which holes share a clip. */
function holePins(spec: BreadboardSpec): PinDef[] {
  const middle = spec.size.h / 2;
  return spec.holes.map((hole): PinDef => {
    const rail = hole.rail ? spec.rails[hole.rail] : undefined;
    const side = hole.y < middle ? "left" : "right";
    if (rail) return { id: hole.id, label: hole.label, side, role: rail.sign === "+" ? "power" : "ground", fns: [rail.sign === "+" ? "power" : "ground"], note: `${rail.label} rail: all ${spec.railHoles} holes are joined` };
    return { id: hole.id, label: hole.label, side, role: "other", expects: "opt", note: terminalNote(hole.id) };
  });
}

/** The holes worth naming on the labeled drawing: one per rail, and a strip either side of the channel. */
function namedSpots(spec: BreadboardSpec): PinSpot[] {
  const at = (id: string) => spec.holes.find((hole) => hole.id === id)!;
  const last = spec.columns;
  const strip = (id: string, label: string, note: string): PinSpot => ({ id, label, role: "other", x: at(id).x, y: at(id).y, note });
  const rails = (Object.keys(spec.rails) as RailId[]).map((rail): PinSpot => {
    const info = spec.rails[rail]!;
    const hole = at(`${rail}1`);
    return { id: hole.id, label: `${info.sign} rail`, role: info.sign === "+" ? "power" : "ground", x: hole.x, y: hole.y, note: `${info.label}: all ${spec.railHoles} holes are one strip. ${info.sign === "+" ? "Feed it 5 V or 3.3 V." : "Feed it from a GND pin."}` };
  });
  return [
    ...rails,
    strip("a1", "a1–e1", "Five holes joined by one clip. The next column is a different strip."),
    strip("f1", "f1–j1", "Below the channel: not joined to a1–e1."),
    strip(`a${last}`, `a${last}–e${last}`, `The last of ${spec.columns} columns.`),
    strip(`j${last}`, `f${last}–j${last}`, "Its own strip, like every half-column."),
  ];
}

/** What the catalog says about one size of breadboard; the rest follows from its layout. */
export interface BreadboardInfo extends Pick<PartDef, "id" | "name" | "aka" | "rank" | "summary" | "facts" | "experiment"> {
  /** Grams. */
  mass?: number;
  sourcing: PartSpec["sourcing"];
}

/** The full definition of a breadboard from its layout: body, holes, strips, the lab's canvas and the engineering data. */
export function breadboardDef(spec: BreadboardSpec, info: BreadboardInfo): PartDef {
  const { mass, sourcing, ...words } = info;
  const withRails = spec.railHoles > 0;
  return {
    ...words,
    group: "prototyping",
    size: spec.size,
    solids: solidsFor(spec),
    features: features(spec),
    pins: holePins(spec),
    pinTable: withRails ? PIN_TABLE : PIN_TABLE.filter((p) => !p.name.includes("rails")),
    spots: namedSpots(spec),
    circuit: withRails ? railCircuit(spec) : miniCircuit(spec),
    spec: {
      form: { ...(mass ? { mass } : {}), mount: "jumpers", pitch: 2.54, note: "Takes solid wire and part legs 0.4 mm to 0.8 mm thick (20 to 29 AWG). Peel the backing to stick it to a chassis." },
      power: { interface: "No electronics: each strip is one junction", note: "About 1 A per strip, up to about 36 V." },
      sourcing,
      limits: withRails ? ["On some boards each rail is split in the middle: the two halves are not joined until you bridge them. Check with a multimeter before you trust the far end.", ...LIMITS] : ["No power rails: two of its 34 strips have to carry 5 V and GND.", ...LIMITS],
      upgrade: UPGRADE,
      refs: REFS,
    },
    lab: { passive: true, strips: spec.strips },
    canvas: canvasSpec(spec),
    tags: TAGS,
  };
}
