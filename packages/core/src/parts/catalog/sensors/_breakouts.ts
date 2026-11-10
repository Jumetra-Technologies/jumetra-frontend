import { MATERIAL, PCB_TOP, pin, silk, type PinDef, type Piece, type Solid } from "../../sdk";

/**
 * Pieces the small I2C breakout boards share (VL53L0X, TCS34725, BNO055,
 * GY-271, INA219): the two bus pins, a pin-labeling helper, chips in the
 * packages these boards really use, solder-jumper pads and axis arrows.
 */

const r3 = (n: number) => Math.round(n * 1000) / 1000;

/* ----- Bus pins ---------------------------------------------------------------- */

export const sdaPin = (note = "I2C data. Wire it to your board's SDA pin."): PinDef => pin("SDA", "i2c", "sda", note);
export const sclPin = (note = "I2C clock. Wire it to your board's SCL pin."): PinDef => pin("SCL", "i2c", "scl", note);

/* ----- Silkscreen -------------------------------------------------------------- */

/**
 * Pin names printed beside a header, standing on end. `side: "below"` is for a
 * header along the bottom edge (the text reads upward from `y`); `side: "above"`
 * is for a header along the top edge (the text reads downward from `y`).
 * `x` and `y` are the center of the first pin and the end of the text nearest it.
 */
export function pinLabels(labels: readonly (string | null)[], x: number, y: number, opts: { side?: "below" | "above"; size?: number; pitch?: number } = {}): Solid[] {
  const { side = "below", size = 0.85, pitch = 2.54 } = opts;
  const out: Solid[] = [];
  labels.forEach((text, i) => {
    if (!text) return;
    const px = x + i * pitch;
    out.push(side === "below" ? silk(r3(px + size * 0.31), y, text, size, MATERIAL.silk, { rotate: -90 }) : silk(r3(px - size * 0.31), y, text, size, MATERIAL.silk, { rotate: 90 }));
  });
  return out;
}

/** A printed arrow with a letter at its tip: the X and Y marks beside a motion or compass chip. */
export function axisArrow(ox: number, oy: number, dir: "right" | "up", len: number, letter: string): Solid[] {
  const [ex, ey] = dir === "right" ? [ox + len, oy] : [ox, oy - len];
  const head = dir === "right" ? `M ${r3(ex - 0.8)} ${r3(ey - 0.5)} L ${ex} ${ey} L ${r3(ex - 0.8)} ${r3(ey + 0.5)}` : `M ${r3(ex - 0.5)} ${r3(ey + 0.8)} L ${ex} ${ey} L ${r3(ex + 0.5)} ${r3(ey + 0.8)}`;
  return [
    { kind: "path", d: `M ${ox} ${oy} L ${ex} ${ey} ${head}`, color: MATERIAL.silk, width: 0.18 },
    dir === "right" ? silk(r3(ex + 0.5), r3(ey + 0.35), letter, 1.0, MATERIAL.silk, { weight: 700 }) : silk(r3(ex), r3(ey - 0.5), letter, 1.0, MATERIAL.silk, { weight: 700, anchor: "middle" }),
  ];
}

/* ----- Chips ------------------------------------------------------------------- */

/**
 * An LGA or QFN sensor chip: a flat black body with a white pin-1 dot and its
 * marking. (cx, cy) is its center.
 */
export function lga(cx: number, cy: number, w: number, h: number, d: number, label?: string, opts: { id?: string; z?: number; top?: string; labelSize?: number } = {}): Solid[] {
  const z = opts.z ?? PCB_TOP;
  return [
    { kind: "box", id: opts.id, x: r3(cx - w / 2), y: r3(cy - h / 2), w, h, d, z, top: opts.top ?? "#1b1c1f", finish: "epoxy", radius: 0.1, label: label ? { text: label, size: opts.labelSize ?? 0.8, color: "#9aa0a6" } : undefined },
    { kind: "disc", cx: r3(cx - w / 2 + 0.45), cy: r3(cy - h / 2 + 0.45), r: 0.18, color: "#c9ccd1", z: z + d + 0.01 },
  ];
}

/** A SOT-23-8 chip (the INA219 and its cousins): a 2.9 × 1.6 body with four legs on each long side. */
export function sot23x8(cx: number, cy: number, label?: string, z = PCB_TOP): Solid[] {
  const solids: Solid[] = [{ kind: "box", x: r3(cx - 1.45), y: r3(cy - 0.8), w: 2.9, h: 1.6, d: 1.0, z: z + 0.05, top: "#1b1c1f", finish: "epoxy", radius: 0.1, label: label ? { text: label, size: 0.8, color: "#9aa0a6" } : undefined }];
  for (let i = 0; i < 4; i++) {
    for (const side of [-1, 1]) solids.push({ kind: "box", x: r3(cx - 1.0 + i * 0.65 - 0.14), y: r3(cy + side * 1.15 - 0.4), w: 0.28, h: 0.8, d: 0.2, z, top: MATERIAL.tin, finish: "tin", radius: 0.03 });
  }
  return solids;
}

/* ----- Jumpers and terminals --------------------------------------------------- */

/**
 * A solder jumper: two gold pads close together. `bridged` lays a blob of
 * solder across them (the address pads of a board that ships with one set).
 */
export function jumperPads(cx: number, cy: number, bridged = false): Solid[] {
  const pad = (dx: number): Solid => ({ kind: "box", x: r3(cx + dx - 0.6), y: r3(cy - 0.6), w: 1.2, h: 1.2, d: 0.05, z: PCB_TOP, top: MATERIAL.gold, finish: "gold", radius: 0.15 });
  const out: Solid[] = [pad(-0.85), pad(0.85)];
  if (bridged) out.push({ kind: "box", x: r3(cx - 1.0), y: r3(cy - 0.35), w: 2.0, h: 0.7, d: 0.3, z: PCB_TOP + 0.05, top: MATERIAL.tin, finish: "tin", radius: 0.3 });
  return out;
}

/**
 * A 3.5 mm pitch screw terminal block, the small kind on breakout boards.
 * (x, y) is its top-left corner; the wires go in through the edge facing
 * `mouth`. Spots are the wire entries.
 */
export function terminal35(x: number, y: number, poles: number, mouth: "top" | "bottom" = "top", color = "#1e5fbf"): Piece {
  const pitch = 3.5;
  const w = poles * pitch;
  const h = 7.2;
  const height = 7.5;
  const solids: Solid[] = [{ kind: "box", x, y, w, h, d: height, z: PCB_TOP, top: color, side: "#173f80", radius: 0.4, finish: "plastic" }];
  const spots: Array<{ x: number; y: number }> = [];
  const face = mouth === "top" ? y : y + h;
  const sign = mouth === "top" ? -1 : 1;
  for (let i = 0; i < poles; i++) {
    const cx = x + pitch / 2 + i * pitch;
    const cy = y + h / 2 + (mouth === "top" ? 0.4 : -0.4);
    solids.push({ kind: "cyl", cx, cy, r: 1.35, d: 0.3, z: PCB_TOP + height, top: "#121316", finish: "plastic" });
    solids.push({ kind: "cyl", cx, cy, r: 1.1, d: 0.5, z: PCB_TOP + height, top: MATERIAL.steel, finish: "metal" });
    solids.push({ kind: "path", d: `M ${r3(cx - 0.8)} ${r3(cy)} L ${r3(cx + 0.8)} ${r3(cy)}`, color: "#4b5059", width: 0.3, z: PCB_TOP + height + 0.52 });
    // The wire entry: a dark square opening on the mouth face.
    solids.push({ kind: "box", x: r3(cx - 1.2), y: r3(face + (mouth === "top" ? 0 : -0.4)), w: 2.4, h: 0.4, d: 3.0, z: PCB_TOP + 1.2, top: "#0c0d0f", finish: "plastic", radius: 0.2 });
    spots.push({ x: r3(cx), y: r3(face + sign * 0.0) });
  }
  return { solids, spots };
}
