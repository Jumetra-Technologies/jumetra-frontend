import { definePart, pin, shade } from "../../sdk";
import type { Solid } from "../../sdk";

/**
 * A 470 µF 16 V radial aluminum electrolytic (8 × 12 mm can, 3.5 mm lead
 * pitch), lying on the bench on its side with the legs trimmed. The vent end
 * faces left, the rubber seal and the legs face right, and the white stripe
 * with its "−" marks runs along the side of the negative leg.
 */

const SLEEVE = "#0f2a5e";
const STRIPE = "#dfe2e8";
const TIN = "#c9ccd1";
const ALU = "#b9bcc3";
const R = 4; // can radius: 8 mm across
const AXIS = R; // the axis is one radius above the bench
const CY = 4; // middle of the footprint
const LEN = 12; // can length
const PITCH = 3.5;
const NEG_Y = CY - PITCH / 2;
const POS_Y = CY + PITCH / 2;
const NEG_END = LEN + 6.5; // legs trimmed; the positive one stays longer
const POS_END = LEN + 8;

/** A cylinder lying along x from `x` for `length`, on the can's axis. */
const lying = (x: number, length: number, r: number, color: string, extra: Partial<Extract<Solid, { kind: "cyl" }>> = {}): Solid => ({
  kind: "cyl",
  cx: x + length / 2,
  cy: CY,
  r,
  d: length,
  z: AXIS - Math.max(r, extra.r2 ?? r),
  axis: "x",
  top: color,
  side: shade(color, 0.8),
  ...extra,
});

/** A leg: a thin cylinder lying along x at height AXIS, at lateral position y. */
const leg = (y: number, x0: number, x1: number, id: string): Solid => ({
  kind: "cyl",
  cx: (x0 + x1) / 2,
  cy: y,
  r: 0.25,
  d: x1 - x0,
  z: AXIS - 0.25,
  axis: "x",
  top: TIN,
  side: shade(TIN, 0.78),
  finish: "tin",
  id,
});

// The stripe sits on the sleeve about 40° round from the top toward the negative leg.
const THETA = (40 * Math.PI) / 180;
const STRIPE_R = R - 0.45;
const stripeY = CY - STRIPE_R * Math.sin(THETA);
const stripeZ = AXIS + STRIPE_R * Math.cos(THETA);

/** The row of "−" marks: dark dashes down the stripe. */
const MARKS: Solid[] = [1.9, 3.5, 5.1, 6.7, 8.3].map((x) => ({
  kind: "box",
  x: x - 0.45,
  y: stripeY - 0.12,
  w: 0.9,
  h: 0.24,
  d: 0.06,
  z: stripeZ + 0.63,
  top: "#2b2f38",
  finish: "plastic",
}));

/** Scored vent: two thin raised lines across the flat top of the can (seen end-on from the left). */
const VENT: Solid[] = [
  { kind: "box", x: -0.05, y: CY - 1.9, w: 0.06, h: 3.8, d: 0.3, z: AXIS - 0.15, top: "#8d9098", finish: "aluminum" },
  { kind: "box", x: -0.05, y: CY - 0.15, w: 0.06, h: 0.3, d: 3.8, z: AXIS - 1.9, top: "#8d9098", finish: "aluminum" },
];

export default definePart({
  id: "capacitor",
  name: "Electrolytic capacitor (470 µF, 16 V)",
  aka: ["capacitor", "electrolytic capacitor", "470uF", "470 µF", "bulk capacitor", "decoupling capacitor", "reservoir cap"],
  group: "prototyping",
  rank: 5,
  summary: "A small tank of charge. Put one across a motor supply or a NeoPixel strip and it covers the sudden dips when the load kicks on. It has a plus and a minus: wire it the wrong way round and it can burst.",
  size: { w: 20, h: 8, d: 8 },
  solids: [
    // Two tinned legs, 0.5 mm thick. The long one is positive.
    leg(NEG_Y, LEN - 0.2, NEG_END, "leg-neg"),
    leg(POS_Y, LEN - 0.2, POS_END, "leg-pos"),
    // The aluminum top, slightly rounded at its rim, with the scored vent.
    lying(0, 0.45, 3.5, ALU, { r2: 3.9, finish: "aluminum" }),
    // The blue sleeve.
    lying(0.4, 10.8, R, SLEEVE, { id: "can", finish: "plastic" }),
    // The groove rolled into the can near the bottom.
    lying(9.9, 0.5, R - 0.25, shade(SLEEVE, 0.85), { finish: "plastic" }),
    // The aluminum rim below the sleeve and the black rubber seal.
    lying(11.15, 0.65, R - 0.1, ALU, { finish: "aluminum" }),
    lying(11.75, 0.25, 3.3, "#17181b", { finish: "rubber" }),
    // The silver stripe along the negative side, with its minus marks.
    { kind: "wire", id: "stripe", points: [[0.9, stripeY, stripeZ], [10.7, stripeY, stripeZ]], r: 0.65, color: STRIPE, finish: "plastic" },
    ...MARKS,
    ...VENT,
    // The value, printed on top of the sleeve.
    { kind: "text", x: 6.1, y: CY + 1.5, text: "470µF 16V", size: 1.5, color: "#e8ebf2", anchor: "middle", z: AXIS + R + 0.01, weight: 600 },
  ],
  features: [
    { id: "can", label: "Aluminum can", kind: "other", x: 0, y: 0, w: 12, h: 8, note: "Holds the foil and the liquid electrolyte. 8 mm across and 12 mm long. The blue sleeve is a plastic wrap." },
    { id: "stripe", label: "Minus stripe", kind: "other", x: 0.9, y: 0.5, w: 9.8, h: 1.8, note: "The stripe with the \"−\" marks is the negative side. The leg on this side is the minus leg." },
    { id: "value", label: "Value mark", kind: "other", x: 1.6, y: 3.3, w: 9, h: 1.9, note: "470 µF (microfarads) is how much charge it holds. 16 V is the most you may put across it." },
    { id: "vent", label: "Vent", kind: "mechanical", x: 0, y: 1.5, w: 0.5, h: 5, note: "Scored lines in the top. If the part gets too hot or is wired backward, the top opens here instead of the can blowing apart." },
    { id: "seal", label: "Rubber seal", kind: "other", x: 10, y: 0.5, w: 2, h: 7, note: "Seals the bottom of the can. The legs come out through it." },
    { id: "leg-neg", label: "Minus leg", kind: "pin", x: LEN, y: NEG_Y - 0.5, w: NEG_END - LEN, h: 1, note: "The short leg, on the striped side. Goes to ground." },
    { id: "leg-pos", label: "Plus leg", kind: "pin", x: LEN, y: POS_Y - 0.5, w: POS_END - LEN, h: 1, note: "The long leg. Goes to the supply. On a new part, the leg length is the quickest way to tell plus from minus: trim them only after you have noted which is which." },
  ],
  pins: [
    pin("POS", "power", "opt", "Plus leg, the long one. Goes to the supply side of the load, at no more than 16 V.", { label: "+", side: "right" }),
    pin("NEG", "ground", "opt", "Minus leg, the short one on the striped side. Goes to ground.", { label: "−", side: "right" }),
  ],
  pinAt: { POS: { x: POS_END - 0.4, y: POS_Y }, NEG: { x: NEG_END - 0.4, y: NEG_Y } },
  circuit: {
    blocks: [
      { id: "supply", label: "Supply", sub: "5 V to 12 V", kind: "power", col: 0, row: 0, note: "A battery or regulator. Its voltage must stay under 16 V." },
      { id: "pos", label: "Plus leg", kind: "connector", col: 1, row: 0, at: "POS", note: "Connect it to the supply side, right next to the load." },
      { id: "can", label: "Foil and electrolyte", sub: "470 µF", kind: "passive", col: 2, row: 0, at: "can", note: "Two long foils rolled up with wet paper between them. The charge sits on the foil faces. It fills up when the supply is steady and gives back when the voltage dips." },
      { id: "neg", label: "Minus leg", kind: "connector", col: 3, row: 0, at: "NEG", note: "Connect it to ground, next to the load." },
      { id: "gnd", label: "GND", kind: "ground", col: 4, row: 0, note: "The way back." },
      { id: "load", label: "Motor or strip", sub: "pulls 0.5 to 1 A", kind: "actuator", col: 2, row: 1, note: "When a motor starts or a strip lights up, it asks for a big current for a few milliseconds." },
    ],
    links: [
      { from: "supply", to: "pos", kind: "power", label: "5 to 12 V" },
      { from: "pos", to: "can", kind: "power" },
      { from: "can", to: "neg", kind: "ground" },
      { from: "neg", to: "gnd", kind: "ground" },
      { from: "can", to: "load", kind: "power", label: "covers the dip" },
    ],
    steps: [
      "While the supply is steady, the capacitor charges up to the supply voltage and then sits there, taking almost no current.",
      "When the load suddenly pulls current, the supply sags. The capacitor gives back charge right then, so the voltage drops less.",
      "How much it drops: dip = current × time ÷ capacitance. A 1 A pull for 1 ms across 470 µF is 1 × 0.001 ÷ 0.00047, about 2.1 V.",
      "Once the pull ends, the supply tops the capacitor up again. That cycle repeats every time the load changes.",
      "It has a plus and a minus. Reverse it and current flows through the thin oxide layer, which heats the inside until the vent opens.",
    ],
  },
  facts: [
    { label: "Capacitance", value: "470 µF, ±20 %" },
    { label: "Voltage", value: "16 V (run it at 12.8 V or less)" },
    { label: "Polarity", value: "Stripe and short leg are minus" },
    { label: "Can", value: "8 mm across, 12 mm long" },
    { label: "Lead pitch", value: "3.5 mm" },
    { label: "Life", value: "2,000 h at 85 °C" },
  ],
  spec: {
    form: { mass: 1.2, mount: "leads", pitch: 3.5, note: "Legs 0.5 mm thick and 3.5 mm apart. New, they are about 15 mm long; this one is trimmed to 6.5 mm (minus) and 8 mm (plus). Splay them out to 5.08 mm to land in two breadboard holes two apart." },
    power: {
      supply: { min: 0, max: 16 },
      interface: "Two legs, polarized: plus to the supply, minus to ground",
      note: "470 µF ±20 %, rated 16 V. Leakage is under about 75 µA after two minutes. Stores 60 mJ at 16 V. ESR is about 0.1 to 0.3 Ω at 100 kHz (typical for this size).",
    },
    sourcing: { mpn: "UVR1C471MPD", maker: "Nichicon, Panasonic, Rubycon, Lelon, and others", lifecycle: "generic", usd: [0.05, 0.3] },
    limits: [
      "Polarized. Reversed by more than about 1 V it heats up and the vent bursts in a few seconds, with a pop and hot electrolyte.",
      "16 V rating: stay at 80 % of it (12.8 V). A 12 V motor supply is fine; a 3S LiPo at 12.6 V is the edge, so use a 25 V part there.",
      "ESR is about 0.1 to 0.3 Ω. A 2 A motor pulse across 0.2 Ω is a 0.4 V step the capacitor can't smooth. It also sets how much ripple current it can take, about 0.5 to 1 A.",
      "It does nothing against very fast spikes (it is slow, about 10 to 20 nH of lead inductance): put a 100 nF ceramic capacitor next to it.",
      "Short life: 2,000 h at 85 °C, and the life halves for every 10 °C hotter. Don't put it next to a hot regulator. Capacitance drops 20 to 30 % in the cold.",
    ],
    upgrade: [{ name: "Polymer aluminum 470 µF 16 V (Panasonic 16SEPG470M)", why: "About 8 mΩ of ESR instead of 100 to 300 mΩ, and 5,000 h at 105 °C. It smooths motor pulses properly and lasts longer, for a bit more money." }],
    refs: ["https://www.digikey.fr/en/products/detail/nichicon/UVR1C471MPD/588784"],
  },
  lab: { passive: true },
  experiment: {
    title: "Catch the dip",
    idea: "Run a small motor from a battery and watch the supply voltage dip when it starts. Add the capacitor across the supply, plus to plus, and see the dip shrink.",
  },
  tags: ["capacitor", "electrolytic", "470uF", "decoupling", "bulk", "polarity", "motor supply", "neopixel", "passive", "smoothing"],
});
