import { MATERIAL, type Solid } from "../../sdk";

/** Antenna copper: the gold of exposed, tinned traces. */
export const COPPER = "#d9a441";

/**
 * A printed serpentine antenna: runs across `w`, steps down `step` at each end,
 * and comes back, `runs` times. (x, y) is where the first run starts.
 * `vertical` swaps the axes, so the runs go up and down and step sideways.
 */
export function serpentine(x: number, y: number, w: number, runs: number, step: number, opts: { vertical?: boolean; color?: string; width?: number; z?: number } = {}): Solid {
  const { vertical = false, color = COPPER, width = 0.4, z } = opts;
  const pt = (a: number, b: number) => (vertical ? `${r(x + b)} ${r(y + a)}` : `${r(x + a)} ${r(y + b)}`);
  let d = `M ${pt(0, 0)}`;
  for (let i = 0; i < runs; i++) {
    const end = i % 2 === 0 ? w : 0;
    d += ` L ${pt(end, i * step)} L ${pt(end, (i + 1) * step)}`;
  }
  d += ` L ${pt(runs % 2 === 0 ? 0 : w, runs * step)}`;
  return { kind: "path", d, color, width, z };
}

/** A square leadless chip (QFN): black body with tinned pads showing along its four sides. */
export function qfn(cx: number, cy: number, size: number, label: string, opts: { id?: string; z: number; perSide?: number; d?: number; labelSize?: number }): Solid[] {
  const { id, z, perSide = 6, d = 0.8, labelSize = 0.8 } = opts;
  const half = size / 2;
  const solids: Solid[] = [
    { kind: "box", id, x: r(cx - half), y: r(cy - half), w: size, h: size, d, z, top: "#17181b", side: MATERIAL.icSide, fill: MATERIAL.ic, radius: 0.15, finish: "epoxy", label: { text: label, size: labelSize, color: "#9aa0a6" } },
    { kind: "disc", cx: r(cx - half + 0.55), cy: r(cy - half + 0.55), r: 0.2, color: "#3a3d42", z: z + d + 0.01 },
  ];
  const pitch = (size - 1) / perSide;
  for (let i = 0; i < perSide; i++) {
    const t = -((perSide - 1) * pitch) / 2 + i * pitch;
    for (const s of [-1, 1]) {
      solids.push({ kind: "box", x: r(cx + t - 0.15), y: r(cy + s * (half + 0.15) - 0.35), w: 0.3, h: 0.7, d: 0.1, z, top: MATERIAL.tin, finish: "tin" });
      solids.push({ kind: "box", x: r(cx + s * (half + 0.15) - 0.35), y: r(cy + t - 0.15), w: 0.7, h: 0.3, d: 0.1, z, top: MATERIAL.tin, finish: "tin" });
    }
  }
  return solids;
}

/** A square steel-can SMD crystal, its frequency printed beside it. */
export function smdCrystal(x: number, y: number, z: number, w = 3.2, h = 2.5): Solid[] {
  return [
    { kind: "box", x, y, w, h, d: 0.8, z, top: "#c9ccd1", fill: MATERIAL.steel, radius: 0.3, finish: "metal" },
    { kind: "box", x: x + 0.45, y: y + 0.45, w: w - 0.9, h: h - 0.9, d: 0.05, z: z + 0.8, top: "#9ea3aa", finish: "metal" },
  ];
}

/** Solder fillets (tin dots) on a row of pads. */
export function solderDots(spots: Array<{ x: number; y: number }>, z: number, r0 = 0.8): Solid[] {
  return spots.flatMap((c): Solid[] => [{ kind: "disc", cx: c.x, cy: c.y, r: r0, color: MATERIAL.tin, z }]);
}

function r(n: number): number {
  return Math.round(n * 1000) / 1000;
}
