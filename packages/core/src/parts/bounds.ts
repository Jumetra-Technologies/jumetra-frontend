/**
 * The space a solid takes up, in the model's millimeters. Used to fit a
 * picture round a part, and to check that a model's stated size matches what
 * was actually built.
 */
import { pathBounds } from "./path";
import type { PartModel, Solid } from "./types";

export interface Bounds {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  z1: number;
  z2: number;
}

/** The box around one solid. Flat printing (text, paths, discs) has no body and returns null. */
export function solidBounds(solid: Solid): Bounds | null {
  switch (solid.kind) {
    case "box": {
      const z = solid.z ?? 0;
      if (!solid.turn) return { x1: solid.x, y1: solid.y, x2: solid.x + solid.w, y2: solid.y + solid.h, z1: z, z2: z + solid.d };
      // A turned box: the box around its turned corners.
      const a = (solid.turn * Math.PI) / 180;
      const hw = (Math.abs(Math.cos(a)) * solid.w + Math.abs(Math.sin(a)) * solid.h) / 2;
      const hh = (Math.abs(Math.sin(a)) * solid.w + Math.abs(Math.cos(a)) * solid.h) / 2;
      const cx = solid.x + solid.w / 2;
      const cy = solid.y + solid.h / 2;
      return { x1: cx - hw, y1: cy - hh, x2: cx + hw, y2: cy + hh, z1: z, z2: z + solid.d };
    }
    case "cyl": {
      const z = solid.z ?? 0;
      const r = Math.max(solid.r, solid.r2 ?? solid.r);
      if (solid.axis === "x") return { x1: solid.cx - solid.d / 2, y1: solid.cy - r, x2: solid.cx + solid.d / 2, y2: solid.cy + r, z1: z, z2: z + 2 * r };
      if (solid.axis === "y") return { x1: solid.cx - r, y1: solid.cy - solid.d / 2, x2: solid.cx + r, y2: solid.cy + solid.d / 2, z1: z, z2: z + 2 * r };
      return { x1: solid.cx - r, y1: solid.cy - r, x2: solid.cx + r, y2: solid.cy + r, z1: z, z2: z + solid.d };
    }
    case "dome": {
      const z = solid.z ?? 0;
      return { x1: solid.cx - solid.r, y1: solid.cy - solid.r, x2: solid.cx + solid.r, y2: solid.cy + solid.r, z1: z, z2: z + solid.d };
    }
    case "pins": {
      const rows = solid.rows ?? 1;
      const long = solid.count * solid.pitch;
      const short = rows * solid.pitch;
      const z = solid.z ?? 0;
      return {
        x1: solid.x,
        y1: solid.y,
        x2: solid.x + (solid.dir === "x" ? long : short),
        y2: solid.y + (solid.dir === "x" ? short : long),
        z1: Math.min(z, z + solid.len),
        z2: Math.max(z, z + solid.len),
      };
    }
    case "extrude": {
      const b = pathBounds(solid.path);
      const z = solid.z ?? 0;
      return { x1: b.x, y1: b.y, x2: b.x + b.w, y2: b.y + b.h, z1: z, z2: z + solid.d };
    }
    case "wire": {
      const xs = solid.points.map((p) => p[0]);
      const ys = solid.points.map((p) => p[1]);
      const zs = solid.points.map((p) => p[2]);
      return { x1: Math.min(...xs) - solid.r, y1: Math.min(...ys) - solid.r, x2: Math.max(...xs) + solid.r, y2: Math.max(...ys) + solid.r, z1: Math.min(...zs) - solid.r, z2: Math.max(...zs) + solid.r };
    }
    default:
      return null;
  }
}

/** The box around everything a model is built from. */
export function modelBounds(model: PartModel): Bounds {
  const all = model.solids.map(solidBounds).filter((b): b is Bounds => b !== null);
  if (!all.length) return { x1: 0, y1: 0, x2: model.size.w, y2: model.size.h, z1: 0, z2: model.size.d };
  return {
    x1: Math.min(...all.map((b) => b.x1)),
    y1: Math.min(...all.map((b) => b.y1)),
    x2: Math.max(...all.map((b) => b.x2)),
    y2: Math.max(...all.map((b) => b.y2)),
    z1: Math.min(...all.map((b) => b.z1)),
    z2: Math.max(...all.map((b) => b.z2)),
  };
}
