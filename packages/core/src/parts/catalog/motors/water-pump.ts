import { definePart, lead, pin, type Solid } from "../../sdk";

const R = 12; // the pump head is 24 mm across, lying on the bench
const WHITE = "#efeee9";
const NOZ_X = 5; // the outlet stands up over the head

// Two flying leads leave the rear through a rubber grommet: red (+) and black (−).
const WIRES = [
  { pin: "M1", color: "#c62b2b", end: 66.4 },
  { pin: "M2", color: "#18191c", end: 67.6 },
];
const wireY = (i: number) => R + (i - 0.5) * 3.2;
const endY = (i: number) => R + (i - 0.5) * 9;
const leads: Solid[] = WIRES.flatMap((w, i) => {
  const y0 = wireY(i);
  const y1 = endY(i);
  const k = (t: number) => y0 + (y1 - y0) * t;
  return lead(
    [
      [46.2, y0, R],
      [48.6, y0, R - 0.6],
      [51.5, k(0.2), 7],
      [54.5, k(0.45), 2.4],
      [59, k(0.75), 0.85],
      [w.end, y1, 0.75],
    ],
    w.color,
    { r: 0.8, strip: 4 },
  );
});

// Six inlet holes round the middle of the head's front face.
const inlet: Solid[] = Array.from({ length: 6 }, (_, i) => ({
  kind: "cyl",
  cx: 0.05,
  cy: R + 6 * Math.cos((i * Math.PI) / 3),
  r: 1.1,
  d: 0.4,
  z: R + 6 * Math.sin((i * Math.PI) / 3) - 1.1,
  axis: "x",
  top: "#3a3c40",
  finish: "plastic",
}));

export default definePart({
  id: "water-pump",
  name: "Mini submersible water pump",
  aka: ["3-6 V water pump", "plant watering pump", "mini DC pump", "JT-180 pump", "aquarium pump"],
  group: "motors",
  rank: 7,
  summary: "A thumb-sized pump that sits under water and pushes it up a tube when you give it 3 V to 6 V. It waters plants on a timer. A pin can't run it: it needs a transistor and a diode.",
  size: { w: 45, h: 24, d: 33 },
  solids: [
    // Pump head with its inlet holes in the front, and the sealed motor chamber behind it.
    { kind: "cyl", id: "head", cx: 7.5, cy: R, r: R, d: 15, z: 0, axis: "x", top: WHITE, finish: "plastic", segments: 32 },
    { kind: "cyl", cx: 15.2, cy: R, r: R + 0.3, d: 0.6, z: -0.3, axis: "x", top: "#cfcdc6", finish: "plastic", segments: 32 },
    { kind: "cyl", id: "motor", cx: 30.4, cy: R, r: 11.7, d: 29.2, z: 0.3, axis: "x", top: "#e7e6e0", finish: "plastic", segments: 32 },
    { kind: "cyl", cx: 0.1, cy: R, r: 2.2, d: 0.5, z: R - 2.2, axis: "x", top: "#d4d2cb", finish: "plastic" },
    inlet,
    // Outlet nozzle: a barbed tube 7.5 mm across, standing up from the head.
    { kind: "cyl", cx: NOZ_X, cy: R, r: 4.7, d: 1.6, z: 23.2, top: WHITE, finish: "plastic" },
    { kind: "cyl", id: "nozzle", cx: NOZ_X, cy: R, r: 3.2, d: 33 - 23.2, z: 23.2, top: WHITE, finish: "plastic", segments: 24 },
    { kind: "cyl", cx: NOZ_X, cy: R, r: 3.2, r2: 3.9, d: 2.8, z: 27.4, top: WHITE, finish: "plastic", segments: 24 },
    { kind: "cyl", cx: NOZ_X, cy: R, r: 3.9, d: 0.5, z: 30.2, top: WHITE, finish: "plastic", segments: 24 },
    { kind: "disc", cx: NOZ_X, cy: R, r: 2.35, color: "#2b2d31", z: 33.01 },
    // Rubber grommet and the two leads.
    { kind: "cyl", cx: 45.6, cy: R, r: 4.2, d: 1.2, z: R - 4.2, axis: "x", top: "#101113", finish: "rubber" },
    leads,
  ],
  features: [
    { id: "nozzle", label: "Outlet nozzle", kind: "mechanical", x: NOZ_X - 3.9, y: R - 3.9, w: 7.8, h: 7.8, note: "A barb 7.5 mm across with a 5 mm bore. Push soft silicone tube over it and the water goes where the tube goes." },
    { id: "inlet", label: "Inlet holes", kind: "mechanical", x: 0, y: 4, w: 2.5, h: 16, note: "Water is sucked in through the holes in the front of the head. Keep them clear, and keep the whole pump under water." },
    { id: "head", label: "Pump head with impeller", kind: "mechanical", x: 0, y: 0, w: 15.2, h: 24, note: "A small paddle wheel spins in here and flings water out through the nozzle. It is the part that wears if you run the pump dry." },
    { id: "motor", label: "Sealed motor chamber", kind: "other", x: 15.2, y: 0.3, w: 29.8, h: 23.4, note: "A small DC motor in a sealed shell, so the pump may work under water. Don't use it in hot water or salt water." },
    { id: "leads", label: "Two leads", kind: "connector", x: 45, y: 4, w: 23, h: 16, note: "Red is plus and black is minus, with bare tinned ends. About 15 cm of wire (cut short here)." },
  ],
  pins: [
    pin("M1", "other", "load", "Red lead, plus. Joins the supply's plus, 3 V to 6 V. Reversed, it runs backward with poor flow and may be damaged: nothing protects it.", { label: "M1" }),
    pin("M2", "other", "load", "Black lead, minus. Switch this side with a transistor or MOSFET and a flyback diode, not with a board pin.", { label: "M2" }),
  ],
  pinAt: {
    M1: { x: WIRES[0].end, y: endY(0) },
    M2: { x: WIRES[1].end, y: endY(1) },
  },
  circuit: {
    blocks: [
      { id: "switch", label: "Switch", sub: "MOSFET or driver", kind: "world", col: 0, row: 0, note: "A board pin gives 20 mA and the pump takes 130 mA to 220 mA. A low-side MOSFET or a motor driver does the switching." },
      { id: "diode", label: "Flyback diode", sub: "1N4001, across the leads", kind: "passive", col: 0, row: 1, note: "You add it, cathode (the striped end) to plus. When the pump switches off its coils make a spike several times the supply voltage, and the diode gives the spike a way round." },
      { id: "leads", label: "M1, M2", sub: "red, black", kind: "pin", col: 1, row: 0, at: "M1", note: "The pump's two leads." },
      { id: "motor", label: "DC motor", sub: "130–220 mA", kind: "actuator", col: 2, row: 0, at: "motor", note: "Spins the impeller. The start-up surge is higher than the running current." },
      { id: "impeller", label: "Impeller", kind: "passive", col: 3, row: 0, at: "head", note: "Throws water outward. Flow is about 120 L/h with no lift and falls to nearly nothing at about 1 m of lift." },
      { id: "water-in", label: "Water in", kind: "world", col: 3, row: 1, at: "inlet", note: "Through the holes in the front. The pump has to be under water." },
      { id: "water-out", label: "Water out", sub: "7.5 mm barb", kind: "world", col: 4, row: 0, at: "nozzle", note: "Up the tube to the plant." },
    ],
    links: [
      { from: "switch", to: "leads", kind: "power", label: "3–6 V" },
      { from: "diode", to: "leads", kind: "power", label: "spike" },
      { from: "leads", to: "motor", kind: "power" },
      { from: "motor", to: "impeller", kind: "mechanical" },
      { from: "water-in", to: "impeller", kind: "physical" },
      { from: "impeller", to: "water-out", kind: "physical", label: "80–120 L/h" },
    ],
    steps: [
      "Your board turns on a MOSFET or a driver output. That puts 3 V to 6 V across the red and black leads.",
      "The motor in the sealed chamber spins the impeller in the head.",
      "The impeller pulls water in through the holes in the front and throws it out of the nozzle and up the tube.",
      "When the switch opens the motor's coil sends a voltage spike back. A diode across the leads lets it die away safely.",
    ],
  },
  facts: [
    { label: "Supply", value: "3–6 V" },
    { label: "Current", value: "130–220 mA while running" },
    { label: "Flow", value: "80–120 L/h with no lift" },
    { label: "Lift", value: "40–110 cm" },
    { label: "Outlet", value: "7.5 mm barb, 5 mm bore" },
    { label: "Size", value: "45 × 24 × 33 mm, 31 g" },
  ],
  spec: {
    form: {
      mass: 31,
      mount: "leads",
      note: "Two flying leads with bare ends. Sits on the bottom of the water, or takes a rubber foot in some versions. Soft tube of about 6 mm inside slides over the outlet barb. The 33 mm height is the nozzle standing up; two sellers disagree on which side of the body it is.",
    },
    power: {
      supply: { min: 3, max: 6, typ: 5 },
      draw: { idle: 0, active: 200, peak: 400 },
      motor: { ratedV: 5, runMa: 200, stallMa: 400 },
      interface: "Two wires; switch the minus side with a MOSFET, a transistor or a motor driver",
      note: "130 mA to 220 mA between 3 V and 6 V. The peak of 400 mA is a guess for a blocked or dry start: no maker gives it. Some sellers list 2.5 V as the lowest voltage.",
    },
    sourcing: { mpn: "JT-180 (style)", maker: "Generic (many makers)", lifecycle: "generic", usd: [1.5, 4], note: "Sold in plant-watering kits with 1 m of silicone tube. Sellers disagree on whether the motor is brushed or brushless." },
    limits: [
      "Takes 130 mA to 220 mA, 5 to 10 times what a board pin gives, so a transistor, MOSFET or motor driver is a must.",
      "Switching it off makes a spike several times the supply voltage. Fit a 1N4001 diode across the leads, striped end to plus, and a 0.1 µF capacitor.",
      "No polarity protection: plus and minus the wrong way round runs it backward with poor flow and may damage it.",
      "Must stay fully under water. Run dry it loses its cooling and its bearings and impeller wear out. Not for hot water or sea water.",
      "Start-up draws more than running, which can sag a weak USB supply.",
      "Flow falls with lift: 120 L/h free falls to nearly nothing at about 1 m.",
    ],
    upgrade: [
      { name: "Peristaltic pump, 12 V", why: "Moves a measured amount (about 20 mL/min to 100 mL/min), can run dry without harm and keeps the water out of the motor. It costs more and needs 12 V." },
    ],
    refs: [
      "https://www.mouser.com/catalog/specsheets/Soldered_101844 mini water pump.pdf",
      "https://www.electrokit.com/en/submersible-waterpump-3-6v-120l/h",
      "https://thinkrobotics.com/es/products/mini-submersible-dc-motor-pump",
      "https://shillehtek.com/blogs/shillehtek-product-manuals/mini-submersible-water-pump-5v-120lph-arduino-esp32-manual",
    ],
  },
  sim: { kind: "motor", terminals: ["M1", "M2"] },
  experiment: { title: "Water a plant on a timer", idea: "Put the pump in a jar, run a tube to a plant, and switch it with a MOSFET from a board pin: 5 s on every hour. Add the diode first." },
  tags: ["water pump", "submersible pump", "plant watering", "dc pump", "irrigation", "motor", "3-6 V"],
});
