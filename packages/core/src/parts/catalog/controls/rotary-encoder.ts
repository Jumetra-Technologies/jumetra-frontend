import { MATERIAL, board, definePart, gnd, name, pin, pinHeader, polygonPath, silk, smd, vcc, type Solid } from "../../sdk";

const TOP = 1.6;
const CX = 13;
const CY = 7.2;
const CAN_TOP = TOP + 6.5;
const SHAFT_TOP = 30;
const STEEL = "#c9ccd1";

const header = pinHeader(7.92, 17.6, 5, { style: "down" });

/** A hexagon of the given circumradius, for the nut on the bushing. */
const hex = (cx: number, cy: number, r: number) =>
  polygonPath(Array.from({ length: 6 }, (_, i): [number, number] => [cx + r * Math.cos((i * Math.PI) / 3), cy + r * Math.sin((i * Math.PI) / 3)]));

export default definePart({
  id: "rotary-encoder",
  name: "KY-040 rotary encoder",
  aka: ["EC11", "rotary knob", "quadrature encoder", "KY040", "click encoder", "encoder module"],
  group: "controls",
  rank: 5,
  summary: "A knob that clicks as you turn it and tells your board which way. Each click makes two signals, CLK and DT, change in a pattern that is different clockwise and counter-clockwise. Pushing the knob presses a switch. Use it for menus, volume and settings.",
  size: { w: 26, h: 20, d: SHAFT_TOP },
  solids: [
    ...board(26, 20, MATERIAL.pcbBlack, { radius: 0.4 }),
    // The EC11 encoder: a steel can with its four crimp tabs, the threaded bushing with a nut, and the shaft.
    { kind: "box", id: "can", x: CX - 6, y: CY - 6, w: 12, h: 12, d: CAN_TOP - TOP, z: TOP, top: "#b9bcc2", side: "#8f949b", radius: 0.5, finish: "metal" },
    ...[-4.2, 4.2].flatMap((dx): Solid[] => [
      { kind: "box", x: CX + dx - 0.8, y: CY - 6.15, w: 1.6, h: 0.3, d: 1.6, z: TOP + 0.9, top: "#8f949b", finish: "metal", radius: 0.05 },
      { kind: "box", x: CX + dx - 0.8, y: CY + 5.85, w: 1.6, h: 0.3, d: 1.6, z: TOP + 0.9, top: "#8f949b", finish: "metal", radius: 0.05 },
    ]),
    { kind: "cyl", cx: CX, cy: CY, r: 3.6, d: 6.9, z: CAN_TOP, top: "#d5d8dc", side: "#a3a8af", finish: "metal" },
    { kind: "extrude", path: hex(CX, CY, 4.7), d: 1.8, z: CAN_TOP + 2.4, top: "#c3c7cc", side: "#9ea3aa", finish: "metal", bevel: 0.2 },
    { kind: "cyl", id: "shaft", cx: CX, cy: CY, r: 3, d: SHAFT_TOP - CAN_TOP, z: CAN_TOP, top: "#eceef1", side: "#c4c8ce", finish: "metal" },
    // The flat ground on one side of the shaft, so a knob can only go on one way.
    { kind: "box", id: "flat", x: CX - 1.4, y: CY + 2.2, w: 2.8, h: 0.4, d: SHAFT_TOP - 17 + 0.1, z: 17, top: "#6b6f76", finish: "metal" },
    // The solder pads of the encoder's five legs: three on one side, two on the other.
    ...[10.5, 13, 15.5].map((x): Solid => ({ kind: "disc", cx: x, cy: 14.0, r: 0.8, color: MATERIAL.tin, z: TOP })),
    ...[11.75, 14.25].map((x): Solid => ({ kind: "disc", cx: x, cy: 0.9, r: 0.7, color: MATERIAL.tin, z: TOP })),
    // The three 10 kΩ pull-ups.
    ...[3.6, 6.1, 8.6].flatMap((y) => smd(21.8, y, "r", "x")),
    header,
    silk(3.6, 11, "KY-040", 1.3, MATERIAL.silk, { rotate: -90, weight: 700 }),
    silk(7.92, 16.1, "GND", 0.85, MATERIAL.silk, { anchor: "middle" }),
    silk(10.46, 16.1, "+", 0.85, MATERIAL.silk, { anchor: "middle" }),
    silk(13, 16.1, "SW", 0.85, MATERIAL.silk, { anchor: "middle" }),
    silk(15.54, 16.1, "DT", 0.85, MATERIAL.silk, { anchor: "middle" }),
    silk(18.08, 16.1, "CLK", 0.85, MATERIAL.silk, { anchor: "middle" }),
  ],
  features: [
    { id: "shaft", label: "Shaft with flat", kind: "mechanical", x: CX - 3, y: CY - 3, w: 6, h: 6, note: "A 6 mm steel shaft about 20 mm long with a flat on one side. Press a knob on it. It turns without stop and clicks every 18°, which is 20 clicks a turn." },
    { id: "can", label: "EC11 encoder", kind: "chip", x: CX - 6, y: CY - 6, w: 12, h: 12, note: "A steel can with two sets of contacts that touch a patterned disc inside. Pushing the shaft down presses a third switch." },
    { id: "nut", label: "Bushing and nut", kind: "mechanical", x: CX - 4.7, y: CY - 4.7, w: 9.4, h: 9.4, note: "A threaded bushing and a hex nut to fix it through a panel hole." },
    { id: "pullups", label: "Pull-up resistors", kind: "other", x: 20.7, y: 3, w: 2.4, h: 7, note: "Three 10 kΩ resistors tie CLK, DT and SW to + so they read high until a contact pulls them to ground. Clones differ, so on some boards SW has none." },
    { id: "header", label: "GND, +, SW, DT, CLK", kind: "pins", x: 6.6, y: 16.3, w: 12.8, h: 2.6, note: "Five pins, 2.54 mm apart. GND is on the left when the shaft points up the page." },
  ],
  pins: [
    gnd("GND"),
    vcc("VCC", "3.3 V or 5 V. The pull-ups on CLK, DT and SW return here, so the outputs swing from 0 V to this.", { label: "+" }),
    pin("SW", "digital", "out-digital", "Low while you push the knob down, high otherwise. If your clone has no pull-up, turn on INPUT_PULLUP.", { label: "SW" }),
    pin("DT", "digital", "out-digital", "Channel B. One click turns it into a square wave a quarter cycle behind or ahead of CLK, which tells the direction.", { label: "DT" }),
    pin("CLK", "digital", "out-digital", "Channel A. Falls first on a clockwise click. Read it on an interrupt and look at DT.", { label: "CLK" }),
  ],
  pinAt: name(header, "GND", "VCC", "SW", "DT", "CLK"),
  circuit: {
    blocks: [
      { id: "hand", label: "Hand", sub: "turn or push", kind: "world", col: 0, row: 0, note: "Turn the knob either way, as far as you like. Push it for the switch." },
      { id: "shaft", label: "Shaft", sub: "20 clicks a turn", kind: "actuator", col: 1, row: 0, at: "shaft", note: "Carries a notched disc inside the can, with a spring that makes each click." },
      { id: "enc", label: "A and B contacts", sub: "90° apart", kind: "passive", col: 2, row: 0, at: "can", note: "Two sliding contacts ride on the disc. Because they sit a quarter step apart, they open and close one after the other." },
      { id: "clk", label: "CLK", sub: "channel A", kind: "pin", col: 3, row: 0, at: "CLK", note: "High at rest. Drops to ground when contact A closes." },
      { id: "vcc", label: "+ 3.3 or 5 V", kind: "power", col: 0, row: 1, at: "VCC", note: "Feeds the three pull-ups." },
      { id: "pull", label: "Pull-ups", sub: "10 kΩ", kind: "passive", col: 2, row: 1, at: "pullups", note: "Hold each output high until a contact grounds it. Most clones use 10 kΩ; it is not on the sheet, so treat it as typical." },
      { id: "dt", label: "DT", sub: "channel B", kind: "pin", col: 3, row: 1, at: "DT", note: "The same, a quarter cycle out of step." },
      { id: "gnd", label: "GND", kind: "ground", col: 0, row: 2, at: "GND", note: "The contacts close to ground." },
      { id: "push", label: "Push switch", sub: "in the shaft", kind: "passive", col: 2, row: 2, at: "can", note: "A third switch under the shaft that closes when you push the knob down." },
      { id: "sw", label: "SW", sub: "low when pushed", kind: "pin", col: 3, row: 2, at: "SW", note: "Reads high at rest and low while pushed." },
    ],
    links: [
      { from: "hand", to: "shaft", kind: "physical", label: "turn, push" },
      { from: "shaft", to: "enc", kind: "mechanical" },
      { from: "shaft", to: "push", kind: "mechanical", label: "push" },
      { from: "vcc", to: "pull", kind: "power" },
      { from: "pull", to: "clk", kind: "signal" },
      { from: "pull", to: "dt", kind: "signal" },
      { from: "enc", to: "clk", kind: "signal", label: "A" },
      { from: "enc", to: "dt", kind: "signal", label: "B" },
      { from: "gnd", to: "push", kind: "ground" },
      { from: "push", to: "sw", kind: "signal", label: "to GND" },
    ],
    steps: [
      "CLK and DT are held high by pull-ups. Turning the knob makes two contacts close to ground, one a quarter step after the other.",
      "Turn clockwise and CLK falls first, then DT, then CLK rises, then DT rises. Turn the other way and DT leads.",
      "Your board watches CLK. When it falls, it reads DT: if DT is still high, you turned clockwise; if DT is low, counter-clockwise. Add or take 1.",
      "Contacts bounce for 1 to 5 ms on every edge, so debounce in code or add a 10 nF capacitor to each output.",
      "Push the knob and SW goes low. Read it like any button.",
    ],
  },
  facts: [
    { label: "Clicks", value: "20 per turn" },
    { label: "Outputs", value: "CLK, DT (quadrature)" },
    { label: "Supply", value: "3.3 to 5 V" },
    { label: "Bounce", value: "1 to 5 ms" },
    { label: "Life", value: "about 30,000 turns" },
    { label: "Size", value: "26 × 20 × 30 mm" },
  ],
  spec: {
    form: {
      mass: 5,
      mount: "jumpers",
      pitch: 2.54,
      note: "A 1 × 5 header for jumper wires or a breadboard. The board has no mounting holes; the knob end is held by the bushing and nut through a panel. Shaft length and can size are estimates.",
    },
    power: {
      supply: { min: 3.3, max: 5, typ: 5 },
      logic: 5,
      tolerant5V: true,
      draw: { idle: 0.5, active: 0.5, peak: 1.5 },
      interface: "Quadrature CLK and DT, plus an active-low switch SW",
      note: "A 10 kΩ pull-up across a closed contact draws 0.5 mA at 5 V, and up to 1.5 mA with all three closed. Switch bounce can last 10 ms.",
    },
    sourcing: { mpn: "EC11 (KY-040 module)", maker: "ALPS / generic", lifecycle: "generic", usd: [0.8, 2] },
    limits: [
      "The contacts bounce for 1 to 5 ms on every edge, so an interrupt can miss or double-count a click without debouncing.",
      "Only 20 clicks a turn, 18° each. Polling loses steps above about 100 steps a second.",
      "Rated for about 30,000 cycles, then the contacts wear.",
      "Pull-up values are not published and change between clones; some boards leave SW without one.",
      "The CLK and DT timing is not modeled in the lab yet: they toggle as the position moves but do not run in true quadrature.",
    ],
    upgrade: [
      { name: "Bourns PEC11R or Alps EC11E", why: "The same footprint and a better-controlled part: bounce under 5 ms and 30,000 cycles on the datasheet." },
      { name: "AS5600 magnetic encoder or a 600 pulse optical encoder", why: "No contacts to bounce or wear, and far finer steps for fast motion." },
    ],
    refs: ["https://protosupplies.com/product/rotary-encoder-module/", "https://docs.wokwi.com/parts/wokwi-ky-040"],
  },
  sim: {
    kind: "sensor",
    reads: [
      { key: "position", label: "Knob", unit: "clicks", min: 0, max: 20, step: 1, start: 0, sweep: [0, 20, 12], digits: 0 },
      { key: "pressed", label: "Push", min: 0, max: 1, step: 1, start: 0, sweep: [0, 1, 5], states: ["Released", "Pressed"] },
    ],
    trips: [
      { pin: "CLK", key: "position", when: "above", at: 5, activeLow: true },
      { pin: "DT", key: "position", when: "above", at: 11, activeLow: true },
      { pin: "SW", key: "pressed", when: "above", at: 0.5, activeLow: true },
    ],
  },
  animate: { spin: ["shaft", "flat"], axis: { at: [CX, CY, TOP], dir: "z" } },
  experiment: { title: "Volume knob", idea: "Count clicks on CLK with an interrupt, add or take one by reading DT, and show the number on a display. Push the knob to reset it to zero." },
  docs: "/docs/hardware-knowledge/rotary-encoder",
  tags: ["rotary encoder", "encoder", "knob", "ky-040", "ec11", "quadrature", "dial", "input", "control"],
});
