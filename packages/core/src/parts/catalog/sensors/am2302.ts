import { definePart, gnd, lead, pin, silk, vcc } from "../../sdk";
import { moldedBody, sensingWindow } from "./_dht";

const W = 15.1;
const BODY_H = 25.1;
const D = 7.7;
const WHITE = "#f2f2ee";
const BLACK = "#1b1c1f";
const STRIP = 3;

type P3 = [number, number, number];
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Where the bare end of a lead really stops: the last point, plus `STRIP` mm along the last segment. */
function tip(points: P3[]): { x: number; y: number } {
  const a = points[points.length - 2];
  const b = points[points.length - 1];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) || 1;
  return { x: r2(b[0] + ((b[0] - a[0]) / len) * STRIP), y: r2(b[1] + ((b[1] - a[1]) / len) * STRIP) };
}

// The cable leaves the black sleeve, then splits into its three wires, each ending in a bare tip.
const RED: P3[] = [[9.6, 45, 1.5], [8.2, 48.5, 0.9], [6.2, 52.5, 0.6], [4.6, 57, 0.55]];
const YELLOW: P3[] = [[9.6, 45, 1.5], [9.5, 49, 0.8], [9.1, 54, 0.6], [9.1, 58, 0.55]];
const DARK: P3[] = [[9.6, 45, 1.5], [10.9, 48.5, 0.9], [12.9, 52.5, 0.6], [14.5, 57, 0.55]];
const RED_TIP = tip(RED);
const YELLOW_TIP = tip(YELLOW);
const DARK_TIP = tip(DARK);
const END = Math.max(RED_TIP.y, YELLOW_TIP.y, DARK_TIP.y);

export default definePart({
  id: "am2302",
  name: "AM2302 wired humidity & temperature",
  aka: ["wired DHT22", "AM2302 cable sensor", "DHT22 with cable"],
  group: "sensors",
  rank: 17,
  summary: "The DHT22 with its wires already attached and the pull-up resistor inside: the same sensor, ready to tape wherever the air is.",
  size: { w: W, h: r2(END), d: 7.8 },
  solids: [
    moldedBody(0, 0, W, BODY_H, D, WHITE, "body"),
    { kind: "disc", cx: W / 2, cy: 1.7, r: 1.0, color: "#3a3d42", z: D + 0.01, ring: { color: "#c9c9c4", width: 0.25 } },
    sensingWindow(2.05, 3.3, 11, 8.5, 4, 5, D, { panel: "#dcdcd6", cell: "#4a4e55" }, { w: 2.0, h: 1.2 }),
    silk(W / 2, 19.2, "AM2302", 2.2, "#1a1a1a", { anchor: "middle", z: D + 0.01, weight: 700 }),
    // The black heat-shrink sleeve over the soldered legs, and the cable that leaves it.
    { kind: "box", id: "sleeve", x: 3.3, y: 23.2, w: 8.5, h: 9.6, d: 5, z: 0, top: BLACK, side: "#0d0e10", finish: "plastic", radius: 2.2 },
    { kind: "wire", points: [[7.55, 29, 2.6], [7.55, 33, 1.7], [8.3, 38.5, 1.5], [9.6, 43, 1.5], [9.6, 45.5, 1.5]], r: 1.5, color: BLACK, finish: "rubber" },
    lead(RED, "#d12d2d", { r: 0.55, strip: STRIP }),
    lead(YELLOW, "#f2c70c", { r: 0.55, strip: STRIP }),
    lead(DARK, "#2a2c31", { r: 0.55, strip: STRIP }),
  ],
  features: [
    { id: "grille", label: "Sensing grille", kind: "sensor", x: 2.05, y: 3.3, w: 11, h: 8.5, note: "Same capacitive humidity element and thermistor as the DHT22 behind these openings." },
    { id: "hole", label: "Mounting hole", kind: "mechanical", x: 6.1, y: 0.7, w: 2.9, h: 2, note: "Hang it where you want to measure; the cable does the rest." },
    { id: "body", label: "White housing", kind: "chip", x: 0, y: 0, w: W, h: 23.2, note: "Holds the sensor chip. The AM2302 label tells it from the bare DHT22." },
    { id: "sleeve", label: "Sleeve with pull-up", kind: "other", x: 3.3, y: 23.2, w: 8.5, h: 9.6, note: "A black heat-shrink sleeve over the soldered legs. The pull-up resistor is hidden inside it, so you need none of your own." },
    { id: "cable", label: "Cable", kind: "connector", x: 4, y: 33, w: 11, h: END - 33 + STRIP, note: "About 23 cm long in real life (drawn shorter). Three wires with bare tinned ends: red VCC, yellow DATA, black GND." },
  ],
  pins: [
    vcc("VCC", "Red wire. 3.3 V to 5.5 V supply, about 1 mA while measuring.", { label: "Red VCC" }),
    pin("DATA", "data", "io", "Yellow wire. Single-wire data, both ways; the pull-up is already inside.", { label: "Yellow DATA" }),
    gnd("GND", "Black wire. Ground.", { label: "Black GND" }),
  ],
  pinAt: { VCC: RED_TIP, DATA: YELLOW_TIP, GND: DARK_TIP },
  circuit: {
    blocks: [
      { id: "air", label: "Air", sub: "humidity, temperature", kind: "world", col: 0, row: 0, note: "The air at the end of the cable." },
      { id: "hum", label: "Humidity element", sub: "capacitive", kind: "sensor", col: 1, row: 0, at: "grille", note: "Same element as the DHT22." },
      { id: "ntc", label: "Thermistor", sub: "NTC, ±0.5 °C", kind: "sensor", col: 1, row: 1, at: "grille", note: "Same thermistor as the DHT22." },
      { id: "mcu", label: "Sensor chip", sub: "calibrated, 40 bits", kind: "ic", col: 2, row: 0, at: "body", note: "Measures, calibrates, answers." },
      { id: "pull", label: "Pull-up", sub: "5.1 kΩ, built in", kind: "passive", col: 2, row: 1, at: "sleeve", note: "Holds the data wire high between bits so you don't need your own resistor." },
      { id: "data", label: "Yellow wire", sub: "DATA", kind: "pin", col: 3, row: 0, at: "DATA", note: "To any digital pin." },
      { id: "vcc", label: "Red wire", sub: "VCC", kind: "power", col: 3, row: 1, at: "VCC", note: "3.3 V to 5.5 V." },
      { id: "gnd", label: "Black wire", sub: "GND", kind: "ground", col: 3, row: 2, at: "GND", note: "Ground." },
    ],
    links: [
      { from: "air", to: "hum", kind: "physical", label: "moisture" },
      { from: "air", to: "ntc", kind: "physical", label: "heat" },
      { from: "hum", to: "mcu", kind: "analog" },
      { from: "ntc", to: "mcu", kind: "analog" },
      { from: "mcu", to: "data", kind: "data", label: "1 wire", both: true },
      { from: "pull", to: "data", kind: "power" },
      { from: "vcc", to: "mcu", kind: "power" },
      { from: "mcu", to: "gnd", kind: "ground" },
    ],
    steps: [
      "Wire red to VCC, black to GND and yellow to a digital pin; nothing else is needed.",
      "Your board pulls the data wire low for about 1 ms; the built-in pull-up lets it float high again.",
      "The chip measures humidity and temperature and sends 40 bits back on the yellow wire.",
      "Read no more than every two seconds. The readings match a DHT22 exactly; a long cable needs a stronger pull-up.",
    ],
  },
  facts: [
    { label: "Humidity", value: "0–100 % RH, ±2–5 %" },
    { label: "Temperature", value: "−40–80 °C, ±0.5 °C" },
    { label: "Supply", value: "3.3–5.5 V" },
    { label: "Interface", value: "Single wire, pull-up inside" },
    { label: "Cable", value: "3 wires, ~23 cm" },
    { label: "Body", value: "15.1 × 25.1 × 7.7 mm" },
  ],
  spec: {
    form: {
      mount: "leads",
      note: "The wires have bare tinned ends and no connector: put them in screw terminals, solder them, or push them into a breadboard. The body hangs by its cable or screws on through the hole.",
    },
    power: {
      supply: { min: 3.3, max: 5.5, typ: 5 },
      logic: 5,
      tolerant5V: true,
      draw: { idle: 0.05, active: 1, peak: 2.5 },
      interface: "One wire, 40-bit frame, at most 1 reading every 2 s",
      note: "Aosong says the cable can run to 100 m with shielded wire, with a stronger pull-up.",
    },
    sourcing: { mpn: "AM2302", maker: "Aosong (ASAIR)", lifecycle: "active", usd: [4, 10], note: "Adafruit has stopped selling it and points to the AM2301B." },
    limits: [
      "Humidity is ±2 % RH typical and up to ±5 % RH at worst; temperature is ±0.5 °C.",
      "One reading every 2 s at most (0.5 Hz).",
      "The pull-up is fixed at 5.1 kΩ. At 3.3 V or on a long cable you may need a stronger one.",
      "The cable ends are bare wire: you must solder them or use terminals.",
    ],
    upgrade: [
      { name: "AM2301B (wired AHT20)", why: "Adafruit's stated replacement: the same kind of cable but an I2C digital output at 3.3 V logic, so there is no bit-banged wire to time." },
      { name: "SHT31-D (Sensirion)", why: "±2 % RH and ±0.2 °C typical over I2C (address 0x44 or 0x45), 2.15 V to 5.5 V." },
    ],
    refs: ["https://www.adafruit.com/products/393", "https://learn.adafruit.com/dht.md", "https://www.electrokit.com/upload/quick/8d/c8/57ed_41009796-tds.pdf"],
  },
  experiment: { title: "Inside and out", idea: "Hang it outside a window on its wires, read every two seconds, and chart the difference against a DHT22 indoors." },
  tags: ["am2302", "dht22", "wired", "humidity", "temperature", "sensor"],
});
