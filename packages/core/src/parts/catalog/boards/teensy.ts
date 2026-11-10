import { MATERIAL, board, chip, definePart, ground, io, microUsb, name, pinHeader, rail, silk, smd, smdDiode, smdLed, sot23, tactileButton, type Solid } from "../../sdk";

const TOP = 1.6;
/** The soldermask is a very dark green, close to black. */
const MASK = "#14211a";

/* The pins hang below the board in two rows 15.24 mm apart, 14 pins each (breadboard format). */
const ROW_TOP = 1.27;
const ROW_BOTTOM = 16.51;
const X0 = 1.27;

/** VIN, GND, 3V3, then 23 down to 13. USB is on the left, so this row is the right-hand side of the board as it is usually photographed. */
const topRow = pinHeader(X0, ROW_TOP, 14, { style: "down" });
/** GND, then 0 up to 12. */
const bottomRow = pinHeader(X0, ROW_BOTTOM, 14, { style: "down" });

const topNames = ["VIN", "GND", "3V3", ...Array.from({ length: 11 }, (_, i) => String(23 - i))];
const bottomNames = ["GND", ...Array.from({ length: 13 }, (_, i) => String(i))];

/** The pin number printed beside each pin. */
const labels: Solid[] = [
  ...topNames.map((text, i) => silk(X0 + i * 2.54, 3.5, text, 0.9, MATERIAL.silk, { anchor: "middle" })),
  ...bottomNames.map((text, i) => silk(X0 + i * 2.54, 15.1, text, 0.9, MATERIAL.silk, { anchor: "middle" })),
];

const topAt = (pin: number) => 3 + (23 - pin);
const bottomAt = (pin: number) => pin + 1;

/** The i.MX RT1062 is a 10 × 10 mm ball-grid chip: a flat black square with its marking in white-gray. */
const processor: Solid[] = [
  chip(17.2, 3.9, 10, 10, "IMXRT1062", 1, "mcu"),
  { kind: "text", x: 22.2, y: 10.9, text: "DVL6A", size: 0.9, color: "#9aa0a6", anchor: "middle", z: TOP + 1.01 },
  { kind: "text", x: 22.2, y: 12.2, text: "2342 T7", size: 0.8, color: "#7d838b", anchor: "middle", z: TOP + 1.01 },
  { kind: "disc", cx: 18.3, cy: 5, r: 0.35, color: "#6b7078", z: TOP + 1.01 },
];

/** The MKL02 chip that holds the bootloader: a small black QFN beside the button. */
const bootChip: Solid[] = [
  { kind: "box", id: "boot", x: 9.6, y: 6.9, w: 4, h: 4, d: 0.8, z: TOP, top: MATERIAL.ic, side: MATERIAL.icSide, radius: 0.2, finish: "epoxy" },
  { kind: "disc", cx: 10.4, cy: 7.7, r: 0.3, color: "#4b5058", z: TOP + 0.81 },
];

/** The 24 MHz crystal: a small steel can on the board. */
const clock: Solid = { kind: "box", id: "xtal", x: 13.8, y: 11.4, w: 3.2, h: 2.5, d: 0.8, z: TOP, top: MATERIAL.steel, side: MATERIAL.steelSide, radius: 0.3, finish: "metal" };

export default definePart({
  id: "teensy",
  name: "Teensy 4.0",
  aka: ["Teensy", "Teensy 4", "i.MX RT1062 board"],
  group: "boards",
  rank: 10,
  summary: "The fastest Arduino-compatible board by a wide margin: a 600 MHz ARM Cortex-M7 on a board smaller than a stick of gum. It plugs into a breadboard, runs on 3.3 V and has a real hardware floating-point unit.",
  size: { w: 35.6, h: 17.8, d: 4.4 },
  solids: [
    board(35.56, 17.78, MASK, { radius: 0.5 }),
    topRow,
    bottomRow,
    microUsb(-1.3, 5.14),
    processor,
    bootChip,
    clock,
    tactileButton(5.4, 7.3, 3.2, "program"),
    // The orange LED by pin 13, and the 3.3 V regulator and diode round it.
    smdLed(32.4, 5.7, "#f97316", "led"),
    sot23(31.6, 9.2, { five: true }),
    ...smdDiode(33.2, 12.9, "x", 1),
    // The specks round the chips.
    ...smd(14, 5.4, "c", "x"),
    ...smd(14, 7.4, "r", "x"),
    ...smd(28.2, 6.8, "c", "y"),
    ...smd(28.2, 11.6, "c", "y"),
    ...smd(17.4, 14.2, "c", "x"),
    ...smd(21, 14.4, "r", "x"),
    ...smd(24.4, 14.4, "c", "x"),
    labels,
  ],
  features: [
    { id: "mcu", label: "i.MX RT1062", kind: "chip", x: 17.2, y: 3.9, w: 10, h: 10, note: "A 600 MHz Cortex-M7 with 1 MB of RAM, a floating-point unit and a lot of peripherals. It is a ball-grid chip, so there are no legs to see." },
    { id: "boot", label: "MKL02 bootloader chip", kind: "chip", x: 9.6, y: 6.9, w: 4, h: 4, note: "A tiny second chip. It loads your program into the main chip when you press the button, so a bad sketch can never lock you out." },
    { id: "xtal", label: "24 MHz crystal", kind: "chip", x: 13.8, y: 11.4, w: 3.2, h: 2.5, note: "The clock the main chip multiplies up to 600 MHz." },
    { id: "pins-top", label: "Pins, VIN side", kind: "pins", x: 0, y: 0, w: 35.56, h: 2.54, note: "VIN, GND, 3V3, then pins 23 down to 13. This row has the I2C pins 18 and 19, the analog inputs 14 to 23 and the pin-13 LED." },
    { id: "pins-bottom", label: "Pins, GND side", kind: "pins", x: 0, y: 15.24, w: 35.56, h: 2.54, note: "GND, then pins 0 to 12: the serial ports, PWM and SPI." },
    { id: "usb", label: "Micro-USB", kind: "port", x: -1.3, y: 5.14, w: 5.6, h: 7.5, note: "USB at 480 Mbit/s straight into the main chip: programming, serial, MIDI, audio or keyboard emulation." },
    { id: "program", label: "Program button", kind: "button", x: 5.4, y: 7.3, w: 3.2, h: 3.2, note: "Press once to put the board in programming mode. The loader program on your computer then sends the new sketch." },
    { id: "led", label: "Pin 13 LED", kind: "led", x: 32, y: 5.3, w: 2.4, h: 1.6, note: "Orange; on pin 13, which is also SCK. It lights when pin 13 is high." },
    { id: "reg", label: "3.3 V regulator", kind: "power", x: 30.2, y: 8, w: 3.6, h: 2.6, note: "Makes 3.3 V from USB or VIN. It gives 250 mA to the 3V3 pin, and the board itself uses part of that." },
  ],
  pins: [
    rail("VIN", "VIN", 5, "left", { accepts: [3.6, 5.5], note: "3.6–5.5 V in; with USB plugged in it also gives out USB's 5 V" }),
    rail("3V3", "3.3V", 3.3, "left"),
    ground("GND1", "left", "GND"),
    io("0", "0 RX1", "left", ["digital", "pwm", "rx"]),
    io("1", "1 TX1", "left", ["digital", "pwm", "tx"]),
    ...[2, 3, 4, 5, 6, 7, 8, 9].map((n) => io(String(n), `${n} ~`, "left", ["digital", "pwm"])),
    io("10", "10 CS", "left", ["digital", "pwm", "cs"]),
    io("11", "11 MOSI", "left", ["digital", "pwm", "mosi"]),
    io("12", "12 MISO", "left", ["digital", "pwm", "miso"]),
    ground("GND2", "right", "GND"),
    io("13", "13 SCK", "right", ["digital", "pwm", "sck", "led"], { note: "Built-in LED" }),
    io("14", "14 A0", "right", ["analog", "digital", "pwm"]),
    io("15", "15 A1", "right", ["analog", "digital", "pwm"]),
    io("16", "16 A2", "right", ["analog", "digital"]),
    io("17", "17 A3", "right", ["analog", "digital"]),
    io("18", "18 A4 SDA", "right", ["analog", "digital", "pwm", "sda"]),
    io("19", "19 A5 SCL", "right", ["analog", "digital", "pwm", "scl"]),
    io("20", "20 A6", "right", ["analog", "digital"]),
    io("21", "21 A7", "right", ["analog", "digital"]),
    io("22", "22 A8", "right", ["analog", "digital", "pwm"]),
    io("23", "23 A9", "right", ["analog", "digital", "pwm"]),
  ],
  pinTable: [
    { name: "0–39", role: "digital", note: "40 digital pins at 3.3 V, not 5 V tolerant; 31 with PWM. 0–23 are on the side pins, 24–39 on pads on the back." },
    { name: "A0–A13", role: "analog", note: "14 analog inputs on pins 14–27, 12-bit, 0–3.3 V" },
    { name: "0 / 1, 7 / 8, 14 / 15 …", role: "uart", note: "Seven hardware serial ports" },
    { name: "18 / 19", role: "i2c", note: "SDA0 and SCL0, plus two more I2C buses" },
    { name: "10 / 11 / 12 / 13", role: "spi", note: "CS, MOSI, MISO, SCK, plus two more SPI buses" },
    { name: "22 / 23", role: "data", note: "CAN bus 1 (pins 22 and 23); three CAN buses in all, one with CAN FD" },
    { name: "VIN", role: "power", note: "3.6–5.5 V in" },
    { name: "3.3V", role: "power", note: "3.3 V out, 250 mA" },
    { name: "GND", role: "ground", note: "Ground" },
  ],
  pinAt: {
    VIN: topRow.spots[0],
    GND2: topRow.spots[1],
    "3V3": topRow.spots[2],
    ...Object.fromEntries(Array.from({ length: 11 }, (_, i) => [String(23 - i), topRow.spots[topAt(23 - i)]])),
    GND1: bottomRow.spots[0],
    ...Object.fromEntries(Array.from({ length: 13 }, (_, i) => [String(i), bottomRow.spots[bottomAt(i)]])),
  },
  lab: { controller: true, logic: 3.3, tolerates5V: false },
  circuit: {
    blocks: [
      { id: "usb", label: "Micro-USB", sub: "480 Mbit/s", kind: "connector", col: 0, row: 0, at: "usb", note: "USB straight into the chip; it can be a serial port, MIDI device or sound card." },
      { id: "boot", label: "MKL02", sub: "bootloader", kind: "ic", col: 1, row: 0, at: "boot", note: "Loads new programs into the main chip when you press the button." },
      { id: "reg", label: "3.3 V regulator", kind: "regulator", col: 1, row: 1, at: "reg", note: "From VIN or USB." },
      { id: "mcu", label: "i.MX RT1062", sub: "600 MHz, M7", kind: "mcu", col: 2, row: 1, at: "mcu", note: "Runs code from flash through a cache at full speed." },
      { id: "xtal", label: "24 MHz crystal", kind: "passive", col: 2, row: 2, at: "xtal", note: "The chip's clock. It is multiplied to 600 MHz inside." },
      { id: "gpio", label: "GPIO", sub: "40 × 3.3 V", kind: "pin", col: 3, row: 1, at: "pins-bottom", note: "Digital, PWM, 7 UART, 3 SPI, 3 I2C, CAN." },
      { id: "adc", label: "Analog inputs", sub: "A0–A13", kind: "pin", col: 3, row: 2, at: "pins-top", note: "12-bit, 0–3.3 V." },
    ],
    links: [
      { from: "usb", to: "mcu", kind: "data", label: "USB", both: true },
      { from: "usb", to: "reg", kind: "power", label: "5 V" },
      { from: "boot", to: "mcu", kind: "data", label: "program" },
      { from: "reg", to: "mcu", kind: "power", label: "3.3 V" },
      { from: "xtal", to: "mcu", kind: "signal", label: "24 MHz" },
      { from: "mcu", to: "gpio", kind: "signal", both: true },
      { from: "adc", to: "mcu", kind: "analog" },
    ],
    steps: [
      "USB or VIN is regulated to 3.3 V; the chip itself is not 5 V tolerant.",
      "The i.MX RT1062 talks USB natively and runs your code at 600 MHz.",
      "The MKL02 chip loads each new program when you press the button, so a crashed sketch never locks the board.",
      "40 pins carry GPIO, 14 analog inputs and seven serial ports.",
    ],
  },
  facts: [
    { label: "Logic", value: "3.3 V (not 5 V tolerant)" },
    { label: "Clock", value: "600 MHz Cortex-M7" },
    { label: "Memory", value: "2 MB flash, 1 MB RAM" },
    { label: "Pins", value: "40 digital (31 PWM), 14 analog" },
    { label: "Extras", value: "7 UART, 3 SPI, 3 I2C, CAN FD, USB 480 Mbit/s" },
    { label: "Size", value: "35.6 × 17.8 mm" },
  ],
  spec: {
    form: {
      mount: "breadboard",
      pitch: 2.54,
      note: "Two rows of 14 pins, 15.24 mm apart, on the underside: it straddles a breadboard's center gap with room left on each side for jumper wires. There are no mounting holes.",
    },
    power: {
      supply: { min: 3.6, max: 5.5, typ: 5 },
      logic: 3.3,
      tolerant5V: false,
      draw: { idle: 100, active: 100 },
      rails: [{ pin: "3V3", volts: 3.3, maxMa: 250, note: "From the on-board regulator, which also feeds the chip, so some of the 250 mA is already used." }],
      gpio: { maxMa: 4 },
      interface: "NXP i.MX RT1062, Cortex-M7 at 600 MHz, 2 MB flash, 1 MB RAM; USB 2.0 device and host",
      note: "At 600 MHz the board draws about 100 mA. The chip runs the same speed in an empty loop as in a busy one, so slowing the clock is what saves current.",
    },
    sourcing: { mpn: "TEENSY40", maker: "PJRC (chip: NXP MIMXRT1062DVL6A)", lifecycle: "active", usd: [22, 30], note: "Sold with or without header pins attached. Buy the pin version for a breadboard." },
    limits: [
      "The pins are NOT 5 V tolerant. 5 V on any pin can destroy the chip. A 5 V sensor needs a level shifter or a divider.",
      "Each pin is meant to give about 4 mA, 10 mA at most. An LED with a 330 Ω resistor from 3.3 V takes about 4 mA; a motor or a relay needs a driver.",
      "The 3V3 pin gives 250 mA, shared with the board.",
      "At 600 MHz the board draws about 100 mA from USB or VIN. A battery lasts hours, not days.",
      "VIN takes 3.6 V to 5.5 V. Above that the regulator is outside its range. USB power and VIN are joined on the board: do not feed VIN from a second 5 V source while USB is plugged in unless you cut the link on the back first.",
      "The pins are small and close; the board is 17.8 mm wide, so a breadboard leaves only one free hole beside each pin.",
    ],
    upgrade: [
      { name: "Teensy 4.1", why: "The same 600 MHz chip on a longer board: 8 MB of flash instead of 2 MB, 55 pins instead of 40, a microSD slot, solder pads for Ethernet and a USB host header. Choose it when the 4.0 runs out of pins or storage; it costs about $10 to $15 more." },
    ],
    refs: ["https://www.pjrc.com/store/teensy40.html", "https://www.pjrc.com/teensy/techspecs.html", "https://www.nxp.com/products/i.MX-RT1060"],
  },
  animate: { lit: ["led"] },
  experiment: { title: "Audio from a sketch", idea: "Use the audio library to play a sine wave on a pin through a small amplifier, then add a knob on A0 to change its pitch." },
  tags: ["teensy", "pjrc", "arm", "cortex-m7", "fast", "audio", "3.3v", "board", "mcu", "breadboard"],
});
