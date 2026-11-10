/**
 * A mini-USB-B socket, as on the Nano: a steel shell with its slot on the
 * left edge, and the flat black tongue inside. 9 mm long, 7.7 wide, 3.9 tall.
 */
import { MATERIAL, PCB_TOP, type Solid } from "../../sdk";

export const MINI_USB = { w: 9, h: 7.7, d: 3.9 } as const;

/** (x, y) is the top-left corner of the shell; its mouth faces left. The solid with the id `usb` is the shell. */
export function miniUsbB(x: number, y: number, z = PCB_TOP): Solid[] {
  const { w, h, d } = MINI_USB;
  return [
    { kind: "box", id: "usb", x, y, w, h, d, z, top: "linear-gradient(180deg,#d7dadf,#b9bdc3)", side: MATERIAL.steelSide, fill: MATERIAL.steel, radius: 0.4, finish: "metal" },
    // The slot on the opening face, and the tongue in it.
    { kind: "box", x: x - 0.05, y: y + 0.9, w: 0.7, h: h - 1.8, d: d - 1.3, z: z + 0.6, top: "#0c0d0f", radius: 0.4, finish: "plastic" },
    { kind: "box", x: x - 0.05, y: y + 1.7, w: 0.9, h: h - 3.4, d: 0.8, z: z + 1.5, top: "#2a2b2e", radius: 0.2, finish: "plastic" },
    // The steel tabs that hold it to the board.
    { kind: "box", x: x + w - 2.4, y: y - 0.5, w: 1.6, h: 0.5, d: 0.3, z, top: MATERIAL.tin, finish: "tin", radius: 0.05 },
    { kind: "box", x: x + w - 2.4, y: y + h, w: 1.6, h: 0.5, d: 0.3, z, top: MATERIAL.tin, finish: "tin", radius: 0.05 },
  ];
}
