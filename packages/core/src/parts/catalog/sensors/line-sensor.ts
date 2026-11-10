import { MATERIAL, PCB_TOP, board, comparatorSet, definePart, gnd, name, pin, pinHeader, silk, vcc, type Solid } from "../../sdk";
import { MODULE_BLUE, comparatorSpecks, headerLabels } from "./_ir";

const TOP = PCB_TOP;
const SENSOR_H = 7;

/** The TCRT5000: a black block, 10.2 x 5.8 x 7 mm, with the IR LED and the phototransistor in two round windows on its face. */
function tcrt5000(cx: number, cy: number): Solid[] {
  const face = TOP + SENSOR_H;
  return [
    { kind: "box", id: "tcrt", x: cx - 5.1, y: cy - 2.9, w: 10.2, h: 5.8, d: SENSOR_H, z: TOP, top: "#1b1c1f", side: "#0d0e10", radius: 0.5, finish: "plastic" },
    // A ridge between the two eyes keeps the LED's light out of the receiver.
    { kind: "box", x: cx - 0.25, y: cy - 2.9, w: 0.5, h: 5.8, d: SENSOR_H + 0.5, z: TOP, top: "#121316", radius: 0.1, finish: "plastic" },
    // Emitter: a dark-tinted dome. Receiver: a flat black window with a lip.
    { kind: "disc", cx: cx - 2.6, cy, r: 1.9, color: "#0a0a0c", z: face + 0.01 },
    { kind: "dome", id: "tcrt-ir", cx: cx - 2.6, cy, r: 1.5, d: 0.9, z: face, color: "#4b4f57", finish: "glass" },
    { kind: "disc", cx: cx + 2.6, cy, r: 1.9, color: "#0a0a0c", z: face + 0.01 },
    { kind: "cyl", cx: cx + 2.6, cy, r: 1.45, d: 0.25, z: face, top: "#2c2e34", finish: "plastic" },
  ];
}

const header = pinHeader(2.2, 30, 4, { style: "up" });

export default definePart({
  id: "line-sensor",
  name: "TCRT5000 line tracking sensor module",
  aka: ["line follower sensor", "TCRT5000 module", "IR tracking sensor", "black-white line sensor"],
  group: "sensors",
  rank: 2,
  summary: "It shines invisible infrared light at the floor and measures how much comes back. Dark tape reflects little, a white floor reflects a lot, so a robot can tell the line from the floor.",
  size: { w: 14, h: 32, d: 12.4 },
  solids: [
    board(14, 32, MODULE_BLUE, { radius: 0.5, holes: [{ x: 3.2, y: 16, d: 3 }] }),
    tcrt5000(7, 3.5),
    comparatorSet({ chip: [6, 21], trimmer: [10, 13.5], power: [3, 25.5], signal: [11, 25.5] }, { chipDir: "x", trimmerDir: "y" }),
    comparatorSpecks([
      [9.2, 19.4, "r", "x"],
      [9.2, 21, "r", "x"],
      [9.2, 22.6, "r", "x"],
      [4.6, 25.1, "r", "x"],
      [7.4, 25.1, "r", "x"],
      [1.6, 19.6, "c", "y"],
    ]),
    header,
    ...headerLabels([2.2, 4.74, 7.28, 9.82], 28.3, ["VCC", "GND", "DO", "AO"]),
    silk(7, 8.6, "TCRT5000", 0.9, MATERIAL.silk, { anchor: "middle" }),
  ],
  features: [
    { id: "sensor", label: "TCRT5000 sensor", kind: "sensor", x: 1.9, y: 0.6, w: 10.2, h: 5.8, note: "An infrared LED (left) and a light sensor (right) side by side. It looks straight ahead, so you mount the board with this face 3 to 8 mm above the floor." },
    { id: "trim", label: "Sensitivity trimmer", kind: "other", x: 7.6, y: 8.75, w: 4.8, h: 9.5, note: "Turn the screw with a small screwdriver to set how dark the line must be before DO flips." },
    { id: "lm393", label: "LM393 comparator", kind: "chip", x: 3.2, y: 18, w: 5.6, h: 6, note: "Compares the sensor's voltage with the trimmer's and gives a clean high or low on DO." },
    { id: "leds", label: "Power and signal LEDs", kind: "led", x: 2, y: 24.8, w: 10, h: 1.4, note: "Red: power is on. Green: lit while DO is low, which is when the sensor sees a bright surface." },
    { id: "hole", label: "Mounting hole", kind: "mechanical", x: 1.7, y: 14.5, w: 3, h: 3, note: "One M3 screw holds the board to a chassis." },
    { id: "pins", label: "VCC, GND, DO, AO", kind: "pins", x: 0.9, y: 28.7, w: 10.2, h: 2.6, note: "DO is the yes-or-no output. AO gives the voltage itself, for when you want to tell shades apart." },
  ],
  pins: [
    vcc("VCC", "3.3 V to 5 V supply."),
    gnd("GND"),
    pin("DO", "digital", "out-digital", "Digital output. High over a dark line, low over a bright floor. The trimmer sets the switching point.", { label: "DO", required: false }),
    pin("AO", "analog", "out-analog", "Analog output. The voltage is high over dark and far away, low over bright and close. Read it with an analog pin to tell shades apart.", { label: "AO", required: false }),
  ],
  pinAt: name(header, "VCC", "GND", "DO", "AO"),
  circuit: {
    blocks: [
      { id: "vcc", label: "VCC", sub: "3.3 V to 5 V", kind: "power", col: 0, row: 0, at: "VCC", note: "Feeds the IR LED, the comparator and the two indicator LEDs." },
      { id: "led", label: "IR LED", sub: "940 nm", kind: "sensor", col: 1, row: 0, at: "sensor", note: "Sends invisible light down at the floor, all the time. A series resistor keeps it near 20 mA." },
      { id: "floor", label: "Floor", sub: "dark or bright", kind: "world", col: 2, row: 0, note: "Bright floor throws most of the light back. A black line soaks it up." },
      { id: "photo", label: "Phototransistor", kind: "sensor", col: 3, row: 0, at: "sensor", note: "Lets more current through the more light it sees, which pulls its voltage down." },
      { id: "ao", label: "AO", sub: "volts follow the light", kind: "pin", col: 3, row: 1, at: "AO", note: "The phototransistor's own voltage. High over dark, low over bright." },
      { id: "trim", label: "Trimmer", sub: "threshold", kind: "passive", col: 2, row: 1, at: "trim", note: "A voltage divider you set by hand. It is the level the comparator checks against." },
      { id: "cmp", label: "Comparator", sub: "LM393", kind: "ic", col: 2, row: 2, at: "lm393", note: "Says high when the sensor's voltage is above the trimmer's, low when it is below." },
      { id: "do", label: "DO", sub: "line seen = high", kind: "pin", col: 0, row: 2, at: "DO", note: "A clean 0 V or VCC signal for any digital pin." },
      { id: "led-out", label: "Green LED", sub: "lit = bright floor", kind: "sensor", col: 1, row: 2, at: "leds", note: "Lights while DO is low." },
    ],
    links: [
      { from: "vcc", to: "led", kind: "power", label: "about 20 mA" },
      { from: "led", to: "floor", kind: "light", label: "infrared" },
      { from: "floor", to: "photo", kind: "light", label: "what bounces back" },
      { from: "photo", to: "ao", kind: "analog" },
      { from: "photo", to: "cmp", kind: "analog" },
      { from: "trim", to: "cmp", kind: "analog", label: "threshold" },
      { from: "cmp", to: "do", kind: "signal" },
      { from: "cmp", to: "led-out", kind: "signal" },
    ],
    steps: [
      "The IR LED is always on. It lights the floor under the sensor with light your eye can't see.",
      "A bright floor sends most of it back to the phototransistor. A black line sends back very little.",
      "More light on the phototransistor means a lower voltage on AO. Dark under it means a high voltage.",
      "The comparator checks that voltage against the trimmer's setting and puts a clean high or low on DO.",
    ],
  },
  facts: [
    { label: "Sensor", value: "TCRT5000, 940 nm" },
    { label: "Best height", value: "3–8 mm" },
    { label: "Supply", value: "3.3–5 V" },
    { label: "Outputs", value: "DO and AO" },
    { label: "Board", value: "32 × 14 mm" },
  ],
  spec: {
    form: {
      mount: "jumpers",
      pitch: 2.54,
      holes: [{ x: 3.2, y: 16, d: 3 }],
      note: "Bolt it to the chassis with one M3 screw, sensor side facing the floor, and wire the 4-pin header with jumpers. A 3-pin version without AO and a 42 x 10 mm version also exist.",
    },
    power: {
      supply: { min: 3.3, max: 5, typ: 5 },
      logic: 5,
      tolerant5V: true,
      draw: { idle: 5, active: 20 },
      interface: "DO high or low, AO 0 V to VCC",
      note: "No maker gives the module's current. The 20 mA is worked out from the IR LED's series resistor; the sensor itself allows 60 mA at most.",
    },
    sourcing: { mpn: "TCRT5000 + LM393", maker: "Generic (Vishay TCRT5000 sensor)", lifecycle: "generic", usd: [0.6, 2], note: "Sold in bags of 5 and 10 for a few dollars." },
    limits: [
      "It only sees 1 to 8 mm in practice: the TCRT5000 peaks at 2.5 mm and fades to almost nothing by 25 mm.",
      "The IR LED is not modulated, so sunlight and bright bulbs swamp it.",
      "Shiny black tape can look white. Test on your own surface.",
      "One sensor gives no idea which way the line has gone. A robot needs three to five of them, or an array.",
    ],
    upgrade: [
      { part: "line-array", name: "QTR-8A reflectance array", why: "Eight sensors 9.5 mm apart in one strip, so code can work out where the line is instead of just whether it is there. The LEDs can be switched off to save about 90 mA." },
    ],
    refs: ["https://www.epfl.ch/campus/associations/robopoly/wp-content/uploads/2018/09/TCRT5000.pdf", "https://docs.sunfounder.com/projects/sf-components/en/latest/component_track_module.html"],
  },
  sim: {
    kind: "sensor",
    reads: [{ key: "reflect", label: "Light reflected", unit: "%", min: 0, max: 100, step: 1, start: 85, sweep: [90, 5, 6], digits: 0 }],
    analog: [{ pin: "AO", key: "reflect", invert: true }],
    trips: [{ pin: "DO", key: "reflect", when: "below", at: 35 }],
  },
  experiment: { title: "Stop at the line", idea: "Stick a strip of black tape on white paper. Read AO while you slide the sensor across it, then use DO to stop a motor on the tape." },
  tags: ["line", "tcrt5000", "reflective", "infrared", "ir", "line follower", "tracking", "sensor"],
});
