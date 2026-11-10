import { definePart, gnd, pin, type Solid } from "../../sdk";
import { flange, leg } from "./_lamps";

const MILK = "#e3e9ef";
const CX = 4.5;
const CY = 3;
// Four legs 2.54 mm apart, centered under the lens: red, common cathode (the longest), green, blue.
const X = { R: 0.69, GND: 3.23, G: 5.77, B: 8.31 } as const;
const LEN = { R: 11, GND: 14, G: 10, B: 9 } as const;

/** The cathode's post carries the three dies on a small plate; you can just make them out through the frosted lens. */
const inside: Solid[] = [
  { kind: "box", x: X.GND - 0.25, y: CY - 0.25, w: 0.5, h: 0.5, d: 4.3, z: 0.5, top: "#b9bdc3", finish: "metal" },
  { kind: "box", x: X.GND - 0.25, y: CY - 0.25, w: 2.6, h: 0.5, d: 0.4, z: 4.5, top: "#b9bdc3", finish: "metal" },
];

export default definePart({
  id: "rgb-led",
  name: "RGB LED, 5 mm",
  aka: ["tri-color LED", "common-cathode LED", "color LED"],
  group: "outputs",
  rank: 2,
  summary: "Three LEDs in one frosted dome with a shared leg. Three PWM pins and you can mix any color you can name.",
  size: { w: 9, h: 6, d: 8.8 },
  plan: "front",
  solids: [
    flange(CX, CY, MILK),
    // The frosted lens (the lab lights these two): a milky wall and dome.
    { kind: "cyl", id: "rgb-body", cx: CX, cy: CY, r: 2.5, d: 5.5, z: 1, top: MILK, side: "#dfe5ec", segments: 20, glow: "#d946ef", finish: "clear" },
    { kind: "dome", id: "rgb", cx: CX, cy: CY, r: 2.5, d: 2.3, z: 6.5, color: MILK, glow: "#d946ef", clear: true },
    ...inside,
    leg(X.R, CY, LEN.R),
    leg(X.GND, CY, LEN.GND),
    leg(X.G, CY, LEN.G),
    leg(X.B, CY, LEN.B),
  ],
  features: [
    { id: "dome", label: "Frosted dome", kind: "led", x: 2, y: 0, w: 5, h: 2.3, note: "Three dies inside, red, green and blue. The frosted plastic blends their light, so the mix reads as one color." },
    { id: "body", label: "Lens wall", kind: "other", x: 2, y: 2.3, w: 5, h: 5.5, note: "Milky epoxy so the three colors blend; look closely while it's lit and you can see the three dots." },
    { id: "rim", label: "Flange with a flat side", kind: "other", x: 1.6, y: 7.8, w: 5.8, h: 1, note: "The flat on the left, next to the red leg, shows which way round it is." },
    { id: "r", label: "Red (+)", kind: "pin", x: 0.3, y: 8.8, w: 0.8, h: 11, note: "Red anode, through its own 150 Ω resistor at 5 V." },
    { id: "c", label: "Common cathode (−), longest", kind: "pin", x: 2.8, y: 8.8, w: 0.8, h: 14, note: "Shared by all three; to GND. On common-anode parts this leg goes to 5 V instead." },
    { id: "g", label: "Green (+)", kind: "pin", x: 5.4, y: 8.8, w: 0.8, h: 10, note: "Green anode, through about 100 Ω at 5 V." },
    { id: "b", label: "Blue (+)", kind: "pin", x: 7.9, y: 8.8, w: 0.8, h: 9, note: "Blue anode, through about 100 Ω at 5 V." },
  ],
  pins: [
    pin("R", "pwm", "pwm", "Red anode, leg 1 (next to the flat). Through about 150 Ω to a PWM pin.", { required: false }),
    gnd("GND", "Common cathode, the longest leg (leg 2). To GND."),
    pin("G", "pwm", "pwm", "Green anode, leg 3. Through about 100 Ω to a PWM pin.", { required: false }),
    pin("B", "pwm", "pwm", "Blue anode, leg 4. Through about 100 Ω to a PWM pin.", { required: false }),
  ],
  pinAt: {
    R: { x: X.R, y: 16 },
    GND: { x: X.GND, y: 18 },
    G: { x: X.G, y: 15 },
    B: { x: X.B, y: 14 },
  },
  circuit: {
    blocks: [
      { id: "pwm", label: "PWM pins ×3", sub: "~9, ~10, ~11", kind: "pin", col: 0, row: 0, note: "One PWM output per color." },
      { id: "res", label: "3 resistors", sub: "yours, one per color", kind: "passive", col: 1, row: 0, note: "Each die needs its own resistor; they must not share one. About 150 Ω for red and 100 Ω for green and blue at 5 V." },
      { id: "dies", label: "R, G, B dies", sub: "2.0 / 3.2 / 3.2 V", kind: "actuator", col: 2, row: 0, at: "body", note: "Three separate junctions under one dome." },
      { id: "light", label: "Mixed color", sub: "16 M combinations", kind: "world", col: 3, row: 0, note: "Your eye adds the three colors together." },
      { id: "cathode", label: "Common cathode", kind: "pin", col: 2, row: 1, at: "GND", note: "The longest leg." },
      { id: "gnd", label: "GND", kind: "ground", col: 1, row: 1, note: "Ground." },
    ],
    links: [
      { from: "pwm", to: "res", kind: "power", label: "3 channels" },
      { from: "res", to: "dies", kind: "power" },
      { from: "dies", to: "light", kind: "light" },
      { from: "dies", to: "cathode", kind: "power" },
      { from: "cathode", to: "gnd", kind: "ground" },
    ],
    steps: [
      "Three separate LEDs share one cathode leg. Each anode gets its own resistor and its own PWM pin.",
      "PWM sets how long each die is on; red + green reads as yellow, all three as white.",
      "Green is about five times brighter than red or blue at the same current, so equal PWM looks green. Trim it in code.",
      "Green and blue need about 3.2 V, so a 3.3 V pin barely lights them: run them from 5 V. Common-anode versions are wired the other way: longest leg to 5 V, and pins pull low to light a color.",
    ],
  },
  facts: [
    { label: "Dies", value: "Red, green, blue" },
    { label: "Forward voltage", value: "2.0 / 3.2 / 3.2 V" },
    { label: "Current", value: "20 mA per die" },
    { label: "Legs", value: "4, longest = common" },
    { label: "Type", value: "Common cathode" },
    { label: "Size", value: "Ø5 mm lens" },
  ],
  lab: { logic: 5, supply: [0, 5.5], tolerates5V: true },
  spec: {
    form: {
      mass: 0.4,
      mount: "breadboard",
      pitch: 2.54,
      note: "Four 0.5 mm legs in a row, 2.54 mm apart, 20 to 27 mm long when new. Lead order differs between makers (green and blue are swapped on some), so test it first.",
    },
    power: {
      draw: { idle: 0, active: 20, peak: 60 },
      interface: "Three PWM pins, one per color, each through its own resistor",
      note: "Forward voltage at 20 mA: red 2.0 to 2.2 V, green 3.0 to 3.2 V, blue 3.0 to 3.2 V. 20 mA per die; all three together up to 60 mA. At 5 V use about 150 Ω for red and 100 Ω for green and blue.",
    },
    sourcing: { mpn: "COM-09264 / COM-00105 (5 mm RGB common cathode)", maker: "Generic; SparkFun sells it", lifecycle: "generic", usd: [0.2, 1] },
    limits: [
      "Green and blue need about 3.2 V: from a 3.3 V pin through a resistor they get about 1 mA and hardly glow.",
      "Colors are not matched: green is about 4000 mcd against 800 for red, so equal PWM looks green. Correct it in code.",
      "It takes 3 pins and 3 resistors.",
      "Lead order differs between makers: check with a 3 V battery and a resistor before wiring.",
      "All three at full is up to 60 mA, more than one pin can give if you tie them together.",
    ],
    upgrade: [
      { name: "WS2812B (NeoPixel) 5 mm LED", why: "One data pin runs many LEDs, with the current control built in and 8 bits per color. It needs 5 V and takes up to 60 mA at full white." },
    ],
    refs: ["https://www.sparkfun.com/led-rgb-clear-common-cathode.html", "https://docs.sunfounder.com/projects/kepler-kit/en/latest/component/component_rgb_led.html"],
  },
  animate: { lit: ["rgb", "rgb-body"] },
  experiment: { title: "Color fader", idea: "Cycle smoothly around the hue wheel with three analogWrite calls, then map a potentiometer to the hue." },
  tags: ["rgb", "led", "colour", "color", "pwm", "light", "output"],
});
