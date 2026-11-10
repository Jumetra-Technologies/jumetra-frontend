import { MATERIAL, PCB_TOP, type Solid } from "../../sdk";

/** The blue of the cheap DC-DC converter boards and the TP4056. */
export const MODULE_BLUE = "#1c5fb4";
/** The pale gray of printed pad labels on those boards. */
export const PAD_PRINT = "#eef3f8";

/**
 * A 3216 (1206) ceramic capacitor: the tan block with tinned ends that
 * boost modules use for their 22 µF input and output capacitors. (cx, cy) is
 * its middle; `dir` is its long way.
 */
export function c1206(cx: number, cy: number, dir: "x" | "y" = "x", z = PCB_TOP): Solid[] {
  const l = 3.2;
  const w = 1.6;
  const bw = dir === "x" ? l : w;
  const bh = dir === "x" ? w : l;
  const x = cx - bw / 2;
  const y = cy - bh / 2;
  const cap = 0.6;
  const body: Solid = { kind: "box", x, y, w: bw, h: bh, d: 1.1, z, top: "#a88f66", finish: "ceramic", radius: 0.1 };
  const ends: Solid[] =
    dir === "x"
      ? [
          { kind: "box", x: x - 0.02, y: y - 0.02, w: cap, h: bh + 0.04, d: 1.12, z, top: MATERIAL.tin, finish: "tin", radius: 0.05 },
          { kind: "box", x: x + bw - cap + 0.02, y: y - 0.02, w: cap, h: bh + 0.04, d: 1.12, z, top: MATERIAL.tin, finish: "tin", radius: 0.05 },
        ]
      : [
          { kind: "box", x: x - 0.02, y: y - 0.02, w: bw + 0.04, h: cap, d: 1.12, z, top: MATERIAL.tin, finish: "tin", radius: 0.05 },
          { kind: "box", x: x - 0.02, y: y + bh - cap + 0.02, w: bw + 0.04, h: cap, d: 1.12, z, top: MATERIAL.tin, finish: "tin", radius: 0.05 },
        ];
  return [body, ...ends];
}

/** An SMC (DO-214AB) Schottky diode like the SS34: a black block 6.9 × 5.9, its cathode band at one end (`band`: -1 or 1 along `dir`). */
export function smcDiode(cx: number, cy: number, dir: "x" | "y" = "x", band: -1 | 1 = 1, label = "SS34", z = PCB_TOP): Solid[] {
  const l = 6.9;
  const w = 5.9;
  const bw = dir === "x" ? l : w;
  const bh = dir === "x" ? w : l;
  const ew = dir === "x" ? l + 1.6 : 3.4;
  const eh = dir === "x" ? 3.4 : l + 1.6;
  const bandOff = band * (l / 2 - 0.7);
  return [
    { kind: "box", x: cx - ew / 2, y: cy - eh / 2, w: ew, h: eh, d: 0.3, z, top: MATERIAL.tin, finish: "tin", radius: 0.05 },
    { kind: "box", x: cx - bw / 2, y: cy - bh / 2, w: bw, h: bh, d: 2.3, z, top: "#1d1e21", finish: "epoxy", radius: 0.2, label: { text: label, size: 1.2, color: "#9aa0a6" } },
    {
      kind: "box",
      x: dir === "x" ? cx + bandOff - 0.55 : cx - bw / 2,
      y: dir === "x" ? cy - bh / 2 : cy + bandOff - 0.55,
      w: dir === "x" ? 1.1 : bw,
      h: dir === "x" ? bh : 1.1,
      d: 0.04,
      z: z + 2.3,
      top: "#c9ccd1",
      finish: "paper",
      radius: 0,
    },
  ];
}

/**
 * A TO-263-5 (D2PAK) chip lying flat: a black body with a flat tinned tab
 * out of the back and five gull-wing legs out of the front. (cx, cy) is the
 * middle of the body; the tab is on the -y side, the legs on +y. Total length
 * is about 10.7 mm and the body is 10.2 wide and 4.4 high.
 */
export function to263(cx: number, cy: number, label: string, id?: string, z = PCB_TOP): Solid[] {
  const out: Solid[] = [
    // The tab: the bare copper-colored plate the chip's ground sits on, soldered to a copper patch.
    { kind: "box", x: cx - 4.8, y: cy - 4.6, w: 9.6, h: 3.6, d: 0.55, z: z + 0.2, top: "#b8bcc2", finish: "metal", radius: 0.15 },
    { kind: "box", x: cx - 5.1, y: cy - 3.1, w: 10.2, h: 7.7, d: 4.3, z: z + 0.25, top: "#1b1c1f", side: "#0d0e10", finish: "epoxy", radius: 0.3, id, label: { text: label, size: 1.15, color: "#9aa0a6" } },
  ];
  // Five legs, 1.7 mm apart; the first and fifth are bent down to the board.
  for (let i = 0; i < 5; i++) {
    const x = cx + (i - 2) * 1.7;
    out.push({ kind: "box", x: x - 0.4, y: cy + 4.5, w: 0.8, h: 1.7, d: 0.35, z: z + 0.05, top: MATERIAL.tin, finish: "tin", radius: 0.05 });
    out.push({ kind: "box", x: x - 0.4, y: cy + 4.3, w: 0.8, h: 0.5, d: 0.9, z: z + 0.05, top: MATERIAL.tin, finish: "tin", radius: 0.05 });
  }
  return out;
}

/** A tantalum chip capacitor (case B): the tan-yellow block with a darker band at its + end. (cx, cy) is its middle. */
export function tantalum(cx: number, cy: number, dir: "x" | "y" = "x", plus: -1 | 1 = -1, z = PCB_TOP): Solid[] {
  const l = 3.5;
  const w = 2.8;
  const bw = dir === "x" ? l : w;
  const bh = dir === "x" ? w : l;
  const bandOff = plus * (l / 2 - 0.45);
  return [
    { kind: "box", x: cx - bw / 2 - (dir === "x" ? 0.35 : 0), y: cy - bh / 2 - (dir === "x" ? 0 : 0.35), w: bw + (dir === "x" ? 0.7 : 0), h: bh + (dir === "x" ? 0 : 0.7), d: 0.25, z, top: MATERIAL.tin, finish: "tin", radius: 0.05 },
    { kind: "box", x: cx - bw / 2, y: cy - bh / 2, w: bw, h: bh, d: 1.9, z, top: "#d49a35", side: "#a8741f", finish: "epoxy", radius: 0.2 },
    {
      kind: "box",
      x: dir === "x" ? cx + bandOff - 0.45 : cx - bw / 2,
      y: dir === "x" ? cy - bh / 2 : cy + bandOff - 0.45,
      w: dir === "x" ? 0.9 : bw,
      h: dir === "x" ? bh : 0.9,
      d: 0.04,
      z: z + 1.9,
      top: "#7a4f12",
      finish: "paper",
      radius: 0,
    },
  ];
}
