/** Pieces the two NeoPixel boards share: a WS2812B pixel that can sit at an angle, and the copper pads. */
import { MATERIAL, PCB_TOP, ws2812, type Solid } from "../../sdk";

export const COPPER_PAD = "#d4a84b";

/** A WS2812B pixel lit by the lab under `id`, turned `turn` degrees about its middle. */
export function pixel(cx: number, cy: number, id: string, turn = 0): Solid[] {
  return ws2812(cx, cy, id).map((s) => (s.kind === "box" && turn ? { ...s, turn } : s));
}

/** A solder pad on the board's face: a bare tinned rectangle with its center at (cx, cy), `turn` degrees about it. */
export function pad(cx: number, cy: number, w: number, h: number, turn = 0): Solid {
  return { kind: "box", x: Math.round((cx - w / 2) * 1000) / 1000, y: Math.round((cy - h / 2) * 1000) / 1000, w, h, d: 0.06, z: PCB_TOP, top: COPPER_PAD, finish: "gold", radius: 0.15, turn: turn || undefined };
}

export { MATERIAL };
