import { MATERIAL, definePart, gnd, pin, silk, type Solid } from "../../sdk";

const STEEL = "#c9ccd1";
const BODY = 6;
/** Terminal centers along the bottom edge, 6.35 mm apart: COM, NO, NC. */
const LUGS = [3.5, 9.85, 16.2];
const HOLES = [5.25, 14.75];

/** A flat solder lug 3.2 mm wide, standing out of the bottom edge. */
const lug = (cx: number): Solid[] => [
  { kind: "box", x: cx - 0.25, y: 9.4, w: 0.5, h: 5.6, d: 3.2, z: 1.4, top: STEEL, finish: "tin", radius: 0.05 },
];

export default definePart({
  id: "limit-switch",
  name: "Micro limit switch with lever",
  aka: ["microswitch", "endstop switch", "KW12-3", "SS-5GL", "bump switch", "lever switch"],
  group: "controls",
  rank: 8,
  summary: "A snap-action microswitch with a metal lever, as on 3D printer endstops and robot bumpers. When something bumps the lever, a click flips the common terminal from one contact to the other. Wire COM to ground and NO to an INPUT_PULLUP pin: pressed reads LOW.",
  size: { w: 20, h: 10, d: BODY },
  solids: [
    { kind: "box", x: 0, y: 0, w: 20, h: 10, d: BODY, z: 0, top: MATERIAL.plasticBlack, side: "#111214", radius: 0.5, finish: "plastic", label: { text: "KW12-3", size: 1.5, color: "#aab0b7" } },
    // Two mounting holes through the body.
    ...HOLES.map((x): Solid => ({ kind: "disc", cx: x, cy: 3.4, r: 1.15, color: "#0c0d0f", z: BODY + 0.01, ring: { color: "#3a3d42", width: 0.3 } })),
    // The plunger in the long edge, and the hinge bracket the lever swings on.
    { kind: "box", id: "plunger", x: 9, y: -0.8, w: 2.4, h: 0.9, d: 2.2, z: 1.9, top: "#4b4d52", side: "#2a2b2f", radius: 0.2, finish: "plastic" },
    { kind: "box", x: 0.6, y: -1.2, w: 2.8, h: 1.3, d: 3.8, z: 1.1, top: STEEL, finish: "metal", radius: 0.2 },
    { kind: "cyl", cx: 2, cy: -0.7, r: 0.7, d: 4.0, z: 1.0, top: "#9ea3aa", finish: "metal" },
    // The straight steel lever: on edge, tilted away from the body and reaching 8 mm past it.
    { kind: "extrude", id: "lever", path: "M2 -0.95 L28 -3.65 L28 -3.15 L2 -0.45 Z", d: 3.6, z: 1.2, top: STEEL, side: "#8f949b", finish: "metal" },
    ...LUGS.flatMap(lug),
    silk(LUGS[0], 8.5, "C", 1.2, "#cfd3d8", { anchor: "middle", z: BODY + 0.01 }),
    silk(LUGS[1], 8.5, "NO", 1.2, "#cfd3d8", { anchor: "middle", z: BODY + 0.01 }),
    silk(LUGS[2], 8.5, "NC", 1.2, "#cfd3d8", { anchor: "middle", z: BODY + 0.01 }),
  ],
  features: [
    { id: "lever", label: "Lever", kind: "mechanical", x: 2, y: -3.7, w: 26, h: 3.3, note: "A straight steel arm, hinged at the left. The long arm gives leverage: it needs about 0.5 to 1.5 N at the tip and 2 to 3 mm of travel to click." },
    { id: "plunger", label: "Plunger", kind: "button", x: 9, y: -0.8, w: 2.4, h: 0.9, note: "The lever pushes this pin in. Inside, a snap spring flips the contact with a click. Do not push it past its stop or the lever bends." },
    { id: "body", label: "Body", kind: "other", x: 0, y: 0, w: 20, h: 10, note: "Black plastic, 20 × 10 × 6 mm. Not sealed, so dust and water get in." },
    { id: "holes", label: "Mounting holes", kind: "mechanical", x: 4.1, y: 2.2, w: 11.8, h: 2.4, note: "Two small screws, M2 size, through the body hold it to a bracket. About 9.5 mm apart on the typical part." },
    { id: "lugs", label: "COM, NO, NC lugs", kind: "pins", x: 3, y: 9.4, w: 13.7, h: 5.6, note: "Three flat solder lugs, 6.35 mm apart. Check the letters stamped on the body: some makers put COM in the middle." },
    { id: "stamp", label: "Stamped letters", kind: "other", x: 2.2, y: 7.4, w: 15, h: 1.5, note: "C is the common. NO is open until the lever is pressed. NC is closed until the lever is pressed." },
  ],
  pins: [
    pin("OUT", "digital", "out-digital", "The NO terminal. Wire it to a board pin set to INPUT_PULLUP. Reads LOW while the lever is pressed.", { label: "NO" }),
    gnd("GND", "The COM terminal, the common. Wire it to ground.", { label: "COM" }),
    pin("NC", "other", "opt", "Normally closed. It joins COM at rest and lets go when pressed. Use it instead of NO for a fail-safe end stop: a broken wire reads as pressed.", { label: "NC", required: false }),
  ],
  pinAt: {
    GND: { x: LUGS[0], y: 14.5 },
    OUT: { x: LUGS[1], y: 14.5 },
    NC: { x: LUGS[2], y: 14.5 },
  },
  circuit: {
    blocks: [
      { id: "bump", label: "Bump", sub: "arm, cart, bumper", kind: "world", col: 0, row: 0, note: "Something moving hits the lever." },
      { id: "lever", label: "Lever", sub: "steel arm", kind: "actuator", col: 1, row: 0, at: "lever", note: "Turns the push at the tip into a bigger, shorter push at the plunger." },
      { id: "plunger", label: "Plunger", kind: "actuator", col: 2, row: 0, at: "plunger", note: "Moves about 0.5 mm, then the spring takes over." },
      { id: "spring", label: "Snap spring", sub: "flips contact", kind: "passive", col: 3, row: 0, at: { x: 10, y: 4.5 }, note: "A curved steel spring that holds the moving contact on NC, then snaps it over to NO. The snap makes the click and keeps the contact clean." },
      { id: "out", label: "NO", sub: "to board pin", kind: "pin", col: 4, row: 0, at: "OUT", note: "Closes to COM when pressed. With INPUT_PULLUP the board pin reads LOW." },
      { id: "com", label: "COM", sub: "to ground", kind: "ground", col: 3, row: 1, at: "GND", note: "The moving contact's terminal." },
      { id: "nc", label: "NC", kind: "pin", col: 4, row: 1, at: "NC", note: "Closed to COM at rest, opens when pressed." },
    ],
    links: [
      { from: "bump", to: "lever", kind: "physical", label: "push" },
      { from: "lever", to: "plunger", kind: "mechanical" },
      { from: "plunger", to: "spring", kind: "mechanical", label: "click" },
      { from: "spring", to: "out", kind: "signal", label: "HIGH → LOW" },
      { from: "com", to: "spring", kind: "ground" },
      { from: "nc", to: "spring", kind: "signal" },
    ],
    steps: [
      "At rest, COM is joined to NC. NO is open, so the board's pull-up holds OUT at HIGH.",
      "Something presses the lever tip. Past about 2 mm of travel the plunger is pushed in far enough.",
      "The snap spring flips: COM leaves NC and lands on NO with a click. OUT is tied to ground and reads LOW.",
      "For 1 to 3 ms the contact bounces. Wait about 10 ms in code before you trust the change.",
    ],
  },
  facts: [
    { label: "Size", value: "20 × 10 × 6 mm" },
    { label: "Type", value: "SPDT snap-action" },
    { label: "Rating", value: "5 A 125 V AC" },
    { label: "Force", value: "about 0.5 to 1.5 N" },
    { label: "Travel", value: "about 2 to 3 mm" },
    { label: "Life", value: "1,000,000 presses" },
  ],
  spec: {
    form: {
      mass: 5,
      mount: "solder",
      pitch: 6.35,
      holes: HOLES.map((x) => ({ x, y: 3.4, d: 2.3 })),
      note: "Bolts to a bracket through two small holes. The three flat lugs take solder or 2.8 mm push-on connectors, or a short wire to a breadboard. Hole and lug positions are typical, not read from a drawing.",
    },
    power: {
      interface: "Digital input with a pull-up. C to NO closes when pressed; C to NC opens. Bounce 1 to 3 ms.",
      note: "Contacts rated 5 A at 125 V AC and 3 A at 250 V AC (resistive). For logic, use under about 100 mA. No supply.",
    },
    sourcing: { mpn: "KW12-3", maker: "Generic; Omron SS-5GL is the genuine part", lifecycle: "generic", usd: [0.2, 1], note: "Roller-lever versions add a plastic wheel at the tip. Sub-mini (12.8 mm) and mini (28 mm) switches are different sizes." },
    limits: [
      "Lever force changes from 0.5 N to 1.5 N between sellers. Mount it for 2 to 3 mm of trip travel and add a stop, or the lever bends.",
      "Contacts bounce for 1 to 3 ms, so debounce in software.",
      "The 5 A rating is for plain resistive loads. A motor halves its life.",
      "A bare switch comes with no wires, and its lugs break if bent more than once.",
      "Not sealed against dust or moisture.",
    ],
    upgrade: [
      { name: "Omron SS-5GL", why: "The same size with a tested force and 10 million mechanical operations. For no wear at all, use an optical or Hall endstop." },
    ],
    refs: [
      "https://www.mouser.lt/datasheet/2/1398/Soldered_101411_microswitch_kw12_3-3532466.pdf",
      "https://besomi.com/ae_en/kw12micro-limit-switch5a-125v3a-250vspdt.html",
    ],
  },
  sim: {
    kind: "sensor",
    reads: [{ key: "pressed", label: "Lever", min: 0, max: 1, step: 1, start: 0, sweep: [0, 1, 3], states: ["Free", "Pressed"] }],
    trips: [{ pin: "OUT", key: "pressed", when: "above", at: 0.5, activeLow: true }],
  },
  experiment: { title: "Bumper stop", idea: "Fix it to the front of a robot so the lever sticks out. When it reads LOW, stop the motors, back up for half a second and turn." },
  tags: ["limit switch", "microswitch", "endstop", "bumper", "lever", "KW12", "SS-5GL", "input", "control"],
});
