import { definePart, gnd, pin, silk, vcc } from "../../sdk";
import { benchLegs, moldedBody, sensingWindow } from "./_dht";

const W = 15.1;
const BODY_H = 25.1;
const D = 7.7;
const WHITE = "#f2f2ee";
const LEG_X = [3.74, 6.28, 8.82, 11.36];
const LEG_END = 35.1;

export default definePart({
  id: "dht22",
  name: "DHT22 humidity and temperature sensor",
  aka: ["DHT-22", "white climate sensor", "RHT03", "DHT22 4-pin"],
  group: "sensors",
  rank: 16,
  summary: "The DHT11's grown-up sibling: the same one-wire conversation, but ±0.5 °C, the full 0 to 100 % humidity and readings below freezing. Bigger and white.",
  size: { w: W, h: LEG_END, d: D },
  solids: [
    moldedBody(0, 0, W, BODY_H, D, WHITE, "body"),
    // The mounting hole at the top: a dark ring with the bench showing through.
    { kind: "disc", cx: W / 2, cy: 1.7, r: 1.0, color: "#3a3d42", z: D + 0.01, ring: { color: "#c9c9c4", width: 0.25 } },
    sensingWindow(2.05, 3.3, 11, 8.5, 4, 5, D, { panel: "#dcdcd6", cell: "#4a4e55" }, { w: 2.0, h: 1.2 }),
    silk(W / 2, 19.2, "DHT22", 2.4, "#1a1a1a", { anchor: "middle", z: D + 0.01, weight: 700 }),
    benchLegs(LEG_X, BODY_H, LEG_END, 2.2),
  ],
  features: [
    { id: "grille", label: "Sensing grille", kind: "sensor", x: 2.05, y: 3.3, w: 11, h: 8.5, note: "Air passes through these openings to the humidity element and the thermistor behind them. Keep them clear." },
    { id: "hole", label: "Mounting hole", kind: "mechanical", x: 6.1, y: 0.7, w: 2.9, h: 2, note: "Screw it to a wall or a case; the sensor is on the face with the grille." },
    { id: "label", label: "DHT22 mark", kind: "other", x: 2.6, y: 16.6, w: 9.9, h: 7, note: "The white housing and the black print tell it from the blue DHT11." },
    { id: "body", label: "White housing", kind: "chip", x: 0, y: 0, w: W, h: BODY_H, note: "Holds the sensor chip. It measures both elements, applies its factory calibration and answers on the data wire." },
    { id: "legs", label: "Legs: VDD, DATA, NC, GND", kind: "pins", x: 3.3, y: BODY_H, w: 8.9, h: LEG_END - BODY_H, note: "Same order as the DHT11. The bare part has no pull-up: add 4.7 kΩ to 10 kΩ from DATA to VDD." },
  ],
  pins: [
    vcc("VCC", "3.3 V to 6 V supply (printed VDD). About 1 mA while measuring.", { label: "VDD" }),
    pin("DATA", "data", "io", "Single-wire data, both ways. Needs a pull-up of about 5 kΩ to VDD; the bare part has none.", { label: "DATA" }),
    pin("NC", "other", "opt", "Not connected. Leave it open.", { label: "NC", required: false }),
    gnd("GND"),
  ],
  pinAt: {
    VCC: { x: LEG_X[0], y: LEG_END },
    DATA: { x: LEG_X[1], y: LEG_END },
    NC: { x: LEG_X[2], y: LEG_END },
    GND: { x: LEG_X[3], y: LEG_END },
  },
  circuit: {
    blocks: [
      { id: "air", label: "Air", sub: "humidity, temperature", kind: "world", col: 0, row: 0, note: "The air that passes through the grille." },
      { id: "hum", label: "Humidity element", sub: "capacitive", kind: "sensor", col: 1, row: 0, at: "grille", note: "A capacitor whose dielectric soaks up moisture; its value tracks humidity." },
      { id: "ntc", label: "Thermistor", sub: "NTC, ±0.5 °C", kind: "sensor", col: 1, row: 1, at: "grille", note: "A precision thermistor; also used to correct the humidity reading." },
      { id: "mcu", label: "Sensor chip", sub: "calibrated, 40 bits", kind: "ic", col: 2, row: 0, at: "body", note: "Measures both, applies factory calibration and answers on the data wire." },
      { id: "data", label: "DATA", sub: "one wire, both ways", kind: "pin", col: 3, row: 0, at: "DATA", note: "Request and reply share this wire." },
      { id: "vcc", label: "VDD", sub: "3.3 V to 6 V", kind: "power", col: 3, row: 1, at: "VCC", note: "About 1 mA while measuring." },
      { id: "gnd", label: "GND", kind: "ground", col: 3, row: 2, at: "GND", note: "Shared ground with your board." },
    ],
    links: [
      { from: "air", to: "hum", kind: "physical", label: "moisture" },
      { from: "air", to: "ntc", kind: "physical", label: "heat" },
      { from: "hum", to: "mcu", kind: "analog" },
      { from: "ntc", to: "mcu", kind: "analog" },
      { from: "mcu", to: "data", kind: "data", label: "1 wire", both: true },
      { from: "vcc", to: "mcu", kind: "power" },
      { from: "mcu", to: "gnd", kind: "ground" },
    ],
    steps: [
      "Your board pulls DATA low for about 1 ms to ask for a reading, then releases the line. The pull-up brings it back high.",
      "The chip measures the humidity element and the thermistor, and applies its factory calibration.",
      "It answers with 40 bits: humidity in tenths of a percent, temperature in tenths of a degree (with a sign bit) and a checksum.",
      "One reading every two seconds at most; the sensor itself sets the pace.",
    ],
  },
  facts: [
    { label: "Humidity", value: "0–100 % RH, ±2–5 %" },
    { label: "Temperature", value: "−40–80 °C, ±0.5 °C" },
    { label: "Supply", value: "3.3–6 V" },
    { label: "Interface", value: "Single wire" },
    { label: "Sampling", value: "1 reading / 2 s" },
    { label: "Size", value: "15.1 × 25.1 × 7.7 mm" },
  ],
  spec: {
    form: {
      mount: "breadboard",
      pitch: 2.54,
      note: "Four 2.54 mm legs plug into a breadboard or a pin socket. It is the same sensor as the AM2302, which comes with a cable. A three-pin module with the pull-up fitted is also common.",
    },
    power: {
      supply: { min: 3.3, max: 6, typ: 5 },
      logic: 5,
      tolerant5V: true,
      draw: { idle: 0.05, active: 1, peak: 1.5 },
      interface: "One wire, 40-bit frame, at most 1 reading every 2 s",
      note: "Its data signal runs at the supply voltage: at 3.3 V it talks 3.3 V logic.",
    },
    sourcing: { mpn: "DHT22", maker: "Aosong (ASAIR)", lifecycle: "active", usd: [3, 8], note: "Also sold as AM2302 and RHT03." },
    limits: [
      "Humidity is ±2 % RH typical and up to ±5 % RH at worst; repeatability is ±1 % RH.",
      "One reading every 2 s at most (0.5 Hz): slower than the DHT11.",
      "In still air it answers slowly: many seconds to follow a change.",
      "The signal is bit-banged with microsecond timing. It fails with long wires or with no pull-up.",
      "It drifts in condensation or above 90 % RH for long.",
    ],
    upgrade: [
      { name: "SHT31-D (Sensirion)", why: "±2 % RH and ±0.2 °C typical, answered over I2C (address 0x44 or 0x45) with no timing-critical wire. Runs on 2.15 V to 5.5 V." },
      { name: "AHT20 / AM2301B", why: "The direct successor Adafruit recommends: I2C digital output, 3.3 V logic and no bit-banging." },
    ],
    refs: ["https://learn.adafruit.com/dht.md", "https://www.electrokit.com/upload/quick/8d/c8/57ed_41009796-tds.pdf", "https://grobotronics.com/rht03-dht22.html?sl=en"],
  },
  experiment: { title: "Window-sill test", idea: "Read it every two seconds, then move it from the desk to a cold window sill and watch both numbers drift; compare with a DHT11 side by side." },
  tags: ["dht22", "am2302", "humidity", "temperature", "climate", "sensor"],
});
