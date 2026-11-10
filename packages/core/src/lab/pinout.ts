/**
 * Wireable pins for every part in the catalog.
 *
 * The lab needs one entry per pin a wire can land on, with what each pin can
 * do (a board's) or what it expects from the far end of its wire (a
 * peripheral's). Each part's pins are written beside its model, in its own
 * file under `parts/catalog`; this file only looks them up.
 */

import { CATALOG } from "../parts/catalog";
import type { LabPin, LabPinRole, Pinout } from "../parts/types";

export type { LabPin, PinFn, Pinout } from "../parts/types";
/** What a peripheral pin expects from the far end of its wire. */
export type PinRole = LabPinRole;

const ALL: Pinout[] = CATALOG.map((entry) => entry.pinout);

const BY_ID = new Map(ALL.map((p) => [p.partId, p]));

export const PINOUTS: readonly Pinout[] = ALL;

const GENERIC: Pinout = {
  partId: "generic",
  controller: false,
  logic: 3.3,
  tolerates5V: false,
  supply: [3, 5.5],
  pins: [
    { id: "VCC", label: "VCC", side: "left", role: "vcc", required: true },
    { id: "GND", label: "GND", side: "left", role: "gnd", required: true },
    { id: "SIG", label: "Signal", side: "left", role: "io", required: false },
  ],
};

export function getPinout(partId: string): Pinout {
  return BY_ID.get(partId) ?? { ...GENERIC, partId };
}

export function hasPinout(partId: string): boolean {
  return BY_ID.has(partId);
}

export function getPin(partId: string, pinId: string): LabPin | undefined {
  return getPinout(partId).pins.find((p) => p.id === pinId);
}

/** The color family a pin belongs to, for its dot on the canvas. */
export type PinTone = "power" | "ground" | "analog" | "pwm" | "bus" | "digital" | "muted";

export function pinTone(pin: LabPin): PinTone {
  const fns = pin.fns ?? [];
  const role = pin.role;
  if (fns.includes("power") || role === "vcc") return "power";
  if (fns.includes("ground") || role === "gnd") return "ground";
  if (role === "opt" || role === "load") return "muted";
  if (role === "out-analog") return "analog";
  if (role === "pwm") return "pwm";
  if (role && ["sda", "scl", "tx", "rx", "mosi", "miso", "sck", "cs"].includes(role)) return "bus";
  if (fns.some((f) => ["sda", "scl", "tx", "rx", "mosi", "miso", "sck", "cs"].includes(f))) return "bus";
  if (fns.includes("pwm")) return "pwm";
  if (fns.includes("analog") && !fns.includes("pwm")) return "analog";
  return "digital";
}
