import { definePart, pin, shade } from "../../sdk";
import type { Solid } from "../../sdk";

/**
 * A 1N4007 rectifier diode in a DO-41 package, lying on the bench with its
 * legs trimmed to the same 16 mm overall length as the resistor, so it fits
 * the same breadboard spacing. The silver band marks the cathode (right).
 */

const TIN = "#c9ccd1";
const BODY = "#1b1c1f";
const BAND = "#d8d8dc";
const BODY_LEN = 5.2;
const BODY_R = 1.35; // 2.7 mm across
const LEG_R = 0.4; // 0.8 mm wire
const TOTAL = 16;
const BODY_X = (TOTAL - BODY_LEN) / 2;
const AXIS = BODY_R;

/** A cylinder lying along x from `x` for `length`, on the part's axis. */
const lying = (x: number, length: number, r: number, color: string, extra: Partial<Extract<Solid, { kind: "cyl" }>> = {}): Solid => ({
  kind: "cyl",
  cx: x + length / 2,
  cy: AXIS,
  r,
  d: length,
  z: AXIS - Math.max(r, extra.r2 ?? r),
  axis: "x",
  top: color,
  side: shade(color, 0.78),
  ...extra,
});

const BAND_X = BODY_X + BODY_LEN - 1.4;

export default definePart({
  id: "diode",
  name: "Diode (1N4007)",
  aka: ["diode", "1N4007", "rectifier diode", "flyback diode", "freewheel diode", "protection diode", "1N400x"],
  group: "prototyping",
  rank: 6,
  summary: "A one-way valve for current: it passes it from anode to cathode (the banded end) and blocks it the other way. Put one across a relay coil or motor to soak up the spike when it switches off.",
  size: { w: 16, h: 2.7, d: 2.8 },
  solids: [
    // Two tinned legs, 0.8 mm thick.
    lying(0, BODY_X + 0.3, LEG_R, TIN, { finish: "aluminum", id: "leg-a" }),
    lying(BODY_X + BODY_LEN - 0.3, TOTAL - (BODY_X + BODY_LEN - 0.3), LEG_R, TIN, { finish: "aluminum", id: "leg-k" }),
    // The black epoxy body with its chamfered ends.
    lying(BODY_X, 0.25, BODY_R - 0.2, BODY, { r2: BODY_R, finish: "epoxy" }),
    lying(BODY_X + 0.25, BODY_LEN - 0.5, BODY_R, BODY, { id: "body", finish: "epoxy" }),
    lying(BODY_X + BODY_LEN - 0.25, 0.25, BODY_R, BODY, { r2: BODY_R - 0.2, finish: "epoxy" }),
    // The silver cathode band.
    lying(BAND_X, 0.85, BODY_R + 0.02, BAND, { id: "band", finish: "plastic" }),
    // The type printed on the top.
    { kind: "text", x: BODY_X + 1.85, y: AXIS + 0.3, text: "1N4007", size: 0.95, color: "#d8d8dc", anchor: "middle", z: BODY_R * 2 + 0.01, weight: 600 },
  ],
  features: [
    { id: "body", label: "Epoxy body", kind: "other", x: BODY_X, y: 0, w: BODY_LEN, h: 2.7, note: "A black plastic body, 5.2 mm long and 2.7 mm across, with the silicon chip inside. 1N4001 to 1N4007 all look the same: read the number." },
    { id: "band", label: "Cathode band", kind: "other", x: BAND_X, y: 0, w: 0.85, h: 2.7, note: "The silver band marks the cathode (K). Current flows toward the band. This is the end that goes to the positive supply in a flyback hookup." },
    { id: "marking", label: "Type mark", kind: "other", x: BODY_X + 0.3, y: 0.7, w: 3.1, h: 1.3, note: "1N4007: 1 A, up to 1000 V. The 1N4001 to 1N4006 are the same size but block less voltage (50 V to 800 V)." },
    { id: "leg-a", label: "Anode leg", kind: "pin", x: 0, y: 0.5, w: BODY_X, h: 1.7, note: "Current comes in here, on the end away from the band." },
    { id: "leg-k", label: "Cathode leg", kind: "pin", x: BODY_X + BODY_LEN, y: 0.5, w: BODY_X, h: 1.7, note: "Current goes out here, on the banded end." },
  ],
  pins: [
    pin("A", "other", "opt", "Anode, the end away from the band. Current flows in here. In a flyback hookup it goes to the switch side of the coil.", { label: "A", side: "left" }),
    pin("K", "other", "opt", "Cathode, the banded end. Current flows out here. In a flyback hookup it goes to the positive supply side of the coil.", { label: "K", side: "right" }),
  ],
  pinAt: { A: { x: 0.4, y: AXIS }, K: { x: TOTAL - 0.4, y: AXIS } },
  circuit: {
    blocks: [
      { id: "sw", label: "Transistor", sub: "just switched off", kind: "ic", col: 0, row: 0, note: "While it was on, the coil was carrying current. When it opens, that current has nowhere to go." },
      { id: "a", label: "Anode leg", kind: "connector", col: 1, row: 0, at: "A", note: "Wired to the switch end of the coil." },
      { id: "junction", label: "Silicon junction", sub: "~0.8 V forward", kind: "passive", col: 2, row: 0, at: "body", hot: true, note: "A PN junction. It conducts from anode to cathode once about 0.7 V is across it, and blocks the other way. The volts it drops times the current becomes heat." },
      { id: "k", label: "Cathode leg", kind: "connector", col: 3, row: 0, at: "K", note: "Wired to the supply end of the coil. The band is on this leg." },
      { id: "v", label: "+ supply", kind: "power", col: 4, row: 0, note: "The rail the coil hangs from." },
      { id: "coil", label: "Coil or motor", sub: "relay, motor, pump", kind: "actuator", col: 2, row: 1, note: "A coil fights any change in its current: when it is cut off, it pushes the voltage at its switch end up, to hundreds of volts if nothing stops it." },
    ],
    links: [
      { from: "coil", to: "sw", kind: "power", label: "voltage spike" },
      { from: "sw", to: "a", kind: "power", label: "spike pushes in" },
      { from: "a", to: "junction", kind: "power" },
      { from: "junction", to: "k", kind: "power", label: "current flows on" },
      { from: "k", to: "v", kind: "power", label: "held to supply + ~1 V" },
      { from: "v", to: "coil", kind: "power", label: "round the loop" },
    ],
    steps: [
      "A relay coil or motor stores energy as it carries current. Open the switch and the current can't stop at once.",
      "With nowhere to go, the voltage at the switch end shoots up, by hundreds of volts, and can kill the transistor.",
      "The diode sits across the coil, band toward the positive supply. In normal running the coil end is lower than the supply, so the diode blocks and does nothing.",
      "When the spike arrives, the switch end rises above the supply. Now the diode conducts and the current circles through the coil and diode instead.",
      "That holds the switch end to about 1 V above the supply. The current dies down in a few milliseconds and the energy turns into a little heat.",
    ],
  },
  facts: [
    { label: "Forward drop", value: "about 0.7 V small, 1.1 V max at 1 A" },
    { label: "Reverse voltage", value: "1000 V" },
    { label: "Forward current", value: "1 A average (at 75 °C)" },
    { label: "Surge", value: "30 A for 8.3 ms" },
    { label: "Polarity", value: "Band is the cathode (K)" },
    { label: "Body", value: "5.2 × 2.7 mm, legs 0.8 mm" },
  ],
  spec: {
    form: { mass: 0.35, mount: "breadboard", pitch: 10.16, note: 'Bend the legs four holes (0.4") apart to fit a breadboard, as for a resistor. New, the legs are 25 mm long each; this one is trimmed to 16 mm overall.' },
    power: {
      interface: "Two legs: current flows from anode (A) to cathode (K, the band)",
      note: "Forward drop (VF) 1.1 V max at 1 A, about 0.9 V typical, about 0.7 V at 10 mA. Reverse 1000 V with about 5 µA of leakage. Average forward current 1 A at 75 °C; surge (IFSM) 30 A for 8.3 ms. Reverse recovery about 2 µs.",
    },
    thermal: { thetaCW: 50, maxC: 150, typicalW: 0.9, at: "carrying 1 A forward", note: "RthJA 50 °C/W with 9.5 mm legs on a board. At 1 A the junction runs about 45 to 55 °C above the air. A flyback pulse is brief, so it hardly warms." },
    sourcing: { mpn: "1N4007", maker: "Vishay, onsemi, Diodes Inc., and many others", lifecycle: "generic", usd: [0.01, 0.05] },
    limits: [
      "Drops about 0.7 V at a small current and 1 V near 1 A. On a 5 V rail that is a fifth gone, and at 1 A it burns about 1 W.",
      "Slow: it takes about 2 µs to switch off. For fast switching (PWM above about 20 kHz, switch-mode supplies) use a Schottky or a 1N4148 for small signals.",
      "1 A average. The 30 A surge lasts only a few milliseconds.",
      "Wrong way round it blocks (and does nothing for a flyback), or shorts the supply if it is in series with it. Check the band.",
      "As reverse-polarity protection it works, but it costs that 1 V all the time.",
    ],
    upgrade: [{ name: "1N5819 Schottky (DO-41)", why: "Same body, but about 0.45 V forward at 1 A (0.6 V max) against 1 V, and no recovery delay. 40 V, 1 A, 25 A surge. For reverse-polarity protection on a 5 V to 12 V supply it wastes half as much. Leakage is higher (up to about 1 mA) and 40 V is the most it blocks." }],
    refs: ["https://alessandra-flammini.unibs.it/EG_FED/EG_AA2324/FE/Laboratorio/Datasheet%20componenti/diodo%201n4007.pdf", "https://www.radiolocman.com/datasheet/data.html?di=101049"],
  },
  lab: { passive: true },
  experiment: {
    title: "Tame the spike",
    idea: "Switch a relay coil with a transistor. First without the diode and watch the collector spike, then add it across the coil, band to the supply, and see the spike disappear.",
  },
  tags: ["diode", "1N4007", "rectifier", "flyback", "freewheel", "polarity", "protection", "passive", "relay", "motor"],
});
