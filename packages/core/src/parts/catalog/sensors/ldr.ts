import { MATERIAL, definePart, pin, vcc, type Solid } from "../../sdk";

/**
 * A GL5528-style 5 mm photoresistor, lying on the bench face up: a pale amber
 * epoxy disc, an orange-red cadmium sulfide film and two silver combs, and two
 * long tinned legs that leave from underneath and run away along the bench.
 */

const R = 2.55;
const CX = 2.55;
const CY = 2.55;
const BASE = 0.7;
const THICK = 2.4;
const TOP = BASE + THICK;
const PITCH = 3;
const LEG_END = 31;
const SILVER = "#c5c9cf";
const FILM = "#c2461f";

const rect = (x: number, y: number, w: number, h: number, color: string, z: number, finish: "plastic" | "aluminum" = "plastic"): Solid => ({
  kind: "box",
  x: Math.round(x * 100) / 100,
  y: Math.round(y * 100) / 100,
  w: Math.round(w * 100) / 100,
  h: Math.round(h * 100) / 100,
  d: 0.04,
  z,
  top: color,
  finish,
});

/** The film fills a block; two combs of silver electrodes interleave on it, so the film shows as a snake between the teeth. */
function track(): Solid[] {
  const z = TOP + 0.02;
  const out: Solid[] = [rect(CX - 1.75, CY - 1.45, 3.5, 2.9, FILM, z)];
  const left = CX - 1.75;
  const right = CX + 1.25;
  out.push(rect(left, CY - 1.45, 0.5, 2.9, SILVER, z + 0.04, "aluminum"));
  out.push(rect(right, CY - 1.45, 0.5, 2.9, SILVER, z + 0.04, "aluminum"));
  // Teeth alternate: from the left spine at -1.2, 0 and 1.2; from the right spine at -0.6 and 0.6.
  for (const dy of [-1.2, 0, 1.2]) out.push(rect(left + 0.5, CY + dy - 0.17, right - 0.25 - (left + 0.5), 0.34, SILVER, z + 0.04, "aluminum"));
  for (const dy of [-0.6, 0.6]) out.push(rect(left + 0.75, CY + dy - 0.17, right - (left + 0.75), 0.34, SILVER, z + 0.04, "aluminum"));
  return out;
}

/** A leg: down from the underside, a gentle bend, then a long straight run along the bench. */
function leg(x: number, drift: number): Solid {
  return {
    kind: "wire",
    points: [
      [x, CY, BASE + 0.2],
      [x, CY + 0.3, 0.55],
      [x + drift * 0.1, CY + 2.2, 0.32],
      [x + drift * 0.4, CY + 8, 0.28],
      [x + drift * 0.8, CY + 18, 0.28],
      [x + drift, LEG_END, 0.28],
    ],
    r: 0.25,
    color: MATERIAL.tin,
    finish: "tin",
  };
}

const X1 = CX - PITCH / 2;
const X2 = CX + PITCH / 2;
const END1 = X1 - 0.5;
const END2 = X2 + 0.5;

export default definePart({
  id: "ldr",
  name: "Light-dependent resistor",
  aka: ["LDR", "photoresistor", "photocell", "CdS cell", "GL5528"],
  group: "sensors",
  rank: 6,
  summary: "A resistor that gives way to light: megohms in the dark, a few thousand ohms in a bright room. One fixed resistor beside it and an analog pin can read the room.",
  size: { w: 5.1, h: LEG_END, d: 3.2 },
  solids: [
    // The epoxy disc with its raised rim, on the legs' short stubs.
    { kind: "cyl", id: "face", cx: CX, cy: CY, r: R, d: THICK, z: BASE, top: "#e3c28d", side: "#c9a56c", finish: "clear", segments: 32 },
    { kind: "disc", cx: CX, cy: CY, r: R - 0.1, color: "#e3c28d", z: TOP + 0.01, ring: { color: "#b98f57", width: 0.3 } },
    ...track(),
    leg(X1, END1 - X1),
    leg(X2, END2 - X2),
  ],
  features: [
    { id: "track", label: "Light-sensitive track", kind: "sensor", x: 0.8, y: 1.1, w: 3.5, h: 2.9, note: "The orange-red snake is a film of cadmium sulfide. Light frees charge carriers in it and its resistance falls, from megohms in the dark to a few thousand ohms in a bright room. Two interleaved silver combs touch it; each leg joins one comb." },
    { id: "face", label: "Epoxy disc", kind: "chip", x: 0, y: 0, w: 5.1, h: 5.1, note: "A 5 mm disc of clear epoxy over a ceramic base. Light has to reach the film through it." },
    { id: "legs", label: "Two legs", kind: "pins", x: END1 - 0.5, y: 5.1, w: END2 - END1 + 1, h: LEG_END - 5.1, note: "About 30 mm long, with no polarity. Wire one leg to 5 V and the other to an analog pin plus a 10 kΩ resistor to GND." },
  ],
  pins: [
    vcc("L1", "Either leg; to VCC.", { label: "Leg 1" }),
    pin("L2", "analog", "out-analog", "Either leg; to an analog pin, with 10 kΩ to GND.", { label: "Leg 2" }),
  ],
  pinAt: { L1: { x: END1, y: LEG_END }, L2: { x: END2, y: LEG_END } },
  circuit: {
    blocks: [
      { id: "light", label: "Light", sub: "lux", kind: "world", col: 0, row: 0, note: "Daylight, a lamp, a shadow passing: the amount of light on the face." },
      { id: "ldr", label: "CdS track", sub: "MΩ dark, kΩ bright", kind: "sensor", col: 1, row: 0, at: "track", note: "Resistance falls as light increases. Every part differs: calibrate in place." },
      { id: "vcc", label: "5 V", kind: "power", col: 0, row: 1, at: "L1", note: "The top of the divider." },
      { id: "node", label: "Junction", sub: "→ analog pin A0", kind: "pin", col: 2, row: 0, at: "L2", note: "The voltage here rises with light; A0 reads it as 0–1023." },
      { id: "res", label: "10 kΩ resistor", sub: "yours, to GND", kind: "passive", col: 2, row: 1, note: "The fixed half of the divider. Change it to shift the sensitive range." },
      { id: "gnd", label: "GND", kind: "ground", col: 2, row: 2, note: "Ground." },
    ],
    links: [
      { from: "light", to: "ldr", kind: "light" },
      { from: "vcc", to: "ldr", kind: "power" },
      { from: "ldr", to: "node", kind: "analog" },
      { from: "node", to: "res", kind: "power" },
      { from: "res", to: "gnd", kind: "ground" },
    ],
    steps: [
      "Light frees charge carriers in the CdS track, so its resistance falls as it gets brighter.",
      "With a fixed 10 kΩ resistor it forms a voltage divider: the junction voltage rises with light.",
      "An analog pin reads that voltage, 0–1023. Calibrate against the room, not a datasheet: every LDR differs.",
      "It responds in tens of milliseconds, slower in the dark; fine for day and night, not for data links.",
    ],
  },
  facts: [
    { label: "Dark resistance", value: "1 MΩ or more" },
    { label: "At 10 lux", value: "10–20 kΩ" },
    { label: "Peak sensitivity", value: "540 nm (green)" },
    { label: "Rating", value: "100 mW, 150 V" },
    { label: "Interface", value: "Analog divider" },
    { label: "Size", value: "Ø5.1 × 2.4 mm" },
  ],
  spec: {
    form: {
      mount: "breadboard",
      pitch: PITCH,
      note: "Two straight legs about 30 mm long, spaced about 3 mm. Bend them to a 5.08 mm (two-hole) gap, or stand it upright in a breadboard with the face up.",
    },
    power: {
      supply: { min: 0, max: 150 },
      logic: 5,
      tolerant5V: true,
      draw: { idle: 0, active: 0.33, peak: 20 },
      interface: "Resistance between two legs; read with a divider on an analog pin",
      note: "A passive part with no supply pin. Draw is 5 V divided by its resistance: 0.33 mA at 10 lux with nothing else in series, up to the 100 mW limit (about 20 mA at 5 V) in strong sun.",
    },
    sourcing: { mpn: "GL5528", maker: "Senba and many others", lifecycle: "generic", usd: [0.1, 0.5], note: "GL5516 (5 to 10 kΩ) and GL5537 (18 to 50 kΩ) have the same size. Cadmium is restricted in the EU." },
    limits: [
      "Not calibrated: at 10 lux a GL5528 reads anywhere from 10 kΩ to 20 kΩ, a 2:1 spread between parts.",
      "Not linear: resistance falls as lux to the power of about −0.7, so it flattens out in bright light.",
      "Slow: about 20 ms to rise and 30 ms to fall, and seconds to recover from darkness.",
      "It drifts with temperature and cannot give lux without calibration.",
      "Contains cadmium, so it cannot be sold in the EU in new products.",
    ],
    upgrade: [
      { name: "BH1750 (ROHM)", why: "A digital light meter: 1 to 65,535 lux in 16 bits over I2C, on 3.3 V. It needs no calibration and no divider." },
      { name: "VEML7700 (Vishay)", why: "I2C ambient light sensor that reads up to about 120,000 lux on 3.3 V, with a response shaped like the human eye." },
    ],
    refs: ["https://static.rapidonline.com/pdf/58-0134_v1.pdf", "https://www.digikey.sg/htmldatasheets/production/2014143/0/0/1/gl5528.html", "https://fablabiub.com/?p=25533"],
  },
  lab: { logic: 5, supply: [0, 5.5], tolerates5V: true },
  experiment: { title: "Automatic night light", idea: "Read the divider on A0 and print it, then switch an LED on below a threshold you choose by covering it with your hand." },
  tags: ["ldr", "photoresistor", "photocell", "light", "cds", "analog", "sensor"],
});
