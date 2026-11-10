import { MATERIAL, definePart, gnd, pin, type Solid } from "../../sdk";

const STEEL = "#c9ccd1";
const BODY = 3.4;
const COVER = 0.3;
const TOP = BODY + COVER;

/** One flat leg: it leaves the side of the body, turns down and ends in a foot below. */
function leg(cx: number, cy: number, side: "left" | "right"): Solid[] {
  const stubX = side === "left" ? cx - 0.15 : cx - 0.15 - 0.3;
  return [
    { kind: "box", x: stubX, y: cy - 0.3, w: 0.45, h: 0.6, d: 0.3, z: 0.6, top: STEEL, finish: "tin", radius: 0.05 },
    { kind: "box", x: cx - 0.15, y: cy - 0.3, w: 0.3, h: 0.6, d: 4.5, z: -3.9, top: STEEL, finish: "tin", radius: 0.05 },
  ];
}

/** The four crimped tabs that hold the steel cover on the body, folded down the long sides. */
const tabs: Solid[] = [1.0, 4.2].flatMap((x): Solid[] => [
  { kind: "box", x, y: -0.05, w: 0.8, h: 0.3, d: 1.5, z: BODY - 1.2, top: STEEL, finish: "metal", radius: 0.05 },
  { kind: "box", x, y: 5.75, w: 0.8, h: 0.3, d: 1.5, z: BODY - 1.2, top: STEEL, finish: "metal", radius: 0.05 },
]);

export default definePart({
  id: "push-button",
  name: "6 × 6 mm tactile push button",
  aka: ["tactile switch", "momentary switch", "pushbutton", "tact switch"],
  group: "controls",
  rank: 1,
  summary: "The little black clicker in every starter kit. It joins its two sides only while you hold it down. Wire one leg to a board pin and one to ground, turn on INPUT_PULLUP, and a press reads LOW.",
  size: { w: 6, h: 6, d: 5 },
  solids: [
    { kind: "box", x: 0, y: 0, w: 6, h: 6, d: BODY, z: 0, top: MATERIAL.plasticBlack, side: "#111214", radius: 0.4, finish: "plastic" },
    ...tabs,
    // The stainless cover plate, with a round hole for the plunger and a dimple at each corner.
    { kind: "box", x: 0.15, y: 0.15, w: 5.7, h: 5.7, d: COVER, z: BODY, top: STEEL, finish: "metal", radius: 0.4 },
    ...[0.85, 5.15].flatMap((x) => [0.85, 5.15].map((y): Solid => ({ kind: "disc", cx: x, cy: y, r: 0.35, color: "#9ea3aa", z: TOP + 0.01 }))),
    { kind: "disc", cx: 3, cy: 3, r: 2.2, color: "#0c0d0f", z: TOP + 0.01 },
    { kind: "cyl", id: "plunger", cx: 3, cy: 3, r: 1.8, d: 5 - TOP, z: TOP, top: "#2a2b2f", side: "#17181a", finish: "plastic" },
    ...leg(-0.25, 0.75, "left"),
    ...leg(-0.25, 5.25, "left"),
    ...leg(6.25, 0.75, "right"),
    ...leg(6.25, 5.25, "right"),
  ],
  features: [
    { id: "plunger", label: "Plunger", kind: "button", x: 1.2, y: 1.2, w: 3.6, h: 3.6, note: "The round cap you press. About 1.3 mm of it sticks out above the cover. It needs roughly 2.5 N, a firm fingertip, and clicks when it gives." },
    { id: "cover", label: "Steel cover", kind: "mechanical", x: 0.15, y: 0.15, w: 5.7, h: 5.7, note: "A thin stainless plate crimped over the body with four tabs. Under it a little steel dome snaps down and touches the two contacts." },
    { id: "body", label: "Plastic body", kind: "other", x: 0, y: 0, w: 6, h: 6, note: "A 6 × 6 mm black block, 3.4 mm tall. The four legs come out of its two sides." },
    { id: "side-a", label: "Legs 1 and 2", kind: "pins", x: -0.9, y: 0, w: 1.3, h: 6, note: "These two legs are joined inside, always. They are one terminal, not two. 4.5 mm apart." },
    { id: "side-b", label: "Legs 3 and 4", kind: "pins", x: 5.6, y: 0, w: 1.3, h: 6, note: "These two are joined to each other too. Pressing the button joins this side to the other side. 6.5 mm from the first pair." },
    { id: "pair-note", label: "OUT and GND legs", kind: "pins", x: -0.9, y: 0, w: 7.8, h: 1.5, note: "Pick one leg from each side, like the two on the top edge. Two legs from the same side are already joined, so the button would read pressed all the time." },
  ],
  pins: [
    pin("OUT", "digital", "out-digital", "One leg to a board pin set to INPUT_PULLUP. Reads HIGH released, LOW pressed. No resistor needed.", { label: "Out" }),
    gnd("GND", "A leg from the other side, to ground. Not the leg joined to OUT."),
  ],
  pinAt: {
    OUT: { x: -0.25, y: 0.75 },
    GND: { x: 6.25, y: 0.75 },
  },
  circuit: {
    blocks: [
      { id: "finger", label: "Finger", sub: "about 2.5 N", kind: "world", col: 0, row: 0, note: "You push the plunger down about 0.25 mm." },
      { id: "plunger", label: "Plunger", sub: "with steel dome", kind: "actuator", col: 1, row: 0, at: "plunger", note: "It presses a springy steel dome. The dome clicks down and touches both contacts." },
      { id: "contacts", label: "Contacts", sub: "side A to side B", kind: "passive", col: 2, row: 0, at: { x: 3, y: 3 }, note: "Open when released. Closed, under 0.1 Ω, while pressed. Each side has two legs joined inside." },
      { id: "out", label: "OUT", sub: "to board pin", kind: "pin", col: 3, row: 0, at: "OUT", note: "The leg that goes to your board. INPUT_PULLUP holds it HIGH until the button ties it to ground." },
      { id: "gnd", label: "GND", sub: "other side", kind: "ground", col: 2, row: 1, at: "GND", note: "A leg from the other side, wired to ground." },
    ],
    links: [
      { from: "finger", to: "plunger", kind: "physical", label: "press" },
      { from: "plunger", to: "contacts", kind: "mechanical", label: "dome snaps" },
      { from: "contacts", to: "out", kind: "signal", label: "HIGH → LOW" },
      { from: "gnd", to: "contacts", kind: "ground" },
    ],
    steps: [
      "Released: the two sides are not connected. The pull-up inside your board holds OUT at HIGH.",
      "You press: the steel dome snaps down and joins side A to side B, so OUT is tied to ground and reads LOW.",
      "For 1 to 5 ms the contacts chatter, so you may see several fast presses. Wait about 10 ms before you believe a change.",
      "Let go: the dome springs back, the sides come apart and OUT goes HIGH again.",
    ],
  },
  facts: [
    { label: "Size", value: "6 × 6 × 5 mm" },
    { label: "Legs", value: "4, in 2 joined pairs" },
    { label: "Leg spacing", value: "6.5 × 4.5 mm" },
    { label: "Force", value: "about 2.5 N" },
    { label: "Rating", value: "50 V DC, 30 mA" },
    { label: "Life", value: "10,000 presses" },
  ],
  spec: {
    form: {
      mass: 0.3,
      mount: "breadboard",
      note: "Straddles the middle gap of a breadboard, so the two joined pairs land on opposite sides. If the legs 4.5 mm apart land on the same strip, the button is shorted for good. The legs are not on the 2.54 mm grid, so you may need to press them in.",
    },
    power: {
      interface: "Digital input with a pull-up: HIGH released, LOW pressed. Contacts bounce for 1 to 5 ms.",
      note: "Contacts rated 50 V DC and 30 mA (series datasheet); one vendor lists 500 mA. Fine for logic, not for motors or relays. No supply.",
    },
    sourcing: { mpn: "6×6×5 tactile switch (Alps SKQG, Omron B3F class)", maker: "Generic; Alps, Omron, C&K equivalents", lifecycle: "generic", usd: [0.02, 0.1], note: "Sold in bags of 100. Plunger heights from 4.3 to 13 mm use the same legs." },
    limits: [
      "Contacts chatter for 1 to 5 ms on every press and release. Debounce in software for about 10 ms.",
      "An input with no pull-up or pull-down floats and reads random values. Use INPUT_PULLUP.",
      "Rated only about 50 V and 30 mA on cheap parts. Do not switch a motor or relay with it.",
      "Cheap ones last about 10,000 presses.",
      "Legs on the same side are joined: placed along the breadboard gap instead of across it, it is shorted.",
    ],
    upgrade: [
      { name: "Alps SKQG or Omron B3F (6 × 6 mm)", why: "The same footprint with a steady 1.0 N feel and 100,000 to 1,000,000 presses, rated 50 mA at 12 V." },
    ],
    refs: [
      "https://static.rapidonline.com/pdf/78-3864_v1.pdf",
      "https://suntan.com.hk/pdf/switch/TSS-SS-12D02.pdf",
    ],
  },
  sim: {
    kind: "sensor",
    reads: [{ key: "pressed", label: "Button", min: 0, max: 1, step: 1, start: 0, sweep: [0, 1, 2], states: ["Released", "Pressed"] }],
    trips: [{ pin: "OUT", key: "pressed", when: "above", at: 0.5, activeLow: true }],
  },
  experiment: { title: "Press and count", idea: "Count presses with INPUT_PULLUP and print the total. Press fast and watch bounce add extra counts, then add a 10 ms wait and see them vanish." },
  tags: ["button", "push button", "tactile", "switch", "momentary", "input", "pullup", "control"],
});
