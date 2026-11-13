/**
 * The lab's simulation: a pure function of the build, the inputs and the time.
 *
 * Each board runs the default sketch in `sketch.ts`: it reads the sensors
 * wired to it, compares them to its settings and drives its outputs. Sensors
 * read what the person set in the Inspector, or the lab's simulated sweep
 * until they do. Actuators with no sensor driving them follow their own
 * command. Parts only respond when the analysis says they are powered and
 * connected, so a missing ground shows up as a dark LED, as it would on a
 * bench. Being pure, any moment can be sampled again, which is how the
 * Signals panel draws its traces and how the tests check a frame.
 */

import { getPart } from "../parts";
import { bridgeDrop, windingAmps } from "../parts/power";
import type { Analysis } from "./circuit";
import { ledCurrentMa, pinKey } from "./circuit";
import { formatOhms } from "../parts/models/passives";
import { breadboardUse, railSummary } from "./breadboard";
import { inputOf, isSet, isSensorPart, ohmsOf } from "./controls";
import { getPinout } from "./pinout";
import { boardSettings, describedPinLevel, displayLines, planBoard, sampleSensor, type BoardPlan, type Inputs, type SensorSample } from "./sketch";
import type { LabNode, LabWire } from "./types";
import { DC_MOTOR_MAX_RPM, LED_SERIES_OHMS, motorSpeedBadge, motorSpeedText } from "./constants";

export interface Reading {
  label: string;
  value: string;
}

export interface NodeLive {
  /** Lit, energised, spinning or reading. */
  on: boolean;
  /** 0–1: brightness, duty, speed. */
  level: number;
  angle?: number;
  rgb?: [number, number, number];
  readings: Reading[];
  /** Lines on a display. */
  text?: string[];
  /** Short state for the node badge: "ON", "23.4 °C", "90°". */
  badge?: string;
  /**
   * What a sounder is being driven with, for the audio engine: its pitch and
   * the pin's on/off pattern in simulated time (on while
   * ((t + phase) mod period) < period × duty). Null when silent.
   */
  tone?: { hz: number; pattern: PinPattern } | null;
}

/** A pin switched on and off at a steady rate, as `square()` draws it. */
export interface PinPattern {
  period: number;
  duty: number;
  phase: number;
}

/** An active buzzer's own oscillator: one fixed pitch, near its piezo's resonance. */
export const ACTIVE_BUZZER_HZ = 2300;

export type WireFlow = "power" | "ground" | "signal" | "data" | "idle" | "fault";

export interface WireLive {
  flow: WireFlow;
  /** 0–1. 0 means no current right now. */
  level: number;
}

export interface Frame {
  t: number;
  running: boolean;
  nodes: Record<string, NodeLive>;
  pins: Record<string, number>;
  wires: Record<string, WireLive>;
}

/** 28BYJ-48 through its gearbox: steps per turn of the output shaft (full-step). */
export const STEPPER_STEPS_PER_TURN = 2048;
/** The TT gear motor's no-load speed at full duty. */
export { DC_MOTOR_MAX_RPM } from "./constants";

const square = (t: number, period: number, duty = 0.5, phase = 0) => (((t + phase) % period) + period) % period < period * duty ? 1 : 0;
const fmt = (n: number, digits = 1) => n.toFixed(digits);

/** The logic voltage of a board's pins (5 V on an Uno, 3.3 V on an ESP32). */
function boardLogicV(nodes: LabNode[], boardId: string | null): number {
  const board = boardId ? nodes.find((n) => n.id === boardId) : undefined;
  return board ? getPinout(board.partId).logic : 5;
}

/** Index of each output part among the outputs on its board, so patterns can be staggered. */
function outputOrder(nodes: LabNode[], analysis: Analysis): Map<string, number> {
  const order = new Map<string, number>();
  const perBoard = new Map<string, number>();
  for (const node of nodes) {
    const report = analysis.nodes[node.id];
    const link = report?.links.find((l) => l.role === "drive" || l.role === "pwm");
    if (!link) continue;
    const k = perBoard.get(link.board) ?? 0;
    order.set(node.id, k);
    perBoard.set(link.board, k + 1);
  }
  return order;
}

/** A sensor's reading at time t with no inputs: the simulated sweep. Kept for the Signals panel and older callers. */
export function sensorReadings(partId: string, t: number): { readings: Reading[]; level: number; on: boolean; badge?: string } {
  const s = sampleSensor({ id: "", partId, label: partId, x: 0, y: 0, mode: "virtual" }, t, undefined, boardSettings(null, undefined));
  return { readings: s.readings, level: s.level, on: s.on, badge: s.badge };
}

const DISPLAYS = new Set(["lcd-16x2", "oled-ssd1306", "tft-display"]);
const RADIOS = new Set(["hc-05", "wifi-module", "nrf24l01", "lora"]);

export function isSensor(partId: string) {
  return isSensorPart(partId);
}

export function isDisplay(partId: string) {
  return DISPLAYS.has(partId);
}

/**
 * Whether a part runs: ready, or wired with only a signal-level fault. A real
 * part would run out of spec there too, so the lab shows it working and
 * keeps the fault in the list.
 */
export function runnable(report: Analysis["nodes"][string] | undefined): boolean {
  if (!report) return false;
  if (report.status === "ready") return true;
  return report.status === "fault" && report.powered && report.faults.every((f) => f.severity !== "error" || f.id.startsWith("level"));
}

/** The board a peripheral takes its signal from. */
function boardFor(report: Analysis["nodes"][string] | undefined): string | null {
  const links = report?.links ?? [];
  return links.find((l) => !["vcc", "gnd"].includes(l.role))?.board ?? links[0]?.board ?? null;
}

/**
 * Where a commanded stepper is at time t, in steps of the output shaft,
 * accumulated since the position was last zeroed. A command moves from
 * `cmdFrom` to `cmdTarget` at `stepRate` (Hz, steps per second), starting at `cmdAt`, then
 * holds. With no command the shaft holds at `cmdFrom` (0 by default).
 */
export function stepperStepsAt(inputs: Inputs, nodeId: string, t: number): number {
  const from = inputOf(inputs, nodeId, "cmdFrom", 0);
  const target = inputOf(inputs, nodeId, "cmdTarget", from);
  const at = inputOf(inputs, nodeId, "cmdAt", 0);
  const sps = Math.max(1, inputOf(inputs, nodeId, "stepRate", 256));
  const distance = Math.abs(target - from);
  const traveled = Math.min(distance, Math.max(0, t - at) * sps);
  return Math.round(from + Math.sign(target - from) * traveled);
}

export function frameAt(nodes: LabNode[], wires: LabWire[], analysis: Analysis, t: number, running: boolean, inputs: Inputs = undefined): Frame {
  const live: Record<string, NodeLive> = {};
  const pins: Record<string, number> = {};
  const order = outputOrder(nodes, analysis);

  // Sensors first: the sketch on each board reads them before deciding anything.
  const samplesByBoard = new Map<string, SensorSample[]>();
  const sensorSamples = new Map<string, SensorSample>();
  /** Sensors wired to a board that can't give a reading (no power, no ground, signal unwired): the sketch gets no data. */
  const silentByBoard = new Map<string, LabNode[]>();
  for (const node of nodes) {
    if (!isSensorPart(node.partId)) continue;
    const report = analysis.nodes[node.id];
    const ready = runnable(report);
    if (!ready || !running) {
      live[node.id] = { on: false, level: 0, readings: [], badge: ready ? "Ready" : undefined };
      const board = boardFor(report);
      if (running && !ready && board) silentByBoard.set(board, [...(silentByBoard.get(board) ?? []), node]);
      continue;
    }
    const board = boardFor(report);
    const sample = sampleSensor(node, t, inputs, boardSettings(board, inputs));
    sensorSamples.set(node.id, sample);
    if (board) samplesByBoard.set(board, [...(samplesByBoard.get(board) ?? []), sample]);
    live[node.id] = { on: sample.on, level: sample.level, readings: sample.readings, badge: sample.held ? `${sample.badge} (set)` : sample.badge };
    const described = getPart(node.partId)?.sim;
    for (const link of report!.links) {
      // A sensor described in data says which quantity each output pin follows.
      const value = describedPinLevel(described, link.pin, sample.values) ?? (link.role === "out-analog" ? sample.level : link.role === "out-digital" ? (node.partId === "soil-moisture" || node.partId === "mq2" ? (sample.level < 0.3 ? 0 : 1) : sample.level) : square(t, 2, 0.08));
      pins[`${node.id}:${link.pin}`] = value;
      pins[`${link.board}:${link.boardPin}`] = value;
    }
  }

  const plans = new Map<string, BoardPlan>();
  const planFor = (boardId: string | null): BoardPlan => {
    const key = boardId ?? "";
    let plan = plans.get(key);
    if (!plan) {
      plan = planBoard(boardId, boardId ? (samplesByBoard.get(boardId) ?? []) : [], inputs);
      plans.set(key, plan);
    }
    return plan;
  };

  for (const node of nodes) {
    if (live[node.id]) continue;
    const report = analysis.nodes[node.id];
    const pinout = getPinout(node.partId);
    if (node.partId === "resistor") {
      live[node.id] = { on: false, level: 0, readings: [{ label: "Value", value: formatOhms(ohmsOf(inputs, node.id)) }] };
      continue;
    }
    if (pinout.passive) {
      // A breadboard runs nothing; its panel says what each wired strip carries.
      const use = breadboardUse(node.id, analysis, nodes);
      live[node.id] = {
        on: false,
        level: 0,
        readings: use.slice(0, 6).map((u) => ({ label: u.name, value: u.kind === "power" ? u.net : u.kind === "ground" ? "GND" : u.kind === "short" ? "Short!" : u.kind === "open" ? "Not connected" : u.net })),
        badge: railSummary(use),
      };
      continue;
    }
    if (pinout.controller) {
      const powered = report?.powered ?? true;
      const { settings, samples, alertSensor, alert } = planFor(node.id);
      const ledPin = pinout.pins.find((p) => p.fns?.includes("led"));
      const ledUsed = ledPin && report?.wiredPins.has(ledPin.id);
      const blink = running && powered && !ledUsed ? square(t, (2 * settings.delayMs) / 1000) : 0;
      if (ledPin && !ledUsed) pins[`${node.id}:${ledPin.id}`] = blink;
      const sketch = !running ? "Stopped" : alertSensor ? `${alertSensor.node.label} → outputs${alert ? " (on)" : " (off)"}` : samples.length ? "Read and show" : `Blink, delay ${settings.delayMs} ms`;
      live[node.id] = {
        on: powered,
        level: blink,
        readings: [{ label: "Power", value: powered ? `USB, ${pinout.logic} V logic` : "Off" }, { label: "Sketch", value: sketch }, ...(running ? [{ label: "Uptime", value: `${fmt(t)} s` }] : [])],
        badge: !powered ? "Off" : running ? (ledUsed ? "Running" : blink ? "L on" : "L off") : "Idle",
      };
      continue;
    }

    const ready = runnable(report);
    const k = order.get(node.id) ?? 0;
    const go = running && ready;
    const board = boardFor(report);
    const plan = planFor(board);
    const period = (2 * plan.settings.delayMs) / 1000;
    const held = isSet(inputs, node.id);
    const setLinks = (fn: (role: string, pin: string) => number) => {
      for (const link of report?.links ?? []) {
        const v = fn(link.role, link.pin);
        pins[`${node.id}:${link.pin}`] = v;
        pins[`${link.board}:${link.boardPin}`] = v;
      }
    };

    switch (node.partId) {
      case "led": {
        const onRail = !report?.links.some((l) => l.pin === "A") && report?.powered;
        const level = go ? (onRail ? 1 : plan.alertSensor ? (plan.alert ? 1 : 0) : square(t, period, 0.5, k * (period / 4))) : !running && onRail && ready ? 1 : 0;
        setLinks(() => level);
        const why = plan.alertSensor ? (plan.alert ? `On: ${plan.alertSensor.node.label} condition met` : `Off: waiting on ${plan.alertSensor.node.label}`) : go ? `Blinking, ${plan.settings.delayMs} ms` : "—";
        // The lab has no resistor part: an LED on a pin is modeled with the 220 Ω a real build needs (see the circuit check's tip).
        const pinV = onRail ? (report?.supplyV ?? 5) : boardLogicV(nodes, board);
        // A wired resistor sets the current; with none, the model assumes 220 Ω (the circuit check's tip says so).
        const ohms = report?.seriesOhms || LED_SERIES_OHMS;
        const current = level > 0 ? ledCurrentMa(pinV, ohms) : 0;
        live[node.id] = {
          on: level > 0,
          level,
          readings: [{ label: "State", value: level ? "On" : "Off" }, ...(go ? [{ label: "Sketch", value: why }, { label: report?.seriesOhms ? "Current" : "Current (modeled)", value: level ? `${fmt(current)} mA via ${formatOhms(ohms)}${report?.seriesOhms ? "" : " (assumed)"}` : "0 mA" }] : [])],
          badge: level ? "ON" : "OFF",
        };
        break;
      }
      case "buzzer": {
        // The sketch beeps the pin: fast while an alert holds, a chirp per blink period otherwise.
        const pattern: PinPattern | null = !go ? null : plan.alertSensor ? (plan.alert ? { period: 0.3, duty: 0.5, phase: 0 } : null) : { period, duty: 0.15, phase: k * 0.2 };
        const level = pattern ? square(t, pattern.period, pattern.duty, pattern.phase) : 0;
        setLinks(() => level);
        live[node.id] = {
          on: level > 0,
          level,
          readings: [{ label: "Tone", value: level ? "2.3 kHz beep" : pattern ? "Beeping" : "Silent" }],
          badge: level ? "BEEP" : pattern ? "Beeping" : "Quiet",
          tone: pattern ? { hz: ACTIVE_BUZZER_HZ, pattern } : null,
        };
        break;
      }
      case "relay": {
        const level = go ? (plan.alertSensor ? (plan.alert ? 1 : 0) : square(t, 4 * period, 0.5, k)) : 0;
        setLinks((role) => (role === "drive" ? 1 - level : 0));
        live[node.id] = { on: level > 0, level, readings: [{ label: "Contact", value: level ? "COM–NO closed" : "COM–NC closed" }], badge: level ? "Energised" : "Released" };
        break;
      }
      case "rgb-led": {
        const r = go ? 0.5 + 0.5 * Math.sin(t * 1.3) : 0;
        const g = go ? 0.5 + 0.5 * Math.sin(t * 1.3 + 2.1) : 0;
        const b = go ? 0.5 + 0.5 * Math.sin(t * 1.3 + 4.2) : 0;
        const wired = (pin: string) => report?.links.some((l) => l.pin === pin) ?? false;
        const rgb: [number, number, number] = [wired("R") ? r : 0, wired("G") ? g : 0, wired("B") ? b : 0];
        setLinks((_, pin) => (pin === "R" ? rgb[0] : pin === "G" ? rgb[1] : pin === "B" ? rgb[2] : 0));
        const level = Math.max(...rgb);
        live[node.id] = { on: level > 0.05, level, rgb, readings: [{ label: "Color", value: `R ${Math.round(rgb[0] * 255)} G ${Math.round(rgb[1] * 255)} B ${Math.round(rgb[2] * 255)}` }], badge: go ? "Fading" : "Off" };
        break;
      }
      case "servo": {
        // Gate policy when a PIR shares the board; otherwise the servo's own command.
        const gate = plan.motion !== null;
        // The angle is set in radians (SI); the servo model works in degrees.
        const commanded = gate ? (plan.motion ? plan.settings.gateOpen : plan.settings.gateRest) : held ? Number(((inputOf(inputs, node.id, "angle", Math.PI / 2) * 180) / Math.PI).toPrecision(12)) : null;
        const angle = !go ? (commanded ?? 90) : commanded !== null ? Math.min(180, Math.max(0, commanded)) : 90 + 75 * Math.sin(t * 1.2 + k);
        setLinks((role) => (role === "pwm" ? (go ? 0.05 + (angle / 180) * 0.05 + 0.4 : 0) : 0));
        const command = gate ? (plan.motion ? `Open (${plan.settings.gateOpen}°): motion seen` : `Rest (${plan.settings.gateRest}°): no motion`) : held ? `Hold ${Math.round(angle)}°` : "Sweep (simulated)";
        live[node.id] = { on: go, level: angle / 180, angle, readings: [{ label: "Angle", value: `${Math.round(angle)}°` }, ...(go ? [{ label: "Command", value: command }] : [])], badge: `${Math.round(angle)}°` };
        break;
      }
      case "dc-motor": {
        const hasEn = report?.links.some((l) => l.pin === "EN");
        const in1 = report?.links.some((l) => l.pin === "IN1") ?? false;
        const in2 = report?.links.some((l) => l.pin === "IN2") ?? false;
        let duty: number;
        let forward: boolean;
        let note: string | undefined;
        if (held) {
          const speed = inputOf(inputs, node.id, "speed", 0);
          forward = inputOf(inputs, node.id, "direction", "forward") !== "reverse";
          const dirPin = forward ? in1 : in2;
          if (!go) duty = 0;
          else if (!dirPin) {
            duty = 0;
            note = `${forward ? "IN1" : "IN2"} isn't wired, so the driver can't turn ${forward ? "forward" : "in reverse"}`;
          } else if (!hasEn) {
            duty = speed > 0 ? 1 : 0;
            note = "EN isn't wired: full speed or stopped";
          } else duty = speed;
        } else {
          duty = go ? (hasEn ? 0.35 + 0.65 * Math.abs(Math.sin(t / 2.5)) : 1) : 0;
          forward = square(t, 8) === 1;
        }
        setLinks((_, pin) => (pin === "EN" ? duty : pin === "IN1" ? (go && forward ? 1 : 0) : pin === "IN2" ? (go && !forward ? 1 : 0) : 0));
        const rpm = Math.round(duty * DC_MOTOR_MAX_RPM);
        live[node.id] = {
          on: duty > 0,
          level: duty,
          angle: ((((forward ? 1 : -1) * t * rpm * 6) % 360) + 360) % 360,
          readings: [
            { label: "Speed", value: motorSpeedText(rpm) },
            { label: "Direction", value: rpm ? (forward ? "Forward" : "Reverse") : "Stopped" },
            ...(go ? [{ label: "Command", value: held ? `${Math.round(inputOf(inputs, node.id, "speed", 0) * 100)} % ${forward ? "forward" : "reverse"}` : "Varying (simulated)" }] : []),
            ...(note ? [{ label: "Note", value: note }] : []),
          ],
          badge: go ? (rpm ? motorSpeedBadge(rpm) : "Stopped") : "Stopped",
        };
        break;
      }
      case "stepper-motor": {
        // Commanded: move from → target at the set speed, then hold. Simulated: turn at 128 steps/s.
        const steps = held ? stepperStepsAt(inputs, node.id, t) : go ? Math.floor(t * 128) : 0;
        const target = held ? inputOf(inputs, node.id, "cmdTarget", inputOf(inputs, node.id, "cmdFrom", 0)) : null;
        const moving = go && (held ? steps !== target : true);
        const angle = ((((steps % STEPPER_STEPS_PER_TURN) + STEPPER_STEPS_PER_TURN) % STEPPER_STEPS_PER_TURN) / STEPPER_STEPS_PER_TURN) * 360;
        setLinks((_, pin) => (moving && pin === `IN${((((steps % 4) + 4) % 4) + 1)}` ? 1 : 0));
        const remaining = target === null ? null : target - steps;
        // The last move commanded (Go), and how much of it the shaft has done: kept apart from the position.
        const from = held ? inputOf(inputs, node.id, "cmdStart", inputOf(inputs, node.id, "cmdFrom", 0)) : 0;
        const goal = held ? inputOf(inputs, node.id, "cmdGoal", target ?? from) : from;
        const commanded = goal - from;
        const executed = Math.abs(steps - from);
        const stopped = target !== null && target !== goal;
        live[node.id] = {
          on: moving,
          level: moving ? 1 : 0,
          angle,
          readings: [
            { label: "Position", value: `${fmt(angle, 0)}°` },
            { label: "Position (steps)", value: `${steps}` },
            ...(go ? [{ label: "Command", value: held ? (remaining ? `${Math.abs(remaining)} steps to go ${remaining > 0 ? "clockwise" : "anticlockwise"}` : "Holding") : "Turning (simulated)" }] : []),
            ...(held && commanded ? [{ label: "Last move", value: `${commanded > 0 ? "+" : "−"}${Math.abs(commanded)} steps` }, { label: "Done", value: `${executed} of ${Math.abs(commanded)}${stopped && steps === target ? ", stopped" : ""}` }] : []),
          ],
          badge: `${fmt(angle, 0)}°`,
        };
        break;
      }
      default: {
        if (DISPLAYS.has(node.partId)) {
          const silent = board ? (silentByBoard.get(board) ?? []) : [];
          const lines = go ? displayLines(node.partId, plan.samples, t, silent.map((n) => n.label)) : [];
          setLinks(() => (go ? 0.5 : 0));
          const sources = [...plan.samples.map((s) => `${s.node.label} (${s.held ? "set" : "simulated"})`), ...silent.map((n) => `${n.label} (no data)`)];
          live[node.id] = { on: go, level: go ? 1 : 0, text: lines, readings: go ? [{ label: "Showing", value: lines.join(" · ") }, { label: "Source", value: sources.length ? sources.join(", ") : "No sensor on this board" }] : [], badge: go ? "Showing" : "Blank" };
        } else if (RADIOS.has(node.partId)) {
          const up = go && t > 2.5;
          const status =
            node.partId === "hc-05" ? (up ? "Paired" : "Discoverable") : node.partId === "wifi-module" ? (up ? "Connected, 192.168.4.2" : "Joining…") : node.partId === "nrf24l01" ? `${Math.floor(t * 4)} packets sent` : `${Math.floor(t / 2)} packets, RSSI −87 dBm`;
          setLinks(() => (go ? square(t, 0.5, 0.3) : 0));
          live[node.id] = { on: go, level: go ? (up ? 1 : square(t, 0.3)) : 0, readings: go ? [{ label: "Status", value: status }] : [], badge: go ? (up ? "Linked" : "Pairing") : "Idle" };
        } else {
          live[node.id] = poweredPart(node, nodes, analysis, t, running, go) ?? { on: go, level: go ? 1 : 0, readings: [], badge: go ? "Running" : undefined };
          if (live[node.id].on) setLinks((role) => (role === "pwm" ? 0.7 : role === "drive" || role === "cs" ? 1 : 0.5));
        }
      }
    }
  }

  const wireLive = wireFlows(nodes, wires, analysis, pins, running);
  return { t, running, nodes: live, pins, wires: wireLive };
}

const amps = (ma: number) => (ma >= 1000 ? `${fmt(ma / 1000, 2)} A` : `${fmt(ma, 0)} mA`);
const hours = (h: number) => (h >= 48 ? `${fmt(h / 24, 0)} days` : h >= 1 ? `${fmt(h)} h` : `${fmt(h * 60, 0)} min`);

/**
 * The live state of the parts the power model knows: batteries, converters,
 * drivers and the motors they run. Null for anything else.
 */
function poweredPart(node: LabNode, nodes: LabNode[], analysis: Analysis, t: number, running: boolean, go: boolean): NodeLive | null {
  const part = getPart(node.partId);
  const sim = part?.sim;
  const spec = part?.spec;
  const report = analysis.nodes[node.id];
  const power = analysis.power;
  const heat = power.heat[node.id];
  const heatLine = heat ? [{ label: "Heat", value: `${heat.watts >= 1 ? `${fmt(heat.watts)} W` : `${fmt(heat.watts * 1000, 0)} mW`}, about ${fmt(heat.tempC, 0)} °C` }] : [];
  if (sim?.kind === "source") {
    const rail = power.rails.find((r) => r.source.node === node.id);
    const source = spec?.power.source;
    const load = rail?.typicalMa ?? 0;
    const sag = source?.ohms ? (load / 1000) * source.ohms : 0;
    const volts = (source?.volts ?? 0) - sag;
    return {
      on: load > 0,
      level: rail?.capacityMa ? Math.min(1, load / rail.capacityMa) : load > 0 ? 0.5 : 0,
      readings: [
        { label: "Voltage", value: `${fmt(volts, 2)} V${sag > 0.05 ? ` (sagging ${fmt(sag, 2)} V)` : ""}` },
        { label: "Load", value: rail ? `${amps(load)}${rail.capacityMa ? ` of ${amps(rail.capacityMa)}` : ""}` : "Nothing connected" },
        ...(rail?.hours ? [{ label: "Lasts about", value: hours(rail.hours) }] : []),
      ],
      badge: `${fmt(volts)} V`,
    };
  }
  if (sim?.kind === "converter") {
    const rails = power.rails.filter((r) => r.source.node === node.id);
    const input = analysis.nets.find((n) => n.id === analysis.netOfPin.get(`${node.id}:${sim.input[0]}`));
    const live = !!report?.powered && rails.length > 0;
    const out = rails.find((r) => r.source.pin === sim.output[0]) ?? rails[0];
    return {
      on: live,
      level: out?.capacityMa ? Math.min(1, out.typicalMa / out.capacityMa) : live ? 0.5 : 0,
      readings: [
        { label: "Input", value: input?.kind === "power" ? `${input.voltage} V` : "No supply" },
        ...rails.map((r) => ({ label: rails.length > 1 ? `Output ${r.source.pin}` : "Output", value: `${fmt(r.volts, 2)} V, ${amps(r.typicalMa)}${r.capacityMa ? ` of ${amps(r.capacityMa)}` : ""}` })),
        ...heatLine,
      ],
      badge: out ? `${fmt(out.volts)} V` : report?.powered ? "On" : "No input",
    };
  }
  if (sim?.kind === "driver") {
    const motors = nodes.filter((n) => analysis.nodes[n.id]?.drivenBy === node.id);
    return {
      on: go,
      level: go ? 1 : 0,
      readings: [
        { label: "Motor supply", value: report?.supplyV ? `${report.supplyV} V` : "None" },
        { label: "Driving", value: motors.length ? motors.map((m) => m.label).join(", ") : "Nothing on its outputs" },
        ...heatLine,
      ],
      badge: go ? (motors.length ? "Driving" : "Ready") : undefined,
    };
  }
  if (sim?.kind === "motor") {
    const motor = spec?.power.motor;
    const driver = report?.drivenBy ? nodes.find((n) => n.id === report.drivenBy) : undefined;
    const driverReady = driver ? runnable(analysis.nodes[driver.id]) : report?.status === "ready";
    const turning = running && report?.status === "ready" && driverReady;
    // With its enable on a PWM pin the speed varies; without, it is all or nothing.
    const hasSpeed = report?.links.some((l) => l.role === "pwm") ?? false;
    const duty = turning ? (hasSpeed ? 0.4 + 0.6 * Math.abs(Math.sin(t / 2.5)) : 1) : 0;
    const bridge = driver ? getPart(driver.partId)?.spec?.power.bridge : undefined;
    const winding = motor ? windingAmps(bridge, motor) : 0;
    const drop = bridge ? bridgeDrop(bridge, winding) : 0;
    // A chopper driver holds the current, so a winding sees its own volts at that current, not the supply.
    const held = !!bridge?.limitMa && !!motor && motor.runMa > 0;
    const volts = held ? winding * (motor.ratedV / (motor.runMa / 1000)) : Math.max(0, (report?.supplyV ?? 0) - drop);
    const share = held ? 1 : motor && motor.ratedV > 0 ? Math.min(1.5, volts / motor.ratedV) : 1;
    // A stepper has no speed of its own: the lab steps it at 200 full steps a second, one turn.
    const base = motor?.rpm ?? (sim.second ? 60 : 0);
    const rpm = Math.round(base * duty * share);
    return {
      on: duty > 0,
      level: duty,
      angle: (((t * rpm * 6) % 360) + 360) % 360,
      readings: [
        ...(base ? [{ label: "Speed", value: motorSpeedText(rpm) }] : [{ label: "State", value: duty > 0 ? "Running" : "Stopped" }]),
        { label: "At its terminals", value: !turning ? "0 V" : held ? `About ${fmt(volts)} V, chopped down from ${report?.supplyV ?? 0} V` : `${fmt(volts)} V${drop > 0.05 ? ` (${fmt(drop)} V lost in the driver)` : ""}` },
        { label: "Current", value: !turning ? "0 mA" : held ? `${amps(winding * 1000)} a winding, held by ${driver?.label}` : amps((motor?.runMa ?? 0) * Math.max(0.3, duty)) },
        ...(driver ? [{ label: "Driven by", value: driver.label }] : []),
      ],
      badge: turning ? (base ? motorSpeedBadge(rpm) : "Running") : "Stopped",
    };
  }
  if (heatLine.length && go) return { on: true, level: 1, readings: heatLine, badge: "Running" };
  return null;
}

/** How much current or data each wire carries, from the pin levels of a frame. */
export function wireFlows(nodes: LabNode[], wires: LabWire[], analysis: Analysis, pins: Record<string, number>, running: boolean): Record<string, WireLive> {
  const wireLive: Record<string, WireLive> = {};
  const netById = new Map(analysis.nets.map((n) => [n.id, n]));
  for (const wire of wires) {
    const net = netById.get(analysis.netOfWire.get(wire.id) ?? "");
    if (!net) {
      wireLive[wire.id] = { flow: "idle", level: 0 };
      continue;
    }
    const consumers = net.pins.filter((p) => {
      const r = analysis.nodes[p.node];
      return r && !getPinout(nodes.find((n) => n.id === p.node)?.partId ?? "").controller && r.powered;
    });
    const faulty = analysis.faults.some((f) => f.severity === "error" && f.wires.includes(wire.id));
    if (net.kind === "short" || net.kind === "conflict" || faulty) {
      wireLive[wire.id] = { flow: "fault", level: 1 };
    } else if (net.kind === "power") {
      wireLive[wire.id] = { flow: "power", level: consumers.length ? 1 : 0 };
    } else if (net.kind === "ground") {
      wireLive[wire.id] = { flow: "ground", level: consumers.length ? 1 : 0 };
    } else {
      const level = Math.max(0, ...net.pins.map((p) => pins[pinKey(p)] ?? 0));
      const anyBus = net.pins.some((p) => {
        const pin = getPinout(nodes.find((n) => n.id === p.node)?.partId ?? "").pins.find((x) => x.id === p.pin);
        return pin?.role && ["io", "sda", "scl", "tx", "rx", "mosi", "miso", "sck", "cs"].includes(pin.role);
      });
      wireLive[wire.id] = { flow: anyBus ? "data" : "signal", level: running ? level : 0 };
    }
  }

  return wireLive;
}

/** One line of serial output a board would print each second. */
export function serialLine(nodes: LabNode[], frame: Frame): string | null {
  const parts: string[] = [];
  for (const node of nodes) {
    const l = frame.nodes[node.id];
    if (!l || !l.readings.length || getPinout(node.partId).controller) continue;
    if (isSensorPart(node.partId)) parts.push(`${node.label}: ${l.readings.map((r) => r.value).join(", ")}`);
  }
  for (const node of nodes) {
    const l = frame.nodes[node.id];
    if (!l || isSensorPart(node.partId) || getPinout(node.partId).controller || getPinout(node.partId).passive || !l.badge) continue;
    parts.push(`${node.label}: ${l.badge}`);
  }
  if (!parts.length) return null;
  return `[${frame.t.toFixed(1)}s] ${parts.join(" | ")}`;
}
