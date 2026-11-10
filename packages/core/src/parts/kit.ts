/**
 * The parts kit: pieces that recur across many parts, each built once.
 *
 * A module is mostly made of the same few things: a board with mounting
 * holes, a pin header, a comparator chip with a trimmer beside it, a screw
 * terminal, a heatsink. Building them here keeps every part's file short and
 * makes the same header look the same everywhere.
 *
 * Conventions for everything in this file:
 * - Lengths are millimeters; x runs right, y runs down the page, z runs up.
 * - Pieces that sit at one spot take their CENTER (cx, cy). Rows of pins take
 *   the center of their FIRST pin. That is how datasheets and reference
 *   drawings give positions.
 * - `z` is what the piece stands on: the top of a 1.6 mm board unless said.
 * - Pieces with pins return a `Piece`: list it in `solids` as it is, and name
 *   its pins with `name()` for `pinAt`.
 */
import { MATERIAL, PCB_TOP, SOLDER_STUB, shade, type Mouth } from "./build";
import { circlePath, roundedRect } from "./path";
import type { Finish, Solid } from "./types";

/** Solids plus where their pins are, in order. */
export interface Piece {
  solids: Solid[];
  spots: Array<{ x: number; y: number }>;
}

/**
 * Names a piece's pins in order, for `pinAt`. Pass null to skip one.
 *
 *   const pins = pinHeader(18.7, 18.4, 4, { style: "angled", out: "bottom" });
 *   pinAt: { ...name(pins, "VCC", "TRIG", "ECHO", "GND") }
 */
export function name(piece: Piece, ...ids: Array<string | null>): Record<string, { x: number; y: number }> {
  const out: Record<string, { x: number; y: number }> = {};
  ids.forEach((id, i) => {
    if (id && piece.spots[i]) out[id] = piece.spots[i];
  });
  return out;
}

const STEEL = "#c9ccd1";
const DARK = "#0c0d0f";
const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** The unit step along a mouth's direction: where "out of the board" points. */
function outward(mouth: Mouth): { x: number; y: number } {
  return mouth === "left" ? { x: -1, y: 0 } : mouth === "right" ? { x: 1, y: 0 } : mouth === "top" ? { x: 0, y: -1 } : { x: 0, y: 1 };
}

/** A box given by its center, its size along and across a direction, and its height. */
function slab(cx: number, cy: number, along: number, across: number, d: number, z: number, dir: "x" | "y", rest: Partial<Extract<Solid, { kind: "box" }>> & { top: string }): Solid {
  const w = dir === "x" ? along : across;
  const h = dir === "x" ? across : along;
  return { kind: "box", x: r3(cx - w / 2), y: r3(cy - h / 2), w, h, d, z, ...rest };
}

/* ----- Boards ------------------------------------------------------------------ */

export interface BoardHole {
  x: number;
  y: number;
  /** Diameter. */
  d: number;
  /** The plating round the hole. false for a bare hole. */
  ring?: string | false;
}

/**
 * A circuit board with real holes drilled through it. `outline` replaces the
 * rounded rectangle for boards of another shape (a closed SVG path in mm).
 */
export function board(w: number, h: number, color: string, opts: { holes?: BoardHole[]; radius?: number; t?: number; outline?: string } = {}): Solid[] {
  const t = opts.t ?? 1.6;
  const holes = opts.holes ?? [];
  const path = [opts.outline ?? roundedRect(0, 0, w, h, opts.radius ?? 1), ...holes.map((hole) => circlePath(hole.x, hole.y, hole.d / 2))].join(" ");
  return [
    { kind: "extrude", id: "pcb", path, d: t, top: color, side: shade(color, 0.55), finish: "soldermask" },
    ...holes
      .filter((hole) => hole.ring !== false)
      .map((hole): Solid => ({ kind: "disc", cx: hole.x, cy: hole.y, r: hole.d / 2, color: DARK, hole: true, z: t, ring: { color: hole.ring || MATERIAL.tin, width: Math.max(0.45, hole.d * 0.2) } })),
  ];
}

/* ----- Pin headers ------------------------------------------------------------- */

export interface HeaderOptions {
  /** The way the row runs. Default x. */
  dir?: "x" | "y";
  rows?: number;
  /**
   * up: plastic on the board, pins standing up for jumper wires.
   * down: plastic under the board and pins hanging down, for a breadboard; solder dots on top.
   * angled: a right-angle header at the board's edge, pins pointing out along `out`.
   */
  style?: "up" | "down" | "angled";
  /** For angled headers: the edge the pins point out of. */
  out?: Mouth;
  /** For angled headers: the plastic and pins are on the underside of the board (an HC-SR04), with only the solder dots on top. */
  under?: boolean;
  z?: number;
  pitch?: number;
}

/**
 * A male pin header. (x, y) is the center of the first pin; the row runs
 * along +x or +y. The returned spots are where a jumper wire lands on each
 * pin: the pin itself, or for an angled header the middle of its bare length.
 */
export function pinHeader(x: number, y: number, count: number, opts: HeaderOptions = {}): Piece {
  const { dir = "x", rows = 1, style = "up", z = PCB_TOP, pitch = 2.54 } = opts;
  const long = count * pitch;
  const short = rows * pitch;
  const bx = x - pitch / 2;
  const by = y - pitch / 2;
  const w = dir === "x" ? long : short;
  const h = dir === "x" ? short : long;
  const centers: Array<{ x: number; y: number }> = [];
  for (let r = 0; r < rows; r++) {
    for (let i = 0; i < count; i++) centers.push(dir === "x" ? { x: r3(x + i * pitch), y: r3(y + r * pitch) } : { x: r3(x + r * pitch), y: r3(y + i * pitch) });
  }
  const plastic = (zz: number, d = 2.5): Solid => ({ kind: "box", x: bx, y: by, w, h, d, z: zz, top: MATERIAL.header, side: MATERIAL.headerSide, radius: 0.3, finish: "plastic" });
  const solder = (): Solid[] => centers.flatMap((c): Solid[] => [{ kind: "disc", cx: c.x, cy: c.y, r: 0.85, color: MATERIAL.tin, z }, { kind: "dome", cx: c.x, cy: c.y, r: 0.7, d: 0.55, z, color: MATERIAL.tin, finish: "tin" }]);

  if (style === "up") {
    return { solids: [plastic(z), { kind: "pins", x: bx, y: by, count, pitch, dir, len: 6, rows, z: z + 2.5, finish: "gold" }], spots: centers };
  }
  if (style === "down") {
    const under = z - PCB_TOP - 2.5;
    return {
      solids: [plastic(under), { kind: "pins", x: bx, y: by, count, pitch, dir, len: 6 + 2.5 + PCB_TOP + SOLDER_STUB, rows, z: under - 6, finish: "gold" }, ...solder()],
      spots: centers,
    };
  }
  // Angled: each pin comes up through the board, bends, passes through the plastic and runs out.
  const out = opts.out ?? (dir === "x" ? "bottom" : "right");
  const o = outward(out);
  const reach = 1.4 + 2.5 + 6;
  const solids: Solid[] = [...solder()];
  const blockC = { x: (centers[0].x + centers[count - 1].x) / 2 + o.x * 2.65, y: (centers[0].y + centers[count - 1].y) / 2 + o.y * 2.65 };
  const blockZ = opts.under ? z - PCB_TOP - 2.54 : z;
  const pinZ = opts.under ? z - PCB_TOP - 1.6 : z + 0.95;
  solids.push(slab(blockC.x, blockC.y, long, 2.5, 2.54, blockZ, dir, { top: MATERIAL.header, side: MATERIAL.headerSide, radius: 0.3, finish: "plastic" }));
  for (const c of centers.slice(0, count)) {
    const mx = c.x + (o.x * reach) / 2;
    const my = c.y + (o.y * reach) / 2;
    solids.push({ kind: "box", x: r3(mx - (o.x ? reach / 2 : 0.32)), y: r3(my - (o.y ? reach / 2 : 0.32)), w: o.x ? reach : 0.64, h: o.y ? reach : 0.64, d: 0.64, z: pinZ, top: MATERIAL.gold, finish: "gold", radius: 0.05 });
  }
  return { solids, spots: centers.slice(0, count).map((c) => ({ x: r3(c.x + o.x * 7.2), y: r3(c.y + o.y * 7.2) })) };
}

/** A female header socket: a tall black strip with a hole per pin. (x, y) is the center of the first hole. */
export function socketHeader(x: number, y: number, count: number, opts: { dir?: "x" | "y"; rows?: number; z?: number; height?: number } = {}): Piece {
  const { dir = "x", rows = 1, z = PCB_TOP, height = 8.5 } = opts;
  const pitch = 2.54;
  const w = dir === "x" ? count * pitch : rows * pitch;
  const h = dir === "x" ? rows * pitch : count * pitch;
  const spots: Array<{ x: number; y: number }> = [];
  for (let r = 0; r < rows; r++) for (let i = 0; i < count; i++) spots.push(dir === "x" ? { x: r3(x + i * pitch), y: r3(y + r * pitch) } : { x: r3(x + r * pitch), y: r3(y + i * pitch) });
  return { solids: [{ kind: "box", x: x - pitch / 2, y: y - pitch / 2, w, h, d: height, z, top: MATERIAL.header, side: MATERIAL.headerSide, holes: { count, rows }, radius: 0.3, finish: "plastic" }], spots };
}

/** A two-pin shorting jumper pushed onto a header: (cx, cy) is the middle of the two pins it joins. */
export function jumperCap(cx: number, cy: number, dir: "x" | "y" = "x", color = "#1e5fbf", z = PCB_TOP + 2.5): Solid {
  return slab(cx, cy, 5, 2.5, 6, z, dir, { top: color, side: shade(color, 0.7), radius: 0.4, finish: "plastic" });
}

/* ----- Connectors -------------------------------------------------------------- */

/**
 * A screw terminal block (KF301 style, 5 mm pitch): (x, y) is its top-left
 * corner and it is 7.6 mm deep. `mouth` is the face the wires go into. Spots
 * are the wire entries.
 */
export function terminalBlock(x: number, y: number, poles: number, opts: { color?: string; pitch?: number; mouth?: Mouth; z?: number } = {}): Piece {
  const { color = "#1e5fbf", pitch = 5, mouth = "bottom", z = PCB_TOP } = opts;
  const acrossX = mouth === "top" || mouth === "bottom";
  const w = acrossX ? poles * pitch : 7.6;
  const h = acrossX ? 7.6 : poles * pitch;
  const solids: Solid[] = [{ kind: "box", x, y, w, h, d: 10, z, top: color, side: shade(color, 0.62), radius: 0.5, finish: "plastic" }];
  const spots: Array<{ x: number; y: number }> = [];
  const o = outward(mouth);
  for (let i = 0; i < poles; i++) {
    const cx = acrossX ? x + pitch / 2 + i * pitch : x + 3.8;
    const cy = acrossX ? y + 3.8 : y + pitch / 2 + i * pitch;
    // The screw: a steel head sunk a little into the top, with its slot.
    solids.push({ kind: "cyl", cx, cy, r: 1.9, d: 0.3, z: z + 10, top: "#121316", finish: "plastic" });
    solids.push({ kind: "cyl", cx, cy, r: 1.55, d: 0.5, z: z + 10, top: STEEL, finish: "metal" });
    solids.push({ kind: "path", d: acrossX ? `M ${r3(cx - 1.1)} ${r3(cy)} L ${r3(cx + 1.1)} ${r3(cy)}` : `M ${r3(cx)} ${r3(cy - 1.1)} L ${r3(cx)} ${r3(cy + 1.1)}`, color: "#4b5059", width: 0.4, z: z + 10.52 });
    // The wire entry on the mouth face: a dark square opening with the steel clamp inside.
    const fx = cx + o.x * 3.75;
    const fy = cy + o.y * 3.75;
    solids.push({ kind: "box", x: r3(fx - (o.x ? 0.2 : 1.6)), y: r3(fy - (o.y ? 0.2 : 1.6)), w: o.x ? 0.4 : 3.2, h: o.y ? 0.4 : 3.2, d: 3.4, z: z + 1.2, top: DARK, finish: "plastic", radius: 0.2 });
    spots.push({ x: r3(cx + o.x * 3.8), y: r3(cy + o.y * 3.8) });
  }
  return { solids, spots };
}

/**
 * A JST socket (PH 2.0 mm by default): a cream shroud with its slot on the
 * mouth face. (cx, cy) is its center. Spots are its pins.
 */
export function jst(cx: number, cy: number, pins: number, mouth: Mouth, opts: { pitch?: number; color?: string; z?: number } = {}): Piece {
  const { pitch = 2, color = "#eee9dc", z = PCB_TOP } = opts;
  const acrossX = mouth === "top" || mouth === "bottom";
  const wide = (pins - 1) * pitch + 3.9;
  const deep = 4.5;
  const o = outward(mouth);
  const body = slab(cx, cy, wide, deep, 6, z, acrossX ? "x" : "y", { top: color, side: shade(color, 0.8), radius: 0.3, finish: "plastic" });
  const fx = cx + (o.x * deep) / 2;
  const fy = cy + (o.y * deep) / 2;
  const slot: Solid = { kind: "box", x: r3(fx - (o.x ? 0.25 : wide / 2 - 0.7)), y: r3(fy - (o.y ? 0.25 : wide / 2 - 0.7)), w: o.x ? 0.5 : wide - 1.4, h: o.y ? 0.5 : wide - 1.4, d: 3.6, z: z + 1.2, top: "#2b2a27", finish: "plastic", radius: 0.2 };
  const spots = Array.from({ length: pins }, (_, i) => {
    const t = (i - (pins - 1) / 2) * pitch;
    return acrossX ? { x: r3(cx + t), y: cy } : { x: cx, y: r3(cy + t) };
  });
  return { solids: [body, slot], spots };
}

/**
 * The plastic housing on the end of jumper leads: `pins` wide, standing on a
 * header (set `z` to the top of the header's plastic) or lying loose.
 */
export function dupont(cx: number, cy: number, pins: number, dir: "x" | "y" = "x", z = PCB_TOP + 2.5, color = "#17181b"): Solid {
  return slab(cx, cy, pins * 2.54, 2.54, 14, z, dir, { top: color, side: shade(color, 0.7), radius: 0.3, finish: "plastic" });
}

/**
 * A flying lead: insulated wire through the given points, with a bare tinned
 * end at its last point when `strip` is set (mm of bare wire).
 */
export function lead(points: Array<[number, number, number]>, color: string, opts: { r?: number; strip?: number } = {}): Solid[] {
  const r = opts.r ?? 0.65;
  const solids: Solid[] = [{ kind: "wire", points, r, color, finish: "plastic" }];
  if (opts.strip && points.length >= 2) {
    const a = points[points.length - 2];
    const b = points[points.length - 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) || 1;
    const k = opts.strip / len;
    solids.push({ kind: "wire", points: [b, [b[0] + (b[0] - a[0]) * k, b[1] + (b[1] - a[1]) * k, b[2] + (b[2] - a[2]) * k]], r: r * 0.55, color: MATERIAL.tin, finish: "tin" });
  }
  return solids;
}

/* ----- Chip packages ----------------------------------------------------------- */

const EPOXY_TOP = "#1b1c1f";

/**
 * A small-outline chip (SOIC): LM393, LM324, PCF8574 and most 8- to 16-pin
 * chips on modules. `perSide` legs along each long side, 1.27 mm apart.
 * `wide` is the 7.5 mm body (SOIC-16W and up).
 */
export function soic(cx: number, cy: number, perSide: number, label?: string, opts: { dir?: "x" | "y"; wide?: boolean; id?: string; z?: number } = {}): Solid[] {
  const { dir = "x", wide = false, id, z = PCB_TOP } = opts;
  const length = perSide * 1.27 + 0.5;
  const width = wide ? 7.5 : 3.9;
  const solids: Solid[] = [slab(cx, cy, length, width, 1.5, z + 0.1, dir, { id, top: EPOXY_TOP, radius: 0.2, finish: "epoxy", label: label ? { text: label, size: Math.min(1.1, width / 4), color: "#9aa0a6" } : undefined })];
  for (let i = 0; i < perSide; i++) {
    const t = (i - (perSide - 1) / 2) * 1.27;
    for (const side of [-1, 1]) {
      const off = side * (width / 2 + 0.5);
      solids.push(slab(dir === "x" ? cx + t : cx + off, dir === "x" ? cy + off : cy + t, 0.42, 1.05, 0.25, z, dir, { top: MATERIAL.tin, finish: "tin", radius: 0.03 }));
    }
  }
  return solids;
}

/** A SOT-23 transistor or regulator: three legs (two one side, one the other), or five with `five`. */
export function sot23(cx: number, cy: number, opts: { dir?: "x" | "y"; five?: boolean; label?: string; z?: number } = {}): Solid[] {
  const { dir = "x", five = false, label, z = PCB_TOP } = opts;
  const solids: Solid[] = [slab(cx, cy, 2.9, 1.3, 1, z + 0.05, dir, { top: EPOXY_TOP, radius: 0.1, finish: "epoxy", label: label ? { text: label, size: 0.7, color: "#9aa0a6" } : undefined })];
  const legs: Array<[number, number]> = five ? [[-0.95, -1], [0, -1], [0.95, -1], [-0.95, 1], [0.95, 1]] : [[-0.95, 1], [0.95, 1], [0, -1]];
  for (const [t, side] of legs) solids.push(slab(dir === "x" ? cx + t : cx + side * 1.05, dir === "x" ? cy + side * 1.05 : cy + t, 0.4, 0.8, 0.2, z, dir, { top: MATERIAL.tin, finish: "tin", radius: 0.03 }));
  return solids;
}

/**
 * A TO-92 transistor or sensor standing on its three legs: a half-round black
 * body with a flat face. `flat` is the way the flat face looks. (cx, cy) is
 * the middle leg; spots are the three legs, left to right as seen from the
 * flat face.
 */
export function to92(cx: number, cy: number, opts: { flat?: Mouth; lift?: number; z?: number; id?: string; color?: string } = {}): Piece {
  const { flat = "bottom", lift = 3, z = PCB_TOP, id, color = "#1a1b1e" } = opts;
  const o = outward(flat);
  const r = 2.4;
  const cut = 1.45; // from the center to the flat face
  // The outline: an arc from one end of the flat, round the back, to the other.
  const px = -o.y;
  const py = o.x;
  const half = Math.sqrt(r * r - cut * cut);
  const a = { x: cx + o.x * cut + px * half, y: cy + o.y * cut + py * half };
  const b = { x: cx + o.x * cut - px * half, y: cy + o.y * cut - py * half };
  // From a (the +perp end of the flat) the long way round the back to b; perp is +90° from out, so that is the positive-angle direction.
  const path = `M ${r3(a.x)} ${r3(a.y)} A ${r} ${r} 0 1 1 ${r3(b.x)} ${r3(b.y)} Z`;
  const acrossX = flat === "top" || flat === "bottom";
  const spots = [-1.27, 0, 1.27].map((t) => (acrossX ? { x: r3(cx + (flat === "bottom" ? t : -t)), y: cy } : { x: cx, y: r3(cy + (flat === "left" ? t : -t)) }));
  return {
    solids: [
      { kind: "extrude", id, path, d: 4.6, z: z + lift, top: color, finish: "epoxy", bevel: 0.2 },
      ...spots.map((s): Solid => ({ kind: "box", x: r3(s.x - 0.22), y: r3(s.y - 0.22), w: 0.44, h: 0.44, d: lift + 0.4, z, top: MATERIAL.tin, finish: "tin", radius: 0.05 })),
    ],
    spots,
  };
}

/**
 * A TO-220 power part standing up: a black body with its steel tab rising
 * behind it. `face` is the way the printed face looks; the tab is on the
 * other side. (cx, cy) is the middle leg; spots are the three legs.
 */
export function to220(cx: number, cy: number, opts: { face?: Mouth; label?: string; z?: number; id?: string } = {}): Piece {
  const { face = "bottom", z = PCB_TOP, id } = opts;
  const o = outward(face);
  const acrossX = face === "top" || face === "bottom";
  const dir = acrossX ? "x" : "y";
  const lift = 3.5;
  const spots = [-2.54, 0, 2.54].map((t) => (acrossX ? { x: r3(cx + t), y: cy } : { x: cx, y: r3(cy + t) }));
  return {
    solids: [
      // Body (10 × 4.5 × 9.2), then the tab (10 × 1.3) from the body's base to 6.4 above it, on the far side.
      slab(cx + o.x * 0.4, cy + o.y * 0.4, 10, 3.3, 9.2, z + lift, dir, { id, top: EPOXY_TOP, radius: 0.3, finish: "epoxy" }),
      slab(cx - o.x * 1.9, cy - o.y * 1.9, 10, 1.3, 15.6, z + lift, dir, { top: STEEL, finish: "metal", radius: 0.2 }),
      ...spots.map((s): Solid => ({ kind: "box", x: r3(s.x - 0.4), y: r3(s.y - 0.25), w: 0.8, h: 0.5, d: lift + 0.6, z, top: MATERIAL.tin, finish: "tin", radius: 0.05 })),
    ],
    spots,
  };
}

/* ----- Power parts ------------------------------------------------------------- */

/**
 * A finned heatsink: a base plate with fins standing on it. (x, y) is its
 * top-left corner. Fins run along `dir`. Black anodized unless `color` is
 * given; pass finish "aluminum" for a bare one.
 */
export function heatsink(x: number, y: number, w: number, h: number, d: number, opts: { fins?: number; dir?: "x" | "y"; color?: string; finish?: Finish; z?: number; base?: number } = {}): Solid[] {
  const { dir = "y", color = "#1c1d20", finish = "anodized", z = PCB_TOP, base = 1.5 } = opts;
  const across = dir === "y" ? w : h;
  const fins = opts.fins ?? Math.max(3, Math.round(across / 2.4));
  const fin = Math.min(1, (across / fins) * 0.45);
  const solids: Solid[] = [{ kind: "box", x, y, w, h, d: base, z, top: color, finish, radius: 0.1 }];
  for (let i = 0; i < fins; i++) {
    const t = fins === 1 ? 0 : (i / (fins - 1)) * (across - fin);
    solids.push(dir === "y" ? { kind: "box", x: r3(x + t), y, w: fin, h, d: d - base, z: z + base, top: color, finish, radius: 0.05 } : { kind: "box", x, y: r3(y + t), w, h: fin, d: d - base, z: z + base, top: color, finish, radius: 0.05 });
  }
  return solids;
}

/**
 * A heatsink standing on edge, as bolted to the back of an upright power
 * chip: a spine along one side and fins reaching away from it, all the full
 * height. (x, y) is the top-left corner of its footprint; `spine` is the side
 * the spine (and the chip) is on.
 */
export function heatsinkUpright(x: number, y: number, w: number, h: number, d: number, opts: { spine?: Mouth; fins?: number; color?: string; finish?: Finish; z?: number } = {}): Solid[] {
  const { spine = "bottom", color = "#1c1d20", finish = "anodized", z = PCB_TOP } = opts;
  const alongX = spine === "top" || spine === "bottom";
  const run = alongX ? w : h;
  const fins = opts.fins ?? Math.max(4, Math.round(run / 2.6));
  const fin = Math.min(1.1, (run / fins) * 0.42);
  const back = 2;
  const solids: Solid[] = [];
  if (alongX) solids.push({ kind: "box", x, y: spine === "bottom" ? y + h - back : y, w, h: back, d, z, top: color, finish, radius: 0.1 });
  else solids.push({ kind: "box", x: spine === "right" ? x + w - back : x, y, w: back, h, d, z, top: color, finish, radius: 0.1 });
  for (let i = 0; i < fins; i++) {
    const t = fins === 1 ? 0 : (i / (fins - 1)) * (run - fin);
    solids.push(
      alongX
        ? { kind: "box", x: r3(x + t), y: spine === "bottom" ? y : y + back, w: fin, h: h - back, d, z, top: color, finish, radius: 0.05 }
        : { kind: "box", x: spine === "right" ? x : x + back, y: r3(y + t), w: w - back, h: fin, d, z, top: color, finish, radius: 0.05 },
    );
  }
  return solids;
}

/** A DPAK (TO-252) regulator or MOSFET lying flat: a black body on a wide tinned tab, three legs out of the other end. `legs` is the side the legs are on. */
export function dpak(cx: number, cy: number, legs: Mouth = "bottom", label?: string, z = PCB_TOP): Solid[] {
  const o = outward(legs);
  const dir = o.x ? "y" : "x";
  const solids: Solid[] = [
    slab(cx - o.x * 1.6, cy - o.y * 1.6, 5.4, 6.2, 0.5, z, dir, { top: MATERIAL.tin, finish: "tin", radius: 0.1 }),
    slab(cx, cy, 6.5, 6.1, 2.3, z, dir, { top: EPOXY_TOP, finish: "epoxy", radius: 0.2, label: label ? { text: label, size: 1.05, color: "#9aa0a6" } : undefined }),
  ];
  for (const t of [-2.28, 2.28]) solids.push(slab(cx + (o.x ? o.x * 4.2 : t), cy + (o.y ? o.y * 4.2 : t), 0.8, 2.6, 0.5, z, dir, { top: MATERIAL.tin, finish: "tin", radius: 0.05 }));
  return solids;
}

/** A shielded power inductor: a dark ferrite block with its value printed on top ("100" is 10 µH, "470" is 47 µH). */
export function inductor(cx: number, cy: number, size = 7, label = "100", height = 4.5, z = PCB_TOP): Solid[] {
  return [
    slab(cx, cy, size + 1.2, size * 0.5, 0.3, z, "x", { top: MATERIAL.tin, finish: "tin", radius: 0.05 }),
    { kind: "box", x: r3(cx - size / 2), y: r3(cy - size / 2), w: size, h: size, d: height, z, top: "#2b2d31", finish: "epoxy", radius: Math.min(1.2, size * 0.18), label: { text: label, size: size * 0.26, color: "#c9ccd1" } },
  ];
}

/** A multi-turn trimmer (Bourns 3296W): a blue block with a brass screw on top at one end. `dir` is its long way; `screw` the end the screw is at (-1 or 1). */
export function trimmer(cx: number, cy: number, dir: "x" | "y" = "x", screw: -1 | 1 = -1, id?: string, z = PCB_TOP): Solid[] {
  const sx = dir === "x" ? cx + screw * 3.2 : cx;
  const sy = dir === "x" ? cy : cy + screw * 3.2;
  return [
    slab(cx, cy, 9.5, 4.8, 10, z, dir, { id, top: "#2a5cc4", side: "#1c3f8a", radius: 0.4, finish: "plastic" }),
    { kind: "cyl", cx: sx, cy: sy, r: 1.15, d: 0.7, z: z + 10, top: "#c2a04e", finish: "brass" },
    { kind: "path", d: dir === "x" ? `M ${r3(sx)} ${r3(sy - 0.8)} L ${r3(sx)} ${r3(sy + 0.8)}` : `M ${r3(sx - 0.8)} ${r3(sy)} L ${r3(sx + 0.8)} ${r3(sy)}`, color: "#5a4a1e", width: 0.3, z: z + 10.72 },
  ];
}

/** A surface-mount diode (SMA size by default): black, with a pale band at its cathode end (`band`: -1 or 1 along `dir`). */
export function smdDiode(cx: number, cy: number, dir: "x" | "y" = "x", band: -1 | 1 = 1, size: "sma" | "sod123" = "sma", z = PCB_TOP): Solid[] {
  const [l, w, hgt] = size === "sma" ? [4.3, 2.6, 2.1] : [2.7, 1.6, 1.1];
  return [
    slab(cx, cy, l + 1, w * 0.55, 0.25, z, dir, { top: MATERIAL.tin, finish: "tin", radius: 0.05 }),
    slab(cx, cy, l, w, hgt, z, dir, { top: "#1d1e21", finish: "epoxy", radius: 0.15 }),
    slab(dir === "x" ? cx + band * (l / 2 - 0.55) : cx, dir === "x" ? cy : cy + band * (l / 2 - 0.55), 0.6, w, 0.04, z + hgt, dir, { top: "#c9ccd1", finish: "paper", radius: 0 }),
  ];
}

/* ----- Lights and optics ------------------------------------------------------- */

/**
 * A 5 mm (or 3 mm) LED lying down, pointing out of the board along `out`:
 * the IR emitter and receiver on obstacle sensors, a flame sensor's diode.
 * (cx, cy) is where its legs enter the board.
 */
export function ledLying(cx: number, cy: number, out: Mouth, color: string, opts: { r?: number; clear?: boolean; id?: string; z?: number; length?: number } = {}): Solid[] {
  const { r = 2.5, id, z = PCB_TOP, length = 8.6 } = opts;
  const o = outward(out);
  const axis = o.x ? "x" : "y";
  const lens = opts.clear ? shade(color, 1.15) : color;
  const body = length - r;
  const bx = cx + o.x * (2.5 + body / 2);
  const by = cy + o.y * (2.5 + body / 2);
  const tx = cx + o.x * (2.5 + body + r * 0.45);
  const ty = cy + o.y * (2.5 + body + r * 0.45);
  const tipFar = o.x > 0 || o.y > 0;
  return [
    // Legs from the board up and out to the body.
    { kind: "wire", points: [[cx - (o.y ? 1.27 : 0), cy - (o.x ? 1.27 : 0), z], [cx - (o.y ? 1.27 : 0), cy - (o.x ? 1.27 : 0), z + r + 0.6], [cx + o.x * 2.6 - (o.y ? 1.27 : 0), cy + o.y * 2.6 - (o.x ? 1.27 : 0), z + r + 0.6]], r: 0.25, color: MATERIAL.tin, finish: "tin" },
    { kind: "wire", points: [[cx + (o.y ? 1.27 : 0), cy + (o.x ? 1.27 : 0), z], [cx + (o.y ? 1.27 : 0), cy + (o.x ? 1.27 : 0), z + r + 0.6], [cx + o.x * 2.6 + (o.y ? 1.27 : 0), cy + o.y * 2.6 + (o.x ? 1.27 : 0), z + r + 0.6]], r: 0.25, color: MATERIAL.tin, finish: "tin" },
    { kind: "cyl", id: id ? `${id}-body` : undefined, cx: r3(bx), cy: r3(by), r, d: body, z: z + 0.6, axis, top: lens, finish: opts.clear ? "clear" : "plastic", glow: id ? color : undefined },
    // The rounded tip, as a short taper.
    { kind: "cyl", id, cx: r3(tx), cy: r3(ty), r: tipFar ? r : r * 0.55, r2: tipFar ? r * 0.55 : r, d: r * 0.9, z: z + 0.6, axis, top: lens, finish: opts.clear ? "clear" : "plastic", glow: id ? color : undefined },
  ];
}

/** A WS2812B addressable LED (5050): a white square with a round clear window. `id` lights it. */
export function ws2812(cx: number, cy: number, id: string, z = PCB_TOP): Solid[] {
  return [
    { kind: "box", x: r3(cx - 2.5), y: r3(cy - 2.5), w: 5, h: 5, d: 1.5, z, top: "#eeeef0", finish: "plastic", radius: 0.3 },
    { kind: "cyl", id, cx, cy, r: 1.9, d: 0.2, z: z + 1.5, top: "#d8dbe0", finish: "clear", glow: "#ffffff" },
  ];
}

/* ----- The comparator sensor board ---------------------------------------------- */

/**
 * The three things nearly every cheap sensor module carries: an LM393
 * comparator, a blue trimmer that sets its threshold, and two indicator LEDs
 * (power and output). Positions are centers.
 */
export function comparatorSet(at: { chip: [number, number]; trimmer: [number, number]; power?: [number, number]; signal?: [number, number] }, opts: { chipDir?: "x" | "y"; trimmerDir?: "x" | "y"; powerColor?: string; signalColor?: string; z?: number } = {}): Solid[] {
  const z = opts.z ?? PCB_TOP;
  const ledAt = (p: [number, number], color: string, id: string): Solid => ({ kind: "box", id, x: r3(p[0] - 0.8), y: r3(p[1] - 0.4), w: 1.6, h: 0.8, d: 0.6, z, top: shade(color, 0.55), side: shade(color, 0.4), glow: color, radius: 0.2, finish: "plastic" });
  return [
    ...soic(at.chip[0], at.chip[1], 4, "LM393", { dir: opts.chipDir ?? "x", id: "lm393", z }),
    ...trimmer(at.trimmer[0], at.trimmer[1], opts.trimmerDir ?? "x", -1, "trimmer", z),
    ...(at.power ? [ledAt(at.power, opts.powerColor ?? "#ff4d4d", "led-pwr")] : []),
    ...(at.signal ? [ledAt(at.signal, opts.signalColor ?? "#3ddc84", "led-signal")] : []),
  ];
}

/* ----- Surfaces ---------------------------------------------------------------- */

/**
 * A woven mesh or grille printed inside a circle: the front of an ultrasonic
 * transducer, a gas sensor's steel gauze, a microphone or buzzer opening.
 * Lay it on a dark disc at the same height.
 */
export function grille(cx: number, cy: number, r: number, z: number, opts: { step?: number; color?: string; width?: number; weave?: boolean } = {}): Solid {
  const { step = 0.9, color = "#8f949b", width = 0.22, weave = true } = opts;
  const parts: string[] = [];
  for (let t = -r + step / 2; t < r; t += step) {
    const half = Math.sqrt(Math.max(0, r * r - t * t));
    if (half < 0.2) continue;
    parts.push(`M ${r3(cx - half)} ${r3(cy + t)} L ${r3(cx + half)} ${r3(cy + t)}`);
    if (weave) parts.push(`M ${r3(cx + t)} ${r3(cy - half)} L ${r3(cx + t)} ${r3(cy + half)}`);
  }
  return { kind: "path", d: parts.join(" "), color, width, z };
}
