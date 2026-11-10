import { MATERIAL, definePart, lead, pin, type Solid } from "../../sdk";

const CY = 6; // the motor's long axis, down the middle of its 12 mm width
const ZC = 5; // and 5 mm above the bench
const STEEL = "#b9bcc0";

/**
 * The motor can: 12 mm wide and 10 mm high, a round can with two flats. Built
 * as slabs whose width follows the circle, so the shoulders look round.
 */
function can(x: number, length: number): Solid[] {
  const layers: Array<[number, number, number]> = [
    [0, 1, 7.9],
    [1, 2, 9.8],
    [2, 4, 11.4],
    [4, 6, 12],
    [6, 8, 11.4],
    [8, 9, 9.8],
    [9, 10, 7.9],
  ];
  return layers.map(([z0, z1, width]) => ({ kind: "box", x, y: CY - width / 2, w: length, h: width, d: z1 - z0, z: z0, top: "#a7aaaf", side: "#8d9095", finish: "aluminum", radius: 0.4 }));
}

// Wire order along the encoder board, left to right as seen from above: red, white, yellow, green, black, blue.
const WIRES = [
  { pin: "M2", color: "#c62b2b", end: 60.4 },
  { pin: "M1", color: "#eceae4", end: 65 },
  { pin: "C2", color: "#e3c22a", end: 60.8 },
  { pin: "C1", color: "#2e9b4a", end: 65.2 },
  { pin: "ENC_VCC", color: "#1b1c1f", end: 60.6 },
  { pin: "ENC_GND", color: "#2a62c8", end: 65.4 },
];
const padY = (i: number) => CY + (i - 2.5) * 1.5;
const endY = (i: number) => CY + (i - 2.5) * 4;

const wires: Solid[] = WIRES.flatMap((w, i) => {
  const y0 = padY(i);
  const y1 = endY(i);
  const k = (t: number) => y0 + (y1 - y0) * t;
  return lead(
    [
      [40.3, y0, 2],
      [41.8, y0, 1.1],
      [46, k(0.3), 0.4],
      [54, k(0.7), 0.35],
      [w.end, y1, 0.35],
    ],
    w.color,
    { r: 0.33, strip: 2 },
  );
});

const pads: Solid[] = WIRES.map((_, i) => ({ kind: "box", x: 40.2, y: padY(i) - 0.45, w: 0.2, h: 0.9, d: 1.5, z: 1.25, top: MATERIAL.tin, finish: "tin" }) as Solid);
const joints: Solid[] = WIRES.map((_, i) => ({ kind: "box", x: 40.4, y: padY(i) - 0.5, w: 0.7, h: 1, d: 1, z: 1.5, top: "#b9bec4", finish: "tin", radius: 0.4 }) as Solid);

export default definePart({
  id: "micro-gear-motor",
  name: "N20 micro gear motor with encoder",
  aka: ["N20 motor", "JGA12-N20", "GA12-N20", "micro metal gearmotor", "N20 encoder motor"],
  group: "motors",
  rank: 3,
  summary: "A motor the size of your thumb, with metal gears and a magnet disc on its back that counts every turn. Small robots use it to drive straight and to know how far they went.",
  size: { w: 41, h: 12, d: 10 },
  solids: [
    // Output shaft: 3 mm, one flat, sticking 9 mm out of the gearbox.
    { kind: "cyl", id: "shaft", cx: 4.75, cy: CY, r: 1.5, d: 9.5, z: ZC - 1.5, axis: "x", top: "#d0d3d8", finish: "metal" },
    { kind: "box", id: "shaft-flat", x: 0.6, y: CY - 1.1, w: 8.4, h: 2.2, d: 0.1, z: ZC + 0.95, top: "#e9ebee", finish: "metal" },
    { kind: "cyl", cx: 8.6, cy: CY, r: 2.3, d: 0.9, z: ZC - 2.3, axis: "x", top: "#b79b4e", finish: "brass" },
    // All-metal gearbox, three plates.
    { kind: "box", x: 9, y: 0, w: 2, h: 12, d: 10, top: "#c6c9ce", side: "#a3a6ab", finish: "metal", radius: 0.6 },
    { kind: "box", x: 11, y: 0.2, w: 8, h: 11.6, d: 9.8, z: 0.1, top: "#9fa2a7", side: "#85888d", finish: "metal", radius: 0.4 },
    { kind: "box", x: 19, y: 0, w: 2, h: 12, d: 10, top: "#c6c9ce", side: "#a3a6ab", finish: "metal", radius: 0.6 },
    // Motor can, rear cap and the two soldered terminals.
    can(21, 15),
    { kind: "text", x: 28.5, y: CY + 0.9, text: "N20", size: 2.4, color: "#4a4d52", anchor: "middle", z: 10.02 },
    { kind: "box", x: 36, y: 1.5, w: 1.6, h: 9, d: 8, z: 1, top: "#2b2a2d", finish: "plastic", radius: 0.4 },
    // Magnet disc on the rear shaft and the two Hall sensors that read it.
    { kind: "cyl", cx: 38.1, cy: CY, r: 0.8, d: 1.2, z: ZC - 0.8, axis: "x", top: "#d0d3d8", finish: "metal" },
    { kind: "cyl", cx: 38, cy: CY, r: 3.8, d: 1, z: ZC - 3.8, axis: "x", top: "#5a5d63", side: "#46484d", finish: "metal" },
    { kind: "box", x: 38.5, y: CY - 3.4, w: 0.7, h: 1.6, d: 1, z: 8.1, top: "#1b1c1f", finish: "epoxy" },
    { kind: "box", x: 38.5, y: CY + 1.8, w: 0.7, h: 1.6, d: 1, z: 8.1, top: "#1b1c1f", finish: "epoxy" },
    // Encoder board standing behind the magnet: 12 mm wide, 10 mm high, 1 mm thick.
    { kind: "box", id: "encoder", x: 39.2, y: 0, w: 1, h: 12, d: 10, top: "#2f7d32", side: "#1f5a24", finish: "soldermask", radius: 0.3 },
    { kind: "box", x: 40.2, y: CY - 3.2, w: 0.4, h: 1.2, d: 0.6, z: 5.6, top: "#8a7a55", finish: "ceramic" },
    { kind: "box", x: 40.2, y: CY + 2, w: 0.4, h: 1.2, d: 0.6, z: 5.6, top: "#8a7a55", finish: "ceramic" },
    { kind: "box", x: 40.2, y: CY - 0.6, w: 0.4, h: 1.2, d: 0.6, z: 7.4, top: "#2a2a2c", finish: "ceramic" },
    pads,
    joints,
    wires,
  ],
  features: [
    { id: "shaft", label: "Output shaft", kind: "mechanical", x: 0, y: 4.5, w: 9, h: 3, note: "3 mm shaft with one flat. A wheel or a coupler with a set screw grips the flat. This is the slow end, after the gears." },
    { id: "gearbox", label: "Metal gearbox", kind: "mechanical", x: 9, y: 0, w: 12, h: 12, note: "Steel gears that slow the motor down about 100 times and make it stronger. Two M1.6 screw holes in the front face hold a mounting bracket." },
    { id: "can", label: "Motor can", kind: "other", x: 21, y: 0, w: 15, h: 12, note: "A small brushed DC motor, 12 × 10 mm. It spins about 15,000 rpm on its own; the gears bring that down to about 150 rpm." },
    { id: "encoder", label: "Encoder board", kind: "sensor", x: 37.2, y: 0, w: 3, h: 12, note: "A magnet disc on the back of the motor shaft turns past two Hall sensors. They give two square waves, C1 and C2, a quarter of a turn out of step, so a board can count turns and tell the direction." },
    { id: "pads", label: "Six solder pads", kind: "pins", x: 40.2, y: 2.2, w: 1.5, h: 7.6, note: "The two motor wires and the four encoder wires are soldered here. Printed names and wire colors differ between sellers: test with a meter before you connect." },
    { id: "leads", label: "Six flying wires", kind: "connector", x: 41.5, y: -4, w: 23, h: 20, note: "About 20 cm of thin 30 AWG wire (cut short here). Red and white run the motor, black and blue feed the encoder, yellow and green are the two pulse lines." },
  ],
  pins: [
    pin("M1", "other", "load", "Motor wire, white. Goes on a driver output. Swap it with M2 to turn the other way.", { label: "M1" }),
    pin("M2", "other", "load", "Motor wire, red. Goes on the other driver output. 3 V to 6 V on the 6 V version.", { label: "M2" }),
    pin("C1", "digital", "opt", "Encoder channel, green. A square wave; 7 pulses per motor turn. The lab does not simulate it yet.", { label: "C1", required: false }),
    pin("C2", "digital", "opt", "Encoder channel, yellow. Same pulses as C1, a quarter pulse later. Which one leads tells you the direction. Not simulated yet.", { label: "C2", required: false }),
    pin("ENC_VCC", "power", "opt", "Power for the encoder only, black wire: 3.3 V to 5 V, never the 6 V motor supply. Not simulated yet.", { label: "ENC VCC", required: false }),
    pin("ENC_GND", "ground", "opt", "Encoder ground, blue wire. Join it to your board's ground. Not simulated yet.", { label: "ENC GND", required: false }),
  ],
  pinAt: {
    M2: { x: 60.4, y: endY(0) },
    M1: { x: 65, y: endY(1) },
    C2: { x: 60.8, y: endY(2) },
    C1: { x: 65.2, y: endY(3) },
    ENC_VCC: { x: 60.6, y: endY(4) },
    ENC_GND: { x: 65.4, y: endY(5) },
  },
  circuit: {
    blocks: [
      { id: "driver", label: "Motor driver", sub: "H-bridge", kind: "world", col: 0, row: 0, note: "The motor needs more current than a board pin gives, so a driver chip like an L298N or TB6612 sits between them." },
      { id: "motor-pins", label: "M1, M2", sub: "white, red", kind: "pin", col: 1, row: 0, at: "M1", note: "The motor's two wires. Plus on red turns it one way, plus on white the other." },
      { id: "motor", label: "Brushed motor", sub: "6 V, 150 mA running", kind: "actuator", col: 2, row: 0, at: "can", note: "About 30 mA with nothing on the shaft, about 150 mA with a load, about 300 mA when it stalls (some makers' motors take over 1 A)." },
      { id: "gears", label: "Metal gears", sub: "about 100 : 1", kind: "passive", col: 3, row: 0, at: "gearbox", note: "Each gear stage slows the turn and adds force. At 100 : 1 the shaft makes one turn for every 100 turns of the motor." },
      { id: "shaft", label: "Output shaft", sub: "150 rpm", kind: "actuator", col: 4, row: 0, at: "shaft", note: "A wheel on this shaft turns at about 150 rpm with no load at 6 V." },
      { id: "magnet", label: "Hall encoder", sub: "magnet + 2 sensors", kind: "sensor", col: 2, row: 1, at: "encoder", note: "Turns with the motor, not the output shaft. 7 pulses per turn on each channel, so 28 counts per motor turn, and 100 times that at the wheel." },
      { id: "enc-power", label: "ENC_VCC, ENC_GND", sub: "3.3–5 V", kind: "power", col: 1, row: 1, at: "pads", note: "Its own supply, apart from the motor's 6 V. It needs only a few mA." },
      { id: "pulses", label: "C1, C2", sub: "quadrature", kind: "pin", col: 3, row: 1, at: "C1", note: "Two square waves a quarter pulse apart. Count the edges for distance; see which leads for direction." },
      { id: "board", label: "Your board", kind: "world", col: 4, row: 1, note: "Counts the pulses on two input pins. Interrupt pins work best." },
    ],
    links: [
      { from: "driver", to: "motor-pins", kind: "power", label: "0–6 V" },
      { from: "motor-pins", to: "motor", kind: "power" },
      { from: "motor", to: "gears", kind: "mechanical", label: "15,000 rpm" },
      { from: "gears", to: "shaft", kind: "mechanical", label: "150 rpm" },
      { from: "motor", to: "magnet", kind: "mechanical", label: "rear shaft" },
      { from: "enc-power", to: "magnet", kind: "power" },
      { from: "magnet", to: "pulses", kind: "signal", label: "28 per turn" },
      { from: "pulses", to: "board", kind: "signal" },
    ],
    steps: [
      "The driver puts battery volts across M1 and M2. The little motor spins at about 15,000 rpm.",
      "Three or four pairs of gears turn that into about 150 rpm at the output shaft, with far more pulling force.",
      "A magnet disc on the back of the motor shaft passes two Hall sensors, which switch on and off as its poles go by.",
      "C1 and C2 show those switches as square waves a quarter pulse apart. Your board counts the edges to know how far the wheel went, and which wire changes first tells it the direction.",
    ],
  },
  facts: [
    { label: "Motor supply", value: "3–6 V (6 V version)" },
    { label: "Speed", value: "about 150 rpm at 100 : 1" },
    { label: "Stall current", value: "0.3 A to 1.6 A, by maker" },
    { label: "Encoder", value: "7 pulses per motor turn, 2 channels" },
    { label: "Encoder supply", value: "3.3–5 V" },
    { label: "Size", value: "41 × 12 × 10 mm" },
  ],
  spec: {
    form: {
      mass: 10,
      mount: "leads",
      pitch: 1.5,
      note: "Two M1.6 screw holes in the gearbox face, 9 mm apart, take a bracket. Wires come out of the encoder board; some versions have a 6-pin JST-ZH plug (1.5 mm) instead.",
    },
    power: {
      supply: { min: 3, max: 6, typ: 6 },
      logic: 3.3,
      tolerant5V: true,
      draw: { idle: 30, active: 150, peak: 300 },
      motor: { ratedV: 6, runMa: 150, stallMa: 300, rpm: 150, torque: "1 to 3 kg·cm, by gear ratio" },
      interface: "Quadrature encoder, 7 pulses per motor turn per channel",
      note: "Stall current depends on the maker: 300 mA or less on most generic motors, about 1.6 A on a Pololu high-power motor of the same size. The encoder lines run at the encoder's own supply, 3.3 V to 5 V.",
    },
    sourcing: { mpn: "JGA12-N20", maker: "Generic (many makers); Pololu sells it with a 12-count encoder", lifecycle: "generic", usd: [3, 9], note: "Ratios from 30 : 1 to 1000 : 1 change the speed and make the gearbox longer. 3 V, 6 V and 12 V versions share one case." },
    limits: [
      "Stalling can strip the small metal gears, and stall current is 300 mA on one seller's motor and up to 1.6 A on another's that looks the same.",
      "The encoder gives only 28 counts per motor turn (12 on Pololu's), which is coarse at the motor shaft but fine at the wheel.",
      "The encoder needs 3.3 V to 5 V on its own pin while the motor wants 6 V: two supplies on one cable.",
      "Wire colors and pad order are not standard: check M1 and M2 and the encoder wires with a meter first.",
      "Stall torque is only 1 to 3 kg·cm, enough for a small robot and not a heavy one.",
    ],
    upgrade: [
      { name: "Pololu 12 CPR micro metal gearmotor (for example #5168)", why: "The same 10 × 12 mm gearbox with published torque and current curves, a 12-count encoder and steady quality. It costs about three times as much." },
      { part: "dc-motor", name: "TT gear motor", why: "Bigger, cheaper and sturdier when you don't need an encoder. It takes a standard wheel and 3 V to 6 V." },
    ],
    refs: [
      "https://probots.co.in/ga12-n20-3v-100rpm-micro-dc-reducer-motor-encoder-with-wire.html",
      "https://makerselectronics.com/?p=527938",
      "https://www.pololu.com/product/5168/pictures",
    ],
  },
  sim: { kind: "motor", terminals: ["M1", "M2"] },
  animate: { spin: ["shaft", "shaft-flat"], axis: { at: [4.75, CY, ZC], dir: "x" } },
  experiment: { title: "Drive straight", idea: "Put two of these on an H-bridge, run both at the same PWM and count the encoder pulses on each. They never match: change one speed until the counts agree and the robot goes straight." },
  tags: ["n20", "micro gear motor", "dc motor", "encoder", "quadrature", "robot", "wheel", "motor"],
});
