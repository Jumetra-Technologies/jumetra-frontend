import { MATERIAL, definePart, gnd, pin, type Solid } from "../../sdk";

const STEEL = "#c9ccd1";
const FRAME = 3.5;
/** Leg centers along the body, 2.54 mm apart: GND, OUT (the middle, common leg), NC. */
const LEGS = [1.71, 4.25, 6.79];

const leg = (cx: number): Solid => ({ kind: "pins", x: cx - 0.5, y: 1.25, count: 1, pitch: 1, dir: "x", len: 5.2, z: -4.6, size: 0.5, color: STEEL, finish: "tin" });
/** A plastic peg that locates the switch in its holes. */
const peg = (cx: number): Solid => ({ kind: "cyl", cx, cy: 1.75, r: 0.45, d: 1.6, z: -1.5, top: "#1b1c1f", finish: "plastic" });

export default definePart({
  id: "slide-switch",
  name: "SS12D00 slide switch",
  aka: ["SPDT slide switch", "SS12D00G3", "on-off switch", "toggle switch"],
  group: "controls",
  rank: 7,
  summary: "A tiny two-position switch you flip with a fingernail. The middle leg joins one outer leg or the other. Wire the middle leg to a board pin and one side to ground, turn on INPUT_PULLUP, and the pin reads LOW in one position and HIGH in the other.",
  size: { w: 8.5, h: 3.5, d: 6.1 },
  solids: [
    // The black plastic base, and the steel shell over it with its slot.
    { kind: "box", x: 0, y: 0, w: 8.5, h: 3.5, d: 0.9, z: 0, top: MATERIAL.plasticBlack, side: "#111214", radius: 0.2, finish: "plastic" },
    { kind: "box", x: 0, y: 0, w: 8.5, h: 3.5, d: FRAME - 0.9, z: 0.9, top: STEEL, side: "#8f949b", radius: 0.2, finish: "metal" },
    { kind: "box", x: 1.2, y: 0.9, w: 6.1, h: 1.7, d: 0.05, z: FRAME + 0.01, top: "#0c0d0f" },
    // The sliding handle, shown slid toward the NC leg, with grip ribs.
    { kind: "box", id: "handle", x: 4.4, y: 1.0, w: 2.6, h: 1.5, d: 6 - FRAME, z: FRAME, top: "#1a4fc4", side: "#12348a", radius: 0.2, finish: "plastic" },
    ...[4.9, 5.6, 6.3].map((x): Solid => ({ kind: "box", x, y: 1.05, w: 0.25, h: 1.4, d: 0.05, z: 6.01, top: "#0e2d7a" })),
    peg(0.75),
    peg(7.75),
    ...LEGS.map(leg),
  ],
  features: [
    { id: "handle", label: "Handle", kind: "button", x: 1.2, y: 0.9, w: 6.1, h: 1.7, note: "Slide it with a fingernail. It rides in a slot and stops at each end, with a small click. Toward the NC leg: OUT joins NC. Toward the GND leg: OUT joins GND." },
    { id: "shell", label: "Steel shell", kind: "mechanical", x: 0, y: 0, w: 8.5, h: 3.5, note: "A 8.5 × 3.5 mm steel cover over the black plastic base. Dust and flux get in easily: do not wash it." },
    { id: "legs", label: "Three legs", kind: "pins", x: 1.2, y: 0.7, w: 6.1, h: 2.1, note: "2.54 mm apart, so they fit three holes of a breadboard in a row. The middle leg is the common one." },
    { id: "pegs", label: "Pegs", kind: "other", x: 0.3, y: 1.3, w: 8, h: 0.9, note: "Two small plastic pegs on the underside that sit in holes in the board. You can clip them off to fit a breadboard." },
  ],
  pins: [
    pin("OUT", "digital", "out-digital", "The middle leg, the common. Wire it to a board pin set to INPUT_PULLUP. It reads LOW when the handle is toward GND.", { label: "Out" }),
    gnd("GND", "An outer leg. When the handle slides to this side, the middle leg joins it and OUT goes LOW."),
    pin("NC", "other", "opt", "The other outer leg. Leave it unwired for a plain on/off, or wire it to a second signal.", { label: "NC", required: false }),
  ],
  pinAt: {
    GND: { x: LEGS[0], y: 1.75 },
    OUT: { x: LEGS[1], y: 1.75 },
    NC: { x: LEGS[2], y: 1.75 },
  },
  circuit: {
    blocks: [
      { id: "finger", label: "Fingernail", kind: "world", col: 0, row: 0, note: "You slide the handle about 4 mm, one end to the other." },
      { id: "handle", label: "Handle", sub: "2 positions", kind: "actuator", col: 1, row: 0, at: "handle", note: "A plastic slider that carries the moving contact. A weak detent holds it, so shaking can flip it." },
      { id: "contact", label: "Common contact", sub: "middle leg", kind: "passive", col: 2, row: 0, at: { x: 4.25, y: 1.75 }, note: "A metal spring that is always on the middle leg. It touches one outer leg or the other, never both. It breaks one before it makes the other." },
      { id: "out", label: "OUT", sub: "common leg", kind: "pin", col: 3, row: 0, at: "OUT", note: "Goes to your board pin. INPUT_PULLUP holds it HIGH until the switch ties it to ground." },
      { id: "gnd", label: "GND", sub: "outer leg", kind: "ground", col: 2, row: 1, at: "GND", note: "The side that gives LOW." },
      { id: "nc", label: "NC", sub: "other outer leg", kind: "pin", col: 3, row: 1, at: "NC", note: "The side that leaves OUT floating to the pull-up, so OUT reads HIGH." },
    ],
    links: [
      { from: "finger", to: "handle", kind: "physical", label: "slide" },
      { from: "handle", to: "contact", kind: "mechanical" },
      { from: "contact", to: "out", kind: "signal", label: "HIGH or LOW" },
      { from: "gnd", to: "contact", kind: "ground", label: "when slid this way" },
      { from: "nc", to: "contact", kind: "signal" },
    ],
    steps: [
      "The handle is at the NC end. The middle leg is joined to the NC leg, which goes nowhere, so OUT feels only the pull-up and reads HIGH.",
      "You slide the handle to the GND end. The common contact lifts off NC for a moment, then lands on the GND leg.",
      "OUT is now tied to ground and reads LOW. It stays that way until you slide it back: unlike a push button, it holds its position.",
    ],
  },
  facts: [
    { label: "Type", value: "SPDT, 2 positions" },
    { label: "Size", value: "8.5 × 3.5 × 6 mm" },
    { label: "Leg pitch", value: "2.54 mm" },
    { label: "Rating", value: "0.3 A at 6 V DC" },
    { label: "Contact", value: "50 mΩ max" },
    { label: "Life", value: "10,000 cycles" },
  ],
  spec: {
    form: {
      mass: 0.4,
      mount: "breadboard",
      pitch: 2.54,
      note: "Three legs fit three holes in a row. The two plastic pegs under the shell may need clipping to sit flat on a breadboard. Size and leg position are from typical SS12D00G3 listings, not a datasheet.",
    },
    power: {
      interface: "Digital input with a pull-up: HIGH in one position, LOW in the other. It keeps its position.",
      note: "Contacts rated 0.3 A at 6 V DC on the SS12D00G series; some sellers print 50 mA at 12 V, so treat 50 mA as the safe limit. No supply.",
    },
    sourcing: { mpn: "SS12D00G3", maker: "Generic", lifecycle: "generic", usd: [0.05, 0.2], note: "G3, G4 and G5 are the handle length: 3, 4 and 5 mm. The footprint is the same." },
    limits: [
      "Tiny contacts: 0.3 A at 6 V, or 50 mA at 12 V. Do not use it to switch a motor or a battery pack.",
      "About 10,000 cycles.",
      "The plastic handle snaps if you push it sideways.",
      "The detent is weak, and vibration can flip it on a moving robot.",
      "It breaks before it makes, so the middle leg is briefly open while you slide it.",
    ],
    upgrade: [
      { name: "C&K JS102011SAQN or NKK SS12SDP", why: "Sealed contacts rated 0.5 A to 3 A, fit for switching a battery pack." },
    ],
    refs: ["https://elektronicavoorjou.nl/en/?p=39142941"],
  },
  sim: {
    kind: "sensor",
    reads: [{ key: "slid", label: "Handle", min: 0, max: 1, step: 1, start: 0, sweep: [0, 1, 4], states: ["Toward NC", "Toward GND"] }],
    trips: [{ pin: "OUT", key: "slid", when: "above", at: 0.5, activeLow: true }],
  },
  experiment: { title: "Mode switch", idea: "Read the switch once at start-up with INPUT_PULLUP. In one position run the robot's line follower; in the other run the obstacle avoider." },
  tags: ["slide switch", "switch", "SPDT", "on off", "toggle", "SS12D00", "input", "control"],
});
