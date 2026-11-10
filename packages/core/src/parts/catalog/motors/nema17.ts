import { definePart, lead, pin, type Solid } from "../../sdk";

const S = 42.3; // the square face
const C = S / 2; // the shaft sits in the middle of it, 21.15 mm from every edge
const FACE = 24; // x of the front face: the shaft sticks 24 mm out of it
const FRONT = 33; // end of the front bell
const REAR = 55; // start of the rear bell
const END = 64; // the rear face: body length 40 mm
const CAP = "#1c1d20";
const STACK = "#3a3d43";

/** A square section with its four corners notched, as end bells and stator stacks are. */
function section(x: number, len: number, notch: number, color: string, finish: "plastic" | "metal", id?: string): Solid[] {
  return [
    { kind: "box", id, x, y: 0, w: len, h: S, d: S - 2 * notch, z: notch, top: color, side: color, finish, radius: 0.3 },
    { kind: "box", x, y: notch, w: len, h: S - 2 * notch, d: S, z: 0, top: color, side: color, finish, radius: 0.3 },
  ];
}

// Four flying wires out of the rear: black, green, red, blue. Coil A is black and green; coil B is red and blue.
const WIRES = [
  { pin: "A1", color: "#17181b", end: 93.2 },
  { pin: "A2", color: "#2e9b4a", end: 94.2 },
  { pin: "B1", color: "#c62b2b", end: 92.8 },
  { pin: "B2", color: "#2a62c8", end: 93.8 },
];
const exitY = (i: number) => C + (i - 1.5) * 2;
const endY = (i: number) => C + (i - 1.5) * 6;
const wires: Solid[] = WIRES.flatMap((w, i) => {
  const y0 = exitY(i);
  const y1 = endY(i);
  const k = (t: number) => y0 + (y1 - y0) * t;
  return lead(
    [
      [END + 1.6, y0, 14],
      [END + 4, y0, 13.2],
      [END + 7, k(0.2), 8],
      [END + 10.5, k(0.4), 2.2],
      [END + 16, k(0.7), 0.8],
      [w.end, y1, 0.75],
    ],
    w.color,
    { r: 0.75, strip: 3 },
  );
});

export default definePart({
  id: "nema17",
  name: "NEMA 17 stepper motor",
  aka: ["17HS4401", "42BYGH", "NEMA 17 bipolar stepper", "3D printer motor", "42 mm stepper"],
  group: "motors",
  rank: 6,
  summary: "The square stepper in 3D printers and CNC machines. It moves in exact 1.8° steps, 200 to the turn, and holds its place when still. It needs a stepper driver and a 12 V to 24 V supply.",
  size: { w: 64, h: 42.3, d: 42.5 },
  solids: [
    // 5 mm shaft with its flat, 24 mm out of the front face, and the 22 mm locating boss around it.
    { kind: "cyl", id: "shaft", cx: 12, cy: C, r: 2.5, d: FACE, z: C - 2.5, axis: "x", top: "#d3d6db", finish: "metal" },
    { kind: "box", id: "shaft-flat", x: 1, y: C - 1.5, w: 15, h: 3, d: 0.1, z: C + 1.98, top: "#eceef1", finish: "metal" },
    { kind: "cyl", cx: FACE - 1, cy: C, r: 11, d: 2, z: C - 11, axis: "x", top: "#b8bbc0", finish: "metal" },
    { kind: "cyl", cx: FACE - 0.05, cy: C, r: 3.6, d: 0.3, z: C - 3.6, axis: "x", top: "#26272a", finish: "metal" },
    // The body: front bell, laminated stack, rear bell.
    section(FACE, FRONT - FACE, 3.5, CAP, "plastic"),
    section(FRONT, REAR - FRONT, 5, STACK, "metal", "stack"),
    section(REAR, END - REAR, 3.5, CAP, "plastic"),
    // The four M3 holes in the front face, 31 mm apart.
    ...[
      [5.65, 5.65],
      [36.65, 5.65],
      [5.65, 36.65],
      [36.65, 36.65],
    ].map(([y, z]) => ({ kind: "cyl", cx: FACE + 0.05, cy: y, r: 1.5, d: 0.3, z: z - 1.5, axis: "x", top: "#0a0a0b", finish: "metal" }) as Solid),
    // Label sticker on the stack.
    { kind: "box", id: "label", x: 34.5, y: C - 10, w: 19, h: 20, d: 0.15, z: S, top: "#e9e6dc", finish: "paper", radius: 0.3 },
    { kind: "text", x: 44, y: C - 5, text: "STEPPER MOTOR", size: 1.4, color: "#4a4a48", anchor: "middle", z: S + 0.16 },
    { kind: "text", x: 44, y: C - 1.4, text: "17HS4401", size: 2.5, color: "#111111", anchor: "middle", weight: 700, z: S + 0.16 },
    { kind: "text", x: 44, y: C + 2.6, text: "1.7 A  1.8° / step", size: 1.6, color: "#262626", anchor: "middle", z: S + 0.16 },
    { kind: "text", x: 44, y: C + 6.2, text: "43 N·cm  40 mm", size: 1.4, color: "#4a4a48", anchor: "middle", z: S + 0.16 },
    // Cable grommet and the four wires.
    { kind: "box", x: END, y: C - 5, w: 1.6, h: 10, d: 4, z: 12, top: "#101113", finish: "rubber", radius: 0.8 },
    wires,
  ],
  features: [
    { id: "shaft", label: "5 mm shaft with flat", kind: "mechanical", x: 0, y: C - 2.5, w: FACE, h: 5, note: "A 5 mm steel shaft with one flat, 24 mm long. A pulley or coupler with a set screw bites on the flat so it can't slip." },
    { id: "pilot", label: "22 mm pilot boss", kind: "mechanical", x: FACE - 2, y: C - 11, w: 2, h: 22, note: "A round step on the front face that centers the motor in a 22 mm hole in a frame." },
    { id: "front", label: "Front bell", kind: "mechanical", x: FACE, y: 0, w: FRONT - FACE, h: S, note: "Four M3 holes, 31 mm apart, fix the motor to a frame. Use screws no longer than 4 mm deep." },
    { id: "stack", label: "Stator and coils", kind: "other", x: FRONT, y: 0, w: REAR - FRONT, h: S, note: "Steel plates wound with two coils, A and B, 1.5 Ω each. Switching current from one coil to the other pulls the rotor round one step at a time." },
    { id: "label", label: "Label", kind: "other", x: 34.5, y: C - 10, w: 19, h: 20, note: "The sticker gives the model, the rated 1.7 A per phase and the 1.8° step angle. Always trust it over a guess." },
    { id: "rear", label: "Rear bell", kind: "mechanical", x: REAR, y: 0, w: END - REAR, h: S, note: "Holds the rear bearing. The cable leaves through a rubber grommet in the rear face." },
    { id: "leads", label: "Four wires", kind: "connector", x: END, y: C - 9, w: 30, h: 18, note: "About 30 cm of wire (cut short here). Black and green are coil A, red and blue are coil B. Many come with a 4-pin plug on the end." },
  ],
  pins: [
    pin("A1", "other", "load", "Coil A, black wire. Goes on the driver's 1A or A1 output.", { label: "A1" }),
    pin("A2", "other", "load", "Coil A, green wire. Goes on the driver's 2A or A2 output.", { label: "A2" }),
    pin("B1", "other", "load", "Coil B, red wire. Goes on the driver's 1B or B1 output.", { label: "B1" }),
    pin("B2", "other", "load", "Coil B, blue wire. Goes on the driver's 2B or B2 output. Swapping one coil's two wires reverses the direction.", { label: "B2" }),
  ],
  pinAt: {
    A1: { x: WIRES[0].end, y: endY(0) },
    A2: { x: WIRES[1].end, y: endY(1) },
    B1: { x: WIRES[2].end, y: endY(2) },
    B2: { x: WIRES[3].end, y: endY(3) },
  },
  circuit: {
    blocks: [
      { id: "driver", label: "Stepper driver", sub: "A4988, DRV8825, TMC2209", kind: "world", col: 0, row: 0, note: "Sets the current in each coil and flips its direction on every step. A board pin can't do this: the coils take 1.7 A each." },
      { id: "pins-a", label: "A1, A2", sub: "black, green", kind: "pin", col: 1, row: 0, at: "A1", note: "The two ends of coil A." },
      { id: "pins-b", label: "B1, B2", sub: "red, blue", kind: "pin", col: 1, row: 1, at: "B1", note: "The two ends of coil B." },
      { id: "coils", label: "Coils A and B", sub: "1.5 Ω, 2.8 mH each", kind: "actuator", col: 2, row: 0, at: "stack", hot: true, note: "Each coil has 1.5 Ω. At the rated 1.7 A both together lose about 8.7 W as heat, even while the motor stands still." },
      { id: "rotor", label: "Magnet rotor", sub: "50 teeth", kind: "passive", col: 3, row: 0, at: "rear", note: "A toothed magnet. It snaps to the nearest position the coils pull it to, 200 of them each turn." },
      { id: "shaft", label: "Shaft", sub: "200 steps per turn", kind: "actuator", col: 4, row: 0, at: "shaft", note: "Moves 1.8° for each step. Microstepping at 1/16 makes 3,200 steps per turn." },
    ],
    links: [
      { from: "driver", to: "pins-a", kind: "power", label: "up to 1.7 A" },
      { from: "driver", to: "pins-b", kind: "power", label: "up to 1.7 A" },
      { from: "pins-a", to: "coils", kind: "power" },
      { from: "pins-b", to: "coils", kind: "power" },
      { from: "coils", to: "rotor", kind: "physical", label: "magnetic pull" },
      { from: "rotor", to: "shaft", kind: "mechanical", label: "1.8° a step" },
    ],
    steps: [
      "Your board sends the driver a STEP pulse and a direction. Nothing else: the driver does the heavy work.",
      "The driver sends current through coil A, then coil B, then coil A backwards, then coil B backwards. Each swap turns the field a quarter of a tooth.",
      "The magnet rotor follows the field and the shaft turns exactly 1.8° for each step, with no feedback needed.",
      "Held still, both coils still carry the set current: the case heats up to about 8.7 W at 1.7 A. Cut the hold current when the motor rests.",
    ],
  },
  facts: [
    { label: "Steps", value: "200 per turn (1.8°)" },
    { label: "Current", value: "1.7 A per phase" },
    { label: "Coil", value: "1.5 Ω, 2.8 mH" },
    { label: "Holding torque", value: "43 N·cm" },
    { label: "Driver supply", value: "12–24 V typical" },
    { label: "Size", value: "42.3 × 42.3 × 40 mm, 280 g" },
  ],
  spec: {
    form: {
      mass: 280,
      mount: "leads",
      pitch: 2.54,
      note: "Four M3 holes in the 42.3 mm square front face, 31 mm apart, and a 22 mm pilot. The four wires end bare or on a 4-pin plug (JST-PH or Dupont). Face hole positions are from the standard NEMA 17 drawing.",
    },
    power: {
      draw: { idle: 1700, active: 1700, peak: 1700 },
      motor: { ratedV: 2.55, runMa: 1700, stallMa: 1700, torque: "43 N·cm holding" },
      interface: "Two coils; STEP and DIR from a stepper driver",
      note: "Rated voltage is 1.7 A × 1.5 Ω = 2.55 V. A driver chops a 12 V to 24 V supply to hold each coil at the set current, so the supply gives less (about 0.3 A to 0.8 A at 12 V) than the coils see.",
    },
    thermal: {
      thetaCW: 9.2,
      maxC: 80,
      typicalW: 8.7,
      at: "holding 1.7 A in both coils",
      note: "Loss is 2 × 1.7² × 1.5 Ω = 8.7 W. The 9 °C per watt comes from the usual 80 K rise at rated current on motors of this kind, not from this motor's own sheet. The case gets too hot to touch after a few minutes.",
    },
    sourcing: { mpn: "17HS4401", maker: "Generic (Wantai 42BYGH, Moons, JK); Pololu #2267 for a 38 mm one", lifecycle: "generic", usd: [8, 15], note: "Often sold as 42BYGH or just 'NEMA 17'. Bodies run from 20 mm to 48 mm long: the longer ones give more torque." },
    limits: [
      "It cannot run from a board pin. It needs a stepper driver and a 12 V to 24 V supply.",
      "Holding a position uses the full set current: 1.7 A in each coil is 8.7 W, up to 80 °C on the case. Cut the hold current to half when idle.",
      "It has no position feedback: pushed too hard or sped up too fast it skips steps without telling you.",
      "Noisy and resonant between about 100 rpm and 300 rpm unless microstepped.",
      "Torque falls fast with speed. With 2.8 mH and 1.5 Ω the coil takes about 1.9 ms to fill, so little torque is left near 600 rpm.",
    ],
    upgrade: [
      { name: "TMC2209 stepper driver", why: "Runs the same motor almost silently with 256 microsteps and can detect a stall, without a new motor. It plugs in where an A4988 goes." },
      { name: "NEMA 17 with encoder (closed loop)", why: "Reads its own position, so it can't lose steps without knowing. It costs about twice as much." },
    ],
    refs: ["https://datasheetspdf.com/datasheet/17HS4401S.html", "https://www.pololu.com/product/2267/specs"],
  },
  sim: { kind: "motor", terminals: ["A1", "A2"], second: ["B1", "B2"] },
  animate: { spin: ["shaft", "shaft-flat"], axis: { at: [12, C, C], dir: "x" } },
  experiment: { title: "Find the coils", idea: "With nothing connected, touch a meter across pairs of wires: the two that read about 1.5 Ω are one coil. Spin the shaft by hand while two wires are shorted together and feel it turn stiff." },
  tags: ["nema17", "stepper", "17hs4401", "42bygh", "3d printer", "cnc", "bipolar", "motor"],
});
