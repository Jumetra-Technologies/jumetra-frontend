import { DEFAULT_OHMS, resistorBands } from "../../models/passives";
import { definePart, pin, shade } from "../../sdk";
import type { Solid } from "../../sdk";

/**
 * A ¼ W axial resistor (Yageo CFR-25 size), lying on the bench with its legs
 * trimmed to 0.6" overall. The lab recolors the four bands for the value set
 * on the part (`withResistorValue` in `models/passives.ts`), so each band keeps
 * its `band-N` id.
 */

const TIN = "#c9ccd1";
const BODY = "#d9c9a3";
/** Height of the part's axis above the bench. */
const AXIS = 1.25;
const BODY_X = 4.85;
const BODY_LEN = 6.3;
/** The body is a gentle dog bone: two end caps a little fatter than the waist between them. */
const CAP_R = 1.17;
const WAIST_R = 1.07;

/** A cylinder lying along x from `x` for `length`, on the part's axis. */
const lying = (x: number, length: number, r: number, color: string, extra: Partial<Extract<Solid, { kind: "cyl" }>> = {}): Solid => ({
  kind: "cyl",
  cx: x + length / 2,
  cy: AXIS,
  r,
  d: length,
  // A lying cylinder rests on `z`: its axis is its larger radius above that.
  z: AXIS - Math.max(r, extra.r2 ?? r),
  axis: "x",
  top: color,
  side: shade(color, 0.78),
  ...extra,
});

/** Where each band sits along the body, and the radius of the body under it. */
const BANDS: Array<{ x: number; r: number }> = [
  { x: BODY_X + 0.85, r: CAP_R },
  { x: BODY_X + 2.1, r: WAIST_R },
  { x: BODY_X + 3.1, r: WAIST_R },
  { x: BODY_X + 4.85, r: CAP_R },
];

/** The body's profile from end to end: [start, length, radius, radius at the far end]. */
const PROFILE: Array<[number, number, number, number]> = [
  [0, 0.35, 0.45, 0.95],
  [0.35, 0.45, 0.95, CAP_R],
  [0.8, 0.7, CAP_R, CAP_R],
  [1.5, 0.5, CAP_R, WAIST_R],
  [2, 2.3, WAIST_R, WAIST_R],
  [4.3, 0.5, WAIST_R, CAP_R],
  [4.8, 0.7, CAP_R, CAP_R],
  [5.5, 0.45, CAP_R, 0.95],
  [5.95, 0.35, 0.95, 0.45],
];

function bands(ohms: number): Solid[] {
  return resistorBands(ohms).map((color, i) => lying(BANDS[i].x, 0.6, BANDS[i].r + 0.025, color, { id: `band-${i + 1}`, fill: color, finish: "plastic" }));
}

export default definePart({
  id: "resistor",
  name: "Resistor (220 Ω)",
  aka: ["resistor", "current-limiting resistor", "220 ohm resistor", "1k resistor", "10k resistor", "pull-down resistor"],
  group: "prototyping",
  rank: 2,
  summary: "Limits current. Put one in series with every LED: from a 5 V pin, 220 Ω lets about 14 mA through, bright and safe for the LED and the pin. Its color bands say its value.",
  size: { w: 16, h: 2.5, d: 2.5 },
  solids: [
    // Two tinned copper legs, 0.55 mm thick.
    lying(0, BODY_X + 0.2, 0.275, TIN, { finish: "aluminum" }),
    lying(BODY_X + BODY_LEN - 0.2, 16 - (BODY_X + BODY_LEN - 0.2), 0.275, TIN, { finish: "aluminum" }),
    // The lacquered body: rounded ends, two caps and the waist between them.
    ...PROFILE.map(([x, length, r, r2], i) => lying(BODY_X + x, length, r, BODY, { ...(r2 !== r ? { r2 } : {}), ...(i === 4 ? { id: "body" } : {}), finish: "plastic" })),
    ...bands(DEFAULT_OHMS),
  ],
  features: [
    { id: "bands", label: "Color bands", kind: "other", x: BANDS[0].x, y: 0, w: BANDS[2].x + 0.6 - BANDS[0].x, h: 2.5, note: "Read from the end the bands crowd toward: first digit, second digit, how many zeros. Red red brown is 22 and one zero: 220 Ω." },
    { id: "tolerance", label: "Gold band", kind: "other", x: BANDS[3].x, y: 0, w: 0.6, h: 2.5, note: "Tolerance: the real value is within 5 % of the printed one. It sits apart from the others, so you know which end to start from." },
    { id: "leg-1", label: "Leg 1", kind: "pin", x: 0, y: 0.75, w: 4.8, h: 1, note: "A resistor has no polarity: either leg goes either way." },
    { id: "leg-2", label: "Leg 2", kind: "pin", x: 11.2, y: 0.75, w: 4.8, h: 1, note: 'Bend the legs 0.4" (4 holes) apart to fit a breadboard.' },
  ],
  pins: [pin("1", "other", "opt", "Either way round", { label: "Leg 1", side: "left" }), pin("2", "other", "opt", "Either way round", { label: "Leg 2", side: "right" })],
  pinAt: { "1": { x: 0.4, y: AXIS }, "2": { x: 15.6, y: AXIS } },
  circuit: {
    blocks: [
      { id: "pin", label: "Board pin", sub: "5 V when HIGH", kind: "pin", col: 0, row: 0, note: "The voltage that pushes the current." },
      { id: "leg1", label: "Leg 1", kind: "connector", col: 1, row: 0, at: "1", note: "Current comes in on one leg. Which one does not matter." },
      { id: "res", label: "Carbon film", sub: "220 Ω", kind: "passive", col: 2, row: 0, at: "bands", hot: true, note: "A thin spiral of carbon on a ceramic rod. It drops the voltage the LED doesn't, about 3 V here, and turns it into heat." },
      { id: "leg2", label: "Leg 2", kind: "connector", col: 3, row: 0, at: "2", note: "The same current leaves by the other leg." },
      { id: "led", label: "LED", sub: "drops ~2 V", kind: "actuator", col: 4, row: 0, note: "Takes about 2 V and lights with the current the resistor allows." },
      { id: "gnd", label: "GND", kind: "ground", col: 4, row: 1, note: "The way back." },
    ],
    links: [
      { from: "pin", to: "leg1", kind: "power", label: "5 V" },
      { from: "leg1", to: "res", kind: "power" },
      { from: "res", to: "leg2", kind: "power", label: "~14 mA" },
      { from: "leg2", to: "led", kind: "power", label: "~2 V" },
      { from: "led", to: "gnd", kind: "ground" },
    ],
    steps: [
      "Ohm's law: current = voltage ÷ resistance. The resistor takes whatever voltage the LED doesn't.",
      "From a 5 V pin with a red LED (about 2 V), the resistor drops 3 V. At 220 Ω that is 3 ÷ 220 ≈ 14 mA.",
      "Less resistance, more current and a brighter LED, up to its limit of about 20 mA. Below about 150 Ω at 5 V you pass it.",
      "The voltage it drops becomes heat: 3 V × 14 mA is about 0.04 W, a sixth of what a ¼ W resistor can take.",
      "It works on either side of the LED, anode or cathode: what matters is that it's in the loop.",
    ],
  },
  facts: [
    { label: "Value", value: "220 Ω (set it in the lab)" },
    { label: "Tolerance", value: "±5 % (gold band)" },
    { label: "Power", value: "¼ W" },
    { label: "Polarity", value: "None" },
    { label: "Body", value: "6.3 × 2.3 mm" },
    { label: "Legs", value: '0.55 mm; bend to 0.4" for a breadboard' },
  ],
  spec: {
    form: { mass: 0.25, mount: "breadboard", pitch: 10.16, note: 'Bend the legs four holes (0.4") apart. New, the legs are 28 mm long each; trim them once the part is in place.' },
    power: { interface: "Two legs, no polarity", note: "Rated ¼ W up to 70 °C around it, falling to nothing at 155 °C. Up to 250 V." },
    thermal: { thetaCW: 340, maxC: 155, typicalW: 0.041, at: "limiting a red LED from a 5 V pin", note: "From its derating curve: (155 − 70) °C over 0.25 W. Above about 0.2 W it is too hot to touch." },
    sourcing: { mpn: "CFR-25JT-52-220R", maker: "Yageo, and many others", lifecycle: "generic", usd: [0.01, 0.05] },
    limits: [
      "¼ W at most. 220 Ω across 12 V would be 0.65 W: it scorches and fails.",
      "±5 %: a 220 Ω part may be anything from 209 Ω to 231 Ω.",
      "Its value drifts as it warms, up to 0.05 % per °C for carbon film.",
      "The bands are easy to misread: brown, red and orange look alike, and starting from the gold end gives a wrong value. Check with a multimeter.",
    ],
    upgrade: [{ name: "1 % metal film (Yageo MFR-25, Vishay MRS25)", why: "Five times tighter tolerance and a fifth of the drift for about the same price. The body is light blue with five bands." }],
    refs: ["https://au.element14.com/yageo/cfr-25jt-52-220r/res-220r-5-0-25w-axial-carbon/dp/3496810", "https://storage.sea.com.ua/tech_info/yageo/CFR.pdf"],
  },
  lab: { passive: true },
  experiment: {
    title: "Brightness by resistor",
    idea: "Light an LED through 1 kΩ, then 470 Ω, then 220 Ω, and watch the current the lab reports rise each time.",
  },
  tags: ["resistor", "ohm", "passive", "current limit", "led", "220", "1k", "10k", "pull-down", "beginner"],
});
