/**
 * The knobs a part has in the lab, declared once so the Inspector can draw
 * them, the simulation can read them and tests can set them.
 *
 * Three kinds of part have inputs:
 * - sensors: their surroundings. "Simulated sweep" keeps the lab's own
 *   time-varying demo signal; "Set by you" holds the value you give.
 * - actuators without a sensor driving them: a command (servo angle, motor
 *   speed and direction, stepper moves).
 * - boards: the sketch's settings (blink delay, warning distance, gate
 *   angles). Only the settings that apply to what is wired to the board
 *   are shown.
 */

import { getPart } from "../parts";
import type { Analysis } from "./circuit";
import { getPinout } from "./pinout";
import type { LabNode, NodeInputs } from "./types";
import { DEFAULT_OHMS, DEFAULT_TOLERANCE, MAX_OHMS, MIN_OHMS, RESISTOR_PRESETS, TOLERANCES, formatOhms } from "../parts/models/passives";
import { QUANTITIES, formatQuantity, type Quantity } from "./units";
import { DC_MOTOR_MAX_RAD_PER_S, DC_MOTOR_MAX_RPM } from "./constants";

/**
 * How a value saved before SI units (session `units` 1) becomes today's:
 * the key it was saved under, if it had another name, and the conversion.
 */
export interface LegacyValue {
  key?: string;
  convert: (old: number) => number;
}

export type NumberControl = {
  key: string;
  kind: "number";
  label: string;
  /** What it measures; the value is stored in this quantity's SI unit (see units.ts). */
  quantity: Quantity;
  /** The SI unit the value is stored in ("m", "Pa", "rad"). */
  unit: string;
  min: number;
  max: number;
  /** The slider's step, in SI. */
  step: number;
  default: number;
  help?: string;
  /** A slider beside the field: linear, or log for quantities spanning decades (light, resistance). False: field only. */
  slider?: "linear" | "log" | false;
  /** Values offered as one-click chips (a resistor's usual values). */
  presets?: number[];
  /** Significant digits kept when set (a resistor's 4.7 kΩ), instead of rounding to `step`. */
  digits?: number;
  /** Saved before SI units: how to read the old value. */
  legacy?: LegacyValue;
};

export type Control =
  | NumberControl
  | { key: string; kind: "toggle"; label: string; on: string; off: string; default: boolean; help?: string }
  | { key: string; kind: "select"; label: string; options: Array<{ id: string; label: string }>; default: string; help?: string; legacy?: LegacyValue };

/** The "where does the value come from" switch every sensor and free actuator has. */
export const SOURCE_KEY = "source";
export const SOURCE_AUTO = "auto";
export const SOURCE_SET = "set";

const source = (autoLabel: string, setLabel = "Set by you"): Control => ({
  key: SOURCE_KEY,
  kind: "select",
  label: "Input",
  options: [
    { id: SOURCE_AUTO, label: autoLabel },
    { id: SOURCE_SET, label: setLabel },
  ],
  default: SOURCE_AUTO,
});

type NumOptions = Partial<Pick<NumberControl, "help" | "slider" | "presets" | "digits" | "legacy">>;

/** A number control. min, max, step and the default are in the quantity's SI unit. */
const num = (key: string, label: string, quantity: Quantity, min: number, max: number, step: number, def: number, opts: NumOptions = {}): NumberControl => ({
  key,
  kind: "number",
  label,
  quantity,
  unit: QUANTITIES[quantity].si,
  min,
  max,
  step,
  default: def,
  slider: "linear",
  ...opts,
});

// Conversions from the units sessions were saved in before SI (units 1).
const DEG = Math.PI / 180;
/** Keep conversions exact to the nanounit, so 120° → rad → 120° doesn't come back as 120.00000000000001. */
const exact = (v: number) => Number(v.toPrecision(12));
const scaled = (factor: number, key?: string): LegacyValue => ({ ...(key ? { key } : {}), convert: (v) => exact(v * factor) });
const cm = (key?: string) => scaled(0.01, key);
const pct = (key?: string) => scaled(0.01, key);
const deg = (key?: string) => scaled(DEG, key);

/**
 * Light on an LDR. Sessions before SI stored a 0–100 % "light" knob; it is
 * read as illuminance on a log scale, 0 % = 1 lx (dark) to 100 % = 100 000 lx
 * (full sun): lx = 10^(% / 20). The sketch's light level is the same scale
 * the other way, so an old session behaves exactly as it did.
 */
export const luxFromLightPercent = (percent: number) => exact(10 ** (Math.min(100, Math.max(0, percent)) / 20));
export const lightPercentFromLux = (lux: number) => Math.min(100, Math.max(0, 20 * Math.log10(Math.max(1, lux))));

/**
 * A GL5528's resistance at `lux`: about 15 kΩ at 10 lx, falling as lux^−0.7
 * (the part's datasheet curve), and no more than 1 MΩ in the dark.
 */
export function ldrOhms(lux: number): number {
  return Math.min(1e6, 15e3 * (Math.max(lux, 0.01) / 10) ** -0.7);
}

/** Sensor surroundings. The ranges are the parts' documented measuring ranges, in SI. */
const SENSOR_CONTROLS: Record<string, Control[]> = {
  "hc-sr04": [source("Simulated sweep (0.30–0.50 m)", "Obstacle set by you"), num("distance", "Obstacle distance", "length", 0.02, 4, 0.001, 0.3, { help: "HC-SR04 range: 20 mm to 4 m", legacy: cm("distanceCm") })],
  pir: [source("Simulated (motion every 8 s)", "Set by you"), { key: "motion", kind: "toggle", label: "Motion", on: "Detected", off: "None", default: false }],
  dht11: [source("Simulated sweep"), num("temperatureC", "Temperature", "temperature", 0, 50, 0.1, 24, { help: "DHT11 range: 0–50 °C" }), num("humidity", "Humidity", "ratio", 0.2, 0.9, 0.01, 0.55, { help: "DHT11 range: 20–90 %", legacy: pct() })],
  dht22: [source("Simulated sweep"), num("temperatureC", "Temperature", "temperature", -40, 80, 0.1, 24), num("humidity", "Humidity", "ratio", 0, 1, 0.01, 0.55, { legacy: pct() })],
  am2302: [source("Simulated sweep"), num("temperatureC", "Temperature", "temperature", -40, 80, 0.1, 24), num("humidity", "Humidity", "ratio", 0, 1, 0.01, 0.55, { legacy: pct() })],
  ds18b20: [source("Simulated sweep"), num("temperatureC", "Temperature", "temperature", -55, 125, 0.1, 24.5)],
  ldr: [
    source("Simulated sweep"),
    num("illuminance", "Light on it", "illuminance", 0, 100_000, 1, luxFromLightPercent(60), {
      slider: "log",
      help: "Moonlight is about 1 lx, a room 100–500 lx, daylight 10 000 lx and more.",
      legacy: { key: "light", convert: luxFromLightPercent },
    }),
  ],
  "soil-moisture": [source("Simulated (drying out)"), num("moisture", "Soil moisture", "ratio", 0, 1, 0.01, 0.45, { legacy: pct() })],
  mq2: [source("Simulated sweep"), num("gas", "Gas", "amount", 0, 0.01, 1e-5, 3e-4, { help: "MQ-2 range: 300–10 000 ppm of LPG, smoke or propane", legacy: scaled(1e-6, "gasPpm") })],
  mpu6050: [source("Simulated (rocking)"), num("pitch", "Pitch", "angle", -90 * DEG, 90 * DEG, DEG, 0, { legacy: deg() }), num("roll", "Roll", "angle", -90 * DEG, 90 * DEG, DEG, 0, { legacy: deg() })],
  bmp280: [
    source("Simulated sweep"),
    num("pressure", "Pressure", "pressure", 30_000, 110_000, 10, 101_320, { help: "BMP280 range: 300–1100 hPa", legacy: scaled(100, "pressureHpa") }),
    num("temperatureC", "Temperature", "temperature", -40, 85, 0.1, 23.1),
  ],
};

/** Commands for actuators that no sensor on the board is driving. */
const ACTUATOR_CONTROLS: Record<string, Control[]> = {
  servo: [source("Simulated sweep (15–165°)", "Angle set by you"), num("angle", "Angle", "angle", 0, Math.PI, DEG, Math.PI / 2, { help: "SG90 travel: 0–180°", legacy: deg() })],
  "dc-motor": [
    source("Simulated (speed and direction vary)", "Command set by you"),
    num("speed", "Speed (PWM)", "ratio", 0, 1, 0.01, 0, {
      help: `Duty on EN. 100 % ≈ ${formatQuantity(DC_MOTOR_MAX_RAD_PER_S, "angular-speed")} (${DC_MOTOR_MAX_RPM} rpm) with no load; 0 stops the motor.`,
      legacy: pct(),
    }),
    { key: "direction", kind: "select", label: "Direction", options: [{ id: "forward", label: "Forward (IN1 high)" }, { id: "reverse", label: "Reverse (IN2 high)" }], default: "forward" },
  ],
  "stepper-motor": [
    source("Simulated (turns continuously)", "Steps commanded by you"),
    num("stepRate", "Step rate", "frequency", 1, 1000, 1, 256, { help: "28BYJ-48 with ULN2003: 2048 steps per turn of the output shaft.", legacy: scaled(1, "stepsPerSecond") }),
  ],
};

/** A resistor's value and tolerance. */
const RESISTOR_CONTROLS: Control[] = [
  num("ohms", "Resistance", "resistance", MIN_OHMS, MAX_OHMS, 0.1, DEFAULT_OHMS, {
    slider: false,
    digits: 3,
    presets: [...RESISTOR_PRESETS],
    help: "The bands on the part change with it. 220 Ω suits an LED on a 5 V pin.",
    // Saved as the dropdown's id ("220"), a string.
    legacy: { convert: (v) => v },
  }),
  { key: "tolerance", kind: "select", label: "Tolerance", options: TOLERANCES.map((t) => ({ id: String(t), label: `±${t} %` })), default: String(DEFAULT_TOLERANCE) },
];

/** Values of passive parts. */
const PASSIVE_CONTROLS: Record<string, Control[]> = {
  resistor: RESISTOR_CONTROLS,
};

/** A potentiometer's track: the resistance end to end. The wiper position is its `sim.reads` knob. */
const EXTRA_CONTROLS: Record<string, Control[]> = {
  potentiometer: [num("track", "Track resistance", "resistance", 100, 1e6, 100, 10_000, { slider: false, digits: 3, presets: [1000, 10_000, 100_000], help: "End to end. The usual knob is 10 kΩ." })],
};

/** A resistor's value in ohms, as set in the lab (220 Ω if not). */
export function ohmsOf(inputs: Record<string, NodeInputs> | undefined, nodeId: string): number {
  const v = Number(inputs?.[nodeId]?.ohms);
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_OHMS;
}

/** A resistor's tolerance in percent, as set in the lab (±5 % if not). */
export function toleranceOf(inputs: Record<string, NodeInputs> | undefined, nodeId: string): 1 | 5 {
  return Number(inputs?.[nodeId]?.tolerance) === 1 ? 1 : 5;
}

/**
 * What a part's settings come to, read-only: an LDR's resistance at the
 * light set, a potentiometer's resistance from end A to the wiper.
 */
export function readoutsFor(partId: string, values: NodeInputs): Array<{ label: string; value: string }> {
  if (partId === "ldr") {
    const lux = typeof values.illuminance === "number" ? values.illuminance : (defaultOf("ldr", "illuminance") as number);
    return [{ label: "Resistance", value: `≈ ${formatOhms(Number(ldrOhms(lux).toPrecision(2)))}` }];
  }
  if (partId === "potentiometer") {
    const position = typeof values.position === "number" ? values.position : (defaultOf("potentiometer", "position") as number);
    const track = typeof values.track === "number" ? values.track : 10_000;
    return [{ label: "End A to wiper", value: formatOhms(Number((position * track).toPrecision(3))) }];
  }
  return [];
}

/** Sketch settings on a board. `when` says which wired parts make a setting relevant. */
const BOARD_CONTROLS: Array<Control & { when: (partsOnBoard: Set<string>) => boolean }> = [
  { ...num("delay", "Blink delay", "time", 0.05, 5, 0.05, 0.5, { help: "delay() between switching an output on and off, as in the Arduino Blink sketch. Period = 2 × delay.", legacy: scaled(0.001, "delayMs") }), when: () => true },
  { ...num("warnDistance", "Warning distance", "length", 0.02, 4, 0.01, 0.2, { help: "Outputs on this board turn on while the ultrasonic distance is below this.", legacy: cm("warnCm") }), when: (p) => p.has("hc-sr04") },
  { ...num("gateOpen", "Gate open angle", "angle", 0, Math.PI, DEG, Math.PI / 2, { help: "Servo angle while motion is seen.", legacy: deg() }), when: (p) => p.has("pir") && p.has("servo") },
  { ...num("gateRest", "Gate resting angle", "angle", 0, Math.PI, DEG, 0, { help: "Servo angle while no motion is seen.", legacy: deg() }), when: (p) => p.has("pir") && p.has("servo") },
  { ...num("gasAlarm", "Gas alarm level", "amount", 0, 0.01, 1e-5, 4.5e-4, { help: "Outputs turn on above this.", legacy: scaled(1e-6, "gasPpm") }), when: (p) => p.has("mq2") },
  { ...num("dryBelow", "Dry below", "ratio", 0, 1, 0.01, 0.3, { help: "Outputs (a pump relay, say) turn on below this moisture.", legacy: pct("dryPct") }), when: (p) => p.has("soil-moisture") },
  {
    ...num("darkBelow", "Dark below", "illuminance", 0, 100_000, 1, luxFromLightPercent(30), { slider: "log", help: "Outputs (a night light) turn on below this much light on the LDR.", legacy: { key: "darkPct", convert: luxFromLightPercent } }),
    when: (p) => p.has("ldr"),
  },
];

function stripWhen(control: Control & { when: unknown }): Control {
  const copy: Control & { when?: unknown } = { ...control };
  delete copy.when;
  return copy;
}

/** Outputs the sketch switches: they follow an alert sensor on their board, or blink. */
const FOLLOWERS = new Set(["led", "buzzer", "relay"]);

/** Alert sensors: the ones whose reading the sketch compares to a setting. */
export const ALERT_SENSORS = new Set(["hc-sr04", "pir", "mq2", "soil-moisture", "ldr"]);

const described = new Map<string, Control[] | null>();

/**
 * Controls for a sensor or a hand control the library describes in data
 * (`sim.reads` in its part file): the same "simulated or set by you" switch,
 * then a knob per quantity it reads. Null for any other part.
 */
function simControls(partId: string): Control[] | null {
  if (described.has(partId)) return described.get(partId)!;
  const sim = getPart(partId)?.sim;
  const legacyKeys = LEGACY_READ_KEYS[partId] ?? {};
  const controls =
    sim?.kind === "sensor"
      ? [
          source(sim.reads.some((q) => q.sweep) ? "Simulated" : "Resting value"),
          ...sim.reads.map((q): Control => {
            if (q.states) return { key: q.key, kind: "toggle", label: q.label, on: q.states[1], off: q.states[0], default: q.start >= 0.5 };
            const { quantity, factor } = siOfPartUnit(q.unit ?? "");
            const old = legacyKeys[q.key];
            return num(q.key, q.label, quantity, exact(q.min * factor), exact(q.max * factor), exact(q.step * factor), exact(q.start * factor), {
              ...(factor !== 1 || old ? { legacy: scaled(factor, old) } : {}),
            });
          }),
          ...(EXTRA_CONTROLS[partId] ?? []),
        ]
      : null;
  described.set(partId, controls);
  return controls;
}

/**
 * A part file states each quantity in the unit its datasheet uses (cm, mm,
 * °, %, mA). The lab stores it in SI: this is the quantity, and the factor
 * from the part's unit to SI. The simulation works in the part's unit, so it
 * divides by the factor when it reads a value.
 */
export function siOfPartUnit(unit: string): { quantity: Quantity; factor: number } {
  switch (unit) {
    case "cm":
      return { quantity: "length", factor: 0.01 };
    case "mm":
      return { quantity: "length", factor: 0.001 };
    case "m":
      return { quantity: "length", factor: 1 };
    case "°":
      return { quantity: "angle", factor: DEG };
    case "%":
      return { quantity: "ratio", factor: 0.01 };
    case "mA":
      return { quantity: "current", factor: 0.001 };
    case "A":
      return { quantity: "current", factor: 1 };
    case "mW":
      return { quantity: "power", factor: 0.001 };
    case "W":
      return { quantity: "power", factor: 1 };
    case "V":
      return { quantity: "voltage", factor: 1 };
    case "lx":
      return { quantity: "illuminance", factor: 1 };
    default:
      return { quantity: "count", factor: 1 };
  }
}

/** Part-file quantities renamed when units became SI (the old name said its unit): part → new key → old key. */
const LEGACY_READ_KEYS: Record<string, Record<string, string>> = {
  "ir-obstacle": { distance: "distanceCm" },
  "sharp-ir": { distance: "distanceCm" },
  vl53l0x: { distance: "distanceMm" },
  bno055: { heading: "headingDeg", pitch: "pitchDeg", roll: "rollDeg" },
  "gy-271": { heading: "headingDeg" },
  ina219: { current: "currentMa", power: "powerMw" },
};

/** The output-voltage setting of an adjustable converter (the trimmer on a buck module). */
function settingControls(partId: string): Control[] | null {
  const converter = getPart(partId)?.spec?.power.converter;
  if (!converter?.adjustable) return null;
  return [num("vout", "Output voltage", "voltage", converter.adjustable[0], converter.adjustable[1], 0.1, converter.volts, { help: "Turn the trimmer until the output reads what your parts need, before you connect them." })];
}

export function isSensorPart(partId: string): boolean {
  return partId in SENSOR_CONTROLS || simControls(partId) !== null;
}

/** Part ids of the peripherals wired to a board, by the analysis. */
export function partsOnBoard(boardId: string, nodes: LabNode[], analysis: Analysis): Set<string> {
  const ids = new Set<string>();
  for (const node of nodes) {
    if (analysis.nodes[node.id]?.links.some((l) => l.board === boardId)) ids.add(node.partId);
  }
  return ids;
}

/** Board id a peripheral is wired to (its first signal link's board), if any. */
export function boardOf(nodeId: string, analysis: Analysis): string | null {
  const links = analysis.nodes[nodeId]?.links ?? [];
  return links.find((l) => !["vcc", "gnd"].includes(l.role))?.board ?? links[0]?.board ?? null;
}

/**
 * The controls to show for a node. Actuators driven by a sensor on their
 * board (a servo gate with a PIR, an LED with an ultrasonic) have no command
 * of their own: the sketch decides, so the Inspector says so instead.
 */
export function controlsFor(node: LabNode, nodes: LabNode[], analysis: Analysis): { title: string; controls: Control[]; note?: string } {
  const pinout = getPinout(node.partId);
  if (pinout.controller) {
    const parts = partsOnBoard(node.id, nodes, analysis);
    return { title: "Sketch settings", controls: BOARD_CONTROLS.filter((c) => c.when(parts)).map((c) => stripWhen(c)) };
  }
  if (PASSIVE_CONTROLS[node.partId]) return { title: "Value", controls: PASSIVE_CONTROLS[node.partId] };
  if (SENSOR_CONTROLS[node.partId]) return { title: "Surroundings", controls: SENSOR_CONTROLS[node.partId] };
  const fromSim = simControls(node.partId);
  if (fromSim) return { title: getPart(node.partId)?.group === "controls" ? "Your hand" : "Surroundings", controls: fromSim };
  const setting = settingControls(node.partId);
  if (EXTRA_CONTROLS[node.partId]) return { title: "Value", controls: EXTRA_CONTROLS[node.partId] };
  if (setting) return { title: "Setting", controls: setting };
  if (FOLLOWERS.has(node.partId)) {
    const board = boardOf(node.id, analysis);
    const driver = board ? drivingSensor(node.partId, partsOnBoard(board, nodes, analysis)) : null;
    if (driver) return { title: "Command", controls: [], note: `Driven by the sketch from the ${driver} on this board: on while its condition holds. Change the ${driver}'s input or the board's settings.` };
    return { title: "Command", controls: [], note: board ? "Blinks with the board's delay. Select the board to change it, or wire a sensor to the board for the sketch to follow." : "" };
  }
  if (ACTUATOR_CONTROLS[node.partId]) {
    const board = boardOf(node.id, analysis);
    const driver = board ? drivingSensor(node.partId, partsOnBoard(board, nodes, analysis)) : null;
    if (driver) return { title: "Command", controls: [], note: `Driven by the sketch from the ${driver} on this board. Change the ${driver}'s input or the board's sketch settings.` };
    return { title: "Command", controls: ACTUATOR_CONTROLS[node.partId] };
  }
  return { title: "Inputs", controls: [] };
}

/** Which sensor on the board, if any, the sketch uses to drive this kind of actuator. */
export function drivingSensor(partId: string, parts: Set<string>): string | null {
  if (partId === "servo") return parts.has("pir") ? "PIR sensor" : null;
  if (partId === "led" || partId === "buzzer" || partId === "relay") {
    for (const s of ["hc-sr04", "pir", "mq2", "soil-moisture", "ldr"]) if (parts.has(s)) return SENSOR_NAMES[s];
  }
  return null;
}

const SENSOR_NAMES: Record<string, string> = { "hc-sr04": "ultrasonic sensor", pir: "PIR sensor", mq2: "gas sensor", "soil-moisture": "soil moisture sensor", ldr: "light sensor" };

/** Read an input with its declared default. */
export function inputOf<T extends number | string | boolean>(inputs: Record<string, NodeInputs> | undefined, nodeId: string, key: string, fallback: T): T extends number ? number : T extends string ? string : boolean {
  const v = inputs?.[nodeId]?.[key];
  return (typeof v === typeof fallback ? v : fallback) as T extends number ? number : T extends string ? string : boolean;
}

/** Whether the person has taken the value over from the simulated sweep. */
export function isSet(inputs: Record<string, NodeInputs> | undefined, nodeId: string): boolean {
  return inputOf(inputs, nodeId, SOURCE_KEY, SOURCE_AUTO) === SOURCE_SET;
}

/**
 * Keep a number input within its declared range (the store's safety net; the
 * Inspector rejects an out-of-range entry with a message before it gets
 * here), at its step or its significant digits; strings and booleans pass through.
 */
export function coerceInput(control: Control, value: unknown): number | string | boolean | null {
  if (control.kind === "number") {
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n)) return null;
    const clamped = Math.min(control.max, Math.max(control.min, n));
    if (control.digits) return Number(clamped.toPrecision(control.digits));
    // At the ends of the range the end itself, not the nearest step (π for 180°, which isn't a whole number of steps).
    if (clamped === control.min || clamped === control.max) return exact(clamped);
    return exact(Math.round(clamped / control.step) * control.step);
  }
  if (control.kind === "toggle") return Boolean(value);
  return control.options.some((o) => o.id === value) ? String(value) : null;
}

/** Find a control by part and key, boards included (for coercion in the store and tests). */
export function findControl(partId: string, key: string): Control | undefined {
  const pinout = getPinout(partId);
  const list = pinout.controller ? BOARD_CONTROLS : (SENSOR_CONTROLS[partId] ?? ACTUATOR_CONTROLS[partId] ?? PASSIVE_CONTROLS[partId] ?? simControls(partId) ?? settingControls(partId) ?? EXTRA_CONTROLS[partId] ?? []);
  return list.find((c) => c.key === key);
}

/** Default for a key, as declared. */
export function defaultOf(partId: string, key: string): number | string | boolean | undefined {
  return findControl(partId, key)?.default;
}

// ── Sessions saved before SI units ─────────────────────────────────────────

/**
 * The unit system a session's inputs are stored in. 1 (or absent): the
 * units each control used to show (cm, hPa, ms, %, °). 2: SI, as declared
 * by the controls above.
 */
export const INPUT_UNITS = 2;

/** Every control a part can have, wherever it's shown. */
export function allControls(partId: string): Control[] {
  if (getPinout(partId).controller) return BOARD_CONTROLS;
  return SENSOR_CONTROLS[partId] ?? ACTUATOR_CONTROLS[partId] ?? PASSIVE_CONTROLS[partId] ?? simControls(partId) ?? settingControls(partId) ?? EXTRA_CONTROLS[partId] ?? [];
}

/**
 * A part's inputs as saved before SI units, in SI: each value is converted
 * (cm → m, hPa → Pa, ms → s, % → ratio, ° → rad, a light % → lux) and moved
 * to its new key where the old name stated its unit (distanceCm → distance).
 * Values with no conversion (an Input switch, a direction, a stepper's
 * position) are kept as they are.
 */
export function migrateNodeInputs(partId: string, values: NodeInputs): NodeInputs {
  const out: NodeInputs = { ...values };
  for (const control of allControls(partId)) {
    if (control.kind === "toggle" || !control.legacy) continue;
    const oldKey = control.legacy.key ?? control.key;
    if (!(oldKey in values)) continue;
    const old = Number(values[oldKey]);
    if (oldKey !== control.key) delete out[oldKey];
    if (!Number.isFinite(old)) continue;
    out[control.key] = control.legacy.convert(old);
  }
  return out;
}
