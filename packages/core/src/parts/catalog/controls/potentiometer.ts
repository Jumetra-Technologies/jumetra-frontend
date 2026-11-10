import { MATERIAL, definePart, gnd, pin, silk, vcc } from "../../sdk";

const STEEL = "#c9ccd1";
const BLUE = "#2f5fb0";
const BLUE_SIDE = "#1d3f80";
const CX = 4.75;
const CY = 4.75;
const BASE = 3.2;
const CAN_TOP = 8.2;
const SHAFT_TOP = 17;

/** A flat leg standing below the body, centered on (cx, cy). */
const leg = (cx: number, cy: number) =>
  ({ kind: "pins", x: cx - 0.5, y: cy - 0.5, count: 1, pitch: 1, dir: "x", len: 6.4, z: -6.2, size: 0.6, color: STEEL, finish: "tin" }) as const;

export default definePart({
  id: "potentiometer",
  name: "10 kΩ rotary potentiometer",
  aka: ["pot", "trimpot", "knob", "variable resistor", "RV09", "B103", "B10K"],
  group: "controls",
  rank: 2,
  summary: "A knob that works as a voltage divider. Put 5 V and ground on the outer legs, and the middle leg slides smoothly between them as you turn. Read it with an analog pin to get a dial for speed, brightness or position.",
  size: { w: 10.5, h: 11.8, d: SHAFT_TOP },
  solids: [
    // The blue plastic base with the leg block, and the round housing on top.
    { kind: "box", x: -0.5, y: 0, w: 10.5, h: 11.8, d: BASE, z: 0, top: BLUE, side: BLUE_SIDE, radius: 0.5, finish: "plastic" },
    { kind: "cyl", id: "housing", cx: CX, cy: CY, r: 4.7, d: CAN_TOP - BASE, z: BASE, top: BLUE, side: BLUE_SIDE, finish: "plastic" },
    { kind: "disc", cx: CX, cy: CY, r: 3.6, color: STEEL, z: CAN_TOP + 0.01, ring: { color: "#8f949b", width: 0.3 } },
    // Two metal tabs that fold down on the sides and solder to the board.
    { kind: "box", x: -1.2, y: 8.2, w: 0.4, h: 1.8, d: 2.6, z: -2.4, top: STEEL, finish: "metal", radius: 0.05 },
    { kind: "box", x: 10.3, y: 8.2, w: 0.4, h: 1.8, d: 2.6, z: -2.4, top: STEEL, finish: "metal", radius: 0.05 },
    // The 6 mm knurled shaft, with a flat ground on one side so you can see it turn.
    { kind: "cyl", id: "shaft", cx: CX, cy: CY, r: 3, d: SHAFT_TOP - CAN_TOP, z: CAN_TOP, top: "#dfe2e6", side: "#c4c8ce", finish: "metal" },
    { kind: "box", id: "shaft-mark", x: CX - 0.3, y: CY - 3, w: 0.6, h: 6, d: 0.08, z: SHAFT_TOP, top: "#4a4e55", finish: "metal" },
    leg(-0.25, 10.5),
    leg(4.75, 10.5),
    leg(9.75, 10.5),
    silk(2.4, 11.4, "B103", 0.9, MATERIAL.silkDark, { anchor: "middle", z: BASE + 0.01 }),
  ],
  features: [
    { id: "shaft", label: "Shaft", kind: "mechanical", x: 1.75, y: 1.75, w: 6, h: 6, note: "A 6 mm knurled steel shaft that turns about 300°. Push a knob on it, or turn it with a fingernail." },
    { id: "housing", label: "Housing", kind: "other", x: 0.05, y: 0.05, w: 9.4, h: 9.4, note: "The round case. Inside, a wiper arm brushes along a curved carbon track." },
    { id: "legs", label: "Three legs", kind: "pins", x: -0.9, y: 9.5, w: 11.3, h: 2, note: "5 mm apart: the end of the track, the wiper in the middle, the other end. They fit holes 1, 3 and 5 of a breadboard row." },
    { id: "code", label: "B103 marking", kind: "other", x: 1.2, y: 10.7, w: 2.5, h: 1.0, note: "B means a linear taper: half a turn is half the resistance. 103 means 10 followed by three zeros, so 10 kΩ. An A on it is an audio taper, which is not straight." },
    { id: "tabs", label: "Side tabs", kind: "mechanical", x: -1.3, y: 8.1, w: 12.6, h: 2, note: "Two metal tabs solder to the board so the knob does not wiggle loose when you turn it." },
  ],
  pins: [
    vcc("VCC", "One end of the track. 3.3 V or 5 V, the same as your board's analog reference. It draws 0.5 mA at 5 V."),
    pin("OUT", "analog", "out-analog", "The wiper, the middle leg. Its voltage goes from 0 V to VCC as you turn clockwise. Wire it to an analog pin.", { label: "Wiper" }),
    gnd("GND", "The other end of the track."),
  ],
  pinAt: {
    GND: { x: -0.25, y: 10.5 },
    OUT: { x: 4.75, y: 10.5 },
    VCC: { x: 9.75, y: 10.5 },
  },
  circuit: {
    blocks: [
      { id: "vcc", label: "VCC", sub: "3.3 or 5 V", kind: "power", col: 0, row: 0, at: "VCC", note: "One end of the carbon track." },
      { id: "track", label: "Track", sub: "10 kΩ", kind: "passive", col: 1, row: 0, at: "housing", note: "A curved strip of carbon. Voltage drops evenly along it from VCC down to ground." },
      { id: "gnd", label: "GND", kind: "ground", col: 2, row: 0, at: "GND", note: "The other end of the track." },
      { id: "hand", label: "Hand", sub: "turns the knob", kind: "world", col: 0, row: 1, note: "Turn it clockwise and the output rises." },
      { id: "shaft", label: "Shaft", sub: "300° of turn", kind: "actuator", col: 1, row: 1, at: "shaft", note: "Carries the wiper arm around the track." },
      { id: "wiper", label: "Wiper", sub: "taps the track", kind: "passive", col: 1, row: 2, at: { x: 4.75, y: 4.75 }, note: "A springy metal contact that rubs on the track and picks off the voltage where it stands." },
      { id: "out", label: "OUT", sub: "0 V to VCC", kind: "pin", col: 2, row: 2, at: "OUT", note: "Wire this to an analog input. A 10-bit ADC reads 0 to 1023 across the turn." },
    ],
    links: [
      { from: "vcc", to: "track", kind: "power", label: "0.5 mA at 5 V" },
      { from: "track", to: "gnd", kind: "ground" },
      { from: "hand", to: "shaft", kind: "physical", label: "turn" },
      { from: "shaft", to: "wiper", kind: "mechanical" },
      { from: "track", to: "wiper", kind: "analog" },
      { from: "wiper", to: "out", kind: "analog", label: "angle ÷ 300° × VCC" },
    ],
    steps: [
      "VCC on one outer leg and ground on the other put the full supply across a 10 kΩ track, about 0.5 mA at 5 V.",
      "You turn the shaft. It moves a wiper along the track, and the wiper picks off the voltage where it touches.",
      "Turn all the way one way: OUT is at ground. All the way the other: OUT is at VCC. In between it is in proportion to the angle.",
      "Feed OUT only to a high-impedance input, 100 kΩ or more, such as an ADC pin. A low-impedance load pulls the middle value down.",
    ],
  },
  facts: [
    { label: "Resistance", value: "10 kΩ, ±20 %" },
    { label: "Taper", value: "Linear (B)" },
    { label: "Turn", value: "300°" },
    { label: "Shaft", value: "6 mm, knurled" },
    { label: "Leg pitch", value: "5.0 mm" },
    { label: "Life", value: "10,000 turns" },
  ],
  spec: {
    form: {
      mass: 2.5,
      mount: "breadboard",
      pitch: 5,
      note: "Three legs 5 mm apart fit holes 1, 3 and 5 of a breadboard row. The two side tabs solder to a board; on a breadboard they are left free. Body size and shaft length are estimates from the typical blue kit pot.",
    },
    power: {
      supply: { min: 0, max: 35, typ: 5 },
      logic: 5,
      tolerant5V: true,
      draw: { idle: 0.5, active: 0.5, peak: 0.5 },
      interface: "Analog voltage divider: Vout = VCC × angle ÷ 300°",
      note: "Rated 0.125 W for the B taper, which is 35 V across 10 kΩ. At 5 V the whole track draws 0.5 mA. Keep its output loaded by 100 kΩ or more.",
    },
    sourcing: { mpn: "RV09 / WH148 B10K", maker: "Alpha, KLS, generic", lifecycle: "generic", usd: [0.2, 0.6] },
    limits: [
      "The 10 kΩ is only good to ±20 %: it may measure 8 to 12 kΩ.",
      "An A (audio) taper marked A103 gives a very uneven sweep. Look for B.",
      "Output sags if the load is under about 100 kΩ, since the wiper source resistance is up to 2.5 kΩ at mid-turn.",
      "The wiper wears out after 10,000 to 15,000 turns.",
      "A few percent at each end of the 300° is a dead band, and the reading is noisy as the wiper moves.",
      "Rated 0.125 W: do not use it as a variable resistor in a motor or LED power circuit.",
    ],
    upgrade: [
      { name: "Bourns PTV09A or ALPS RK09K", why: "The same 9 mm footprint with a smoother conductive-plastic track, rated 15,000 to 50,000 turns." },
      { name: "AS5600 magnetic angle sensor", why: "A contactless 12-bit angle sensor over I2C with no wiper to wear out: 0.088° steps." },
    ],
    refs: ["https://www.rcscomponents.kiev.ua/datasheets/kls4-wh148-datasheet.pdf"],
  },
  sim: {
    kind: "sensor",
    reads: [{ key: "position", label: "Knob", unit: "%", min: 0, max: 100, step: 1, start: 50, sweep: [0, 100, 6], digits: 0 }],
    analog: [{ pin: "OUT", key: "position" }],
  },
  animate: { sweep: ["shaft", "shaft-mark"] },
  experiment: { title: "Dimmer knob", idea: "Read the wiper with analogRead, scale 0 to 1023 into 0 to 255, and use it as the brightness of an LED on a PWM pin." },
  docs: "/docs/hardware-knowledge/potentiometer",
  tags: ["potentiometer", "pot", "knob", "dial", "analog", "variable resistor", "10k", "input", "control"],
});
