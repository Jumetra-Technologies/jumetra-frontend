import { definePart, pin, shade } from "../../sdk";
import type { Solid } from "../../sdk";

/**
 * A PN2222A (the common "2N2222" kit part) in a TO-92 package, lying on its
 * round back with the flat face up so the marking reads and the legs point
 * toward the viewer. Seen from the flat face with the legs down, the legs run
 * E, B, C from left to right, and the same here from above.
 */

const BODY = "#1a1b1e";
const TIN = "#c9ccd1";
const R = 2.4; // the body is a 4.8 mm round, cut flat on one side
const CUT = 1.45; // from the middle of the round to the flat face
const CX = 2.4;
const AXIS = R; // legs run along the middle of the round
const TOP = R + CUT; // flat face height: 3.85 mm
const BODY_Y = 0; // top end of the body
const BODY_LEN = 5.2;
const LEG_END = BODY_LEN + 8;
const PITCH = 2.54;

/** The body: a stack of thin slabs, each as wide as the round is at that height. */
const SLICES = 30;
const slabs = (): Solid[] =>
  Array.from({ length: SLICES }, (_, i): Solid => {
    const z0 = (TOP * i) / SLICES;
    const z1 = (TOP * (i + 1)) / SLICES;
    const mid = (z0 + z1) / 2;
    const half = Math.sqrt(Math.max(R * R - (mid - AXIS) ** 2, 0.05));
    return { kind: "box", x: CX - half, y: BODY_Y, w: half * 2, h: BODY_LEN, d: z1 - z0, z: z0, top: BODY, finish: "epoxy", ...(i === SLICES - 1 ? { id: "body" } : {}) };
  });

const legAt = (x: number, id: string): Solid => ({
  kind: "cyl",
  cx: x,
  cy: (BODY_LEN - 0.3 + LEG_END) / 2,
  r: 0.25,
  d: LEG_END - (BODY_LEN - 0.3),
  z: AXIS - 0.25,
  axis: "y",
  top: TIN,
  side: shade(TIN, 0.78),
  finish: "tin",
  id,
});

const LEGS = [
  { id: "E", x: CX - PITCH },
  { id: "B", x: CX },
  { id: "C", x: CX + PITCH },
];

export default definePart({
  id: "transistor",
  name: "Transistor (PN2222A / 2N2222)",
  aka: ["transistor", "2N2222", "2N2222A", "PN2222A", "NPN transistor", "BJT", "switching transistor", "TO-92"],
  group: "prototyping",
  rank: 7,
  summary: "An electronic switch. A small current into the base lets a much bigger one flow from collector to emitter, so a pin on your board can switch a relay, a buzzer or a small motor.",
  size: { w: 4.8, h: LEG_END, d: 3.85 },
  solids: [
    ...LEGS.map((l) => legAt(l.x, `leg-${l.id}`)),
    ...slabs(),
    // The type printed on the flat face.
    { kind: "text", x: CX, y: 2.45, text: "PN2222A", size: 0.8, color: "#d8d8dc", anchor: "middle", z: TOP + 0.01, weight: 600 },
  ],
  features: [
    { id: "body", label: "TO-92 body", kind: "other", x: 0, y: 0, w: 4.8, h: BODY_LEN, note: "Black plastic, round on the back and flat on the front. The flat face is how you find the pin order." },
    { id: "marking", label: "Type mark", kind: "other", x: 0.5, y: 1.9, w: 3.8, h: 1.1, note: "PN2222A, or 2N2222A on some parts. Parts of other types (BC547, 2N3904) have the same shape: always read the mark." },
    { id: "leg-E", label: "E: emitter", kind: "pin", x: CX - PITCH - 0.5, y: BODY_LEN, w: 1, h: LEG_END - BODY_LEN, note: "Left leg with the flat face toward you and the legs pointing down. Current leaves here, usually to ground." },
    { id: "leg-B", label: "B: base", kind: "pin", x: CX - 0.5, y: BODY_LEN, w: 1, h: LEG_END - BODY_LEN, note: "Middle leg. The control input: a small current in here switches the big one." },
    { id: "leg-C", label: "C: collector", kind: "pin", x: CX + PITCH - 0.5, y: BODY_LEN, w: 1, h: LEG_END - BODY_LEN, note: "Right leg. The load goes between this leg and the supply." },
  ],
  pins: [
    pin("E", "other", "opt", "Emitter, the left leg from the flat face. The current leaves here. For a switch on the ground side, wire it to GND.", { label: "E", side: "left" }),
    pin("B", "digital", "opt", "Base, the middle leg. The control input. Wire it to a board pin through a resistor (470 Ω from 5 V): never straight.", { label: "B", side: "left" }),
    pin("C", "other", "opt", "Collector, the right leg. One end of the load goes here, the other end to the supply. Up to 40 V.", { label: "C", side: "right" }),
  ],
  pinAt: { E: { x: LEGS[0].x, y: LEG_END - 0.4 }, B: { x: LEGS[1].x, y: LEG_END - 0.4 }, C: { x: LEGS[2].x, y: LEG_END - 0.4 } },
  circuit: {
    blocks: [
      { id: "pin", label: "Board pin", sub: "5 V when HIGH", kind: "pin", col: 0, row: 0, note: "The control signal. It supplies only the small base current." },
      { id: "rb", label: "Base resistor", sub: "470 Ω", kind: "passive", col: 1, row: 0, note: "Limits the base current to about 9 mA. Without it the base takes all the pin can give, and the pin is damaged." },
      { id: "b", label: "Base leg", kind: "connector", col: 2, row: 0, at: "B", note: "The middle leg takes the control current." },
      { id: "die", label: "Silicon", sub: "gain 100 to 300", kind: "ic", col: 3, row: 0, at: "body", hot: true, note: "A layered chip. The base current opens a path from collector to emitter that carries about ten times more. The volts left across it times the current become heat." },
      { id: "e", label: "Emitter leg", kind: "connector", col: 4, row: 0, at: "E", note: "The current from the base and the collector leave together." },
      { id: "gnd", label: "GND", kind: "ground", col: 4, row: 1, note: "The way back." },
      { id: "v", label: "+ supply", kind: "power", col: 0, row: 1, note: "The load's own supply: 5 V to 40 V." },
      { id: "load", label: "Load", sub: "relay, motor, strip", kind: "actuator", col: 1, row: 1, note: "Up to 600 mA. Put a diode across it if it is a coil." },
      { id: "c", label: "Collector leg", kind: "connector", col: 2, row: 1, at: "C", note: "The load current comes in on the right leg." },
    ],
    links: [
      { from: "pin", to: "rb", kind: "signal", label: "5 V" },
      { from: "rb", to: "b", kind: "signal", label: "~9 mA" },
      { from: "b", to: "die", kind: "signal" },
      { from: "die", to: "e", kind: "ground" },
      { from: "e", to: "gnd", kind: "ground" },
      { from: "v", to: "load", kind: "power" },
      { from: "load", to: "c", kind: "power", label: "up to 600 mA" },
      { from: "c", to: "die", kind: "power" },
    ],
    steps: [
      "The emitter goes to ground and the load sits between the supply and the collector. This is a low-side switch.",
      "With 0 V on the base, no base current flows and the transistor is off. The load gets nothing.",
      "Raise the pin to 5 V and about 9 mA flows into the base through the resistor, once the base is at about 0.7 V.",
      "That lets about ten times more current through, up to hundreds of milliamps, from collector to emitter. The load comes on.",
      "A switched-on transistor still drops 0.3 V at 150 mA and 1 V at 500 mA. That drop times the current heats it.",
    ],
  },
  facts: [
    { label: "Type", value: "NPN, PN2222A, TO-92" },
    { label: "Pin order", value: "E B C from the flat face, legs down" },
    { label: "Collector current", value: "600 mA continuous (1 A absolute)" },
    { label: "Gain (hFE)", value: "100 to 300 at 150 mA" },
    { label: "Saturation", value: "0.3 V at 150 mA, 1.0 V at 500 mA" },
    { label: "Voltage", value: "40 V (collector to emitter)" },
  ],
  spec: {
    form: { mass: 0.2, mount: "breadboard", pitch: PITCH, note: "Three legs 0.4 to 0.5 mm thick, 2.54 mm apart, so one leg per breadboard column. New, they are 12 to 14 mm long; trimmed here." },
    power: {
      interface: "Base in, collector to emitter out. Low-side switch.",
      note: "Collector current: 600 mA continuous, 1 A absolute. Gain (hFE) 100 to 300 at 150 mA and 10 V. VCE(sat) 0.3 V max at 150 mA with 15 mA of base, 1.0 V max at 500 mA with 50 mA of base. 40 V collector to emitter, 6 V base to emitter, 625 mW total at 25 °C. Switches on at VBE of about 0.65 to 0.75 V.",
    },
    thermal: { thetaCW: 200, maxC: 150, typicalW: 0.5, at: "switching 500 mA fully on (VCE 1 V)", note: "RthJA 200 °C/W, so 0.5 W lifts the case about 100 °C. 625 mW at 25 °C, and the allowance falls 5 mW for every °C above that." },
    sourcing: { mpn: "PN2222A", maker: "onsemi (Fairchild), Central Semi, NXP, and many others", lifecycle: "generic", usd: [0.03, 0.1] },
    limits: [
      "It needs a base resistor. From a 5 V pin to switch 100 mA: base current is a tenth of the load, 10 mA, so R = (5 − 0.7) ÷ 0.010 = 430 Ω; use 470 Ω. From 3.3 V it is about 260 Ω.",
      "600 mA at most for steady use. A hobby motor that stalls at over 0.5 A is too much for it.",
      "It gets hot above about 0.5 W: 1 V across it at 500 mA is 0.5 W, and in a TO-92 that means about 100 °C over the air.",
      "Pin order depends on the part. The PN2222A is E B C from the flat face; a BC547 is the other way round (C B E), and some P2N2222A parts are C B E too. A wrong way round part can still conduct, weakly, so it looks like it works: check with the diode test of a meter.",
      "It loses 0.3 to 1 V across it when on, and the base current is wasted. At low voltage (3.3 V) that matters.",
    ],
    upgrade: [{ name: "Logic-level N-MOSFET: AO3400A (SOT-23) or IRLZ44N (TO-220)", why: "For loads over half an amp. The AO3400A is fully on at 3.3 V to 4.5 V with about 33 mΩ, 5.7 A and 30 V: about 0.1 W at 3 A against 1.5 W for a transistor. It is tiny, so it needs a breakout board. The IRLZ44N fits a breadboard (about 25 mΩ at 5 V). Needs no base resistor, only a 100 Ω gate resistor and a pull-down." }],
    refs: ["https://www.digikey.kr/htmldatasheets/production/67483/0/0/1/pn2222-pn2222a.html", "https://www2.ensc.sfu.ca/reference/data-sheets/PN2222A.PDF", "https://www.etechnophiles.com/pn2222-transistor-basics/"],
  },
  lab: { passive: true },
  experiment: {
    title: "Pin to relay",
    idea: "Switch a relay or a buzzer with a board pin. Wire the emitter to GND, the load between 5 V and the collector, and a 470 Ω resistor from the pin to the base.",
  },
  tags: ["transistor", "2N2222", "PN2222A", "NPN", "BJT", "switch", "amplifier", "TO-92", "base resistor", "passive"],
});
