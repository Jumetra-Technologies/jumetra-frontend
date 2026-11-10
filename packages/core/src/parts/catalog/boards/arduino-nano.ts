/**
 * The Arduino Nano V3 (ATmega328P), as the clone sold everywhere looks: a blue
 * board 43.2 × 18.5 mm with a mini-USB-B at the left end, two rows of 15 pins
 * pointing down so it plugs into a breadboard, and the ATmega328P in a TQFP-32
 * turned 45°. Row spacing is 15.24 mm (0.6 in).
 *
 * Seen from above with the USB on the left, the top row reads
 * VIN GND RST 5V A7 … A0 AREF 3V3 D13 and the bottom row TX1 RX0 RST GND D2 … D12.
 * The 5 V regulator is on the back of the board and is not drawn; the Trace
 * view points at where it sits.
 */
import { MATERIAL, PCB_TOP, SOLDER_STUB, along, board, definePart, ground, io, name, pinHeader, rail, shade, silk, smd, smdLed, soic, tactileButton, type PinInfo, type Solid } from "../../sdk";
import { MINI_USB, miniUsbB } from "./_usb-mini";

const W = 43.18;
const H = 18.54;
const P = 2.54;
const BLUE = "#0a5aa6";
const SILK = "#f3f6f4";
const X0 = 6.35;
const ROW_TOP = 1.65;
const ROW_BOTTOM = 16.89;

const TOP_ROW = ["VIN", "GND1", null, "5V", "A7", "A6", "A5", "A4", "A3", "A2", "A1", "A0", null, "3V3", "D13"] as const;
const BOTTOM_ROW = ["D1", "D0", null, "GND2", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9", "D10", "D11", "D12"] as const;
const TOP_LABELS = ["VIN", "GND", "RST", "5V", "A7", "A6", "A5", "A4", "A3", "A2", "A1", "A0", "REF", "3V3", "D13"];
const BOTTOM_LABELS = ["TX1", "RX0", "RST", "GND", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9", "D10", "D11", "D12"];

const MCU = { x: 25, y: 9.27 };
/** The USB socket's shell starts 1 mm past the left edge. */
const USB = { x: -1.0, y: H / 2 - MINI_USB.h / 2 };

const top = pinHeader(X0, ROW_TOP, 15, { style: "down" });
const bottom = pinHeader(X0, ROW_BOTTOM, 15, { style: "down" });
const icsp = pinHeader(38.83, 6.73, 3, { dir: "y", rows: 2, style: "up" });

/** A point on the turned chip: (u, v) in the chip's own frame, turned 45° about its center. */
function turned(u: number, v: number): [number, number] {
  const c = Math.SQRT1_2;
  return [MCU.x + u * c - v * c, MCU.y + u * c + v * c];
}

/** The ATmega328P: a 7 mm TQFP-32 body turned 45°, with 8 fine legs on each side. */
function atmega(): Solid[] {
  const legs: string[] = [];
  for (let side = 0; side < 4; side++) {
    for (let i = 0; i < 8; i++) {
      const t = (i - 3.5) * 0.8;
      // The leg in the frame of the side facing +v, then turned to its side.
      const pts: Array<[number, number]> = [[t - 0.17, 3.3], [t + 0.17, 3.3], [t + 0.17, 4.5], [t - 0.17, 4.5]];
      const turnSide = ([u, v]: [number, number]): [number, number] => (side === 0 ? [u, v] : side === 1 ? [-v, u] : side === 2 ? [-u, -v] : [v, -u]);
      legs.push(`M ${pts.map((p) => turned(...turnSide(p)).map((n) => n.toFixed(3)).join(" ")).join(" L ")} Z`);
    }
  }
  const [dotX, dotY] = turned(-2.5, -2.5);
  return [
    { kind: "path", d: legs.join(" "), color: "none", fill: MATERIAL.tin, z: PCB_TOP + 0.03 },
    { kind: "box", id: "mcu", x: MCU.x - 3.5, y: MCU.y - 3.5, w: 7, h: 7, d: 1.0, z: PCB_TOP + 0.12, top: MATERIAL.ic, side: MATERIAL.icSide, radius: 0.25, finish: "epoxy", turn: 45, label: { text: "ATMEGA328P", size: 0.85, color: "#9aa0a6" } },
    { kind: "disc", cx: dotX, cy: dotY, r: 0.4, color: "#3a3d42", z: PCB_TOP + 1.14 },
  ];
}

/** Pin names, small and level, just inside each row. */
function pinLabels(): Solid[] {
  const out: Solid[] = [];
  TOP_LABELS.forEach((text, i) => out.push(silk(X0 + i * P, 4.0, text, 0.9, SILK, { anchor: "middle", weight: 600 })));
  BOTTOM_LABELS.forEach((text, i) => out.push(silk(X0 + i * P, 15.5, text, 0.9, SILK, { anchor: "middle", weight: 600 })));
  return out;
}

const NANO_PINS: PinInfo[] = [
  ...["0 (RX)", "1 (TX)", "2", "~3", "4", "~5", "~6", "7", "8", "~9", "~10", "~11", "12", "13"].map(
    (n) => ({ name: `D${n}`, role: n.startsWith("~") ? "pwm" : "digital", note: n.startsWith("~") ? "Digital, with PWM output" : "Digital input/output" }) as PinInfo,
  ),
  { name: "A0–A5", role: "analog", note: "10-bit analog inputs; they can also be digital pins. A4 is SDA and A5 is SCL for I2C" },
  { name: "A6–A7", role: "analog", note: "Analog inputs only: they cannot be used as digital pins" },
  { name: "5V", role: "power", note: "5 V output from the regulator or USB; also an input that skips the regulator" },
  { name: "3V3", role: "power", note: "3.3 V output from the USB chip: 50 mA at most, far less on CH340 clones" },
  { name: "GND", role: "ground", note: "Two ground pins; joined" },
  { name: "VIN", role: "power", note: "Unregulated input, 7–12 V" },
  { name: "RST", role: "other", note: "Two reset pins, joined: pull low to reset" },
  { name: "AREF", role: "other", note: "External reference for the analog inputs" },
];

export default definePart({
  id: "arduino-nano",
  name: "Arduino Nano",
  aka: ["Nano V3", "Nano 3.0", "ATmega328P Nano", "CH340 Nano"],
  group: "boards",
  rank: 4,
  summary: "An Uno's brain on a board the size of a stick of gum, with pins that plug into a breadboard. The same ATmega328P and the same 5 V logic, plus two extra analog inputs.",
  size: { w: 43.2, h: 18.5, d: 10.1 },
  solids: [
    board(W, H, BLUE, { radius: 0.5 }),
    { kind: "path", d: "M 17.0 8.6 L 19.2 8.6 L 21.2 6.8 M 17.0 9.9 L 19.6 9.9 L 21.6 11.7", color: shade(BLUE, 1.3), width: 0.25 },

    // The pin rows: plastic under the board, pins hanging down, solder on top.
    top,
    bottom,
    // The 2 × 3 ICSP header at the far end.
    icsp,

    // USB at the left end, then the USB-serial chip and its 12 MHz crystal.
    miniUsbB(USB.x, USB.y),
    soic(14.2, MCU.y, 8, "CH340G", { dir: "y" }),
    { kind: "box", x: 17.2, y: 12.2, w: 3.2, h: 2.5, d: 0.9, z: PCB_TOP, top: "linear-gradient(180deg,#d9dce0,#aeb3ba)", side: MATERIAL.steelSide, fill: MATERIAL.steel, radius: 0.3, finish: "metal" },

    // The ATmega328P and its 16 MHz resonator.
    atmega(),
    { kind: "box", id: "resonator", x: 18.2, y: 4.0, w: 3.2, h: 1.3, d: 1.0, z: PCB_TOP, top: "#cdbf8a", side: "#8f8456", radius: 0.2, finish: "ceramic" },
    { kind: "box", x: 18.2, y: 4.0, w: 0.6, h: 1.3, d: 1.02, z: PCB_TOP, top: MATERIAL.tin, finish: "tin" },
    { kind: "box", x: 20.8, y: 4.0, w: 0.6, h: 1.3, d: 1.02, z: PCB_TOP, top: MATERIAL.tin, finish: "tin" },

    // Reset button.
    tactileButton(31.4, 9.9, 3.2, "reset-btn"),

    // Four LEDs in a column, each with its resistor on the left.
    smdLed(33.2, 4.3, "#ffb020", "led-tx"),
    smdLed(33.2, 5.7, "#ffb020", "led-rx"),
    smdLed(33.2, 7.1, "#ffb020", "led-l"),
    smdLed(33.2, 8.5, "#3ddc84", "led-on"),
    smd(31.0, 4.3, "r"),
    smd(31.0, 5.7, "r"),
    smd(31.0, 7.1, "r"),
    smd(31.0, 8.5, "r"),

    // Capacitors and resistors round the chips.
    smd(9.6, 4.4, "c", "y"),
    smd(9.6, 12.6, "r", "y"),
    smd(22.4, 3.9, "c"),
    smd(28.2, 3.9, "r"),
    smd(29.6, 12.4, "r"),
    smd(28.6, 13.6, "c"),
    smd(35.2, 13.4, "r"),

    // Silkscreen.
    pinLabels(),
    silk(35.3, 4.9, "TX", 0.9, SILK, { weight: 600 }),
    silk(35.3, 6.3, "RX", 0.9, SILK, { weight: 600 }),
    silk(35.3, 7.7, "L", 0.9, SILK, { weight: 600 }),
    silk(35.3, 9.1, "PWR", 0.9, SILK, { weight: 600 }),
    silk(40.1, 14.0, "ICSP", 0.9, SILK, { anchor: "middle", weight: 600 }),
    silk(33.0, 14.1, "RST", 0.9, SILK, { anchor: "middle", weight: 600 }),
  ],
  features: [
    { id: "header-top", label: "Power and analog pins", kind: "pins", x: X0 - P / 2, y: ROW_TOP - P / 2, w: 15 * P, h: P, note: "VIN, GND, RST, 5V, the analog inputs A7 to A0, AREF, 3V3 and D13, in one row of 15 pins." },
    { id: "header-bottom", label: "Digital pins", kind: "pins", x: X0 - P / 2, y: ROW_BOTTOM - P / 2, w: 15 * P, h: P, note: "TX1, RX0, RST, GND and the digital pins D2 to D12. Pins 0 and 1 are also the serial port, so leave them free while uploading." },
    { id: "usb", label: "Mini-USB port", kind: "port", x: USB.x, y: USB.y, w: MINI_USB.w, h: MINI_USB.h, note: "Programming and serial over USB; also powers the board at 5 V. Some clones use a micro-USB or USB-C socket instead." },
    { id: "bridge", label: "USB-serial chip", kind: "chip", x: 11.5, y: 3.9, w: 5.4, h: 10.7, note: "A CH340G on clones, an FT232RL on the official board. It turns the computer's USB into the serial the ATmega328P speaks. The CH340 needs a driver on older computers." },
    { id: "mcu", label: "ATmega328P", kind: "chip", x: 18.6, y: 2.9, w: 12.8, h: 12.7, note: "The microcontroller: 16 MHz, 32 KB flash, 2 KB RAM. The same chip as the Uno's, in a small surface-mount package." },
    { id: "resonator", label: "16 MHz resonator", kind: "other", x: 18.2, y: 4.0, w: 3.2, h: 1.3, note: "The clock the ATmega328P counts by. Every delay() in a sketch is measured against it." },
    { id: "reset", label: "Reset button", kind: "button", x: 31.4, y: 9.9, w: 3.2, h: 3.2, note: "Restarts the sketch from the top." },
    { id: "leds", label: "TX, RX, L and PWR LEDs", kind: "led", x: 33.2, y: 4.3, w: 1.6, h: 5.0, note: "TX and RX blink with serial traffic. L is wired to pin 13. PWR is lit whenever the board has 5 V." },
    { id: "icsp", label: "ICSP header", kind: "pins", x: 37.56, y: 5.46, w: 5.08, h: 7.62, note: "In-circuit programming of the ATmega328P with an external programmer. Pin 2 carries 5 V." },
    { id: "regulator", label: "5 V regulator (on the back)", kind: "power", x: 9.0, y: 2.9, w: 6.5, h: 3.5, note: "An AMS1117 or LM1117 on the underside of the board: drops VIN's 7–12 V to 5 V. It gets hot at 12 V in." },
  ],
  pins: [
    rail("VIN", "VIN", 5, "left", { accepts: [7, 12], note: "7–12 V in from a battery; the regulator on the back makes 5 V from it" }),
    rail("5V", "5V", 5, "left"),
    rail("3V3", "3V3", 3.3, "left", { note: "3.3 V from the USB chip: 50 mA at most, far less on CH340 clones" }),
    ground("GND1", "left"),
    ground("GND2", "right"),
    io("A0", "A0", "left", ["analog", "digital"]),
    io("A1", "A1", "left", ["analog", "digital"]),
    io("A2", "A2", "left", ["analog", "digital"]),
    io("A3", "A3", "left", ["analog", "digital"]),
    io("A4", "A4 SDA", "left", ["analog", "digital", "sda"]),
    io("A5", "A5 SCL", "left", ["analog", "digital", "scl"]),
    io("A6", "A6", "left", ["analog"], { inputOnly: true, note: "Analog input only: it cannot be used as a digital pin" }),
    io("A7", "A7", "left", ["analog"], { inputOnly: true, note: "Analog input only: it cannot be used as a digital pin" }),
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
    io("D13", "D13 SCK", "left", ["digital", "sck", "led"], { note: "Built-in LED L" }),
  ],
  pinTable: NANO_PINS,
  pinAt: { ...name(top, ...TOP_ROW), ...name(bottom, ...BOTTOM_ROW) },
  lab: { controller: true, logic: 5, tolerates5V: true },
  circuit: {
    blocks: [
      { id: "usb", label: "Mini-USB", sub: "5 V in, serial", kind: "connector", col: 0, row: 0, at: "usb", note: "The computer supplies 5 V and talks serial through the USB chip." },
      { id: "bridge", label: "USB-serial chip", sub: "CH340G or FT232RL", kind: "ic", col: 1, row: 0, at: "bridge", note: "Turns USB into the serial signals the main chip understands." },
      { id: "reg", label: "5 V regulator", sub: "AMS1117, on the back", kind: "regulator", col: 1, row: 2, at: "regulator", hot: true, note: "Drops VIN to a steady 5 V and burns the difference as heat: (VIN − 5 V) × current." },
      { id: "mcu", label: "ATmega328P", sub: "16 MHz", kind: "mcu", col: 2, row: 1, at: "mcu", note: "Runs your sketch. Every pin on the two rows is one of its pins." },
      { id: "clock", label: "Resonator", sub: "16 MHz", kind: "passive", col: 2, row: 0, at: "resonator", note: "Sets the speed the chip runs at." },
      { id: "digital", label: "Digital pins", sub: "D0–D13", kind: "pin", col: 3, row: 0, at: "header-bottom", note: "Switch between 0 V and 5 V, source up to 20 mA each." },
      { id: "analog", label: "Analog inputs", sub: "A0–A7", kind: "pin", col: 3, row: 1, at: "header-top", note: "Read 0–5 V as 0–1023. A6 and A7 can only read." },
      { id: "power", label: "Power pins", sub: "5V, 3V3, GND", kind: "power", col: 3, row: 2, at: "5V", note: "Feed your sensors and modules." },
    ],
    links: [
      { from: "usb", to: "bridge", kind: "data", label: "USB" },
      { from: "usb", to: "reg", kind: "power", label: "5 V" },
      { from: "bridge", to: "mcu", kind: "data", label: "TX/RX", both: true },
      { from: "clock", to: "mcu", kind: "signal", label: "16 MHz" },
      { from: "reg", to: "mcu", kind: "power", label: "5 V" },
      { from: "reg", to: "power", kind: "power" },
      { from: "mcu", to: "digital", kind: "signal", both: true },
      { from: "analog", to: "mcu", kind: "analog" },
    ],
    steps: [
      "Power arrives from USB (5 V) or on VIN (7–12 V); the regulator on the back settles it at 5 V for the whole board.",
      "The USB chip converts the computer's USB traffic into serial for the ATmega328P, which is how sketches are uploaded.",
      "The ATmega328P runs your sketch at 16 MHz and drives the pins directly: digital pins switch between 0 and 5 V, analog pins read voltages.",
      "The power pins pass the regulated 5 V to your sensors and modules; both GND pins join the same ground.",
    ],
  },
  facts: [
    { label: "Logic", value: "5 V" },
    { label: "Clock", value: "16 MHz" },
    { label: "Memory", value: "32 KB flash, 2 KB RAM" },
    { label: "Pins", value: "14 digital (6 PWM), 8 analog" },
    { label: "Input", value: "USB 5 V or 7–12 V on VIN" },
    { label: "Size", value: "45 × 18 mm with USB" },
  ],
  spec: {
    form: {
      mass: 7,
      mount: "breadboard",
      pitch: 2.54,
      note: "Pins point down and the rows are 15.24 mm (0.6 in) apart, so it straddles the middle gap of a breadboard with a few holes free beside each row. No mounting holes.",
    },
    power: {
      supply: { min: 7, max: 12, typ: 9 },
      logic: 5,
      tolerant5V: true,
      draw: { idle: 19, active: 25 },
      rails: [
        { pin: "5V", volts: 5, maxMa: 500, note: "On USB the port's own limit is 500 mA. From VIN the regulator can pass 800 mA on paper, but heat stops you near 150 mA at 12 V in." },
        { pin: "3V3", volts: 3.3, maxMa: 50, note: "FT232RL boards give 50 mA. CH340 clones often give far less, or nothing: do not power a sensor from it." },
      ],
      gpio: { maxMa: 20, totalMa: 200 },
      interface: "ATmega328P at 16 MHz: UART, SPI, I2C, 8-channel 10-bit ADC; USB through a CH340G or FT232RL",
      note: "VIN takes 7–12 V (6–20 V is the limit). The 5 V pin can also be fed from outside, which skips the regulator.",
    },
    thermal: { thetaCW: 90, maxC: 125, typicalW: 0.7, at: "12 V in, 100 mA drawn", note: "The regulator is in a SOT-223 package on the back, on a small patch of copper. It burns (VIN − 5 V) × current: 1.4 W at 12 V in and 200 mA. It shuts itself down near 150 °C." },
    sourcing: { mpn: "ATmega328P-AU", maker: "Microchip (the chip); the boards come from many makers", lifecycle: "generic", usd: [4, 25], note: "Clones with a CH340 chip cost $3–6. The official board costs about $25." },
    limits: [
      "Clones use a CH340 USB chip: older Windows and macOS need its driver installed before the board shows up as a port.",
      "The 3.3 V pin gives 50 mA on the FT232RL version and often much less (or nothing) on CH340 clones: do not run a sensor or radio from it.",
      "A6 and A7 are analog inputs only: no digital output, no pull-up, no digitalRead.",
      "Only 2 KB of RAM and 32 KB of flash (2 KB of that goes to the bootloader), the same as an Uno.",
      "Each pin gives 20 mA (40 mA at the absolute limit) and all of them together 200 mA: an LED yes, a motor or relay coil no.",
      "12 V in on VIN makes the regulator lose 7 V × current: at 100 mA that is 0.7 W, and the back of the board gets hot.",
    ],
    upgrade: [
      { part: "esp32", name: "ESP32 DevKit", why: "When a build needs Wi-Fi or Bluetooth, or more speed: 240 MHz dual core and 520 KB of RAM, against the Nano's 16 MHz and 2 KB. It runs at 3.3 V, so 5 V sensors need a level shifter." },
      { part: "raspberry-pi-pico", name: "Raspberry Pi Pico", why: "Cheaper and far faster: 133 MHz dual core, 264 KB of RAM, 2 MB of flash and 26 pins, for about $4. It runs at 3.3 V and its pins do not tolerate 5 V." },
      { name: "Arduino Nano Every", why: "The same footprint and 5 V logic with 48 KB of flash and 6 KB of RAM, when the sketch is only too big." },
    ],
    refs: [
      "https://www.mouser.com/pdfdocs/Gravitech_Arduino_Nano3_0.pdf",
      "https://content.arduino.cc/assets/Pinout-NANO_latest.pdf",
      "https://www.arduino.cc/en/uploads/Main/ArduinoNanoManual23.pdf",
      "https://ww1.microchip.com/downloads/en/DeviceDoc/Atmel-7810-Automotive-Microcontrollers-ATmega328P_Datasheet.pdf",
    ],
  },
  animate: { lit: ["led-on", "led-l"] },
  experiment: { title: "Blink on a breadboard", idea: "Push the Nano into a breadboard, wire an LED and a resistor from D8 to GND, and blink it. Then add a second LED on D9." },
  tags: ["arduino", "nano", "atmega328p", "5v", "breadboard", "mcu", "board", "ch340"],
  canvas: { usb: { x: USB.x, y: USB.y + MINI_USB.h / 2, z: PCB_TOP + MINI_USB.d / 2, from: "left" }, pinZ: PCB_TOP + SOLDER_STUB },
});
