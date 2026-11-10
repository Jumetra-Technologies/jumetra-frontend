import { MATERIAL, shade, type Solid } from "../../sdk";

const TOP = 1.6;

/** Gives the first solid of a kit piece an id (the lab and the animation refer to solids by id). */
export function withId(solids: Solid[], id: string): Solid[] {
  const [first, ...rest] = solids;
  return [{ ...first, id } as Solid, ...rest];
}

/**
 * A Songle SRD-05VDC-SL-C relay: the blue 19 × 15.5 × 15.3 mm cube with its
 * printing. (x, y) is its top-left corner on the board.
 */
export function songleRelay(x: number, y: number, id: string): Solid[] {
  const w = 19;
  const h = 15.5;
  const d = 15.3;
  const zTop = TOP + d + 0.01;
  const cx = x + w / 2;
  const ink = "#e8eefc";
  return [
    { kind: "box", id, x, y, w, h, d, z: TOP, top: "#1f55bd", side: shade("#1f55bd", 0.62), radius: 0.5, finish: "plastic" },
    // The ridge round the top face where the cover seats on the base.
    { kind: "path", d: `M ${x + 0.7} ${y + 0.7} H ${x + w - 0.7} V ${y + h - 0.7} H ${x + 0.7} Z`, color: shade("#1f55bd", 0.8), width: 0.25, z: zTop },
    { kind: "text", x: cx, y: y + 4.2, text: "SONGLE", size: 2.1, color: ink, weight: 700, anchor: "middle", z: zTop },
    { kind: "text", x: cx, y: y + 6.9, text: "SRD-05VDC-SL-C", size: 1.55, color: ink, anchor: "middle", z: zTop },
    { kind: "text", x: cx, y: y + 9.6, text: "10A 250VAC  10A 125VAC", size: 1.0, color: ink, anchor: "middle", z: zTop },
    { kind: "text", x: cx, y: y + 11.2, text: "10A 30VDC  10A 28VDC", size: 1.0, color: ink, anchor: "middle", z: zTop },
    { kind: "text", x: cx, y: y + 13.2, text: "COIL 5VDC  CONTACT SPDT", size: 0.9, color: ink, anchor: "middle", z: zTop },
  ];
}

/** A PC817 optocoupler in a four-lead mini-flat package: 4.4 × 3.6 mm, two legs on each long side. */
export function sop4(cx: number, cy: number, id?: string, z = TOP): Solid[] {
  const solids: Solid[] = [
    { kind: "box", id, x: +(cx - 2.2).toFixed(2), y: +(cy - 1.8).toFixed(2), w: 4.4, h: 3.6, d: 2, z: z + 0.1, top: "#1b1c1f", side: MATERIAL.icSide, radius: 0.2, finish: "epoxy", label: { text: "817", size: 1.1, color: "#9aa0a6" } },
  ];
  for (const t of [-1.27, 1.27]) {
    for (const side of [-1, 1]) {
      solids.push({ kind: "box", x: +(cx + t - 0.25).toFixed(2), y: +(cy + side * 2.35 - 0.6).toFixed(2), w: 0.5, h: 1.2, d: 0.25, z, top: MATERIAL.tin, finish: "tin", radius: 0.03 });
    }
  }
  return solids;
}

/** A ring of copper pads with a drilled hole, for a footprint left empty on the board (the optional capacitor on a PCA9685). */
export function emptyFootprint(cx: number, cy: number, r = 1.0): Solid[] {
  return [{ kind: "disc", cx, cy, r: r + 0.4, color: MATERIAL.tin, z: TOP }, { kind: "disc", cx, cy, r: r * 0.55, color: "#0b0c0e", z: TOP + 0.01 }];
}

/** A pair of bare pads that a blob of solder joins: an address or option jumper. (cx, cy) is the middle of the pair. */
export function solderJumper(cx: number, cy: number, dir: "x" | "y" = "y", bridged = false): Solid[] {
  const gap = 0.55;
  const l = 1.1;
  const w = 1.3;
  const a = dir === "y" ? { x: cx - w / 2, y: cy - gap / 2 - l, w, h: l } : { x: cx - gap / 2 - l, y: cy - w / 2, w: l, h: w };
  const b = dir === "y" ? { x: cx - w / 2, y: cy + gap / 2, w, h: l } : { x: cx + gap / 2, y: cy - w / 2, w: l, h: w };
  const pad = (r: { x: number; y: number; w: number; h: number }): Solid => ({ kind: "box", x: +r.x.toFixed(3), y: +r.y.toFixed(3), w: r.w, h: r.h, d: 0.04, z: TOP, top: MATERIAL.gold, finish: "gold", radius: 0.05 });
  const out: Solid[] = [pad(a), pad(b)];
  if (bridged) out.push({ kind: "box", x: +(cx - 0.45).toFixed(3), y: +(cy - 0.45).toFixed(3), w: 0.9, h: 0.9, d: 0.2, z: TOP, top: MATERIAL.tin, finish: "tin", radius: 0.3 });
  return out;
}
