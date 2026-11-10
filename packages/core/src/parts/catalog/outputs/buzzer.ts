import { MATERIAL, definePart, gnd, pin, silk } from "../../sdk";

const CX = 6;
const CY = 6;
const H = 9.5;
// The legs are 7.6 mm apart; the + leg is the left one, under the + mark, and a little longer.
const P = { x: 2.2, y: 6 };
const N = { x: 9.8, y: 6 };

export default definePart({
  id: "buzzer",
  name: "Buzzer, 12 mm active",
  aka: ["piezo buzzer", "beeper", "active buzzer", "TMB12A05"],
  group: "outputs",
  rank: 3,
  summary: "A black can that beeps the moment you give it voltage. Alarms, confirmations, the sound of a project waking up.",
  size: { w: 12, h: 12, d: 9.5 },
  solids: [
    // The case: a black plastic cylinder, 12 mm across and 9.5 mm tall.
    { kind: "cyl", id: "buzzer", cx: CX, cy: CY, r: 6, d: H, z: 0, top: MATERIAL.plasticBlack, side: "#111214", segments: 32, finish: "plastic" },
    // A shallow step round the top face, and the sound hole in the middle.
    { kind: "disc", cx: CX, cy: CY, r: 5.2, color: "#2d2e32", z: H + 0.01, ring: { color: "#1a1b1e", width: 0.35 } },
    { kind: "disc", cx: CX, cy: CY, r: 1.1, color: "#000000", z: H + 0.02, ring: { color: "#3a3b40", width: 0.3 } },
    silk(3.4, 3.7, "+", 2, "#eef0f2", { anchor: "middle", z: H + 0.02, weight: 700 }),
    silk(CX, 10.1, "5V", 0.9, "#9aa0a7", { anchor: "middle", z: H + 0.02 }),
    // The two legs run straight down out of the base.
    { kind: "wire", points: [[P.x, P.y, -7.5], [P.x, P.y, 0.5]], r: 0.3, color: MATERIAL.tin, finish: "tin" },
    { kind: "wire", points: [[N.x, N.y, -6], [N.x, N.y, 0.5]], r: 0.3, color: MATERIAL.tin, finish: "tin" },
  ],
  features: [
    { id: "hole", label: "Sound hole", kind: "other", x: 4.9, y: 4.9, w: 2.2, h: 2.2, note: "Sound leaves here. New ones often ship with a sticker over it: peel it off or the beep is muffled." },
    { id: "plus", label: "+ mark", kind: "pin", x: 2.4, y: 2.4, w: 2.2, h: 2.2, note: "The positive leg is on this side, under this mark (and is the longer one)." },
    { id: "body", label: "Case", kind: "other", x: 0, y: 0, w: 12, h: 12, note: "An active buzzer has its own oscillator inside: give it DC and it sounds at one fixed pitch. A passive buzzer needs a tone signal instead." },
    { id: "legs", label: "Two legs, 7.6 mm apart", kind: "pins", x: 1.2, y: 5, w: 9.2, h: 2, note: "+ to a pin (or to 5 V through a transistor), − to GND." },
  ],
  pins: [
    pin("P", "digital", "drive", "+, the longer leg under the + mark. 3.5 to 5.5 V; most draw under 30 mA, fine straight from a pin.", { label: "+" }),
    gnd("N", "GND.", { label: "−" }),
  ],
  pinAt: { P, N },
  circuit: {
    blocks: [
      { id: "pin", label: "Board pin", sub: "HIGH = on", kind: "pin", col: 0, row: 0, at: "P", note: "Digital HIGH starts it; LOW stops it." },
      { id: "osc", label: "Oscillator", sub: "~2.3 kHz, built in", kind: "ic", col: 1, row: 0, at: { x: 6, y: 6 }, note: "A small transistor circuit that makes the tone on its own." },
      { id: "coil", label: "Coil + disc", sub: "electromagnetic", kind: "actuator", col: 2, row: 0, at: "body", note: "The oscillator drives a coil that snaps a thin metal disc back and forth." },
      { id: "sound", label: "Sound", sub: "~85 dB at 10 cm", kind: "world", col: 3, row: 0, at: "hole", note: "Loud enough to notice from the next room." },
      { id: "gnd", label: "GND", kind: "ground", col: 1, row: 1, at: "N", note: "Ground." },
    ],
    links: [
      { from: "pin", to: "osc", kind: "power", label: "+" },
      { from: "osc", to: "coil", kind: "signal" },
      { from: "coil", to: "sound", kind: "sound" },
      { from: "coil", to: "gnd", kind: "ground" },
    ],
    steps: [
      "Take + high: the built-in oscillator starts straight away.",
      "It drives a coil that snaps a metal disc back and forth about 2300 times a second.",
      "The disc pushes air through the hole: a steady beep. Pulse the pin for beeps and patterns.",
      "A passive buzzer (no oscillator) needs tone() instead, but it can play any note, so melodies.",
    ],
  },
  facts: [
    { label: "Type", value: "Active (oscillator inside)" },
    { label: "Tone", value: "~2.3 kHz" },
    { label: "Supply", value: "3.5–5.5 V" },
    { label: "Current", value: "~30 mA" },
    { label: "Loudness", value: "~85 dB at 10 cm" },
    { label: "Size", value: "Ø12 × 9.5 mm" },
  ],
  lab: { logic: 5, supply: [3.5, 5.5], tolerates5V: true },
  spec: {
    form: {
      mass: 0.8,
      mount: "breadboard",
      pitch: 7.6,
      note: "Two straight legs 7.6 mm apart, about 6 mm long under the case. They go into a breadboard or a PCB. Some makers use 6.5 mm.",
    },
    power: {
      supply: { min: 3.5, max: 5.5, typ: 5 },
      logic: 5,
      tolerant5V: true,
      draw: { idle: 0, active: 30, peak: 30 },
      interface: "DC on or off; about 2300 Hz at one fixed pitch",
      note: "Rated 30 mA at 5 V. At 3.3 V it still sounds, but quieter. Coil resistance is about 40 to 50 Ω.",
    },
    sourcing: { mpn: "TMB12A05", maker: "Jiangsu Huaneng (generic)", lifecycle: "generic", usd: [0.2, 1] },
    limits: [
      "One fixed pitch near 2.3 kHz (give or take 300 Hz): it cannot play a melody.",
      "The coil is inductive: when you switch it with a transistor put a 1N4148 diode across it (stripe to +), or the spike can damage the pin.",
      "It looks and sounds the same as a passive buzzer: an active one beeps on plain 5 V, a passive one only clicks.",
      "30 mA is close to the 40 mA an Arduino pin can take at most.",
      "It is loud, about 85 dB at 10 cm: not for your ear.",
    ],
    upgrade: [
      { name: "Passive buzzer driven with tone()", why: "You choose the pitch, from about 100 Hz to 5 kHz, so it plays melodies. It needs a PWM-capable pin." },
      { name: "I2S amplifier (MAX98357A) and a small speaker", why: "For real audio, not just beeps." },
    ],
    refs: ["https://www.lcsc.com/datasheet/lcsc_datasheet_Jiangsu-Huaneng-Elec-TMB12A05_C96093.pdf"],
  },
  experiment: { title: "Alarm patterns", idea: "Beep twice a second, then make the gap shrink as a distance sensor reads closer." },
  tags: ["buzzer", "sound", "beep", "piezo", "alarm", "speaker", "output"],
});
