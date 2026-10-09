/**
 * The lab's simulation: a pure function of the build and the time.
 *
 * Each board runs a default sketch ("blink and read"): it switches the
 * outputs wired to it in a recognisable pattern and reads every sensor wired
 * to it. Parts only respond when the analysis says they are powered and
 * connected, so a missing ground shows up as a dark LED, as it would on a
 * bench. Being pure, any moment can be sampled again, which is how the
 * Signals panel draws its traces.
 */

import type { Analysis } from "./circuit";
import { pinKey } from "./circuit";
import { getPinout } from "./pinout";
import type { LabNode, LabWire } from "./types";

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
}

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

const square = (t: number, period: number, duty = 0.5, phase = 0) => (((t + phase) % period) + period) % period < period * duty ? 1 : 0;
const fmt = (n: number, digits = 1) => n.toFixed(digits);

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

export function sensorReadings(partId: string, t: number): { readings: Reading[]; level: number; on: boolean; badge?: string } {
  switch (partId) {
    case "dht11":
    case "dht22":
    case "am2302": {
      const temp = 22 + 3 * Math.sin(t / 8);
      const hum = 55 + 8 * Math.cos(t / 12);
      return { readings: [{ label: "Temperature", value: `${fmt(temp)} °C` }, { label: "Humidity", value: `${fmt(hum, 0)} %` }], level: 0.5, on: true, badge: `${fmt(temp)} °C` };
    }
    case "ds18b20": {
      const temp = 24.5 + 1.5 * Math.sin(t / 10);
      return { readings: [{ label: "Temperature", value: `${fmt(temp, 2)} °C` }], level: 0.5, on: true, badge: `${fmt(temp)} °C` };
    }
    case "hc-sr04": {
      const d = 30 + 20 * Math.abs(Math.sin(t / 5));
      return { readings: [{ label: "Distance", value: `${fmt(d)} cm` }], level: square(t, 0.1, 0.3), on: true, badge: `${fmt(d, 0)} cm` };
    }
    case "pir": {
      const motion = square(t, 8, 0.375) === 1;
      return { readings: [{ label: "Motion", value: motion ? "Detected" : "None" }], level: motion ? 1 : 0, on: motion, badge: motion ? "Motion" : "Clear" };
    }
    case "ldr": {
      const light = 50 + 40 * Math.sin(t / 4);
      return { readings: [{ label: "Light", value: `${fmt(light, 0)} %` }], level: light / 100, on: true, badge: `${fmt(light, 0)} %` };
    }
    case "soil-moisture": {
      const m = 60 - ((t * 0.8) % 40);
      return { readings: [{ label: "Moisture", value: `${fmt(m, 0)} %` }, { label: "Threshold", value: m < 30 ? "Dry" : "Wet enough" }], level: m / 100, on: true, badge: `${fmt(m, 0)} %` };
    }
    case "mq2": {
      const ppm = 300 + 250 * Math.max(0, Math.sin(t / 6)) ** 3;
      return { readings: [{ label: "Gas", value: `${fmt(ppm, 0)} ppm` }, { label: "Alarm", value: ppm > 450 ? "Over threshold" : "Normal" }], level: ppm / 600, on: true, badge: `${fmt(ppm, 0)} ppm` };
    }
    case "mpu6050": {
      const pitch = 25 * Math.sin(t / 2);
      const roll = 15 * Math.cos(t / 3);
      return { readings: [{ label: "Pitch", value: `${fmt(pitch)}°` }, { label: "Roll", value: `${fmt(roll)}°` }, { label: "Accel Z", value: `${fmt(Math.cos((pitch * Math.PI) / 180), 2)} g` }], level: 0.5, on: true, badge: `${fmt(pitch, 0)}° tilt` };
    }
    case "bmp280": {
      const p = 1013.2 + 1.5 * Math.sin(t / 20);
      return { readings: [{ label: "Pressure", value: `${fmt(p)} hPa` }, { label: "Temperature", value: `${fmt(23.1 + 0.4 * Math.sin(t / 9))} °C` }, { label: "Altitude", value: `${fmt(44330 * (1 - (p / 1013.25) ** 0.1903), 1)} m` }], level: 0.5, on: true, badge: `${fmt(p, 0)} hPa` };
    }
    default:
      return { readings: [], level: 0, on: false };
  }
}

const SENSORS = new Set(["dht11", "dht22", "am2302", "ds18b20", "hc-sr04", "pir", "ldr", "soil-moisture", "mq2", "mpu6050", "bmp280"]);
const DISPLAYS = new Set(["lcd-16x2", "oled-ssd1306", "tft-display"]);
const RADIOS = new Set(["hc-05", "wifi-module", "nrf24l01", "lora"]);

export function isSensor(partId: string) {
  return SENSORS.has(partId);
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

export function frameAt(nodes: LabNode[], wires: LabWire[], analysis: Analysis, t: number, running: boolean): Frame {
  const live: Record<string, NodeLive> = {};
  const pins: Record<string, number> = {};
  const order = outputOrder(nodes, analysis);
  const firstReading: string[] = [];

  // Sensors first, so displays can show what they read.
  for (const node of nodes) {
    if (!SENSORS.has(node.partId)) continue;
    const report = analysis.nodes[node.id];
    const ready = runnable(report);
    if (!ready || !running) {
      live[node.id] = { on: false, level: 0, readings: [], badge: ready ? "Ready" : undefined };
      continue;
    }
    const r = sensorReadings(node.partId, t);
    live[node.id] = { on: r.on, level: r.level, readings: r.readings, badge: r.badge };
    if (r.readings[0]) firstReading.push(`${node.label.split(" ")[0]} ${r.readings[0].value}`);
    for (const link of report!.links) {
      const value = link.role === "out-analog" ? r.level : link.role === "out-digital" ? (node.partId === "soil-moisture" || node.partId === "mq2" ? (r.level < 0.3 ? 0 : 1) : r.level) : square(t, 2, 0.08);
      pins[`${node.id}:${link.pin}`] = value;
      pins[`${link.board}:${link.boardPin}`] = value;
    }
  }

  for (const node of nodes) {
    if (live[node.id]) continue;
    const report = analysis.nodes[node.id];
    const pinout = getPinout(node.partId);
    if (pinout.controller) {
      const powered = report?.powered ?? true;
      const ledPin = pinout.pins.find((p) => p.fns?.includes("led"));
      const ledUsed = ledPin && report?.wiredPins.has(ledPin.id);
      const blink = running && powered && !ledUsed ? square(t, 1) : 0;
      if (ledPin && !ledUsed) pins[`${node.id}:${ledPin.id}`] = blink;
      live[node.id] = {
        on: powered,
        level: blink,
        readings: [
          { label: "Power", value: powered ? `USB, ${pinout.logic} V logic` : "Off" },
          ...(running ? [{ label: "Sketch", value: "Blink and read" }, { label: "Uptime", value: `${fmt(t)} s` }] : [{ label: "Sketch", value: "Stopped" }]),
        ],
        badge: !powered ? "Off" : running ? (ledUsed ? "Running" : blink ? "L on" : "L off") : "Idle",
      };
      continue;
    }

    const ready = runnable(report);
    const k = order.get(node.id) ?? 0;
    const go = running && ready;
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
        const level = go ? (onRail ? 1 : square(t, 1, 0.5, k * 0.25)) : !running && onRail && ready ? 1 : 0;
        setLinks(() => level);
        live[node.id] = { on: level > 0, level, readings: [{ label: "State", value: level ? "On" : "Off" }], badge: level ? "ON" : "OFF" };
        break;
      }
      case "buzzer": {
        const level = go ? square(t, 1, 0.15, k * 0.2) : 0;
        setLinks(() => level);
        live[node.id] = { on: level > 0, level, readings: [{ label: "Tone", value: level ? "2.3 kHz beep" : "Silent" }], badge: level ? "BEEP" : "Quiet" };
        break;
      }
      case "relay": {
        const level = go ? square(t, 4, 0.5, k) : 0;
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
        live[node.id] = { on: level > 0.05, level, rgb, readings: [{ label: "Colour", value: `R ${Math.round(rgb[0] * 255)} G ${Math.round(rgb[1] * 255)} B ${Math.round(rgb[2] * 255)}` }], badge: go ? "Fading" : "Off" };
        break;
      }
      case "servo": {
        const angle = go ? 90 + 75 * Math.sin(t * 1.2 + k) : 90;
        setLinks((role) => (role === "pwm" ? (go ? 0.05 + (angle / 180) * 0.05 + 0.4 : 0) : 0));
        live[node.id] = { on: go, level: angle / 180, angle, readings: [{ label: "Angle", value: `${Math.round(angle)}°` }], badge: `${Math.round(angle)}°` };
        break;
      }
      case "dc-motor": {
        const hasEn = report?.links.some((l) => l.pin === "EN");
        const duty = go ? (hasEn ? 0.35 + 0.65 * Math.abs(Math.sin(t / 2.5)) : 1) : 0;
        const forward = square(t, 8) === 1;
        setLinks((_, pin) => (pin === "EN" ? duty : pin === "IN1" ? (go && forward ? 1 : 0) : pin === "IN2" ? (go && !forward ? 1 : 0) : 0));
        const rpm = Math.round(duty * 140);
        live[node.id] = { on: duty > 0, level: duty, angle: (t * rpm * 6) % 360, readings: [{ label: "Speed", value: `${rpm} rpm` }, { label: "Direction", value: forward ? "Forward" : "Reverse" }], badge: go ? `${rpm} rpm` : "Stopped" };
        break;
      }
      case "stepper-motor": {
        const step = go ? Math.floor(t * 8) : 0;
        setLinks((_, pin) => (go && pin === `IN${(step % 4) + 1}` ? 1 : 0));
        const angle = go ? (t * 22.5) % 360 : 0;
        live[node.id] = { on: go, level: go ? 1 : 0, angle, readings: [{ label: "Position", value: `${Math.round(angle)}°` }, { label: "Steps", value: String(step * 64) }], badge: `${Math.round(angle)}°` };
        break;
      }
      default: {
        if (DISPLAYS.has(node.partId)) {
          const lines = go ? (firstReading.length ? firstReading.slice(0, 2) : ["Hello, Kiungo!", `Up ${fmt(t, 0)} s`]) : [];
          setLinks(() => (go ? 0.5 : 0));
          live[node.id] = { on: go, level: go ? 1 : 0, text: lines, readings: go ? [{ label: "Showing", value: lines.join(" · ") }] : [], badge: go ? "Showing" : "Blank" };
        } else if (RADIOS.has(node.partId)) {
          const up = go && t > 2.5;
          const status =
            node.partId === "hc-05" ? (up ? "Paired" : "Discoverable") : node.partId === "wifi-module" ? (up ? "Connected, 192.168.4.2" : "Joining…") : node.partId === "nrf24l01" ? `${Math.floor(t * 4)} packets sent` : `${Math.floor(t / 2)} packets, RSSI −87 dBm`;
          setLinks(() => (go ? square(t, 0.5, 0.3) : 0));
          live[node.id] = { on: go, level: go ? (up ? 1 : square(t, 0.3)) : 0, readings: go ? [{ label: "Status", value: status }] : [], badge: go ? (up ? "Linked" : "Pairing") : "Idle" };
        } else {
          live[node.id] = { on: go, level: go ? 1 : 0, readings: [], badge: go ? "Running" : undefined };
        }
      }
    }
  }

  // Wires: how much current or data each carries right now.
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

  return { t, running, nodes: live, pins, wires: wireLive };
}

/** One line of serial output a board would print each second. */
export function serialLine(nodes: LabNode[], frame: Frame): string | null {
  const parts: string[] = [];
  for (const node of nodes) {
    const l = frame.nodes[node.id];
    if (!l || !l.readings.length || getPinout(node.partId).controller) continue;
    if (SENSORS.has(node.partId)) parts.push(`${node.label}: ${l.readings.map((r) => r.value).join(", ")}`);
  }
  for (const node of nodes) {
    const l = frame.nodes[node.id];
    if (!l || SENSORS.has(node.partId) || getPinout(node.partId).controller || !l.badge) continue;
    parts.push(`${node.label}: ${l.badge}`);
  }
  if (!parts.length) return null;
  return `[${frame.t.toFixed(1)}s] ${parts.join(" | ")}`;
}
