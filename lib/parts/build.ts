/**
 * Helpers for writing part models: materials, and the shapes that recur
 * across many parts (PCBs, headers, chips, LEDs, screw terminals).
 */
import type { Solid } from "./types";

/** Top of a standard 1.6 mm PCB: where parts on a board sit. */
export const PCB_TOP = 1.6;

export const MATERIAL = {
  pcbGreen: "#1f6b57",
  pcbGreenEdge: "#0f3a2e",
  pcbBlue: "#1d4f91",
  pcbBlueEdge: "#0f2b52",
  pcbBlack: "#1f2124",
  pcbBlackEdge: "#0a0b0c",
  pcbRed: "#8e1c2a",
  pcbRedEdge: "#4a0d15",
  pcbPurple: "#4a2a7a",
  pcbPurpleEdge: "#2a1448",
  pcbWhite: "#e9ecef",
  pcbWhiteEdge: "#b9bec4",
  ic: "#1b1c1f",
  icSide: "#0d0e10",
  header: "#141517",
  headerSide: "#090a0b",
  steel: "#c9ccd1",
  steelSide: "#8f949b",
  gold: "#d9b05c",
  silk: "#e9f1ec",
  silkDark: "#f4f6f8",
  plasticBlue: "#2f6fd6",
  plasticWhite: "#eef0f2",
  plasticBlack: "#26272b",
  copper: "#c77e3a",
  tin: "#a7acb3",
} as const;

/** Darken or lighten a hex colour. factor < 1 darkens. */
export function shade(hex: string, factor: number): string {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return hex;
  const value = parseInt(match[1], 16);
  const channel = (shift: number) => Math.max(0, Math.min(255, Math.round(((value >> shift) & 255) * factor)));
  return `#${[16, 8, 0].map((shift) => channel(shift).toString(16).padStart(2, "0")).join("")}`;
}

/** The first hex colour in a paint string, for flat 2D fills. */
export function flatColor(paint: string): string {
  const match = /#[0-9a-f]{6}/i.exec(paint);
  return match ? match[0] : paint;
}

export function pcb(w: number, h: number, color: string, edge?: string, radius = 1.5): Solid {
  return { kind: "box", id: "pcb", x: 0, y: 0, w, h, d: 1.6, top: color, side: edge ?? shade(color, 0.55), radius };
}

/** Female header: a black strip with holes. */
export function header(x: number, y: number, count: number, dir: "x" | "y", rows = 1, pitch = 2.54, z = PCB_TOP): Solid {
  const long = count * pitch;
  const short = rows * pitch;
  return {
    kind: "box",
    x,
    y,
    w: dir === "x" ? long : short,
    h: dir === "x" ? short : long,
    d: 8.5,
    z,
    top: MATERIAL.header,
    side: MATERIAL.headerSide,
    holes: { count, rows },
    radius: 0.3,
  };
}

/** Male pins standing up, or hanging below the board when len is negative. */
export function pinRow(x: number, y: number, count: number, dir: "x" | "y", len = 6, rows = 1, z?: number): Solid {
  return { kind: "pins", x, y, count, pitch: 2.54, dir, len, rows, z };
}

/** A plastic pin-header body with pins through it. */
export function maleHeader(x: number, y: number, count: number, dir: "x" | "y", rows = 1, below = true, z = PCB_TOP): Solid[] {
  const long = count * 2.54;
  const short = rows * 2.54;
  const w = dir === "x" ? long : short;
  const h = dir === "x" ? short : long;
  return [
    { kind: "box", x, y, w, h, d: 2.5, z, top: MATERIAL.header, side: MATERIAL.headerSide, radius: 0.3 },
    below ? pinRow(x, y, count, dir, 8, rows, z - PCB_TOP - 8) : pinRow(x, y, count, dir, 6, rows, z + 2.5),
  ];
}

/** DIP chip with legs along its long sides. */
export function dip(x: number, y: number, pinsPerSide: number, label: string, width = 7.6, z = PCB_TOP): Solid[] {
  const length = pinsPerSide * 2.54;
  return [
    {
      kind: "box",
      x,
      y,
      w: length,
      h: width,
      d: 3.8,
      z: z + 0.6,
      top: "linear-gradient(180deg,#232428,#17181b)",
      side: MATERIAL.icSide,
      fill: MATERIAL.ic,
      label: { text: label, size: 1.6, color: "#a3a7ad" },
    },
    { kind: "pins", x: x + 1.27, y: y - 1.2, count: pinsPerSide, pitch: 2.54, dir: "x", len: 1.2, z, size: 0.5, color: MATERIAL.tin },
    { kind: "pins", x: x + 1.27, y: y + width + 1.2, count: pinsPerSide, pitch: 2.54, dir: "x", len: 1.2, z, size: 0.5, color: MATERIAL.tin },
  ];
}

/** Flat square IC (QFN/QFP/module can). */
export function chip(x: number, y: number, w: number, h: number, label?: string, d = 1, id?: string, z = PCB_TOP): Solid {
  return {
    kind: "box",
    id,
    x,
    y,
    w,
    h,
    d,
    z,
    top: "linear-gradient(180deg,#232428,#17181b)",
    side: MATERIAL.icSide,
    fill: MATERIAL.ic,
    radius: 0.3,
    label: label ? { text: label, size: Math.min(1.6, w / 7), color: "#a3a7ad" } : undefined,
  };
}

/** A metal RF shield can, as on ESP32 and Wi-Fi modules. */
export function shieldCan(x: number, y: number, w: number, h: number, label: string, d = 3, z = PCB_TOP): Solid {
  return {
    kind: "box",
    id: "shield",
    x,
    y,
    w,
    h,
    d,
    z,
    top: "linear-gradient(135deg,#d7dadf,#aeb3ba)",
    side: MATERIAL.steelSide,
    fill: MATERIAL.steel,
    radius: 0.5,
    label: { text: label, size: Math.min(2, w / 9), color: "#4b5059" },
  };
}

/** Surface-mount LED, lit colour given. */
export function smdLed(x: number, y: number, color: string, id: string, z = PCB_TOP): Solid {
  return { kind: "box", id, x, y, w: 1.6, h: 0.8, d: 0.6, z, top: shade(color, 0.7), side: shade(color, 0.4), glow: color, radius: 0.2 };
}

/** 5 mm through-hole LED: base rim, body and dome. */
export function led5mm(cx: number, cy: number, color: string, id: string, z = 0, clear = false): Solid[] {
  return [
    { kind: "cyl", cx, cy, r: 2.9, d: 1, z, top: shade(color, 0.85), side: shade(color, 0.6), segments: 16 },
    { kind: "cyl", id: `${id}-body`, cx, cy, r: 2.5, d: 5.5, z: z + 1, top: color, side: shade(color, 0.8), segments: 16, glow: color },
    { kind: "dome", id, cx, cy, r: 2.5, d: 2.3, z: z + 6.5, color, glow: color, clear },
  ];
}

/** Electrolytic capacitor can. */
export function capacitor(cx: number, cy: number, r: number, d: number, z = 0): Solid {
  return { kind: "cyl", cx, cy, r, d, z, top: "radial-gradient(circle,#8a8f96 0 30%,#3a3d42 36%)", side: "#202226", fill: "#3a3d42", segments: 16 };
}

/** Screw terminal block (blue or green). */
export function screwTerminal(x: number, y: number, poles: number, color = "#1e5fbf", pitch = 5, z = PCB_TOP): Solid[] {
  const w = poles * pitch;
  const solids: Solid[] = [{ kind: "box", x, y, w, h: 7.5, d: 9, z, top: color, side: shade(color, 0.6), radius: 0.6 }];
  for (let i = 0; i < poles; i++) {
    solids.push({ kind: "disc", cx: x + pitch / 2 + i * pitch, cy: y + 3.2, r: 1.5, color: MATERIAL.steel, z: z + 9, ring: { color: "#6b7280", width: 0.3 } });
  }
  return solids;
}

/** Tactile push button. */
export function tactileButton(x: number, y: number, size = 6, id?: string, z = PCB_TOP): Solid[] {
  return [
    { kind: "box", x, y, w: size, h: size, d: 3.5, z, top: MATERIAL.plasticBlack, side: "#111214", radius: 0.5 },
    { kind: "cyl", id, cx: x + size / 2, cy: y + size / 2, r: size * 0.28, d: 1.5, z: z + 3.5, top: "#3a3d42", side: "#1b1c1f", segments: 12 },
  ];
}

/** USB connectors. */
export function microUsb(x: number, y: number, z = PCB_TOP): Solid {
  return { kind: "box", id: "usb", x, y, w: 7.5, h: 5.5, d: 2.8, z, top: "linear-gradient(180deg,#d7dadf,#b9bdc3)", side: MATERIAL.steelSide, fill: MATERIAL.steel, radius: 0.6 };
}
export function usbC(x: number, y: number, z = PCB_TOP): Solid {
  return { kind: "box", id: "usb", x, y, w: 9, h: 7.5, d: 3.2, z, top: "linear-gradient(180deg,#d7dadf,#b9bdc3)", side: MATERIAL.steelSide, fill: MATERIAL.steel, radius: 1.2 };
}
export function usbB(x: number, y: number, z = PCB_TOP): Solid {
  return { kind: "box", id: "usb", x, y, w: 16, h: 12, d: 11, z, top: "linear-gradient(180deg,#d7dadf,#b9bdc3)", side: MATERIAL.steelSide, fill: MATERIAL.steel, radius: 0.6 };
}
export function usbA(x: number, y: number, z = PCB_TOP): Solid {
  return { kind: "box", id: "usb", x, y, w: 13.5, h: 14.5, d: 7, z, top: "linear-gradient(180deg,#d7dadf,#b9bdc3)", side: MATERIAL.steelSide, fill: MATERIAL.steel, radius: 0.5 };
}
export function barrelJack(x: number, y: number, z = PCB_TOP): Solid {
  return { kind: "box", id: "jack", x, y, w: 14, h: 9, d: 11, z, top: "linear-gradient(180deg,#34363b,#222326)", side: "#111214", fill: "#2a2c30", radius: 0.6 };
}

/** Silkscreen text helper. */
export function silk(x: number, y: number, text: string, size = 1.4, color: string = MATERIAL.silk, extra?: Partial<Extract<Solid, { kind: "text" }>>): Solid {
  return { kind: "text", x, y, text, size, color, ...extra };
}

/** A mounting hole with a copper ring. */
export function mountHole(cx: number, cy: number, r = 1.6): Solid {
  return { kind: "disc", cx, cy, r, color: "#0b0c0e", ring: { color: MATERIAL.gold, width: 0.6 } };
}

/**
 * A cylinder lying on its side along x, built from stacked slabs whose widths
 * follow the circle. Motor cans, crystals, round bodies that are not upright.
 */
export function lyingCylinder(x: number, cy: number, length: number, r: number, color: string, z = 0, id?: string, layers = 7): Solid[] {
  const solids: Solid[] = [];
  const step = (2 * r) / layers;
  for (let i = 0; i < layers; i++) {
    const zc = i * step + step / 2;
    const half = Math.sqrt(Math.max(0, r * r - (zc - r) * (zc - r)));
    const tone = shade(color, 0.72 + 0.4 * (zc / (2 * r)));
    solids.push({ kind: "box", id: i === layers - 1 ? id : undefined, x, y: cy - half, w: length, h: half * 2, d: step, z: z + i * step, top: tone, side: shade(tone, 0.8), fill: color, radius: Math.min(half, 1) });
  }
  return solids;
}

/** Component legs lying flat along +y from a body edge, for parts drawn lying on their back. */
export function flatLegs(x: number, y: number, count: number, len: number, pitch = 2.54, z = 0): Solid[] {
  return Array.from({ length: count }, (_, i) => ({ kind: "box", x: x + i * pitch - 0.25, y, w: 0.5, h: len, d: 0.5, z, top: MATERIAL.tin, side: "#7d8289", radius: 0.2 }) as Solid);
}

/** A flat lead or wire running along x or y. */
export function wire(x: number, y: number, w: number, h: number, color: string, z = 0): Solid {
  return { kind: "box", x, y, w, h, d: Math.min(w, h), z, top: color, side: shade(color, 0.7), radius: Math.min(w, h) / 2 };
}

/** Square trimmer potentiometer with a screw slot on top. */
export function trimPot(x: number, y: number, size = 6, color = "#d9772b", id?: string, z = PCB_TOP): Solid[] {
  return [
    { kind: "box", id, x, y, w: size, h: size, d: 4.5, z, top: color, side: shade(color, 0.65), radius: 0.4 },
    { kind: "disc", cx: x + size / 2, cy: y + size / 2, r: size * 0.3, color: MATERIAL.steel, z: z + 4.5, ring: { color: shade(color, 0.5), width: 0.25 } },
    { kind: "path", d: `M ${x + size / 2 - size * 0.22} ${y + size / 2} L ${x + size / 2 + size * 0.22} ${y + size / 2}`, color: "#4b5059", width: 0.35, z: z + 4.55 },
  ];
}

/** A row of gold pads (castellations, solder pads) along x or y. */
export function pads(x: number, y: number, count: number, dir: "x" | "y", pitch = 2.54, r = 0.55, z?: number): Solid[] {
  return Array.from({ length: count }, (_, i) => ({ kind: "disc", cx: dir === "x" ? x + i * pitch : x, cy: dir === "y" ? y + i * pitch : y, r, color: MATERIAL.gold, z }) as Solid);
}
