/**
 * The Arduino Uno R3, laid out as the real board is.
 *
 * Measured from the Rev3 reference design (68.58 × 53.34 mm, USB-B on the
 * left, the digital header along the top, the power and analog headers along
 * the bottom), so that every header hole, chip, jack and LED sits where it
 * does on the bench. The lab wires to these holes directly (`canvas`) and the
 * USB lead plugs into the real USB-B socket.
 *
 * The board's hardware design is open (CC BY-SA). The Arduino name and logo
 * are Arduino SA's trademarks, so the silkscreen carries functional markings
 * only (pin names, DIGITAL, POWER, ANALOG IN, L, TX, RX, ON, ICSP).
 */
import { MATERIAL, along, barrelJack, board, capacitor, chip, crystal, definePart, dip, ground, io, pinHeader, rail, shade, silk, smd, smdDiode, smdLed, socketHeader, sot223, sot23, soic, tactileButton, usbB, type PinInfo, type Solid } from "../../sdk";

/** 0.1" header pitch. */
const P = 2.54;

/** Header bodies: x, y of the top-left corner. Holes are at pitch centers inside. */
const HEADERS = {
  /** SCL SDA AREF GND 13 12 11 10 9 8, along the top. */
  top10: { x: 17.5, y: 0.8, count: 10 },
  /** 7 6 5 4 3 2 1 0, along the top (after the famous 0.16" gap). */
  top8: { x: 44.5, y: 0.8, count: 8 },
  /** NC IOREF RESET 3.3V 5V GND GND VIN, along the bottom. */
  power: { x: 29.0, y: 50.0, count: 8 },
  /** A0 to A5, along the bottom. */
  analog: { x: 51.0, y: 50.0, count: 6 },
  /** The ATmega328P's ICSP, 2 × 3 on the right edge. */
  icsp: { x: 63.3, y: 21.6 },
  /** The 16U2's ICSP, 3 × 2 near the USB socket. */
  icsp2: { x: 17.3, y: 9.5 },
} as const;

/** Where the first hole's center is on each header. */
const hx = (h: { x: number }) => h.x + P / 2;
const hy = (h: { y: number }) => h.y + P / 2;

const TOP10 = ["SCL", "SDA", "AREF", "GND", "13", "12", "11", "10", "9", "8"];
const TOP8 = ["7", "6", "5", "4", "3", "2", "1", "0"];
const POWER = ["", "IOREF", "RESET", "3.3V", "5V", "GND", "GND", "Vin"];
const ANALOG = ["A0", "A1", "A2", "A3", "A4", "A5"];
const PWM = new Set(["3", "5", "6", "9", "10", "11"]);

/** The USB-B socket: 16.3 long, 12 wide, 10.9 tall, overhanging the edge by 6.6 mm. */
const USB = { x: -6.6, y: 7.8, w: 16.3, h: 12, d: 10.9 };
/** The DC barrel jack under it. */
const JACK = { x: -2.6, y: 40.4, w: 14, h: 9, d: 11 };

/** Arduino teal as the solder mask shows it: a little darker and bluer than the brand color. */
const TEAL = "#00878f";
const TRACE = shade(TEAL, 1.11);
const SILK = "#f3f6f4";

/** Copper traces under the mask: a shade lighter than the board, all in one printed path. */
const trace = (d: string): string => d;

/** Vertical pin names: down from under the top headers, up from above the bottom ones. */
function pinLabels(): Solid[] {
  const out: Solid[] = [];
  const top = (x: number, name: string) => out.push(silk(x + 0.5, 4.4, name, 1.3, SILK, { rotate: 90, weight: 600 }));
  TOP10.forEach((name, i) => top(hx(HEADERS.top10) + i * P, PWM.has(name) ? `~${name}` : name));
  TOP8.forEach((name, i) => top(hx(HEADERS.top8) + i * P, name === "1" ? "TX→1" : name === "0" ? "RX←0" : PWM.has(name) ? `~${name}` : name));
  POWER.forEach((name, i) => {
    if (name) out.push(silk(hx(HEADERS.power) + i * P - 0.5, 49.3, name, 1.2, SILK, { rotate: -90, weight: 600 }));
  });
  ANALOG.forEach((name, i) => out.push(silk(hx(HEADERS.analog) + i * P - 0.5, 49.3, name, 1.2, SILK, { rotate: -90, weight: 600 })));
  return out;
}

/** The traces you can see on the real board: headers to the chips, USB to the bridge, power to the caps. */
function traces(): Solid {
  const out: string[] = [];
  // D13 to D8 down to the 328's top row of legs.
  [4, 5, 6, 7, 8, 9].forEach((i, k) => {
    const x = hx(HEADERS.top10) + i * P;
    const tx = 34 + k * 2.54;
    out.push(trace(`M ${x} 3.4 L ${x} ${13 + k * 1.2} L ${tx} ${20 + k * 1.2} L ${tx} 32.2`));
  });
  // D7 to D2 down to the 328.
  [0, 1, 2, 3, 4, 5].forEach((i, k) => {
    const x = hx(HEADERS.top8) + i * P;
    const tx = 50.2 + k * 2.54;
    out.push(trace(`M ${x} 3.4 L ${x} ${11 + k * 1.1} L ${tx} ${24 + k * 1.1} L ${tx} 32.2`));
  });
  // A0 to A5 up to the 328's bottom row.
  ANALOG.forEach((_, i) => {
    const x = hx(HEADERS.analog) + i * P;
    out.push(trace(`M ${x} 49.4 L ${x} 44.2`));
  });
  // Serial between the USB bridge and the 328, and USB data into the bridge.
  out.push(trace("M 23.2 17.2 L 28.6 17.2 L 28.6 30.4 L 31.2 33"));
  out.push(trace("M 23.2 18.6 L 27.6 18.6 L 27.6 31 L 30.2 33.6"));
  out.push(trace("M 9.6 12.4 L 15.6 12.4 L 18.2 16.2"));
  out.push(trace("M 9.6 14.6 L 14.8 14.6 L 18.2 18.4"));
  // Power from the regulator to the caps and the 5 V pin.
  out.push(trace("M 10.3 36.6 L 15.8 36.6 L 15.8 44.8"));
  out.push(trace("M 29.6 44.8 L 33 44.8 L 33 49.4"));
  const vin = hx(HEADERS.power) + 7 * P;
  out.push(trace(`M ${vin} 49.4 L ${vin} 46.2 L 12.4 46.2 L 12.4 44`));
  return { kind: "path", d: out.join(" "), color: TRACE, width: 0.38 };
}

/** The SMD resistors and capacitors that cover a real Uno. */
function passives(): Solid[] {
  const r = (x: number, y: number, dir: "x" | "y" = "x") => smd(x, y, "r", dir);
  const c = (x: number, y: number, dir: "x" | "y" = "x") => smd(x, y, "c", dir);
  return [
    // By the reset button and the USB socket.
    r(12.2, 10.6), c(12.2, 12.6),
    // Round the USB bridge.
    c(15.8, 16.8, "y"), r(15.8, 19.0, "y"), r(14.0, 21.6), c(24.4, 20.6),
    // By the L, TX and RX LEDs: their series resistors.
    r(29.0, 10.4), r(29.0, 16.6), r(29.0, 18.8),
    // Round the comparator and the 3.3 V regulator.
    c(31.4, 11.2), r(31.4, 13.4), c(3.2, 24.2, "y"), r(3.2, 27.4, "y"), c(11.6, 28.4),
    // By the regulator and the jack.
    c(11.6, 34.6, "y"), c(14.2, 41.0), r(17.0, 41.0),
    // Under the 328 and by the ON LED.
    c(31.0, 44.2), r(36.6, 44.2), c(39.4, 44.2), r(56.4, 16.1), c(54.2, 24.6), r(54.2, 27.0),
  ].flat();
}

const UNO_PINS: PinInfo[] = [
  ...["0 (RX)", "1 (TX)", "2", "~3", "4", "~5", "~6", "7", "8", "~9", "~10", "~11", "12", "13"].map(
    (name) => ({ name: `D${name}`, role: name.startsWith("~") ? "pwm" : "digital", note: name.startsWith("~") ? "Digital, with PWM output" : "Digital input/output" }) as PinInfo,
  ),
  { name: "A0–A5", role: "analog", note: "10-bit analog inputs; A4 is SDA and A5 is SCL for I2C" },
  { name: "5V", role: "power", note: "5 V output from the regulator or USB, up to about 500 mA" },
  { name: "3.3V", role: "power", note: "3.3 V output, 50 mA max" },
  { name: "GND", role: "ground", note: "Three ground pins; all connected" },
  { name: "VIN", role: "power", note: "Unregulated input, 7–12 V" },
  { name: "RESET", role: "other", note: "Pull low to reset" },
  { name: "AREF", role: "other", note: "External reference for the analog inputs" },
];

const HOLES = [
  { x: 14.0, y: 2.5, d: 3.2, ring: MATERIAL.gold },
  { x: 15.3, y: 50.7, d: 3.2, ring: MATERIAL.gold },
  { x: 66.6, y: 5.0, d: 3.2, ring: MATERIAL.gold },
  { x: 66.6, y: 33.0, d: 3.2, ring: MATERIAL.gold },
];

const topPins = along([null, null, null, "GND3", "D13", "D12", "D11", "D10", "D9", "D8"], hx(HEADERS.top10), hy(HEADERS.top10));
const top8Pins = along(["D7", "D6", "D5", "D4", "D3", "D2", "D1", "D0"], hx(HEADERS.top8), hy(HEADERS.top8));
const powerPins = along([null, null, null, "3V3", "5V", "GND1", "GND2", "VIN"], hx(HEADERS.power), hy(HEADERS.power));
const analogPins = along(["A0", "A1", "A2", "A3", "A4", "A5"], hx(HEADERS.analog), hy(HEADERS.analog));
/** ICSP pin 2 (VCC) is the bottom-right hole: pin 1 is marked at the bottom-left. */
const icspVcc = { x: HEADERS.icsp.x + P / 2 + P, y: HEADERS.icsp.y + P / 2 + 2 * P };

export default definePart({
  id: "arduino-uno",
  name: "Arduino Uno",
  aka: ["Uno R3", "ATmega328P board"],
  group: "boards",
  rank: 1,
  summary: "The board most people start on: 14 digital pins, 6 analog inputs, 5 V logic, USB-B programming, and forgiving of mistakes.",
  size: { w: 68.6, h: 53.4, d: 13 },
  solids: [
    board(68.6, 53.4, TEAL, { radius: 1.2, holes: HOLES }),
    traces(),

    // Connectors on the left edge.
    usbB(USB.x, USB.y),
    barrelJack(JACK.x, JACK.y),

    // Headers: female sockets for jumper wires.
    socketHeader(hx(HEADERS.top10), hy(HEADERS.top10), 10),
    socketHeader(hx(HEADERS.top8), hy(HEADERS.top8), 8),
    socketHeader(hx(HEADERS.power), hy(HEADERS.power), 8),
    socketHeader(hx(HEADERS.analog), hy(HEADERS.analog), 6),
    // The ICSP headers are male: a low body with pins standing up.
    pinHeader(HEADERS.icsp.x + P / 2, HEADERS.icsp.y + P / 2, 3, { dir: "y", rows: 2 }),
    pinHeader(HEADERS.icsp2.x + P / 2, HEADERS.icsp2.y + P / 2, 3, { dir: "x", rows: 2 }),

    // Reset button, top left.
    tactileButton(4.2, 1.2, 6, "reset-btn"),

    // USB bridge (ATmega16U2, a QFN) and its own small crystal.
    chip(18.2, 15.8, 5, 5, "16U2", 0.9),
    { kind: "box", x: 19.6, y: 22.4, w: 3.2, h: 2.5, d: 0.8, z: 1.6, top: "linear-gradient(180deg,#d9dce0,#aeb3ba)", side: MATERIAL.steelSide, fill: MATERIAL.steel, radius: 0.4, finish: "metal" },
    // The main 16 MHz crystal lying beside the bridge.
    crystal(15.2, 25.6, "16.000"),

    // The 5 V regulator by the jack, the comparator and the 3.3 V regulator.
    sot223(4.3, 32.6, "1117"),
    sot23(9.4, 28.0, { five: true }),
    soic(34.2, 25.4, 4, "358", { dir: "x" }),
    sot23(13.2, 37.0),
    smdDiode(13.0, 33.0, "x", 1),
    // The resettable fuse on the USB 5 V line: a tan block.
    { kind: "box", x: 11.0, y: 21.0, w: 3.2, h: 1.6, d: 0.9, z: 1.6, top: "#c9b27a", side: "#8a7747", radius: 0.2, finish: "ceramic" },

    // The two 47 µF, 25 V electrolytics by the jack.
    capacitor(19.6, 44.8, 3.15, 8.6, 1.6),
    capacitor(26.5, 44.8, 3.15, 8.6, 1.6),

    // The ATmega328P in its socket, bottom right.
    { kind: "box", x: 29.4, y: 32.5, w: 36.8, h: 9.8, d: 2.0, z: 1.6, top: "#1d1e22", side: "#0f1012", radius: 0.3, finish: "plastic" },
    dip(30.0, 33.6, 14, "ATMEGA328P-PU", 7.6, 3.6),
    { kind: "disc", cx: 31.6, cy: 37.4, r: 0.75, color: "#0d0e10", z: 8.05 },
    { kind: "disc", cx: 33.0, cy: 40.4, r: 0.4, color: "#4b4f56", z: 8.05 },

    // LEDs: L, TX, RX by the bridge; ON by the right edge.
    smdLed(25.6, 10.4, "#ffb020", "led-l"),
    smdLed(27.3, 16.6, "#ffb020", "led-tx"),
    smdLed(27.3, 18.8, "#ffb020", "led-rx"),
    smdLed(58.6, 16.1, "#3ddc84", "led-on"),

    passives(),

    // Silkscreen.
    pinLabels(),
    silk(31.0, 9.4, "DIGITAL (PWM~)", 1.6, SILK, { weight: 700 }),
    silk(40.6, 45.0, "POWER", 1.5, SILK, { weight: 700 }),
    silk(51.4, 45.0, "ANALOG IN", 1.5, SILK, { weight: 700 }),
    silk(27.8, 11.5, "L", 1.3, SILK, { weight: 700 }),
    silk(24.4, 17.6, "TX", 1.2, SILK, { weight: 700 }),
    silk(24.4, 19.8, "RX", 1.2, SILK, { weight: 700 }),
    silk(61.2, 17.2, "ON", 1.2, SILK, { weight: 700 }),
    silk(62.6, 20.6, "ICSP", 1.2, SILK, { weight: 700 }),
    silk(63.6, 30.8, "1", 1.0, SILK),
    silk(16.4, 9.4, "ICSP2", 1.0, SILK, { rotate: 90 }),
    silk(2.6, 1.2, "RESET", 1.2, SILK, { rotate: 90, weight: 700 }),
    silk(13.0, 33.6, "3.3V", 1.0, SILK),
    silk(0.8, 36.6, "+5V", 1.0, SILK, { rotate: 90 }),
    { kind: "path", d: "M 17.3 5.1 L 17.3 7.2 M 42.9 5.1 L 42.9 7.2 M 44.5 5.1 L 44.5 7.2 M 64.8 5.1 L 64.8 7.2", color: SILK, width: 0.25 },
    { kind: "path", d: "M 29.0 48.2 L 29.0 46.4 M 49.3 48.2 L 49.3 46.4 M 51.0 48.2 L 51.0 46.4 M 66.2 48.2 L 66.2 46.4", color: SILK, width: 0.25 },
  ],
  features: [
    { id: "digital", label: "Digital pins 0–13", kind: "pins", x: HEADERS.top10.x, y: HEADERS.top10.y, w: 47.3, h: P, note: "14 digital inputs and outputs at 5 V. Pins marked ~ can output PWM. 0 and 1 are also the serial port, so leave them free while uploading." },
    { id: "analog", label: "Analog inputs A0–A5", kind: "pins", x: HEADERS.analog.x, y: HEADERS.analog.y, w: 6 * P, h: P, note: "Six 10-bit analog inputs, 0–5 V. They can also be used as digital pins." },
    { id: "power", label: "Power pins", kind: "power", x: HEADERS.power.x, y: HEADERS.power.y, w: 8 * P, h: P, note: "5 V and 3.3 V out, two GND, VIN in (7–12 V), RESET and IOREF." },
    { id: "usb", label: "USB-B port", kind: "port", x: -6.6, y: 7.6, w: 16.2, h: 12.4, note: "Programming and serial over USB; also powers the board at 5 V." },
    { id: "jack", label: "Barrel jack", kind: "port", x: -2.6, y: 40.4, w: 14.3, h: 9, note: "7–12 V DC in. The onboard regulator makes 5 V from it." },
    { id: "mcu", label: "ATmega328P", kind: "chip", x: 30, y: 33.6, w: 35.6, h: 7.6, note: "The microcontroller: 16 MHz, 32 KB flash, 2 KB RAM. In a socket, so it can be replaced." },
    { id: "bridge", label: "ATmega16U2 USB bridge", kind: "chip", x: 18.2, y: 15.8, w: 5, h: 5, note: "Turns the computer's USB into the serial the ATmega328P speaks. It has its own crystal and ICSP header." },
    { id: "crystal", label: "16 MHz crystal", kind: "other", x: 15.2, y: 25.6, w: 11, h: 4.65, note: "The clock the ATmega328P counts by. Every delay() in a sketch is measured against it." },
    { id: "led-l", label: "L LED (pin 13)", kind: "led", x: 25.6, y: 10.4, w: 1.6, h: 0.8, note: "Wired to digital pin 13. Blink makes this one flash." },
    { id: "led-on", label: "Power LED", kind: "led", x: 58.6, y: 16.1, w: 1.6, h: 0.8, note: "Lit whenever the board has 5 V." },
    { id: "reset", label: "Reset button", kind: "button", x: 4.2, y: 1.2, w: 6, h: 6, note: "Restarts the sketch from the top." },
    { id: "icsp", label: "ICSP header", kind: "pins", x: HEADERS.icsp.x, y: HEADERS.icsp.y, w: 2 * P, h: 3 * P, note: "In-circuit programming of the ATmega328P with an external programmer. Pin 2, bottom right, carries 5 V." },
    { id: "regulator", label: "5 V regulator", kind: "chip", x: 4.3, y: 32.6, w: 6.5, h: 6, note: "NCP1117: drops the barrel jack's 7–12 V to 5 V. Warm to the touch under load, hot at 12 V." },
    { id: "caps", label: "47 µF capacitors", kind: "other", x: 16.4, y: 41.6, w: 13.3, h: 6.4, note: "Smooth the supply on both sides of the regulator." },
  ],
  pins: [
    rail("VIN", "VIN", 5, "left", { accepts: [7, 12], note: "7–12 V in from a battery, or the barrel jack's voltage out" }),
    rail("5V", "5V", 5, "left"),
    rail("3V3", "3.3V", 3.3, "left"),
    ground("GND1", "left"),
    ground("GND2", "left"),
    io("A0", "A0", "left", ["analog", "digital"]),
    io("A1", "A1", "left", ["analog", "digital"]),
    io("A2", "A2", "left", ["analog", "digital"]),
    io("A3", "A3", "left", ["analog", "digital"]),
    io("A4", "A4 SDA", "left", ["analog", "digital", "sda"]),
    io("A5", "A5 SCL", "left", ["analog", "digital", "scl"]),
    io("D0", "D0 RX", "right", ["digital", "rx"]),
    io("D1", "D1 TX", "right", ["digital", "tx"]),
    io("D2", "D2", "right", ["digital"]),
    io("D3", "D3 ~", "right", ["digital", "pwm"]),
    io("D4", "D4", "right", ["digital"]),
    io("D5", "D5 ~", "right", ["digital", "pwm"]),
    io("D6", "D6 ~", "right", ["digital", "pwm"]),
    io("D7", "D7", "right", ["digital"]),
    io("D8", "D8", "right", ["digital"]),
    io("D9", "D9 ~", "right", ["digital", "pwm"]),
    io("D10", "D10 ~ SS", "right", ["digital", "pwm", "cs"]),
    io("D11", "D11 ~ MOSI", "right", ["digital", "pwm", "mosi"]),
    io("D12", "D12 MISO", "right", ["digital", "miso"]),
    io("D13", "D13 SCK", "right", ["digital", "sck", "led"], { note: "Built-in LED L" }),
    ground("GND3", "right"),
    rail("5V_ICSP", "5V ICSP", 5, "right", { note: "5 V on the ICSP header, beside the digital pins" }),
  ],
  pinTable: UNO_PINS,
  pinAt: { ...topPins, ...top8Pins, ...powerPins, ...analogPins, "5V_ICSP": icspVcc },
  lab: { controller: true, logic: 5, tolerates5V: true },
  circuit: {
    blocks: [
      { id: "usb", label: "USB-B", sub: "5 V in, serial", kind: "connector", col: 0, row: 0, at: "usb", note: "The computer supplies 5 V and talks serial through the USB bridge." },
      { id: "jack", label: "Barrel jack", sub: "7–12 V in", kind: "connector", col: 0, row: 2, at: "jack", note: "An external supply when USB is not plugged in." },
      { id: "bridge", label: "USB bridge", sub: "ATmega16U2", kind: "ic", col: 1, row: 0, at: "bridge", note: "Turns USB into the serial signals the main chip understands." },
      { id: "reg", label: "5 V regulator", sub: "NCP1117", kind: "regulator", col: 1, row: 2, at: "regulator", hot: true, note: "Drops VIN to a steady 5 V and burns the difference as heat: (VIN − 5 V) × current. A second regulator makes 3.3 V." },
      { id: "mcu", label: "ATmega328P", sub: "16 MHz", kind: "mcu", col: 2, row: 1, at: "mcu", note: "Runs your sketch. Every pin on the headers is one of its pins." },
      { id: "digital", label: "Digital pins", sub: "D0–D13", kind: "pin", col: 3, row: 0, at: "digital", note: "Switch between 0 V and 5 V, source up to 20 mA each." },
      { id: "analog", label: "Analog inputs", sub: "A0–A5", kind: "pin", col: 3, row: 1, at: "analog", note: "Read 0–5 V as 0–1023." },
      { id: "power", label: "Power pins", sub: "5V, 3.3V, GND", kind: "power", col: 3, row: 2, at: "power", note: "Feed your sensors and modules." },
    ],
    links: [
      { from: "usb", to: "bridge", kind: "data", label: "USB" },
      { from: "usb", to: "reg", kind: "power", label: "5 V" },
      { from: "jack", to: "reg", kind: "power", label: "VIN" },
      { from: "bridge", to: "mcu", kind: "data", label: "TX/RX", both: true },
      { from: "reg", to: "mcu", kind: "power", label: "5 V" },
      { from: "reg", to: "power", kind: "power" },
      { from: "mcu", to: "digital", kind: "signal", both: true },
      { from: "analog", to: "mcu", kind: "analog" },
    ],
    steps: [
      "Power arrives from USB (5 V) or the barrel jack (7–12 V); the regulator settles it at 5 V for the whole board.",
      "The USB bridge chip converts the computer's USB traffic into serial for the ATmega328P, which is how sketches are uploaded.",
      "The ATmega328P runs your sketch at 16 MHz and drives the header pins directly: digital pins switch between 0 and 5 V, analog pins read voltages.",
      "The power pins pass the regulated 5 V and 3.3 V to your sensors and modules; all GND pins join the same ground.",
    ],
  },
  facts: [
    { label: "Logic", value: "5 V" },
    { label: "Clock", value: "16 MHz" },
    { label: "Memory", value: "32 KB flash, 2 KB RAM" },
    { label: "Pins", value: "14 digital (6 PWM), 6 analog" },
    { label: "Input", value: "USB 5 V or 7–12 V DC" },
    { label: "Size", value: "68.6 × 53.4 mm" },
  ],
  spec: {
    form: {
      mass: 25,
      mount: "jumpers",
      pitch: 2.54,
      holes: HOLES.map(({ x, y, d }) => ({ x, y, d })),
      note: "Female headers take jumper wires and shield boards. Four M3 holes bolt it to a case.",
    },
    power: {
      supply: { min: 7, max: 12, typ: 9 },
      logic: 5,
      tolerant5V: true,
      draw: { idle: 45, active: 50 },
      rails: [
        { pin: "5V", volts: 5, maxMa: 500, note: "On USB the port and the board's 500 mA fuse set the limit. From the barrel jack the regulator can pass 1 A, but heat stops you long before: at 12 V in, about 200 mA." },
        { pin: "3V3", volts: 3.3, maxMa: 50, note: "A small separate regulator: 50 mA, enough for one sensor, not a Wi-Fi module." },
      ],
      gpio: { maxMa: 20, totalMa: 200 },
      interface: "ATmega328P at 16 MHz: UART, SPI, I2C, 10-bit ADC; USB through an ATmega16U2",
      note: "VIN takes 7–12 V (6–20 V is survivable). The 5 V pin can also be fed from outside, which skips the regulator.",
    },
    thermal: { thetaCW: 90, maxC: 125, typicalW: 1.4, at: "12 V in, 200 mA drawn on the 5 V pin (a couple of servos)", note: "The NCP1117 in its SOT-223 package sits on a small patch of copper. It burns (VIN − 5 V) × current; above about 1 W it is too hot to hold a finger on." },
    sourcing: { mpn: "A000066", maker: "Arduino", lifecycle: "active", usd: [20, 28], note: "Clones with a CH340 USB chip cost $5–10 and work the same once the driver is installed." },
    limits: [
      "Only 2 KB of RAM and 32 KB of flash (0.5 KB and 2 KB of that go to the bootloader): long strings and big arrays run it out of memory.",
      "Each pin gives 20 mA (40 mA at the absolute limit) and all of them together 200 mA: an LED yes, a motor or relay coil no.",
      "12 V in with a couple of servos on the 5 V pin overheats the regulator: 7 V × 0.2 A is 1.4 W. Power servos and motors from their own supply.",
      "The 3.3 V pin gives 50 mA, and no 3.3 V logic board should hang on a 5 V pin: 5 V signals can damage it.",
      "No Wi-Fi or Bluetooth, and 16 MHz is slow for audio or fast sensors. Pins 0 and 1 are shared with the USB serial.",
    ],
    upgrade: [
      { part: "esp32", name: "ESP32 DevKit", why: "When a build needs Wi-Fi or Bluetooth, or more speed: 240 MHz dual core, 520 KB of RAM, 34 pins. It runs at 3.3 V, so 5 V sensors need a level shifter." },
      { part: "arduino-mega", name: "Arduino Mega 2560", why: "When you run out of pins: 54 digital (15 PWM), 16 analog, 4 serial ports and 8 KB of RAM, with the same 5 V logic and the same shields." },
      { part: "arduino-nano", name: "Arduino Nano", why: "When it must fit on a breadboard: the same ATmega328P and 5 V logic in 43 × 18 mm." },
      { name: "Arduino Uno R4 Minima", why: "The same size and 5 V logic, with a 48 MHz Cortex-M4, 32 KB of RAM and 256 KB of flash; it takes up to 24 V on VIN." },
    ],
    refs: [
      "https://docs.arduino.cc/hardware/uno-rev3/",
      "https://docs.arduino.cc/resources/datasheets/A000066-datasheet.pdf",
      "https://ww1.microchip.com/downloads/en/DeviceDoc/Atmel-7810-Automotive-Microcontrollers-ATmega328P_Datasheet.pdf",
      "https://www.onsemi.com/pdf/datasheet/ncp1117-d.pdf",
    ],
  },
  animate: { lit: ["led-on", "led-l"] },
  experiment: { title: "Blink", idea: "Flash the pin-13 LED once a second, then change the timing and watch the serial monitor count the blinks." },
  docs: "/docs/hardware-knowledge/arduino-uno",
  tags: ["arduino", "uno", "atmega328p", "5v", "beginner", "mcu", "board"],
  canvas: { usb: { x: -6.6, y: USB.y + USB.h / 2, z: 1.6 + USB.d / 2, from: "left" } },
});
