/**
 * `definePart`: how a part gets into the library.
 *
 * One call per part, in the part's own file under `catalog/`, says everything
 * Kiungo knows about it: what it looks like, where its pins are, how it is
 * wired and simulated in the lab, and the engineering data behind it. From
 * that one definition come the library's part model and the lab's pinout, so
 * the two can't drift apart.
 *
 * See docs/parts/AUTHORING.md for a walkthrough.
 */

import type { CanvasSpec, LabPin, LabPinRole, PartModel, PinFn, PinInfo, PinRole, PinSpot, Pinout, Solid } from "./types";

/** One pin, described once for the library's pin table, the labeled 2D view and the lab. */
export interface PinDef {
  /** The lab's id for the pin. Saved projects refer to it, so it never changes once shipped. */
  id: string;
  /** What is printed next to the pin. Defaults to the id. */
  label?: string;
  /** What kind of pin it is, for its color in tables and drawings. */
  role: PinRole;
  /** What it does, in a sentence a beginner can act on. */
  note: string;
  /** Peripherals: what the far end of the wire should be. */
  expects?: LabPinRole;
  /** Boards: what the pin can do. */
  fns?: PinFn[];
  /** Supply pins: the voltage they give. */
  supplies?: number;
  /** A supply pin that can also be fed from outside: the voltage range it takes. */
  accepts?: [number, number];
  /** Board pins that can only read. */
  inputOnly?: boolean;
  /** Must be wired for the part to work. Defaults to true for every expected signal and supply except "opt" and "load". */
  required?: boolean;
  /** The side of the part's card the pin is listed on in the lab. Defaults to left. */
  side?: "left" | "right";
  /** Where the pin is on the part, in mm. Usually given through `pinAt` instead. */
  at?: { x: number; y: number };
  /** Leave it out of the library's pin table (a second ground, a spare). */
  quiet?: boolean;
  /**
   * On a programming header (ICSP): the supply is real, but nobody takes a
   * part's power from it on the bench, so auto-wire never picks it.
   */
  programmingHeader?: boolean;
}

/** The electrical facts the lab's wiring checks need. Left out, they come from `spec.power`. */
export interface LabDef {
  /** A board that runs code. */
  controller?: boolean;
  /** Logic level in volts. */
  logic?: number;
  /** Its inputs survive 5 V signals ("some": only some pins do). */
  tolerates5V?: boolean | "some";
  /** Supply range in volts. */
  supply?: [number, number];
  /** Only joins pins (a breadboard, a resistor): nothing to power or check. */
  passive?: boolean;
  /** Groups of pin ids joined inside the part. */
  strips?: readonly string[][];
}

export interface PartDef extends Omit<PartModel, "solids" | "pins" | "pinSpots" | "canvas"> {
  /** The body. Builders that return several solids (or a piece with pins) can be listed as they are; nothing needs spreading. */
  solids: Array<Solid | Solid[] | { solids: Solid[] } | null | undefined | false>;
  pins: PinDef[];
  /** The library's pin table, when it should group pins ("D0–D13") instead of listing each one. */
  pinTable?: PinInfo[];
  /** Where each pin is on the part: pin id → its hole, pad or leg, in mm. See `along` and `grid`. */
  pinAt?: Record<string, { x: number; y: number }>;
  /**
   * The part's real terminals, given by hand, for the rare part whose
   * terminals aren't the pins the lab wires (a motor the lab drives through a
   * built-in driver). Replaces the positions from `pinAt`.
   */
  spots?: PinSpot[];
  lab?: LabDef;
  /** For parts the lab draws as themselves. Its pin positions come from `pinAt`. */
  canvas?: Omit<CanvasSpec, "pins"> & { pins?: CanvasSpec["pins"] };
}

/** What a definition becomes: the library's model and the lab's pinout. */
export interface PartEntry {
  model: PartModel;
  pinout: Pinout;
}

export function definePart(def: PartDef): PartEntry {
  const { solids: rawSolids, pins: pinDefs, pinTable, pinAt, spots, lab = {}, canvas, ...rest } = def;
  const solids = rawSolids.flatMap((entry) => (!entry ? [] : Array.isArray(entry) ? entry : "solids" in entry ? entry.solids : [entry]));

  const spotOf = (pin: PinDef) => pin.at ?? pinAt?.[pin.id];
  const pinSpots: PinSpot[] =
    spots ??
    pinDefs.flatMap((pin) => {
      const at = spotOf(pin);
      return at ? [{ id: pin.id, label: pin.label ?? pin.id, role: pin.role, x: at.x, y: at.y, note: pin.note }] : [];
    });

  const pins: PinInfo[] = pinTable ?? pinDefs.filter((pin) => !pin.quiet).map((pin) => ({ name: pin.label ?? pin.id, role: pin.role, note: pin.note }));

  const power = rest.spec?.power;
  const logic = lab.logic ?? power?.logic ?? 5;
  const supply = lab.supply ?? (power?.supply ? ([power.supply.min, power.supply.max] as [number, number]) : undefined);
  const labPins: LabPin[] = pinDefs.map((pin) => {
    const out: LabPin = { id: pin.id, label: pin.label ?? pin.id, side: pin.side ?? "left" };
    if (pin.fns) out.fns = pin.fns;
    if (pin.supplies !== undefined) out.supplies = pin.supplies;
    if (pin.accepts) out.accepts = pin.accepts;
    if (pin.inputOnly) out.inputOnly = true;
    if (pin.programmingHeader) out.programmingHeader = true;
    if (pin.expects) {
      out.role = pin.expects;
      out.required = pin.required ?? (pin.expects !== "opt" && pin.expects !== "load");
    } else if (pin.required !== undefined) out.required = pin.required;
    if (pin.note) out.note = pin.note;
    return out;
  });
  const pinout: Pinout = {
    partId: def.id,
    controller: lab.controller ?? false,
    logic,
    tolerates5V: lab.tolerates5V ?? power?.tolerant5V ?? logic >= 5,
    pins: labPins,
  };
  if (supply) pinout.supply = supply;
  if (lab.passive) pinout.passive = true;
  if (lab.strips) pinout.strips = lab.strips;

  const model: PartModel = { ...rest, solids, pins, pinSpots };
  if (canvas) model.canvas = { ...canvas, pins: canvas.pins ?? Object.fromEntries(pinSpots.map((spot) => [spot.id, { x: spot.x, y: spot.y }])) };
  return { model, pinout };
}

/* ----- Pin positions --------------------------------------------------------- */

/**
 * Pins in a row: ids from the first pin's center, one pitch apart along x or
 * y (2.54 mm unless said). Pass a negative pitch to count the other way.
 *
 *   pinAt: { ...along(["VCC", "TRIG", "ECHO", "GND"], 18.69, 18.7) }
 */
export function along(ids: readonly (string | null)[], x: number, y: number, dir: "x" | "y" = "x", pitch = 2.54): Record<string, { x: number; y: number }> {
  const out: Record<string, { x: number; y: number }> = {};
  ids.forEach((id, i) => {
    if (id) out[id] = dir === "x" ? { x: round(x + i * pitch), y } : { x, y: round(y + i * pitch) };
  });
  return out;
}

/**
 * Pins in rows and columns (a 2×4 header, a DIP chip): `rows` lists each
 * row's ids from the first pin's center; rows are one pitch apart.
 */
export function grid(rows: readonly (readonly (string | null)[])[], x: number, y: number, dir: "x" | "y" = "x", pitch = 2.54, rowPitch = pitch): Record<string, { x: number; y: number }> {
  const out: Record<string, { x: number; y: number }> = {};
  rows.forEach((row, r) => Object.assign(out, dir === "x" ? along(row, x, round(y + r * rowPitch), "x", pitch) : along(row, round(x + r * rowPitch), y, "y", pitch)));
  return out;
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/* ----- Pin shorthands ---------------------------------------------------------- */

type PinExtra = Partial<Omit<PinDef, "id" | "role" | "note" | "expects">>;

/** A peripheral's supply pin. */
export const vcc = (id: string, note: string, extra: PinExtra = {}): PinDef => ({ id, role: "power", note, expects: "vcc", ...extra });
/** A peripheral's ground pin. */
export const gnd = (id: string, note = "Ground", extra: PinExtra = {}): PinDef => ({ id, role: "ground", note, expects: "gnd", ...extra });
/** Any other peripheral pin: its kind for the table, what it expects in the lab, and what it does. */
export const pin = (id: string, role: PinRole, expects: LabPinRole, note: string, extra: PinExtra = {}): PinDef => ({ id, role, note, expects, ...extra });

/* ----- Board pins -------------------------------------------------------------- */

const BUS: Partial<Record<PinFn, PinRole>> = { sda: "i2c", scl: "i2c", tx: "uart", rx: "uart", mosi: "spi", miso: "spi", sck: "spi", cs: "spi" };

/** A board's GPIO pin: what it can do, and the side of the board's card it is listed on in the lab. */
export function io(id: string, label: string, side: "left" | "right", fns: PinFn[], extra: Partial<Omit<PinDef, "id" | "label" | "fns" | "side">> = {}): PinDef {
  const bus = fns.map((fn) => BUS[fn]).find(Boolean);
  const role: PinRole = bus ?? (fns.includes("analog") ? "analog" : fns.includes("pwm") ? "pwm" : "digital");
  return { id, label, side, fns, role, note: "", ...extra };
}

/** A board's supply pin: the voltage it gives. Pass `accepts` for one that can also be fed from outside (VIN). */
export function rail(id: string, label: string, volts: number, side: "left" | "right" = "left", extra: Partial<Omit<PinDef, "id" | "label" | "side">> = {}): PinDef {
  return { id, label, side, fns: ["power"], supplies: volts, role: "power", note: `${volts} V out`, ...extra };
}

/** A board's ground pin. */
export function ground(id: string, side: "left" | "right" = "left", label = "GND", extra: Partial<Omit<PinDef, "id" | "label" | "side">> = {}): PinDef {
  return { id, label, side, fns: ["ground"], role: "ground", note: "Ground", ...extra };
}
