import { MATERIAL, PCB_TOP, board, definePart, gnd, name, pin, pinHeader, silk, smd, sot23, vcc, type Solid } from "../../sdk";

const TOP = PCB_TOP;
const PITCH = 9.525;
const FIRST = 4.1;
const SY = 8.5;
const centers = Array.from({ length: 8 }, (_, i) => Math.round((FIRST + i * PITCH) * 100) / 100);

/** One QRE1113-style reflective sensor: a black 3.6 x 2.9 x 1.7 mm package with an IR LED window and a phototransistor window. */
function reflector(cx: number): Solid[] {
  const z = TOP + 1.7;
  return [
    { kind: "box", x: cx - 1.8, y: SY - 1.45, w: 3.6, h: 2.9, d: 1.7, z: TOP, top: "#17181b", side: "#0b0c0d", radius: 0.2, finish: "epoxy" },
    { kind: "disc", cx: cx - 0.85, cy: SY, r: 0.6, color: "#4a4f58", z: z + 0.01 },
    { kind: "disc", cx: cx + 0.85, cy: SY, r: 0.6, color: "#08090a", z: z + 0.01 },
  ];
}

const header = pinHeader(24.75, 2, 11, { style: "down" });
const ids = ["GND", "VCC", "LEDON", ...Array.from({ length: 8 }, (_, i) => `OUT${i + 1}`)];

const perforation = (x: number): Solid => ({
  kind: "path",
  d: Array.from({ length: 12 }, (_, i) => `M ${x} ${0.7 + i} L ${x} ${1.0 + i}`).join(" "),
  color: "#0b0b0d",
  width: 0.45,
  z: TOP,
});

export default definePart({
  id: "line-array",
  name: "QTR-8A reflectance sensor array",
  aka: ["QTR-8A", "8-channel line sensor", "Pololu QTR-8A", "line sensor array", "line follower bar"],
  group: "sensors",
  rank: 10,
  summary: "Eight line sensors in one strip, 9.5 mm apart. Your code reads all eight and works out where the line is, so a robot can follow it smoothly instead of zig-zagging.",
  size: { w: 74.9, h: 12.7, d: 3.3 },
  solids: [
    board(74.9, 12.7, "#1a1a1e", {
      radius: 0.6,
      holes: [
        { x: 3.2, y: 3.4, d: 2.2 },
        { x: 71.7, y: 3.4, d: 2.2 },
      ],
    }),
    centers.flatMap(reflector),
    // A 47 k resistor (marked 473) beside each sensor makes the voltage divider that gives its output.
    centers.flatMap((cx) => smd(cx - 0.8, 10.9, "r", "x")),
    // The switch for all eight LEDs and its pull-up, the 3.3 V bypass pads and the strip's bypass cap.
    sot23(20.6, 5.6),
    smd(18.2, 5.0, "r", "y"),
    smd(22.4, 7.6, "c", "x"),
    smd(60, 5.4, "c", "x"),
    { kind: "disc", cx: 63.6, cy: 5.4, r: 0.7, color: MATERIAL.tin },
    { kind: "disc", cx: 65.9, cy: 5.4, r: 0.7, color: MATERIAL.tin },
    perforation(56.55),
    header,
    ...ids.map((id, i): Solid => silk(24.75 + i * 2.54, 4.75, i < 3 ? ["GND", "VCC", "LED"][i] : String(i - 2), 0.85, MATERIAL.silk, { anchor: "middle" })),
    silk(8.6, 5.4, "QTR-8A", 1.3, MATERIAL.silk, { weight: 700 }),
    silk(64.75, 4.0, "3.3V", 0.8, MATERIAL.silk, { anchor: "middle" }),
    silk(64.75, 7.2, "BYPASS", 0.8, MATERIAL.silk, { anchor: "middle" }),
  ],
  features: [
    { id: "sensors", label: "Eight reflective sensors", kind: "sensor", x: 2.3, y: 7.05, w: 70.5, h: 2.9, note: "Each is an infrared LED and a phototransistor in one black package. They sit 9.525 mm apart and look at the floor 3 to 6 mm below." },
    { id: "pins", label: "GND, VCC, LEDON, 1 to 8", kind: "pins", x: 23.5, y: 0.7, w: 28, h: 2.6, note: "Eleven pins in a row. Outputs 1 to 8 each go to an analog input. LEDON can stay unwired." },
    { id: "fet", label: "LED switch", kind: "chip", x: 19.1, y: 4.4, w: 3, h: 2.4, note: "A small transistor that turns all eight infrared LEDs on or off. The LEDON pin drives it." },
    { id: "dividers", label: "47 kΩ resistors", kind: "other", x: 3.3, y: 10.8, w: 69, h: 0.9, note: "One beside each sensor. With the phototransistor it makes a voltage that rises as the floor gets darker." },
    { id: "break", label: "Break line", kind: "mechanical", x: 56.2, y: 0.5, w: 0.7, h: 11.7, note: "A line of holes between sensors 6 and 7. Snap the strip here to get a 6-sensor piece and a 2-sensor piece." },
    { id: "holes", label: "Mounting holes", kind: "mechanical", x: 2.1, y: 2.3, w: 70.7, h: 2.2, note: "One at each end, for #2 screws." },
  ],
  pins: [
    gnd("GND"),
    vcc("VCC", "3.3 V to 5 V supply. About 100 mA with the LEDs lit."),
    pin("LEDON", "digital", "opt", "Pulled high on the board, so the LEDs are on if you leave it unwired. Drive it low to switch them off and save about 90 mA, or send PWM to dim them.", { label: "LEDON", required: false }),
    ...Array.from({ length: 8 }, (_, i) => pin(`OUT${i + 1}`, "analog", "out-analog", `Sensor ${i + 1}'s voltage. Near 0 V over white, near VCC over black. Wire it to an analog input.`, { label: String(i + 1), required: false })),
  ],
  pinAt: name(header, ...ids),
  circuit: {
    blocks: [
      { id: "vcc", label: "VCC", sub: "3.3 V to 5 V", kind: "power", col: 0, row: 0, at: "VCC", note: "Feeds the eight LEDs and eight dividers. Nearly all of the 100 mA goes into the LEDs." },
      { id: "ledon", label: "LEDON", sub: "low = LEDs off", kind: "pin", col: 0, row: 1, at: "LEDON", note: "Optional. Pulled high on the board." },
      { id: "fet", label: "LED switch", sub: "MOSFET", kind: "driver", col: 1, row: 1, at: "fet", note: "Switches the eight LEDs on and off as one." },
      { id: "leds", label: "IR LEDs", sub: "eight of them", kind: "sensor", col: 2, row: 1, at: "sensors", note: "Each lights the floor under its own sensor." },
      { id: "line", label: "Floor and line", kind: "world", col: 3, row: 1, note: "Bright floor sends light back. A dark line does not." },
      { id: "photo", label: "Phototransistors", sub: "eight of them", kind: "sensor", col: 3, row: 2, at: "sensors", note: "Each one only sees the spot under it." },
      { id: "div", label: "47 kΩ dividers", kind: "passive", col: 2, row: 2, at: "dividers", note: "Turn each phototransistor's current into a voltage." },
      { id: "out", label: "OUT1 to OUT8", sub: "eight voltages", kind: "pin", col: 0, row: 2, at: "OUT1", note: "Low over white, high over black. Read them with eight analog inputs." },
    ],
    links: [
      { from: "vcc", to: "fet", kind: "power" },
      { from: "ledon", to: "fet", kind: "signal", label: "low = off" },
      { from: "fet", to: "leds", kind: "power", label: "about 90 mA" },
      { from: "leds", to: "line", kind: "light", label: "infrared" },
      { from: "line", to: "photo", kind: "light", label: "bounce" },
      { from: "photo", to: "div", kind: "analog" },
      { from: "div", to: "out", kind: "analog", label: "0 V to VCC" },
    ],
    steps: [
      "Eight infrared LEDs shine down at the floor. Leave LEDON alone and they are always lit.",
      "Each phototransistor sees only the spot under its own LED. A dark line under one sensor gives that sensor a high voltage.",
      "Read all eight outputs. The sensor with the highest value is the one nearest the line.",
      "Weigh the readings by sensor position to get a line position, then steer to bring it to the middle.",
    ],
  },
  facts: [
    { label: "Sensors", value: "8, 9.525 mm apart" },
    { label: "Height", value: "3 mm best, 6 mm max" },
    { label: "Supply", value: "3.3–5 V" },
    { label: "Draw", value: "about 100 mA" },
    { label: "Outputs", value: "8 analog, 0 V to VCC" },
    { label: "Size", value: "74.9 × 12.7 mm" },
  ],
  spec: {
    form: {
      mass: 3.09,
      mount: "jumpers",
      pitch: 2.54,
      holes: [
        { x: 3.2, y: 3.4, d: 2.2 },
        { x: 71.7, y: 3.4, d: 2.2 },
      ],
      note: "The header comes loose in the bag: solder it on the side away from the sensors. Screw the strip under the front of the robot, sensors facing the floor. It can be snapped between sensors 6 and 7.",
    },
    power: {
      supply: { min: 3.3, max: 5, typ: 5 },
      logic: 5,
      tolerant5V: true,
      draw: { idle: 5, active: 100 },
      interface: "8 analog voltages, 0 V to VCC",
      note: "Just under 100 mA with the LEDs on. With LEDON low it falls to a few mA (the 5 mA is an estimate).",
    },
    sourcing: { mpn: "QTR-8A (Pololu item 960)", maker: "Pololu", lifecycle: "active", usd: [12, 13] },
    limits: [
      "It draws about 100 mA with the LEDs on, more than the rest of a small robot together. Use LEDON to switch them off between readings.",
      "It needs eight analog inputs. An Uno has six, so use six sensors, or take a Nano (A0 to A7) or a Mega.",
      "It only works 3 to 6 mm above the floor, and sunlight swamps it.",
      "It must be calibrated on your own floor and line: sweep it across the line at start-up and note the lowest and highest readings.",
    ],
    upgrade: [
      { name: "Pololu QTR-HD or QTRX dimmable arrays", why: "The same idea with 4 mm sensor spacing, emitters you can dim, and about 30 mA for the whole array at 3.3 V instead of 100 mA. They come in 1 to 31 channels." },
    ],
    refs: ["https://www.pololu.com/product/960", "https://www.pololu.com/docs/0J12/all"],
  },
  sim: {
    kind: "sensor",
    reads: [{ key: "line", label: "Line position", unit: "mm", min: -40, max: 40, step: 1, start: 0, sweep: [-25, 25, 6], digits: 0 }],
    analog: [-33.3, -23.8, -14.3, -4.8, 4.8, 14.3, 23.8, 33.3].map((center, i) => ({ pin: `OUT${i + 1}`, key: "line", near: [center, 8] as [number, number] })),
  },
  experiment: { title: "Where is the line?", idea: "Read all eight outputs and print them. Slide a strip of black tape under the array and watch the biggest number move from sensor 1 to sensor 8." },
  tags: ["qtr-8a", "line", "array", "reflectance", "pololu", "line follower", "8 channel", "sensor"],
});
