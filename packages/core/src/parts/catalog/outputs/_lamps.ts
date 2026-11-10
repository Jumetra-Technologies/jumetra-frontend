/** Pieces the 5 mm through-hole LEDs share: the flange with its flat, and the straight legs under it. */
import { MATERIAL, type Solid } from "../../sdk";

/**
 * The 5.8 mm flange at the base of a 5 mm LED, with its flat on the left (the
 * cathode side). (cx, cy) is the middle of the lens; the flange is 1 mm thick.
 */
export function flange(cx: number, cy: number, color: string): Solid {
  const r = 2.9;
  const flat = cx - 2.4;
  const half = Math.sqrt(r * r - 2.4 * 2.4);
  const path = `M ${flat} ${cy + half} A ${r} ${r} 0 1 0 ${flat} ${cy - half} Z`;
  return { kind: "extrude", path, d: 1, z: 0, top: color, finish: "clear", bevel: 0.15 };
}

/** One 0.5 mm square leg hanging below the flange, `len` mm long. */
export function leg(x: number, y: number, len: number): Solid {
  return { kind: "box", x: x - 0.25, y: y - 0.25, w: 0.5, h: 0.5, d: len, z: -len, top: MATERIAL.tin, finish: "tin" };
}
