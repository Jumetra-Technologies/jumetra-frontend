/**
 * The lab running the user's own program (RUN-02, EMU-02, OUT-02, DBG-01).
 *
 * One board in the circuit runs the compiled sketch on the emulator. Its
 * parts show what the program does to the pins (an LED as bright as the
 * pin's PWM duty, a servo at the angle its pulse width means, a buzzer at
 * the pitch the pin toggles), and its sensors answer the program with the
 * values set in the Inspector or the lab's simulated sweep. Every other
 * board keeps its built-in behavior.
 */

import type { PeripheralInput } from "../emulator/peripherals";
import type { CrashKind, PinReading } from "../emulator/protocol";
import type { Analysis } from "./circuit";
import { getPart } from "../parts";
import { getPinout } from "./pinout";
import { ACTIVE_BUZZER_HZ, wireFlows, type Frame, type NodeLive } from "./simulate";
import { boardSettings, describedPinLevel, sampleSensor, type Inputs } from "./sketch";
import type { LabNode, LabWire } from "./types";
import { DC_MOTOR_MAX_RPM, SERVO_MAX_US, SERVO_MIN_US, motorSpeedBadge, motorSpeedText } from "./constants";

/** What the emulated board reported last. */
export interface ProgramReadings {
  /** The lab node running the program. */
  boardId: string;
  /** Simulated seconds since the program started. */
  t: number;
  /** Simulated time per wall-clock time, in percent: 100 is real time (RUN-05). */
  speedPercent: number;
  pins: PinReading[];
  crashed: CrashKind | null;
  /** A run on a real board (sprint 9): which one, "Arduino Uno on COM3". Omitted: the emulated board. */
  where?: string;
}

/** Boards whose chip Kiungo emulates now: the ATmega328P (EMU-01). */
export const EMULATED_PARTS = new Set(["arduino-uno"]);

/** The Arduino pin number of an Uno header pin: "D13" is 13, "A0" is 14. */
export function arduinoPinOf(boardPinId: string): number | null {
  const d = /^D(\d+)$/.exec(boardPinId);
  if (d) return Number(d[1]);
  const a = /^A(\d)$/.exec(boardPinId);
  if (a) return 14 + Number(a[1]);
  return null;
}

/** Below this a toggling pin is a blink, not a sound. */
const AUDIBLE_HZ = 20;
 
export function servoAngle(pulseUs: number): number {
  return Math.max(0, Math.min(180, ((pulseUs - SERVO_MIN_US) / (SERVO_MAX_US - SERVO_MIN_US)) * 180));
}

const fmt = (n: number, digits = 0) => n.toFixed(digits);

/**
 * The frame with the program's board and the parts on it taken from the
 * emulator. Parts on other boards, and the wires' power, stay as `base` has them.
 */
export function programFrame(base: Frame, nodes: LabNode[], wires: LabWire[], analysis: Analysis, program: ProgramReadings): Frame {
  const byPin = new Map(program.pins.map((p) => [p.pin, p]));
  const reading = (boardPin: string): PinReading | undefined => {
    const n = arduinoPinOf(boardPin);
    return n === null ? undefined : byPin.get(n);
  };
  const live: Record<string, NodeLive> = { ...base.nodes };
  const pins: Record<string, number> = { ...base.pins };
  const t = program.t;
  const crashed = program.crashed !== null;

  // The board's own pins, as a logic analyser would show them.
  const board = nodes.find((n) => n.id === program.boardId);
  if (board) {
    for (const pin of getPinout(board.partId).pins) {
      const r = reading(pin.id);
      if (r) pins[`${board.id}:${pin.id}`] = r.level === "high" ? 1 : r.level === "low" ? 0 : r.duty;
    }
    const led = byPin.get(13);
    const speed = program.speedPercent;
    live[board.id] = {
      on: !crashed,
      level: led?.duty ?? 0,
      readings: [
        { label: "Sketch", value: crashed ? "Stopped: ran out of memory" : "Your code (sketch.ino)" },
        { label: "Uptime", value: `${fmt(t, 1)} s` },
        program.where ? { label: "Runs on", value: `The real ${program.where}` } : { label: "Speed", value: speed >= 97 ? "Real time" : `${speed} % of real time` },
      ],
      badge: crashed ? "Crashed" : program.where ? "On board" : speed >= 97 ? "Running" : `${speed} %`,
    };
  }

  for (const node of nodes) {
    const report = analysis.nodes[node.id];
    if (!report?.powered || !report.links.some((l) => l.board === program.boardId)) continue;
    const link = (pin: string) => report.links.find((l) => l.pin === pin && l.board === program.boardId);
    const at = (pin: string) => {
      const l = link(pin);
      return l ? reading(l.boardPin) : undefined;
    };
    const driven = (r: PinReading | undefined) => (r && (r.level === "high" || r.level === "low") ? r.duty : 0);
    const mirror = (pin: string, v: number) => {
      const l = link(pin);
      if (!l) return;
      pins[`${node.id}:${pin}`] = v;
      pins[`${l.board}:${l.boardPin}`] = v;
    };

    switch (node.partId) {
      case "led": {
        const level = driven(at("A"));
        mirror("A", level);
        live[node.id] = {
          on: level > 0.02,
          level,
          readings: [{ label: "State", value: level > 0.98 ? "On" : level > 0.02 ? `On, ${Math.round(level * 100)} % (PWM)` : "Off" }],
          badge: level > 0.02 ? "ON" : "OFF",
        };
        break;
      }
      case "rgb-led": {
        const rgb: [number, number, number] = [driven(at("R")), driven(at("G")), driven(at("B"))];
        mirror("R", rgb[0]);
        mirror("G", rgb[1]);
        mirror("B", rgb[2]);
        const level = Math.max(...rgb);
        live[node.id] = { on: level > 0.02, level, rgb, readings: [{ label: "Color", value: `R ${Math.round(rgb[0] * 255)} G ${Math.round(rgb[1] * 255)} B ${Math.round(rgb[2] * 255)}` }], badge: level > 0.02 ? "On" : "Off" };
        break;
      }
      case "buzzer": {
        const r = at("P");
        const duty = driven(r);
        const toggling = (r?.hz ?? 0) >= AUDIBLE_HZ;
        // A steady high drives the active buzzer's own oscillator; a toggling pin (tone()) sets the pitch.
        const hz = toggling ? (r?.hz ?? 0) : duty > 0.98 ? ACTIVE_BUZZER_HZ : 0;
        mirror("P", duty);
        live[node.id] = {
          on: hz > 0,
          level: hz > 0 ? 1 : 0,
          readings: [{ label: "Tone", value: hz ? `${Math.round(hz)} Hz` : "Silent" }],
          badge: hz ? `${Math.round(hz)} Hz` : "Quiet",
          tone: hz ? { hz, pattern: { period: 1, duty: 1, phase: 0 } } : null,
        };
        break;
      }
      case "relay": {
        // The module's input is active-low: a low pin energises the coil.
        const r = at("IN");
        const energised = r?.level === "low";
        mirror("IN", r?.level === "high" ? 1 : 0);
        live[node.id] = { on: energised, level: energised ? 1 : 0, readings: [{ label: "Contact", value: energised ? "COM–NO closed" : "COM–NC closed" }], badge: energised ? "Energised" : "Released" };
        break;
      }
      case "servo":
      case "servo-mg996r": {
        const r = at("SIG");
        const pulse = r && r.hz > 30 && r.hz < 400 ? r.pulseUs : null;
        const prev = base.nodes[node.id]?.angle ?? 90;
        const angle = pulse ? servoAngle(pulse) : prev;
        mirror("SIG", driven(r));
        live[node.id] = {
          on: pulse !== null,
          level: angle / 180,
          angle,
          readings: [{ label: "Angle", value: `${Math.round(angle)}°` }, { label: "Pulse", value: pulse ? `${Math.round(pulse)} µs every ${fmt(1000 / (r?.hz ?? 50), 1)} ms` : "No signal" }],
          badge: `${Math.round(angle)}°`,
        };
        break;
      }
      case "dc-motor": {
        const en = link("EN") ? driven(at("EN")) : 1;
        const in1 = at("IN1")?.level === "high";
        const in2 = at("IN2")?.level === "high";
        const duty = in1 !== in2 ? en : 0;
        const forward = in1 && !in2;
        for (const p of ["EN", "IN1", "IN2"]) mirror(p, driven(at(p)));
        const rpm = Math.round(duty * DC_MOTOR_MAX_RPM);
        live[node.id] = {
          on: duty > 0,
          level: duty,
          angle: ((((forward ? 1 : -1) * t * rpm * 6) % 360) + 360) % 360,
          readings: [{ label: "Speed", value: motorSpeedText(rpm) }, { label: "Direction", value: rpm ? (forward ? "Forward" : "Reverse") : "Stopped" }],
          badge: rpm ? motorSpeedBadge(rpm) : "Stopped",
        };
        break;
      }
      default: {
        const sim = getPart(node.partId)?.sim;
        // A sensor or control described in data answers the program on its pins (peripheralInputs), and a driver passes on what its inputs say.
        // They keep their own readings, as do the parts a program never talks to: batteries, converters and level shifters.
        if (sim && sim.kind !== "motor" && sim.kind !== "output" && sim.kind !== "expander") break;
        if (sim?.kind === "motor") {
          const turned = motorUnderProgram(node, nodes, analysis, t, base.nodes[node.id], program.boardId, reading);
          if (turned) {
            live[node.id] = turned;
            break;
          }
        }
        if (!getPinout(node.partId).controller && !isProgramSensor(node.partId) && !getPinout(node.partId).passive) {
          // Displays and radios talk over buses the emulator doesn't model yet: say so rather than show the built-in behavior.
          live[node.id] = { on: false, level: 0, readings: [{ label: "Program", value: "Not shown yet: the lab doesn't model this part's bus for your code" }], badge: "—" };
        }
      }
    }
  }

  return { ...base, t, running: base.running, nodes: live, pins, wires: wireFlows(nodes, wires, analysis, pins, base.running) };
}

/**
 * A bare motor on a driver, run by the program's pins. An H-bridge channel
 * turns it while IN1 and IN2 differ, at the duty of its PWM; a switch runs it
 * at its gate's duty; a stepper driver steps it once for each rising edge on
 * STEP. Null when the motor isn't on a driver the board controls.
 */
function motorUnderProgram(node: LabNode, nodes: LabNode[], analysis: Analysis, t: number, before: NodeLive | undefined, boardId: string, reading: (boardPin: string) => PinReading | undefined): NodeLive | null {
  const report = analysis.nodes[node.id];
  const driver = nodes.find((n) => n.id === report?.drivenBy);
  const sim = driver ? getPart(driver.partId)?.sim : undefined;
  if (!report || !driver || sim?.kind !== "driver") return null;
  const channel = sim.channels.find((c) => report.links.some((l) => c.inputs.includes(l.pin)));
  if (!channel) return null;
  // The driver's own pins the program's board is wired to: the channel's inputs, its enable, a standby pin.
  const link = (pin: string) => analysis.nodes[driver.id]?.links.find((l) => l.pin === pin && l.board === boardId);
  const at = (pin: string) => {
    const l = link(pin);
    return l ? reading(l.boardPin) : undefined;
  };
  const driven = (r: PinReading | undefined) => (r && (r.level === "high" || r.level === "low") ? r.duty : 0);
  const motor = getPart(node.partId)?.spec?.power.motor;
  // A standby pin the board controls must be high; one tied to a supply is.
  const awake = !sim.standby || !link(sim.standby) || at(sim.standby)?.level === "high";
  let rpm = 0;
  let forward = true;
  let duty = 0;
  if (channel.inputs[0] === "STEP") {
    // A stepper driver: 200 full steps a turn, the direction from DIR, and EN low (or left alone) to run.
    const enabled = !channel.enable || !link(channel.enable) || at(channel.enable)?.level !== "high";
    const hz = awake && enabled ? (at("STEP")?.hz ?? 0) : 0;
    rpm = Math.round((hz / 200) * 60);
    forward = at(channel.inputs[1])?.level !== "low";
    duty = hz > 0 ? 1 : 0;
  } else {
    const [a, b] = [driven(at(channel.inputs[0])), channel.inputs[1] ? driven(at(channel.inputs[1])) : 0];
    const enable = channel.enable && link(channel.enable) ? driven(at(channel.enable)) : 1;
    duty = awake ? Math.abs(a - b) * enable : 0;
    forward = a >= b;
    rpm = Math.round((motor?.rpm ?? 0) * duty);
  }
  const turn = (forward ? 1 : -1) * t * rpm * 6;
  return {
    on: duty > 0.02,
    level: duty,
    angle: rpm ? ((turn % 360) + 360) % 360 : (before?.angle ?? 0),
    readings: [
      ...(motor?.rpm || channel.inputs[0] === "STEP" ? [{ label: "Speed", value: motorSpeedText(rpm) }] : [{ label: "State", value: duty > 0.02 ? `Running${duty < 0.98 ? `, ${Math.round(duty * 100)} % (PWM)` : ""}` : "Stopped" }]),
      { label: "Direction", value: duty > 0.02 ? (forward ? "Forward" : "Reverse") : "Stopped" },
      { label: "Driven by", value: driver.label },
    ],
    badge: duty > 0.02 ? (rpm ? motorSpeedBadge(rpm) : "Running") : "Stopped",
  };
}

const PROGRAM_SENSORS = new Set(["hc-sr04", "dht11", "dht22", "am2302", "pir", "ldr", "soil-moisture", "mq2"]);
export const isProgramSensor = (partId: string) => PROGRAM_SENSORS.has(partId);

/**
 * What the sensors wired to the program's board read now, as the emulator's
 * part models take them. `unsupported` lists sensors on the board the
 * emulator can't answer for yet (I2C and 1-Wire parts).
 */
export function peripheralInputs(nodes: LabNode[], analysis: Analysis, inputs: Inputs, boardId: string, t: number, logicV = 5): { inputs: PeripheralInput[]; unsupported: LabNode[] } {
  const out: PeripheralInput[] = [];
  const unsupported: LabNode[] = [];
  const settings = boardSettings(boardId, inputs);
  for (const node of nodes) {
    const report = analysis.nodes[node.id];
    if (!report?.links.some((l) => l.board === boardId) || getPinout(node.partId).controller) continue;
    const pinOf = (pin: string) => {
      const l = report.links.find((x) => x.pin === pin && x.board === boardId);
      return l ? arduinoPinOf(l.boardPin) : null;
    };
    const described = getPart(node.partId)?.sim;
    const sensorLike = isProgramSensor(node.partId) || ["ds18b20", "mpu6050", "bmp280"].includes(node.partId) || described?.kind === "sensor";
    if (!sensorLike) continue;
    // A sensor without power gives the program nothing, as on a bench.
    if (!report.powered) continue;
    const sample = sampleSensor(node, t, inputs, settings);
    const v = sample.values;
    switch (node.partId) {
      case "hc-sr04": {
        const trig = pinOf("TRIG");
        const echo = pinOf("ECHO");
        if (trig !== null && echo !== null) out.push({ kind: "hc-sr04", id: node.id, trig, echo, distanceCm: v.distanceCm ?? 30 });
        break;
      }
      case "dht11":
      case "dht22":
      case "am2302": {
        const pin = pinOf("DATA");
        if (pin !== null) out.push({ kind: "dht", id: node.id, pin, model: node.partId === "dht11" ? 11 : 22, temperatureC: v.temperatureC ?? 22, humidity: v.humidity ?? 50 });
        break;
      }
      case "pir": {
        const pin = pinOf("OUT");
        if (pin !== null) out.push({ kind: "digital", id: node.id, pin, high: (v.motion ?? 0) > 0 });
        break;
      }
      case "ldr": {
        // The LDR and its 10 kΩ make a divider: brighter light, higher voltage.
        const pin = pinOf("L2");
        if (pin !== null && pin >= 14) out.push({ kind: "analog", id: node.id, pin, volts: ((v.light ?? 50) / 100) * logicV });
        break;
      }
      case "soil-moisture": {
        // Wetter soil, lower voltage on A0; D0 goes low past the module's threshold.
        const a = pinOf("A0");
        const d = pinOf("D0");
        const wet = (v.moisture ?? 45) / 100;
        if (a !== null && a >= 14) out.push({ kind: "analog", id: `${node.id}:A0`, pin: a, volts: (1 - wet) * logicV });
        if (d !== null) out.push({ kind: "digital", id: `${node.id}:D0`, pin: d, high: (v.moisture ?? 45) < settings.dryPct });
        break;
      }
      case "mq2": {
        const a = pinOf("A0");
        const d = pinOf("D0");
        const ppm = v.gasPpm ?? 300;
        if (a !== null && a >= 14) out.push({ kind: "analog", id: `${node.id}:A0`, pin: a, volts: Math.min(1, ppm / 1000) * logicV });
        if (d !== null) out.push({ kind: "digital", id: `${node.id}:D0`, pin: d, high: ppm <= settings.gasPpm });
        break;
      }
      default: {
        // A sensor or control described in data answers on its analog and digital pins. One that only talks over a bus can't yet.
        let answered = false;
        for (const l of report.links) {
          const level = l.board === boardId ? describedPinLevel(described, l.pin, v) : null;
          const pin = arduinoPinOf(l.boardPin);
          if (level === null || pin === null) continue;
          if (described?.kind === "sensor" && described.analog?.some((a) => a.pin === l.pin)) {
            if (pin < 14) continue;
            out.push({ kind: "analog", id: `${node.id}:${l.pin}`, pin, volts: level * Math.min(logicV, report.supplyV ?? logicV) });
          } else out.push({ kind: "digital", id: `${node.id}:${l.pin}`, pin, high: level > 0.5 });
          answered = true;
        }
        if (!answered) unsupported.push(node);
      }
    }
  }
  return { inputs: out, unsupported };
}
