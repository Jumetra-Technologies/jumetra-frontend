import { circlePath, definePart, gnd, jst, lead, name, pin, silk, vcc, type Solid } from "../../sdk";

const BODY_H = 13; // lying on its back, lenses up
const BODY_Y = 13.5;
const BLACK = "#1b1c1f";

/** One lens window in the black face: a dark ring and a glassy dome. */
function lens(cx: number, cy: number, r: number, id: string): Solid[] {
  return [
    { kind: "disc", cx, cy, r: r + 0.5, color: "#0b0c0e", z: BODY_H + 0.01 },
    { kind: "dome", id, cx, cy, r, d: 0.9, z: BODY_H, color: "#3a3d46", finish: "glass" },
  ];
}

// Three wires on the JST plug, lying on the bench. Left to right as seen from above: power, ground, signal.
const STRIP = 3;
const wires: Array<{ id: string; color: string; points: Array<[number, number, number]> }> = [
  { id: "VCC", color: "#c0262b", points: [[16.5, 22.4, 6], [16.5, 25.2, 5.6], [17, 30, 3], [20, 34, 1.3], [28, 35, 0.65], [36, 34.6, 0.65], [44, 34.4, 0.65]] },
  { id: "GND", color: "#17181b", points: [[18.5, 22.4, 6], [18.5, 25, 5.6], [19.5, 28.5, 3], [23, 31.5, 1.3], [30, 32.2, 0.65], [37, 31.8, 0.65], [44, 31.4, 0.65]] },
  { id: "VO", color: "#e8c21a", points: [[20.5, 22.4, 6], [20.5, 24.8, 5.6], [22, 27.5, 3.2], [26, 29.5, 1.3], [32, 30, 0.65], [38, 29.2, 0.65], [44, 28.4, 0.65]] },
];

const socket = jst(18.5, 15.75, 3, "bottom", { z: 3 });
const tip = (w: (typeof wires)[number]) => {
  const last = w.points[w.points.length - 1];
  return { x: Math.round((last[0] + STRIP * 0.6) * 100) / 100, y: last[1] };
};

// The body has a half-round notch at each end where the mounting screw passes.
const bodyPath = `M 3.75 0 L 33.25 0 L 33.25 5.15 A 1.6 1.6 0 0 0 33.25 8.35 L 33.25 ${BODY_Y} L 3.75 ${BODY_Y} L 3.75 8.35 A 1.6 1.6 0 0 0 3.75 5.15 Z`;
const ear = (cx: number) => `${circlePath(cx, 6.75, 3.75)} ${circlePath(cx, 6.75, 1.6)}`;

export default definePart({
  id: "sharp-ir",
  name: "Sharp GP2Y0A21YK0F distance sensor",
  aka: ["Sharp IR range finder", "GP2Y0A21", "GP2Y0A21YK", "Sharp 10-80 cm sensor", "analog IR distance sensor"],
  group: "sensors",
  rank: 11,
  summary: "A black box with two lenses. One sends a thin beam of infrared light and the other sees where the spot lands, which tells it how far away the object is. It gives a voltage that falls as the distance grows, for 10 cm to 80 cm.",
  size: { w: 37, h: 13.5, d: BODY_H },
  solids: [
    { kind: "extrude", id: "case", path: bodyPath, d: BODY_H, z: 0, top: BLACK, side: "#0d0e10", bevel: 0.4, finish: "plastic" },
    // Two mounting ears with a 3.2 mm hole each. Their inner halves are inside the body.
    { kind: "extrude", id: "ear-l", path: ear(3.75), d: 2.5, z: 0, top: BLACK, side: "#0d0e10", finish: "plastic" },
    { kind: "extrude", id: "ear-r", path: ear(33.25), d: 2.5, z: 0, top: BLACK, side: "#0d0e10", finish: "plastic" },
    lens(8.5, 6.75, 2.8, "lens-emitter"),
    lens(28.5, 6.75, 3.3, "lens-detector"),
    silk(18.5, 6.0, "SHARP", 1.5, "#8d9199", { anchor: "middle", weight: 700, z: BODY_H + 0.01 }),
    silk(18.5, 8.3, "GP2Y0A21YK", 1, "#8d9199", { anchor: "middle", z: BODY_H + 0.01 }),
    socket,
    // The mating plug, pushed into the socket, with its three wires coming out of its far end.
    { kind: "box", x: 14.75, y: 18, w: 7.5, h: 4.7, d: 5.4, z: 3.3, top: "#f0ecdf", side: "#c9c4b3", radius: 0.4, finish: "plastic" },
    ...wires.flatMap((w) => lead(w.points, w.color, { r: 0.65, strip: STRIP })),
  ],
  features: [
    { id: "lens-emitter", label: "Emitter lens", kind: "sensor", x: 5.2, y: 3.45, w: 6.6, h: 6.6, note: "An infrared LED behind this window sends out a narrow beam, in short bursts about 26 times a second." },
    { id: "lens-detector", label: "Detector lens", kind: "sensor", x: 24.6, y: 3.05, w: 7.8, h: 7.4, note: "Focuses the returning light onto a thin strip that senses where the spot lands. The closer the object, the further along the strip the spot falls." },
    { id: "ears", label: "Mounting ears", kind: "mechanical", x: 0, y: 3, w: 37, h: 7.5, note: "Two ears with 3.2 mm holes. Screws go through along the beam, so the sensor bolts to the front of a robot." },
    { id: "socket", label: "JST connector", kind: "connector", x: 14.55, y: 13.5, w: 7.9, h: 9.2, note: "A 3-pin JST PH socket, 2 mm pitch. The cable plugs in here. Pin 1 is the signal, pin 2 is ground, pin 3 is power." },
    { id: "cable", label: "Cable", kind: "pins", x: 15.5, y: 22.7, w: 31, h: 13.5, note: "Red is power, black is ground, yellow is the signal. Wire VO to an analog input." },
  ],
  pins: [
    pin("VO", "analog", "out-analog", "The distance as a voltage: about 2.3 V at 10 cm falling to about 0.4 V at 80 cm. It stays under about 3.1 V, so it is safe for a 3.3 V analog input.", { label: "VO" }),
    gnd("GND"),
    vcc("VCC", "4.5 V to 5.5 V supply. It takes about 30 mA, in spikes. It will not run from 3.3 V."),
  ],
  pinAt: { VCC: tip(wires[0]), GND: tip(wires[1]), VO: tip(wires[2]) },
  circuit: {
    blocks: [
      { id: "vcc", label: "VCC", sub: "4.5 V to 5.5 V", kind: "power", col: 0, row: 0, at: "VCC", note: "About 30 mA on average, with spikes each time the LED fires." },
      { id: "led", label: "IR LED", sub: "pulsed", kind: "sensor", col: 1, row: 0, at: "lens-emitter", note: "Fires a narrow beam in short bursts. Because it is pulsed, room light does not fool it the way it fools a steady LED." },
      { id: "obj", label: "Object", sub: "10–80 cm", kind: "world", col: 2, row: 0, note: "The beam makes a small spot on it. Shiny, sunlit or edge-on objects give errors." },
      { id: "psd", label: "Position sensor", sub: "a thin light strip", kind: "sensor", col: 3, row: 0, at: "lens-detector", note: "The spot lands nearer one end for a close object and nearer the other for a far one." },
      { id: "proc", label: "Signal processor", kind: "ic", col: 2, row: 1, at: { x: 18.5, y: 6.75 }, note: "Turns the spot's position into a voltage and holds it until the next measurement." },
      { id: "vo", label: "VO", sub: "falls as distance grows", kind: "pin", col: 0, row: 1, at: "VO", note: "A new value about every 38 ms. It can be unsteady for up to 5 ms after each one." },
    ],
    links: [
      { from: "vcc", to: "led", kind: "power", label: "bursts" },
      { from: "led", to: "obj", kind: "light", label: "infrared spot" },
      { from: "obj", to: "psd", kind: "light", label: "angle depends on distance" },
      { from: "psd", to: "proc", kind: "analog" },
      { from: "proc", to: "vo", kind: "analog", label: "0.4 V to 2.3 V" },
    ],
    steps: [
      "The LED sends a narrow burst of infrared light straight ahead.",
      "The spot it makes on the object is seen through the second lens, from a slightly different angle.",
      "The nearer the object, the bigger that angle, and the further along the strip the spot lands.",
      "The processor turns the spot's position into a voltage on VO. Closer means a higher voltage. It updates about every 38 ms.",
    ],
  },
  facts: [
    { label: "Range", value: "10–80 cm" },
    { label: "Output", value: "0.4 V at 80 cm, 2.3 V at 10 cm" },
    { label: "Supply", value: "4.5–5.5 V, 30 mA" },
    { label: "Update", value: "every 38 ms (about 26 Hz)" },
    { label: "Connector", value: "JST PH, 3 pins" },
    { label: "Size", value: "29.5 × 13 × 13.5 mm" },
  ],
  spec: {
    form: {
      mass: 3.6,
      mount: "leads",
      pitch: 2,
      holes: [
        { x: 3.75, y: 6.75, d: 3.2 },
        { x: 33.25, y: 6.75, d: 3.2 },
      ],
      note: "It comes with a JST PH socket and needs a matching cable (PHR-3 with wires). Bolt it to the robot through the two ears; the lenses must have a clear view ahead.",
    },
    power: {
      supply: { min: 4.5, max: 5.5, typ: 5 },
      logic: 5,
      tolerant5V: true,
      draw: { idle: 30, active: 30, peak: 40 },
      interface: "Analog voltage on VO; a new value every 38 ms",
      note: "30 mA typical, 40 mA at most. The supply is spiky, so put a capacitor of 10 µF or more close to the sensor.",
    },
    sourcing: { mpn: "GP2Y0A21YK0F", maker: "Sharp", lifecycle: "active", usd: [8, 15], note: "Many clones. Same case: GP2Y0A41SK0F (4 to 30 cm), GP2Y0A02YK0F (20 to 150 cm) and GP2Y0A710K0F (100 to 550 cm)." },
    limits: [
      "The curve is not a straight line. Distance in cm is roughly 27 divided by the volts, so a reading at 80 cm has 20 times less to work with than one at 10 cm.",
      "It reads wrong closer than 10 cm. The voltage peaks near 3.1 V at about 6 cm, then falls again, so a very close object looks far away.",
      "It updates only about 26 times a second (every 38.3 ms, give or take 9.6 ms).",
      "It needs 4.5 V to 5.5 V and will not run from 3.3 V. It draws 30 mA with spikes, and without a bypass capacitor the output gets noisy.",
      "Bright sunlight, shiny surfaces and edges give errors, and the target's color moves the reading a little.",
    ],
    upgrade: [
      { part: "vl53l0x", name: "VL53L0X time-of-flight sensor", why: "Reports millimeters over I2C, so there is no curve to fit. It runs on 3.3 V and takes 19 mA. Its range is about 30 mm to 2 m." },
      { name: "VL53L1X time-of-flight sensor", why: "The same bus and idea, but it reaches up to 4 m, past the Sharp's 80 cm limit." },
    ],
    refs: ["https://course.ccs.neu.edu/cs4610/s13/docs/gp2y0a21yk0f.pdf", "https://www.superdroidrobots.com/store/product=1557"],
  },
  sim: {
    kind: "sensor",
    reads: [{ key: "distanceCm", label: "Distance", unit: "cm", min: 10, max: 80, step: 1, start: 30, sweep: [12, 75, 8], digits: 0 }],
    analog: [{ pin: "VO", key: "distanceCm", invert: true }],
  },
  experiment: { title: "Fit the curve", idea: "Hold a book at 10, 20, 40 and 80 cm and note the voltage each time. Then plot distance against 1 divided by volts and see that it is nearly a straight line." },
  tags: ["sharp", "gp2y0a21yk0f", "ir", "infrared", "distance", "range", "analog", "proximity", "sensor"],
});
