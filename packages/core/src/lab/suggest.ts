/**
 * Part suggestions for the lab's search box.
 *
 * With no query, suggestions come from three places: what the build is
 * missing (a board, a way to show readings), what the linked project is
 * about (its name, description, objectives and hardware list), and what goes
 * well with the parts already on the canvas. With a query, results are the
 * catalog search, ranked the same way, with a note on whether each part
 * fits the board in use. Typos fall back to the closest names.
 */

import { getPart, PARTS, searchParts, type PartModel } from "../parts";
import { breadboardSpec } from "../parts/models/breadboard";
import { getPinout } from "./pinout";
import type { LabNode } from "./types";

export interface Suggestion {
  part: PartModel;
  reason: string;
  /** How it fits the board on the canvas. */
  fit?: { tone: "ok" | "warn"; text: string };
  source: "missing" | "project" | "pairs" | "search" | "popular" | "fuzzy";
}

export interface ProjectContext {
  name?: string;
  description?: string;
  objectives?: string;
  hardware?: string[];
  category?: string;
}

/** Words in a project brief and the parts they point to. */
const INTENTS: Array<{ words: RegExp; parts: string[]; why: string }> = [
  { words: /\b(temp(erature)?|climate|weather|humid(ity)?|greenhouse|thermo)/i, parts: ["dht22", "dht11", "bmp280", "ds18b20"], why: "Reads temperature and humidity" },
  { words: /\b(distance|obstacle|rover|robot|avoid|parking|range|sonar|level)/i, parts: ["hc-sr04"], why: "Measures distance to obstacles" },
  { words: /\b(motion|presence|intruder|security|alarm|burglar|occupancy)/i, parts: ["pir", "buzzer"], why: "Detects people moving" },
  { words: /\b(motor|wheel|drive|rover|car|robot|vehicle|conveyor)/i, parts: ["dc-motor", "micro-gear-motor", "stepper-motor"], why: "Moves your build" },
  { words: /\b(line[- ]?follow\w*|follow a line|track the line|black line|line sensor)/i, parts: ["line-sensor", "line-array"], why: "Sees the line on the floor" },
  { words: /\b(battery|batteries|portable|untethered|cordless|runs on its own|mobile)/i, parts: ["battery-18650", "battery-4aa", "lipo-2s", "lipo-3s", "battery-9v"], why: "Runs it away from the USB lead" },
  { words: /\b(button|press|push|start switch|doorbell)/i, parts: ["push-button"], why: "Lets a person start or stop it" },
  { words: /\b(knob|dial|volume|adjust|dimmer|tune)/i, parts: ["potentiometer", "rotary-encoder"], why: "Sets a value by hand" },
  { words: /\b(joystick|gamepad|controller|steer by hand)/i, parts: ["joystick"], why: "Steers it by hand" },
  { words: /\b(remote control|ir remote|tv remote|infrared remote)/i, parts: ["ir-receiver"], why: "Takes commands from a remote" },
  { words: /\b(keypad|pin code|passcode|password|combination)/i, parts: ["keypad"], why: "Takes a code typed in" },
  { words: /\b(rfid|card|tag|badge|access control|attendance)/i, parts: ["rc522"], why: "Reads a card or key fob" },
  { words: /\b(colou?r sort\w*|sort by colou?r|detect colou?r|colou?r sensor|colou?r of)/i, parts: ["tcs34725"], why: "Tells one color from another" },
  { words: /\b(compass|heading|north|bearing|navigat\w*)/i, parts: ["bno055", "gy-271"], why: "Knows which way it faces" },
  { words: /\b(speed|odomet\w*|encoder|rpm|how far|straight line)/i, parts: ["wheel-encoder"], why: "Counts wheel turns" },
  { words: /\b(neopixel|pixels?|ws2812|rainbow|led strip|led ring)/i, parts: ["neopixel-ring", "neopixel-stick"], why: "Many colors from one pin" },
  { words: /\b(clock|timer|countdown|score|counter|stopwatch)/i, parts: ["tm1637"], why: "Shows a number from across the room" },
  { words: /\b(cnc|plotter|3d printer|exact position|linear rail|slider)/i, parts: ["nema17", "a4988"], why: "Moves to an exact position" },
  { words: /\b(hexapod|walker|humanoid|robot arm|many servos|animatronic)/i, parts: ["pca9685"], why: "Runs up to 16 servos from two pins" },
  { words: /\b(current|consumption|power use|battery level|energy)/i, parts: ["ina219"], why: "Measures what the build really draws" },
  { words: /\b(arm|gripper|claw|pan|tilt|door|lock|steer)/i, parts: ["servo"], why: "Turns to an exact angle" },
  { words: /\b(plant|soil|garden|irrigat|farm|crop|water)/i, parts: ["soil-moisture", "relay"], why: "Knows when the soil is dry" },
  { words: /\b(gas|smoke|fire|lpg|air quality|kitchen)/i, parts: ["mq2", "buzzer"], why: "Smells smoke and gas" },
  { words: /\b(light|dark|night|sun|lamp|brightness)/i, parts: ["ldr", "led", "relay"], why: "Senses or switches light" },
  { words: /\b(balance|drone|imu|tilt|orientation|gesture|self-balancing|accel)/i, parts: ["mpu6050"], why: "Measures tilt and motion" },
  { words: /\b(pressure|altitude|altimeter|barometer|weather station)/i, parts: ["bmp280"], why: "Reads air pressure and altitude" },
  { words: /\b(display|screen|show|dashboard|readout|monitor)/i, parts: ["oled-ssd1306", "lcd-16x2", "tft-display"], why: "Shows readings on the device" },
  { words: /\b(bluetooth|phone|app|wireless|remote)/i, parts: ["hc-05", "nrf24l01"], why: "Talks to a phone or another board" },
  { words: /\b(wi-?fi|internet|iot|cloud|online|mqtt|web)/i, parts: ["esp32", "wifi-module", "esp8266"], why: "Gets your project online" },
  { words: /\b(long range|lora|field|remote sensor|telemetry|farm)/i, parts: ["lora"], why: "Sends data kilometres away" },
  { words: /\b(mains|pump|heater|fan|appliance|switch|load)/i, parts: ["relay"], why: "Switches a bigger load safely" },
  { words: /\b(sound|beep|alert|buzz|notify|siren)/i, parts: ["buzzer"], why: "Makes an audible alert" },
  { words: /\b(colou?r|rgb|mood|status light|indicator)/i, parts: ["rgb-led", "led"], why: "Shows status in color" },
  { words: /\b(camera|vision|linux|python|ai|machine learning|server)/i, parts: ["raspberry-pi-4"], why: "Runs Linux, Python and a camera" },
  { words: /\b(breadboard|prototyp\w*|solderless|power rail)/i, parts: ["breadboard"], why: "Shares the board's 5 V and GND with every part" },
  { words: /\b(classroom|beginner|school|learn|first)/i, parts: ["arduino-uno", "microbit", "led"], why: "Easy first steps" },
];

const PAIRS: Record<string, Array<{ part: string; why: string }>> = {
  "dht11": [{ part: "oled-ssd1306", why: "Show the temperature without a computer" }],
  "dht22": [{ part: "oled-ssd1306", why: "Show the temperature without a computer" }],
  "bmp280": [{ part: "oled-ssd1306", why: "Show pressure and altitude on the device" }],
  "hc-sr04": [{ part: "buzzer", why: "Beep faster as things get closer" }, { part: "servo", why: "Sweep the sensor for a radar" }],
  "pir": [{ part: "buzzer", why: "Sound an alarm on motion" }, { part: "relay", why: "Switch a light when someone walks in" }],
  "soil-moisture": [{ part: "relay", why: "Run a pump when the soil is dry" }],
  "mq2": [{ part: "buzzer", why: "Alarm when gas passes the threshold" }],
  "ldr": [{ part: "led", why: "Turn on a light when it gets dark" }],
  "dc-motor": [{ part: "hc-sr04", why: "Stop before hitting something" }],
  "micro-gear-motor": [{ part: "line-sensor", why: "Follow a line on the floor" }, { part: "hc-sr04", why: "Stop before hitting something" }],
  "line-sensor": [{ part: "micro-gear-motor", why: "Steer along the line" }],
  "a4988": [{ part: "nema17", why: "The stepper it is made for" }, { part: "limit-switch", why: "Find the end of travel" }],
  "nema17": [{ part: "limit-switch", why: "Find the end of travel" }],
  "pca9685": [{ part: "servo", why: "Up to 16 of them" }],
  "water-pump": [{ part: "soil-moisture", why: "Water only when the soil is dry" }],
  "push-button": [{ part: "led", why: "Light it when the button is pressed" }],
  "potentiometer": [{ part: "servo", why: "Turn the knob, turn the arm" }],
  "joystick": [{ part: "servo", why: "Point something with it" }],
  "rc522": [{ part: "servo", why: "Open a latch for the right card" }],
  "keypad": [{ part: "servo", why: "Open a latch for the right code" }],
  "lipo-2s": [{ part: "buck-converter", why: "A steady 5 V for the board and servos" }],
  "lipo-3s": [{ part: "buck-converter", why: "A steady 5 V for the board and servos" }],
  "battery-18650": [{ part: "buck-converter", why: "A steady 5 V for the board and servos" }],
  "mpu6050": [{ part: "servo", why: "Keep a platform level" }],
  "led": [{ part: "ldr", why: "Make it react to the room's light" }],
  "relay": [{ part: "pir", why: "Trigger it on motion" }],
  "servo": [{ part: "hc-sr04", why: "Point a distance sensor" }],
  "esp32": [{ part: "dht22", why: "A classic first IoT reading" }],
  "raspberry-pi-4": [{ part: "arduino-uno", why: "Let an Uno handle real-time pins over serial" }],
};

/** The driver a bare motor is usually run from, the battery a driver usually needs, and the motor a driver usually turns. */
const DRIVER_FOR: Record<string, string> = { "nema17": "a4988", "water-pump": "mosfet-module" };
const BATTERY_FOR: Record<string, string> = { "a4988": "lipo-3s", "mosfet-module": "battery-4aa" };
const MOTOR_FOR: Record<string, string> = { "a4988": "nema17", "mosfet-module": "water-pump" };

const POPULAR = ["arduino-uno", "esp32", "led", "dht11", "hc-sr04", "servo", "pir", "oled-ssd1306", "relay", "buzzer"];

function boardsOn(nodes: LabNode[]) {
  return nodes.filter((n) => getPinout(n.partId).controller);
}

const fitsRange = (volts: number, range?: [number, number]) => !!range && volts >= range[0] - 0.2 && volts <= range[1] + 0.25;

/**
 * A battery, a converter and a bare motor don't go on a board pin, so what
 * they suit is the driver, converter or battery already in the build.
 */
function powerFit(part: PartModel, nodes: LabNode[]): Suggestion["fit"] | null {
  const sim = part.sim;
  const others = nodes.map((node) => ({ node, part: getPart(node.partId), pinout: getPinout(node.partId) }));
  if (sim?.kind === "source") {
    const volts = part.spec?.power.source?.volts ?? 0;
    // A driver's motor supply or a converter's input that takes this voltage.
    const taker = others.find(({ part: other, pinout }) => {
      const id = other?.sim?.kind === "driver" ? other.sim.supply : other?.sim?.kind === "converter" ? other.sim.input[0] : null;
      const pin = id ? pinout.pins.find((p) => p.id === id) : undefined;
      return !!pin && fitsRange(volts, pin.accepts ?? pinout.supply);
    });
    if (taker) return { tone: "ok", text: `Powers your ${taker.node.label}` };
    const waiting = others.find(({ part: other }) => other?.sim?.kind === "driver" || other?.sim?.kind === "converter");
    if (waiting) return { tone: "warn", text: `${volts} V is outside what your ${waiting.node.label} takes` };
    for (const { node, pinout } of others) {
      const input = pinout.controller ? pinout.pins.find((p) => p.accepts && fitsRange(volts, p.accepts)) : undefined;
      if (input) return { tone: "ok", text: `Can run ${getPart(node.partId)?.name.split(" ")[0] ?? "the board"} from its ${input.label} pin` };
    }
    return { tone: "ok", text: `${volts} V for a motor driver or a converter` };
  }
  if (sim?.kind === "converter") {
    const pinout = getPinout(part.id);
    const range = pinout.pins.find((p) => p.id === sim.input[0])?.accepts ?? pinout.supply;
    const battery = others.find(({ part: other }) => other?.sim?.kind === "source" && fitsRange(other.spec?.power.source?.volts ?? 0, range));
    return battery ? { tone: "ok", text: `Feeds from your ${battery.node.label}` } : { tone: "warn", text: "Add a battery to feed it" };
  }
  if (sim?.kind === "motor") {
    const driver = others.find(({ part: other }) => other?.sim?.kind === "driver");
    return driver ? { tone: "ok", text: `Goes on your ${driver.node.label}` } : { tone: "warn", text: "Needs a motor driver, not a board pin" };
  }
  return null;
}

/** Does this part suit the first board on the canvas? */
export function fitFor(partId: string, nodes: LabNode[]): Suggestion["fit"] {
  const board = boardsOn(nodes)[0];
  const pinout = getPinout(partId);
  if (partId === "resistor") return { tone: "ok", text: "Goes in series with an LED: 220 Ω at 5 V" };
  const part = getPart(partId);
  const power = part ? powerFit(part, nodes) : null;
  if (power) return power;
  // A capacitor, a diode and a transistor sit between two other pins; the lab draws them but does not run them yet.
  if (pinout.passive && !breadboardSpec(partId)) return { tone: "ok", text: "Goes between two pins. Not simulated yet" };
  if (pinout.passive) {
    if (!board) return { tone: "ok", text: "Shares one 5 V pin with every part" };
    const boardName = getPart(board.partId)?.name.split(" ")[0] ?? "the board";
    return { tone: "ok", text: `Shares the ${boardName} ${getPinout(board.partId).logic} V and GND with every part` };
  }
  if (!board) return pinout.controller ? undefined : { tone: "warn", text: "Add a board to drive it" };
  if (pinout.controller) return { tone: "ok", text: "A second board: link them over serial or I²C" };
  const bp = getPinout(board.partId);
  const name = getPart(board.partId)?.name.split(" ")[0] ?? "board";
  const [min, max] = pinout.supply ?? [3, 5.5];
  const rails = bp.pins.filter((p) => p.supplies).map((p) => p.supplies!);
  if (!rails.some((v) => v >= min - 0.2 && v <= max + 0.25)) return { tone: "warn", text: `Needs ${min}–${max} V; ${name} can't supply it` };
  // A 5 V part that can't run at the board's 3.3 V drives 5 V signals into it.
  const mustRunAt5 = min > bp.logic + 0.2;
  if (pinout.logic >= 5 && mustRunAt5 && bp.tolerates5V !== true && pinout.pins.some((p) => p.role === "out-digital" || p.role === "io" || p.role === "tx" || p.role === "sda" || p.role === "out-analog")) return { tone: "warn", text: `5 V signals: needs a divider on ${name}` };
  if (bp.logic >= 5 && pinout.tolerates5V === false) return { tone: "warn", text: `3.3 V part: run it from ${name}'s 3.3V pin` };
  if (pinout.pins.some((p) => p.role === "out-analog" && p.required) && !bp.pins.some((p) => p.fns?.includes("analog"))) return { tone: "warn", text: `${name} has no analog inputs` };
  return { tone: "ok", text: `Works with ${name} (${bp.logic} V)` };
}

function projectText(project?: ProjectContext | null) {
  if (!project) return "";
  return [project.name, project.description, project.objectives, ...(project.hardware ?? []), project.category].filter(Boolean).join(" ");
}

/** Edit distance, for "did you mean". */
function distance(a: string, b: string) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

function fuzzy(query: string): PartModel[] {
  const q = query.trim().toLowerCase();
  if (q.length < 3) return [];
  const scored = PARTS.map((part) => {
    const words = [part.name, part.id, ...(part.aka ?? []), ...part.tags].flatMap((w) => w.toLowerCase().split(/[\s,/()-]+/)).filter((w) => w.length >= 3);
    const best = Math.min(...words.map((w) => distance(q, w.slice(0, Math.max(q.length, Math.min(w.length, q.length + 2))))));
    return { part, best };
  });
  const limit = q.length <= 4 ? 1 : 2;
  return scored.filter((s) => s.best <= limit).sort((a, b) => a.best - b.best).map((s) => s.part).slice(0, 5);
}

export function suggest(query: string, nodes: LabNode[], project?: ProjectContext | null, limit = 8): { items: Suggestion[]; didYouMean: boolean } {
  const q = query.trim();
  const onCanvas = new Set(nodes.map((n) => n.partId));
  const hasBoard = boardsOn(nodes).length > 0;
  const add = (list: Suggestion[], partId: string, reason: string, source: Suggestion["source"]) => {
    const part = getPart(partId);
    if (!part || list.some((s) => s.part.id === partId)) return;
    list.push({ part, reason, source, fit: fitFor(partId, nodes) });
  };

  if (q) {
    const found = searchParts(q);
    if (found.length) {
      const items = found.map<Suggestion>((part) => ({ part, reason: part.summary.split(". ")[0], source: "search", fit: fitFor(part.id, nodes) }));
      // Parts that fit the board first, keeping search order otherwise.
      items.sort((a, b) => (a.fit?.tone === "warn" ? 1 : 0) - (b.fit?.tone === "warn" ? 1 : 0));
      return { items: items.slice(0, limit), didYouMean: false };
    }
    return { items: fuzzy(q).map((part) => ({ part, reason: part.summary.split(". ")[0], source: "fuzzy" as const, fit: fitFor(part.id, nodes) })), didYouMean: true };
  }

  const list: Suggestion[] = [];
  const text = projectText(project);

  if (!hasBoard) {
    const wantsWifi = /\b(wi-?fi|iot|internet|cloud|online|mqtt|web)/i.test(text);
    const wantsLinux = /\b(camera|vision|linux|python|ai|server)/i.test(text);
    if (wantsWifi) add(list, "esp32", "Start with a board: Wi-Fi for your IoT project", "missing");
    if (wantsLinux) add(list, "raspberry-pi-4", "Start with a board: Linux and Python for your project", "missing");
    add(list, "arduino-uno", "Start with a board: everything else connects to it", "missing");
    add(list, "esp32", "Start with a board: Wi-Fi and Bluetooth built in", "missing");
  }

  // A bare motor runs from a driver, and a driver's motors from a battery.
  const simOf = (node: LabNode) => getPart(node.partId)?.sim;
  const motor = nodes.find((n) => simOf(n)?.kind === "motor");
  const driver = nodes.find((n) => simOf(n)?.kind === "driver");
  const battery = nodes.find((n) => simOf(n)?.kind === "source");
  if (motor && !driver) add(list, DRIVER_FOR[motor.partId] ?? "tb6612fng", `Your ${motor.label} needs a driver between it and the board`, "missing");
  if (driver && !battery) add(list, BATTERY_FOR[driver.partId] ?? "battery-18650", `The motors on your ${driver.label} need their own supply`, "missing");
  if (driver && !motor) add(list, MOTOR_FOR[driver.partId] ?? "micro-gear-motor", `Something for your ${driver.label} to turn`, "pairs");

  // The project's own hardware list comes first: it's what the person said they need.
  for (const item of project?.hardware ?? []) {
    const match = searchParts(item)[0];
    if (match && !onCanvas.has(match.id) && !(getPinout(match.id).controller && hasBoard)) add(list, match.id, `On your project's hardware list (“${item}”)`, "project");
  }

  // Then what the brief talks about, most-mentioned first. One part per need:
  // once the canvas has a temperature sensor, don't offer three more.
  const scored = INTENTS.map((intent) => ({ intent, hits: text ? (text.match(new RegExp(intent.words.source, "gi")) ?? []).length : 0 }))
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits);
  for (const { intent } of scored) {
    if (intent.parts.some((id) => onCanvas.has(id))) continue;
    const pick = intent.parts.find((id) => !(getPinout(id).controller && hasBoard));
    if (pick) add(list, pick, `${intent.why}, for “${project?.name ?? "your project"}”`, "project");
  }

  // Several parts each wanting 5 V and GND: the board has one 5 V pin, a breadboard rail has 25 holes.
  const powered = nodes.filter((n) => getPinout(n.partId).pins.some((p) => p.role === "vcc")).length;
  if (hasBoard && powered >= 2 && ![...onCanvas].some((id) => id.startsWith("breadboard"))) add(list, "breadboard", `${powered} parts need 5 V and GND: feed them from a power rail`, "missing");

  for (const node of nodes) {
    for (const pair of PAIRS[node.partId] ?? []) if (!onCanvas.has(pair.part)) add(list, pair.part, `${pair.why} with your ${node.label}`, "pairs");
  }

  const hasSensor = nodes.some((n) => getPart(n.partId)?.group === "sensors");
  const hasDisplay = nodes.some((n) => getPart(n.partId)?.group === "displays");
  if (hasSensor && !hasDisplay) add(list, "oled-ssd1306", "Show your readings on the device", "pairs");
  if (hasBoard && nodes.length === 1) add(list, "led", "The first experiment: make it blink", "pairs");

  // Popular parts, minus ones whose job something on the canvas already does.
  const covered = (id: string) => INTENTS.some((intent) => intent.parts.includes(id) && intent.parts.some((p) => p !== id && (onCanvas.has(p) || list.some((s) => s.part.id === p))));
  for (const id of POPULAR) {
    if (onCanvas.has(id) || (getPinout(id).controller && hasBoard) || covered(id)) continue;
    add(list, id, "Popular in Kiungo builds", "popular");
  }
  return { items: list.slice(0, limit), didYouMean: false };
}
