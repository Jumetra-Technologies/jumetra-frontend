/** How the library writes engineering numbers, in one place so every panel agrees. */
import type { Mounting, PartSpec } from "@kiungo/core/parts/types";

const trim = (n: number, digits = 2) => String(Math.round(n * 10 ** digits) / 10 ** digits);

export function volts(v: number): string {
  return `${trim(v)} V`;
}

export function voltRange(min: number, max: number): string {
  return min === max ? volts(min) : `${trim(min)}–${trim(max)} V`;
}

/** Milliamps under an amp, amps above; microamps for the very small. */
export function current(ma: number): string {
  if (ma >= 1000) return `${trim(ma / 1000)} A`;
  if (ma > 0 && ma < 1) return `${trim(ma * 1000, 0)} µA`;
  return `${trim(ma, ma < 10 ? 1 : 0)} mA`;
}

export function watts(w: number): string {
  return w >= 1 ? `${trim(w, 1)} W` : `${trim(w * 1000, 0)} mW`;
}

export function price(usd: [number, number]): string {
  const f = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));
  return usd[0] === usd[1] ? `$${f(usd[0])}` : `$${f(usd[0])}–${f(usd[1])}`;
}

export const MOUNT_LABEL: Record<Mounting, string> = {
  breadboard: "Plugs into a breadboard",
  jumpers: "Header for jumper wires",
  terminals: "Screw terminals",
  leads: "Flying leads",
  solder: "Solder pads",
  socket: "Plugs onto a board",
  panel: "Bolts through a panel",
};

export const LIFECYCLE_LABEL: Record<PartSpec["sourcing"]["lifecycle"], string> = {
  active: "In production",
  nrnd: "Not recommended for new designs",
  obsolete: "Discontinued",
  generic: "Made by many",
};

const LAW_LABEL = { buck: "Step-down (buck)", boost: "Step-up (boost)", linear: "Linear regulator", pass: "Pass-through" } as const;
export function lawLabel(law: keyof typeof LAW_LABEL): string {
  return LAW_LABEL[law];
}
