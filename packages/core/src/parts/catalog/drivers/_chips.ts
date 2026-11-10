import { MATERIAL, type Solid } from "../../sdk";

const TOP = 1.6;
const EPOXY = "#1b1c1f";

/**
 * A fine-pitch gull-wing chip lying on a board (SSOP, TSSOP): a black body
 * with flat tinned leads along its two long sides. (cx, cy) is its middle,
 * `along` the way the pins run. `span` is the width over the lead tips.
 */
export function gullWing(
  cx: number,
  cy: number,
  perSide: number,
  pitch: number,
  body: { length: number; width: number; height: number; span: number },
  label: { text: string; size: number },
  opts: { id?: string; along?: "x" | "y"; z?: number } = {},
): Solid[] {
  const { id, along = "x", z = TOP } = opts;
  const alongX = along === "x";
  const w = alongX ? body.length : body.width;
  const h = alongX ? body.width : body.length;
  const solids: Solid[] = [
    { kind: "box", id, x: +(cx - w / 2).toFixed(3), y: +(cy - h / 2).toFixed(3), w, h, d: body.height, z: z + 0.12, top: EPOXY, finish: "epoxy", radius: 0.15, label: { text: label.text, size: label.size, color: "#9aa0a6" } },
  ];
  const reach = (body.span - body.width) / 2 + 0.25;
  for (let i = 0; i < perSide; i++) {
    const t = (i - (perSide - 1) / 2) * pitch;
    for (const side of [-1, 1]) {
      const off = side * (body.width / 2 + reach / 2 - 0.25);
      solids.push(
        alongX
          ? { kind: "box", x: +(cx + t - 0.15).toFixed(3), y: +(cy + off - reach / 2).toFixed(3), w: 0.3, h: reach, d: 0.22, z, top: MATERIAL.tin, finish: "tin", radius: 0.03 }
          : { kind: "box", x: +(cx + off - reach / 2).toFixed(3), y: +(cy + t - 0.15).toFixed(3), w: reach, h: 0.3, d: 0.22, z, top: MATERIAL.tin, finish: "tin", radius: 0.03 },
      );
    }
  }
  return solids;
}

/** The little printed dot that marks pin 1 on a chip, on top of the body at height `zTop`. */
export function pinOneDot(cx: number, cy: number, zTop: number, r = 0.3): Solid {
  return { kind: "disc", cx, cy, r, color: "#454850", z: zTop + 0.01 };
}
