import { definePart, gnd, pin, silk, vcc } from "../../sdk";
import { benchLegs, moldedBody, sensingWindow } from "./_dht";

const W = 15.5;
const BODY_H = 12;
const D = 5.5;
const BLUE = "#2a7de1";
const LEG_X = [3.94, 6.48, 9.02, 11.56];
const LEG_END = 22;

export default definePart({
  id: "dht11",
  name: "DHT11 humidity & temperature",
  aka: ["DHT-11", "blue climate sensor", "DHT11 4-pin"],
  group: "sensors",
  rank: 4,
  summary: "The little blue box that tells you how warm and how humid the room is, over one wire. Cheap, slow, and the first sensor most people wire up.",
  size: { w: W, h: LEG_END, d: 5.6 },
  solids: [
    moldedBody(0, 0, W, BODY_H, D, BLUE, "body"),
    sensingWindow(2.25, 1, 11, 6, 6, 3, D, { panel: "#2368bd", cell: "#0f2f63" }, { w: 1.3, h: 1.2 }),
    silk(W / 2, 10.4, "DHT11", 1.7, "#f4f8ff", { anchor: "middle", z: D + 0.01, weight: 700 }),
    benchLegs(LEG_X, BODY_H, LEG_END, 1.7),
  ],
  features: [
    { id: "grille", label: "Sensing grille", kind: "sensor", x: 2.25, y: 1, w: 11, h: 6, note: "Air reaches the humidity element and the thermistor through these openings. Keep them clear; never cover them with tape or glue." },
    { id: "label", label: "DHT11 mark", kind: "other", x: 3.2, y: 8.8, w: 9.1, h: 2.3, note: "Aosong's marking. The white-on-blue print is the same on every DHT11, genuine or clone." },
    { id: "body", label: "Blue housing", kind: "chip", x: 0, y: 0, w: W, h: BODY_H, note: "Holds a small chip that reads the two elements and answers on the single data wire." },
    { id: "legs", label: "Legs: VCC, DATA, NC, GND", kind: "pins", x: 3.3, y: BODY_H, w: 8.9, h: LEG_END - BODY_H, note: "Left to right with the grille facing you: VCC, DATA, not connected, GND. The bare part has no pull-up: add 10 kΩ from DATA to VCC. Three-pin modules add it for you." },
    { id: "nc", label: "NC leg", kind: "pin", x: 8.5, y: BODY_H, w: 1, h: LEG_END - BODY_H, note: "Not connected inside. Leave it unwired, or snip it." },
  ],
  pins: [
    vcc("VCC", "3 V to 5.5 V supply. About 0.5 mA while measuring. Put 100 nF between VCC and GND."),
    pin("DATA", "data", "io", "Single-wire data, both ways. Needs a 4.7 kΩ to 10 kΩ pull-up to VCC; the bare part has none.", { label: "DATA" }),
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
      { id: "air", label: "Air", sub: "humidity, temperature", kind: "world", col: 0, row: 0, note: "What it measures: the air that reaches the grille." },
      { id: "hum", label: "Humidity element", sub: "resistive", kind: "sensor", col: 1, row: 0, at: "grille", note: "A polymer film whose resistance changes as it soaks up moisture." },
      { id: "ntc", label: "Thermistor", sub: "NTC", kind: "sensor", col: 1, row: 1, at: "grille", note: "A resistor that drops in value as it warms." },
      { id: "mcu", label: "Sensor chip", sub: "8-bit, 40-bit frames", kind: "ic", col: 2, row: 0, at: "body", note: "Reads both elements and answers on the single data wire." },
      { id: "data", label: "DATA", sub: "one wire, both ways", kind: "pin", col: 3, row: 0, at: "DATA", note: "Your board asks here and the reply comes back on the same wire." },
      { id: "vcc", label: "VCC", sub: "3 V to 5.5 V", kind: "power", col: 3, row: 1, at: "VCC", note: "Power for the chip; about 0.5 mA while measuring." },
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
      "Your board pulls DATA low for at least 18 ms to ask for a reading, then releases the line. A 10 kΩ pull-up brings it back high.",
      "The chip inside measures the humidity element and the thermistor and converts both to numbers.",
      "It answers on the same wire with 40 bits: humidity, temperature and a checksum, each bit told apart by pulse length.",
      "One reading a second at most; the library you use handles the timing for you.",
    ],
  },
  facts: [
    { label: "Humidity", value: "20–80 % RH, ±5 %" },
    { label: "Temperature", value: "0–50 °C, ±2 °C" },
    { label: "Supply", value: "3–5.5 V" },
    { label: "Interface", value: "Single wire" },
    { label: "Sampling", value: "1 reading / s" },
    { label: "Size", value: "15.5 × 12 × 5.5 mm" },
  ],
  spec: {
    form: {
      mount: "breadboard",
      pitch: 2.54,
      note: "Four 2.54 mm legs plug into a breadboard or a pin socket. The three-pin DHT11 module on a small board, with the pull-up fitted, is the same sensor.",
    },
    power: {
      supply: { min: 3, max: 5.5, typ: 5 },
      logic: 5,
      tolerant5V: true,
      draw: { idle: 0.1, active: 0.5, peak: 2.5 },
      interface: "One wire, 40-bit frame, at most 1 reading a second",
      note: "Its data signal runs at the supply voltage: at 3.3 V it talks 3.3 V logic.",
    },
    sourcing: { mpn: "DHT11", maker: "Aosong (ASAIR)", lifecycle: "active", usd: [1, 3], note: "Clones behave the same." },
    limits: [
      "Humidity is only good to ±5 % RH between 20 % and 80 %. It cannot read below 20 %.",
      "Temperature is only good to ±2 °C between 0 °C and 50 °C: no freezing air, no hot air.",
      "Both readings are whole numbers: 1 % RH and 1 °C steps.",
      "One reading a second at most. Ask sooner and you get old or failed data.",
      "The signal is timed in microseconds (the start pulse is 18 ms or more), so a busy board can miss it.",
    ],
    upgrade: [
      { name: "SHT31-D (Sensirion)", why: "±2 % RH over the full 0 to 100 % and ±0.2 °C typical, answered over I2C (address 0x44 or 0x45) with no timing tricks. Runs on 2.15 V to 5.5 V and takes about 1.5 mA while measuring." },
      { name: "BME280 (Bosch)", why: "±3 % RH and ±0.5 °C at 25 °C, plus pressure to ±1 hPa. I2C, 3.3 V only, and about 3.6 µA at one reading a second." },
    ],
    refs: ["https://www.electronicwings.com/sensors-modules/dht11", "https://static.rapidonline.com/pdf/75-0137_v1.pdf", "https://learn.adafruit.com/dht.md"],
  },
  experiment: { title: "Room climate logger", idea: "Read temperature and humidity every two seconds and print them, then breathe on the grille and watch the humidity jump and settle back." },
  docs: "/docs/hardware-knowledge/dht11",
  tags: ["dht11", "humidity", "temperature", "climate", "single-wire", "sensor"],
});
