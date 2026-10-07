/**
 * Geometry of a part on the lab canvas, shared by the renderer (pin handles)
 * and by placement (so new parts land in free space).
 */

import { getPinout, type LabPin } from "./pinout";

export const NODE = {
  header: 46,
  row: 18,
  padTop: 8,
  padBottom: 12,
  railLabel: 88,
  boardWidth: 340,
  partWidth: 252,
  minRowsBoard: 10,
  minRowsPart: 5,
} as const;

export interface NodeLayout {
  w: number;
  h: number;
  rows: number;
  left: LabPin[];
  right: LabPin[];
  /** Graphic slot between the rails. */
  slot: { x: number; y: number; w: number; h: number };
}

export function pinY(index: number): number {
  return NODE.header + NODE.padTop + index * NODE.row + NODE.row / 2;
}

export function nodeLayout(partId: string): NodeLayout {
  const pinout = getPinout(partId);
  const left = pinout.pins.filter((p) => p.side === "left");
  const right = pinout.pins.filter((p) => p.side === "right");
  const rows = Math.max(left.length, right.length, pinout.controller ? NODE.minRowsBoard : NODE.minRowsPart);
  const w = pinout.controller ? NODE.boardWidth : NODE.partWidth;
  const h = NODE.header + NODE.padTop + rows * NODE.row + NODE.padBottom;
  const slotX = NODE.railLabel;
  const slotW = w - NODE.railLabel - (right.length ? NODE.railLabel : 12);
  return { w, h, rows, left, right, slot: { x: slotX, y: NODE.header + 4, w: slotW, h: h - NODE.header - 10 } };
}
