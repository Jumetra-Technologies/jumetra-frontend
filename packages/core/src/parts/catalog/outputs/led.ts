import { MATERIAL, definePart, gnd, pin, type Solid } from "../../sdk";
import { flange, leg } from "./_lamps";

const RED = "#e0252b";
// The lens is 5 mm across and the part is 8.8 mm tall: flange 1 mm, straight wall to 6.5 mm, dome above.
const CX = 3;
const CY = 3;
const ANODE_X = 4.27;
const CATHODE_X = 1.73;

/** What you see inside the clear lens: the cathode's post and the anvil cup that holds the die, the shorter anode post and the hair-thin bond wire. */
const inside: Solid[] = [
  { kind: "box", x: CATHODE_X - 0.25, y: CY - 0.25, w: 0.5, h: 0.5, d: 4.4, z: 0.5, top: MATERIAL.tin, finish: "metal" },
  { kind: "box", x: CATHODE_X - 0.25, y: CY - 0.25, w: 1.6, h: 0.5, d: 0.4, z: 4.5, top: MATERIAL.tin, finish: "metal" },
  { kind: "cyl", cx: CX, cy: CY, r: 0.95, d: 0.7, z: 4.4, top: "#d6d9dd", finish: "metal", segments: 14 },
  { kind: "box", x: CX - 0.17, y: CY - 0.17, w: 0.34, h: 0.34, d: 0.2, z: 5.05, top: "#e8c45a", finish: "gold" },
  { kind: "box", x: ANODE_X - 0.25, y: CY - 0.25, w: 0.5, h: 0.5, d: 4.0, z: 0.5, top: MATERIAL.tin, finish: "metal" },
  { kind: "wire", points: [[ANODE_X, CY, 4.5], [3.7, CY, 5.4], [CX + 0.1, CY, 5.2]], r: 0.06, color: "#e8c45a", finish: "gold" },
];

export default definePart({
  id: "led",
  name: "LED, 5 mm red",
  aka: ["light-emitting diode", "red LED", "indicator LED"],
  group: "outputs",
  rank: 1,
  summary: "The first thing anyone makes a board do. Current goes in the long leg, light comes out the top, and a resistor in series keeps both alive.",
  size: { w: 6, h: 6, d: 8.8 },
  plan: "front",
  solids: [
    flange(CX, CY, RED),
    // The lens: a clear red wall and dome (the lab lights these two).
    { kind: "cyl", id: "led-body", cx: CX, cy: CY, r: 2.5, d: 5.5, z: 1, top: RED, side: "#b81c22", segments: 20, glow: RED, finish: "clear" },
    { kind: "dome", id: "led", cx: CX, cy: CY, r: 2.5, d: 2.3, z: 6.5, color: RED, glow: RED, clear: true, finish: "clear" },
    ...inside,
    leg(CATHODE_X, CY, 11),
    leg(ANODE_X, CY, 13),
  ],
  features: [
    { id: "dome", label: "Dome", kind: "led", x: 0.5, y: 0, w: 5, h: 2.3, note: "Clear red epoxy that shapes the light into a beam 30° to 60° wide. The color comes from the semiconductor inside, not the plastic." },
    { id: "body", label: "Lens wall", kind: "other", x: 0.5, y: 2.3, w: 5, h: 5.5, note: "A straight 5 mm wall of water-clear epoxy. Look through it and you can see the metal inside." },
    { id: "die", label: "Anvil and die", kind: "chip", x: 1.5, y: 3.4, w: 2.4, h: 1.6, note: "The cathode leg ends in a cup (the anvil) with a tiny die glued in it. A bond wire, thinner than a hair, joins the die to the anode leg." },
    { id: "rim", label: "Flange with a flat side", kind: "other", x: 0.1, y: 7.8, w: 5.8, h: 1, note: "The flat edge on the left of the flange marks the cathode (−)." },
    { id: "anode", label: "Anode (+), longer leg", kind: "pin", x: 3.9, y: 8.8, w: 0.8, h: 13, note: "Current enters here. Always through a resistor." },
    { id: "cathode", label: "Cathode (−), shorter leg", kind: "pin", x: 1.3, y: 8.8, w: 0.8, h: 11, note: "Current leaves here, to GND. It is on the flat side." },
  ],
  pins: [
    pin("A", "digital", "drive", "Longer leg. From an output pin, through a resistor of 150 to 330 Ω.", { label: "Anode (+)" }),
    gnd("C", "Shorter leg, on the flat side of the flange. To GND.", { label: "Cathode (−)" }),
  ],
  pinAt: {
    A: { x: ANODE_X, y: 21.3 },
    C: { x: CATHODE_X, y: 15.8 },
  },
  circuit: {
    blocks: [
      { id: "gpio", label: "Board pin", sub: "HIGH = 5 V", kind: "pin", col: 0, row: 0, note: "Any digital pin; a ~ pin if you want to dim it with PWM." },
      { id: "res", label: "220 Ω resistor", sub: "yours, in series", kind: "passive", col: 1, row: 0, note: "Sets the current: (5 − 2 V) ÷ 220 Ω ≈ 14 mA. Without it the LED or the pin burns." },
      { id: "anode", label: "Anode +", kind: "pin", col: 2, row: 0, at: "A", note: "The longer leg." },
      { id: "die", label: "LED die", sub: "drops ~2 V", kind: "actuator", col: 3, row: 0, at: "die", note: "A semiconductor junction; electrons crossing it give off light of one color." },
      { id: "light", label: "Light", sub: "~20 mA = full bright", kind: "world", col: 3, row: 1, note: "Brightness follows current, not voltage." },
      { id: "cathode", label: "Cathode −", kind: "pin", col: 2, row: 1, at: "C", note: "The shorter leg, on the flat side." },
      { id: "gnd", label: "GND", kind: "ground", col: 1, row: 1, note: "Back to the board's ground." },
    ],
    links: [
      { from: "gpio", to: "res", kind: "power", label: "5 V" },
      { from: "res", to: "anode", kind: "power", label: "~14 mA" },
      { from: "anode", to: "die", kind: "power" },
      { from: "die", to: "light", kind: "light" },
      { from: "die", to: "cathode", kind: "power" },
      { from: "cathode", to: "gnd", kind: "ground" },
    ],
    steps: [
      "The pin goes HIGH (5 V). The resistor sets the current: (5 − 2 V) ÷ 220 Ω ≈ 14 mA. Never skip it; without it the LED or the pin burns.",
      "Current enters at the anode, crosses the semiconductor junction, and electrons give up their energy as light of one color.",
      "It leaves by the cathode to GND. Reverse it and nothing lights: an LED is a one-way valve.",
      "Dim it with PWM: analogWrite switches it on and off faster than your eye can follow.",
    ],
  },
  facts: [
    { label: "Forward voltage", value: "~2 V red, ~3.2 V blue/white" },
    { label: "Current", value: "10–20 mA" },
    { label: "Resistor", value: "220–330 Ω at 5 V" },
    { label: "Beam", value: "30–60°" },
    { label: "Polarity", value: "Long leg = +" },
    { label: "Size", value: "Ø5 mm lens, 8.8 mm tall" },
  ],
  lab: { logic: 5, supply: [0, 5.5], tolerates5V: true },
  spec: {
    form: {
      mass: 0.3,
      mount: "breadboard",
      pitch: 2.54,
      note: "Two 0.5 mm legs, 2.54 mm apart, 24 to 27 mm long when new. The legs go straight into a breadboard.",
    },
    power: {
      draw: { idle: 0, active: 20, peak: 100 },
      interface: "Drops about 2 V (red) across it; the resistor takes the rest",
      note: "Forward voltage: red 1.8 to 2.2 V, yellow 2.0 to 2.4 V, green 1.9 to 2.1 V (pure green 3.0 to 3.2 V), blue and white 3.0 to 3.4 V. Current: 10 to 20 mA works; 20 mA is the usual limit; 100 mA only in 1 ms pulses at 1/10 duty. R = (supply − Vf) ÷ I: 150 Ω at 5 V and 20 mA, 65 Ω at 3.3 V.",
    },
    sourcing: { mpn: "5 mm red LED (many makers)", maker: "Kingbright, Everlight, Vishay, Broadcom, generic", lifecycle: "generic", usd: [0.03, 0.2] },
    limits: [
      "No resistor means nothing limits the current but the supply: the LED dies in a moment, or the pin does.",
      "Over about 20 to 30 mA it dims and fails early.",
      "Reverse voltage over about 5 V kills it.",
      "Forward voltage depends on color: a 3.3 V pin cannot light a blue or white LED through a resistor.",
      "At 5 V and 20 mA the resistor turns 60 % of the power into heat.",
    ],
    upgrade: [
      { name: "3 mm or 2 mm super-bright LED", why: "As bright to the eye at 2 mA as a standard 5 mm one at 20 mA: a tenth of the current, so a pin can drive several." },
      { name: "WS2812B addressable LEDs", why: "Any color from one data pin, with no resistors; each takes up to 60 mA at full white." },
    ],
    refs: ["https://www.vishay.com/en/leds/t1-3m-34-5/"],
  },
  experiment: { title: "Blink, then breathe", idea: "Blink it once a second, then fade it up and down with analogWrite on a ~ pin." },
  animate: { lit: ["led", "led-body"] },
  tags: ["led", "light", "diode", "blink", "5mm", "indicator", "output"],
});
