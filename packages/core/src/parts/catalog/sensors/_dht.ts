import { MATERIAL, shade, type Solid } from "../../sdk";

/**
 * Pieces the DHT family shares (DHT11, DHT22, AM2302): the sensing window with
 * its grid of openings, and the thin tinned legs that run out of the body.
 */

const r3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * The sensing window on a DHT body: a slightly darker panel with a grid of
 * dark openings cut into it. `z` is the top of the body.
 */
export function sensingWindow(
  x: number,
  y: number,
  w: number,
  h: number,
  cols: number,
  rows: number,
  z: number,
  colors: { panel: string; cell: string },
  cell: { w: number; h: number },
): Solid[] {
  const out: Solid[] = [{ kind: "box", x, y, w, h, d: 0.05, z, top: colors.panel, finish: "plastic", radius: 0.3 }];
  const px = w / cols;
  const py = h / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      out.push({ kind: "box", x: r3(x + c * px + (px - cell.w) / 2), y: r3(y + r * py + (py - cell.h) / 2), w: cell.w, h: cell.h, d: 0.03, z: z + 0.05, top: colors.cell, finish: "plastic", radius: 0.12 });
    }
  }
  return out;
}

/**
 * Thin tinned legs leaving the bottom edge of a body lying on the bench. They
 * start inside the body at `yEdge`, dip toward the bench and end at `yEnd`.
 */
export function benchLegs(xs: readonly number[], yEdge: number, yEnd: number, zStart: number): Solid[] {
  return xs.map(
    (x): Solid => ({
      kind: "wire",
      points: [
        [x, r3(yEdge - 1.5), zStart],
        [x, r3(yEdge + 0.8), zStart - 0.1],
        [x, r3(yEdge + 3.5), r3(zStart * 0.55)],
        [x, r3(yEdge + 6), 0.4],
        [x, yEnd, 0.32],
      ],
      r: 0.3,
      color: MATERIAL.tin,
      finish: "tin",
    }),
  );
}

/** A body made of a main block and a slightly inset top plate, so the edge reads as a molded chamfer. */
export function moldedBody(x: number, y: number, w: number, h: number, d: number, color: string, id: string): Solid[] {
  return [
    { kind: "box", id, x, y, w, h, d: r3(d - 0.5), z: 0, top: color, side: shade(color, 0.82), finish: "plastic", radius: 0.9 },
    { kind: "box", x: r3(x + 0.25), y: r3(y + 0.25), w: r3(w - 0.5), h: r3(h - 0.5), d: 0.5, z: r3(d - 0.5), top: color, side: shade(color, 0.9), finish: "plastic", radius: 0.7 },
  ];
}
