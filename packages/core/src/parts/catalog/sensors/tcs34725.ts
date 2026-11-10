import { MATERIAL, board, definePart, gnd, name, pin, pinHeader, silk, smd, sot23, vcc } from "../../sdk";
import { pinLabels, sclPin, sdaPin } from "./_breakouts";

const TOP = 1.6;
const header = pinHeader(2.6, 18.2, 7, { style: "down" });

export default definePart({
  id: "tcs34725",
  name: "TCS34725 RGB color sensor",
  aka: ["color sensor", "RGB sensor", "TCS34725", "GY-33 color sensor"],
  group: "sensors",
  rank: 12,
  summary: "Measures how much red, green, blue and total light reaches it. Its own white LED lights the thing in front, so it can tell what color a nearby surface is, such as a card or a block.",
  size: { w: 20.44, h: 20.28, d: 2.9 },
  solids: [
    board(20.44, 20.28, "#1b1c22", {
      radius: 0.8,
      holes: [
        { x: 2.5, y: 2.5, d: 2.5 },
        { x: 17.94, y: 2.5, d: 2.5 },
      ],
    }),
    // The sensor: a DFN-6 chip with the 4 × 4 photodiode window under an infrared-blocking filter.
    { kind: "box", id: "sensor", x: 9.0, y: 6.0, w: 2.4, h: 2.0, d: 0.65, z: TOP, top: "#8a8f98", finish: "ceramic", radius: 0.1 },
    { kind: "box", x: 9.5, y: 6.45, w: 1.4, h: 1.1, d: 0.06, z: TOP + 0.62, top: "#35406f", finish: "glass", radius: 0.05 },
    { kind: "path", d: "M 9.85 6.45 L 9.85 7.55 M 10.2 6.45 L 10.2 7.55 M 10.55 6.45 L 10.55 7.55 M 9.5 6.82 L 10.9 6.82 M 9.5 7.19 L 10.9 7.19", color: "#c9a24a", width: 0.05, z: TOP + 0.69 },
    // The white LED beside it (a 3.2 × 1.6 mm part with its yellow phosphor).
    { kind: "box", id: "led-pwr", x: 8.6, y: 10.7, w: 3.2, h: 1.6, d: 1.0, z: TOP, top: "#f4f1e0", side: "#c9c5b0", glow: "#fff4c2", finish: "plastic", radius: 0.2 },
    { kind: "box", x: 9.4, y: 11.1, w: 1.6, h: 0.8, d: 0.04, z: TOP + 1.0, top: "#f0cf5e", finish: "plastic", radius: 0.1 },
    // 3.3 V regulator, the two level-shifting MOSFETs and the small parts round them.
    sot23(5.0, 12.5, { five: true }),
    sot23(14.4, 12.5),
    sot23(17.4, 12.5),
    smd(7.0, 5.6, "c", "y"),
    smd(12.6, 5.6, "c", "y"),
    smd(6.4, 9.0, "r", "x"),
    smd(13.2, 9.2, "r", "x"),
    smd(3.0, 8.0, "c", "y"),
    smd(3.0, 10.6, "r", "y"),
    smd(15.4, 9.8, "r", "x"),
    smd(17.3, 9.8, "r", "x"),
    smd(18.4, 10.6, "c", "y"),
    header,
    silk(10.22, 4.2, "TCS34725", 1.0, MATERIAL.silk, { anchor: "middle", weight: 700 }),
    ...pinLabels(["LED", "INT", "SDA", "SCL", "3V3", "GND", "VIN"], 2.6, 16.6),
  ],
  features: [
    { id: "sensor", label: "TCS34725 sensor", kind: "sensor", x: 9.0, y: 6.0, w: 2.4, h: 2.0, note: "A 4 × 4 grid of light detectors: some filtered red, some green, some blue and some clear. An infrared filter sits on top." },
    { id: "led", label: "White LED", kind: "led", x: 8.6, y: 10.7, w: 3.2, h: 1.6, note: "Lights the surface so readings don't depend on the room. On by default; pull the LED pin low to switch it off." },
    { id: "reg", label: "3.3 V regulator", kind: "power", x: 3.5, y: 11.5, w: 3, h: 2, note: "Makes the chip's 3.3 V from VIN, so the board runs from 3 to 5 V." },
    { id: "shift", label: "I2C level shifter", kind: "chip", x: 12.9, y: 11.5, w: 6, h: 2, note: "Two MOSFETs that let SDA and SCL work with a 3.3 V or a 5 V board." },
    { id: "pins", label: "LED, INT, SDA, SCL, 3V3, GND, VIN", kind: "pins", x: 1.3, y: 16.9, w: 17.8, h: 2.6, note: "Wire VIN, GND, SDA and SCL. LED and INT are optional." },
    { id: "holes", label: "Mounting holes", kind: "mechanical", x: 1.2, y: 1.2, w: 17.9, h: 2.6, note: "Two 2.5 mm holes for M2 screws." },
  ],
  pins: [
    pin("LED", "digital", "opt", "Controls the white LED. Leave it open or hold it high for on; pull it low for off.", { label: "LED" }),
    pin("INT", "digital", "opt", "Interrupt, active low and open-drain: it needs a pull-up. Goes low when light crosses a limit you set.", { label: "INT" }),
    sdaPin("I2C data. Works with 3.3 V or 5 V boards."),
    sclPin("I2C clock, up to 400 kHz. Works with 3.3 V or 5 V boards."),
    pin("V3V3", "power", "opt", "3.3 V output from the on-board regulator. Power the chip from VIN, not from here.", { label: "3V3" }),
    gnd("GND"),
    vcc("VIN", "Supply, 3 to 5 V. The chip takes only 0.24 mA; the LED adds about 20 mA."),
  ],
  pinAt: { ...name(header, "LED", "INT", "SDA", "SCL", "V3V3", "GND", "VIN") },
  circuit: {
    blocks: [
      { id: "vin", label: "VIN", sub: "3–5 V", kind: "power", col: 0, row: 0, at: "VIN", note: "Supply from your board." },
      { id: "reg", label: "Regulator", sub: "3.3 V", kind: "regulator", col: 1, row: 0, at: "reg", note: "Gives the chip a steady 3.3 V." },
      { id: "chip", label: "TCS34725", sub: "16-bit counts", kind: "ic", col: 2, row: 0, at: "sensor", note: "Counts the light on each filtered detector and keeps four 16-bit numbers: red, green, blue and clear." },
      { id: "pd", label: "Photodiodes", sub: "R, G, B, clear", kind: "sensor", col: 3, row: 0, at: "sensor", note: "Each filter lets one band of light through." },
      { id: "bus", label: "SDA / SCL", sub: "I2C 0x29", kind: "pin", col: 0, row: 1, at: "SDA", note: "Your board reads the four numbers here." },
      { id: "ledpin", label: "LED pin", sub: "open or high = on", kind: "pin", col: 1, row: 1, at: "LED", note: "Pull it low and the LED turns off." },
      { id: "led", label: "White LED", sub: "4150 K", kind: "actuator", col: 2, row: 1, at: "led", note: "A neutral white light that lights a spot a few millimeters wide." },
      { id: "surf", label: "Surface", sub: "a few mm away", kind: "world", col: 3, row: 1, note: "It sends back the colors it does not absorb: a red card sends back mostly red." },
    ],
    links: [
      { from: "vin", to: "reg", kind: "power", label: "3–5 V" },
      { from: "reg", to: "chip", kind: "power", label: "3.3 V" },
      { from: "ledpin", to: "led", kind: "signal", label: "on / off" },
      { from: "led", to: "surf", kind: "light", label: "white" },
      { from: "surf", to: "pd", kind: "light", label: "reflected" },
      { from: "pd", to: "chip", kind: "analog" },
      { from: "bus", to: "chip", kind: "data", label: "R G B C", both: true },
    ],
    steps: [
      "The white LED lights the surface under the sensor. Hold the board 3 to 10 mm away.",
      "The surface sends back some of each color. A red card sends back mostly red and soaks up the rest.",
      "The sensor counts the light on each filtered detector for a time you choose, from 2.4 to 614 ms.",
      "Your board reads four numbers over I2C. Compare them with readings taken on a white card and a black card to name the color.",
    ],
  },
  facts: [
    { label: "Reads", value: "Red, green, blue, clear" },
    { label: "Resolution", value: "16 bits per channel" },
    { label: "Best distance", value: "3–10 mm" },
    { label: "Supply", value: "3–5 V" },
    { label: "Interface", value: "I2C, 0x29" },
    { label: "Size", value: "20.4 × 20.3 mm" },
  ],
  spec: {
    form: {
      mass: 3.23,
      mount: "jumpers",
      pitch: 2.54,
      holes: [
        { x: 2.5, y: 2.5, d: 2.5 },
        { x: 17.94, y: 2.5, d: 2.5 },
      ],
      note: "A 1 × 7 header, often supplied loose to solder yourself. Mount it facing down at the surface with the sensor and LED shaded from room light.",
    },
    power: {
      supply: { min: 3, max: 5, typ: 5 },
      logic: 3.3,
      tolerant5V: true,
      draw: { idle: 0.003, active: 0.235, peak: 20 },
      interface: "I2C 0x29 up to 400 kHz, integration time 2.4 to 614 ms, gain 1× to 60×",
      note: "The chip takes about 0.24 mA. The white LED adds roughly 20 mA when it is on; that figure is an estimate.",
    },
    sourcing: { mpn: "TCS34725", maker: "ams-OSRAM", lifecycle: "active", usd: [3, 10], note: "The Adafruit board is #1334. Boards sold as GY-33 carry the same chip." },
    limits: [
      "The numbers are raw counts, not true RGB. The chip sees through an infrared filter with a different eye from yours, so calibrate on a white card and a black card.",
      "It works best 3 to 10 mm from the surface. The LED lights a small spot and the light falls off fast with distance.",
      "Room light changes the readings unless you shade the sensor and use the LED.",
      "The address is fixed at 0x29 with no address pins, the same as the VL53L0X: those two can't share a bus without a multiplexer.",
      "The LED draws about 20 mA, which matters on a battery. Drive the LED pin low between readings.",
    ],
    upgrade: [
      { name: "APDS-9960 gesture, proximity and color sensor", why: "Reads color and also proximity and hand gestures. It sits at address 0x39, so it doesn't clash with a VL53L0X. Its color accuracy is weaker." },
      { name: "TCS3200 color sensor", why: "Gives color as a frequency on one pin, with four LEDs round the sensor, so there is no I2C address to clash. It is less accurate." },
    ],
    refs: ["https://cdn-shop.adafruit.com/datasheets/TCS34725.pdf", "https://learn.adafruit.com/adafruit-color-sensors", "https://www.adafruit.com/product/1334"],
  },
  sim: {
    kind: "sensor",
    reads: [
      { key: "red", label: "Red", unit: "", min: 0, max: 255, step: 1, start: 180, sweep: [20, 240, 7], digits: 0 },
      { key: "green", label: "Green", unit: "", min: 0, max: 255, step: 1, start: 120, sweep: [30, 220, 9], digits: 0 },
      { key: "blue", label: "Blue", unit: "", min: 0, max: 255, step: 1, start: 60, sweep: [10, 200, 11], digits: 0 },
      { key: "clear", label: "Clear (total light)", unit: "", min: 0, max: 255, step: 1, start: 200, sweep: [40, 250, 8], digits: 0 },
    ],
    badge: "clear",
  },
  animate: { lit: ["led-pwr"] },
  experiment: { title: "Sort by color", idea: "Hold red, green and blue cards 5 mm under the sensor. Print the four numbers for each, then write an if-chain that names the card and lights an LED of that color." },
  tags: ["tcs34725", "color sensor", "rgb", "color", "light", "i2c", "sorting", "sensor"],
});
