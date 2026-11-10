import { MATERIAL, board, chip, definePart, ground, io, microUsb, pinHeader, rail, silk, smd, smdLed, soic, sot23, tactileButton, type Solid } from "../../sdk";

const TOP = 1.6;
/** The soldermask is a very dark green, close to black. */
const MASK = "#14211a";

/* The pins hang below the board in two rows of 24, 15.24 mm apart (breadboard format). */
const ROW_TOP = 1.27;
const ROW_BOTTOM = 16.51;
const X0 = 1.27;
const COUNT = 24;

/**
 * With the USB socket on the left, the top row is the board's right-hand column on the PJRC card:
 * VIN, GND, 3.3V, 23 down to 13, GND, then 41 down to 33.
 */
const topRow = pinHeader(X0, ROW_TOP, COUNT, { style: "down" });
/** The other column of the card: GND, 0 up to 12, 3.3V, then 24 up to 32. */
const bottomRow = pinHeader(X0, ROW_BOTTOM, COUNT, { style: "down" });

const topNames = ["VIN", "GND", "3.3V", ...Array.from({ length: 11 }, (_, i) => String(23 - i)), "GND", ...Array.from({ length: 9 }, (_, i) => String(41 - i))];
const bottomNames = ["GND", ...Array.from({ length: 13 }, (_, i) => String(i)), "3.3V", ...Array.from({ length: 9 }, (_, i) => String(24 + i))];

/** The pin number printed beside each pin. */
const labels: Solid[] = [
  ...topNames.map((text, i) => silk(X0 + i * 2.54, 3.5, text, 0.9, MATERIAL.silk, { anchor: "middle" })),
  ...bottomNames.map((text, i) => silk(X0 + i * 2.54, 15.1, text, 0.9, MATERIAL.silk, { anchor: "middle" })),
];

const topAt = (pin: number) => 3 + (23 - pin);
const bottomAt = (pin: number) => pin + 1;

/** The i.MX RT1062 is a 10 × 10 mm ball-grid chip: a flat black square with its marking in white-gray. */
const MCU_X = 19.5;
const processor: Solid[] = [
  chip(MCU_X, 3.9, 10, 10, "IMXRT1062", 1, "mcu"),
  { kind: "text", x: MCU_X + 5, y: 10.9, text: "DVL6A", size: 0.9, color: "#9aa0a6", anchor: "middle", z: TOP + 1.01 },
  { kind: "text", x: MCU_X + 5, y: 12.2, text: "2342 T7", size: 0.8, color: "#7d838b", anchor: "middle", z: TOP + 1.01 },
  { kind: "disc", cx: MCU_X + 1.1, cy: 5, r: 0.35, color: "#6b7078", z: TOP + 1.01 },
];

/** The MKL02 chip that holds the bootloader: a small black QFN beside the button. */
const bootChip: Solid[] = [
  { kind: "box", id: "boot", x: 9.6, y: 6.9, w: 4, h: 4, d: 0.8, z: TOP, top: MATERIAL.ic, side: MATERIAL.icSide, radius: 0.2, finish: "epoxy" },
  { kind: "disc", cx: 10.4, cy: 7.7, r: 0.3, color: "#4b5058", z: TOP + 0.81 },
];

/** The 24 MHz crystal: a small steel can on the board. */
const clock: Solid = { kind: "box", id: "xtal", x: 14.6, y: 11, w: 3.2, h: 2.5, d: 0.8, z: TOP, top: MATERIAL.steel, side: MATERIAL.steelSide, radius: 0.3, finish: "metal" };
/** The 32.768 kHz crystal for the real-time clock. */
const watch: Solid = { kind: "box", id: "xtal32", x: 29.2, y: 12.3, w: 3.2, h: 1.5, d: 0.8, z: TOP, top: MATERIAL.steel, side: MATERIAL.steelSide, radius: 0.3, finish: "metal" };

/** The 8 MB QSPI flash beside the processor. */
const flash = soic(35, 8.9, 4, "W25Q64", { id: "flash" });

/** Six Ethernet pads (2 × 3) for the MagJack kit, and five USB-host pads in a row. */
const ethPads: Solid[] = [0, 1].flatMap((c) => [0, 1, 2].map((r): Solid => ({ kind: "disc", cx: 41.3 + c * 2.54, cy: 6.36 + r * 2.54, r: 0.8, color: MATERIAL.gold, z: TOP })));
const hostPads: Solid[] = Array.from({ length: 5 }, (_, i): Solid => ({ kind: "disc", cx: 39.4 + i * 1.27, cy: 13.4, r: 0.5, color: MATERIAL.gold, z: TOP }));

/** The metal microSD socket at the far end, its card slot facing out. */
const sdSocket: Solid[] = [
  { kind: "box", id: "sd", x: 45.9, y: 3.7, w: 15, h: 10.4, d: 1.9, z: TOP, top: "linear-gradient(180deg,#d7dadf,#b9bdc3)", side: MATERIAL.steelSide, fill: MATERIAL.steel, radius: 0.4, finish: "metal", label: { text: "microSD", size: 1.3, color: "#4b5059" } },
  { kind: "box", x: 60.4, y: 4.7, w: 0.6, h: 8.4, d: 1.0, z: TOP + 0.4, top: "#0c0d0f", finish: "plastic", radius: 0.2 },
];

export default definePart({
  id: "teensy",
  name: "Teensy 4.1",
  aka: ["Teensy", "i.MX RT1062 board"],
  group: "boards",
  rank: 10,
  summary: "The fastest Arduino-compatible board by a wide margin: a 600 MHz ARM Cortex-M7 in a small package, with an SD slot, Ethernet pads and audio-grade peripherals. It plugs into a breadboard and runs on 3.3 V.",
  size: { w: 61, h: 17.8, d: 4.4 },
  solids: [
    board(60.96, 17.78, MASK, { radius: 0.5 }),
    topRow,
    bottomRow,
    microUsb(-1.3, 5.14),
    processor,
    bootChip,
    clock,
    watch,
    flash,
    sdSocket,
    ethPads,
    hostPads,
    tactileButton(5.4, 7.3, 3.2, "program"),
    // The 3.3 V regulator beside the USB socket and the orange LED by pin 13.
    sot23(7, 13, { five: true }),
    smdLed(33.5, 5.2, "#f97316", "led"),
    // The specks round the chips.
    ...smd(14, 5.4, "c", "x"),
    ...smd(30.4, 4.6, "c", "y"),
    silk(42.5, 4.8, "ETHERNET", 0.7, MATERIAL.silk, { anchor: "middle" }),
    labels,
  ],
  features: [
    { id: "mcu", label: "i.MX RT1062", kind: "chip", x: MCU_X, y: 3.9, w: 10, h: 10, note: "A 600 MHz Cortex-M7 with 1 MB of RAM, a floating-point unit and a lot of peripherals. It is a ball-grid chip, so there are no legs to see." },
    { id: "boot", label: "MKL02 bootloader chip", kind: "chip", x: 9.6, y: 6.9, w: 4, h: 4, note: "A tiny second chip. It loads your program into the main chip when you press the button, so a bad sketch can never lock you out." },
    { id: "xtal", label: "24 MHz crystal", kind: "chip", x: 14.6, y: 11, w: 3.2, h: 2.5, note: "The clock the main chip multiplies up to 600 MHz. A 32.768 kHz crystal beside the chip keeps the real-time clock." },
    { id: "flash", label: "8 MB flash", kind: "chip", x: 32.2, y: 6.4, w: 5.6, h: 5.0, note: "The QSPI flash that holds your program; 64 KB of it is kept for EEPROM emulation and the restore program. Pads on the underside take an extra PSRAM or flash chip, not drawn here." },
    { id: "sd", label: "microSD slot", kind: "port", x: 45.9, y: 3.7, w: 15, h: 10.4, note: "A card slot wired to a fast 4-bit interface: log data or play audio files." },
    { id: "eth", label: "Ethernet pads", kind: "pins", x: 40.5, y: 5.5, w: 4.2, h: 6.6, note: "Six pads (2 × 3) for the MagJack kit. The chip has a 10/100 Ethernet controller; add the jack and a few parts and the board is on the network." },
    { id: "host", label: "USB host pads", kind: "pins", x: 38.8, y: 12.8, w: 6.3, h: 1.2, note: "Five pads in a row (5 V, D−, D+, ID, GND) for a USB host connector, so the board can read a keyboard, a memory stick or a MIDI device." },
    { id: "pins-top", label: "Pins, VIN side", kind: "pins", x: 0, y: 0, w: 60.96, h: 2.54, note: "VIN, GND, 3.3V, pins 23 down to 13, GND, then 41 down to 33. This row has the I2C pins 18 and 19, the analog inputs and the pin-13 LED." },
    { id: "pins-bottom", label: "Pins, GND side", kind: "pins", x: 0, y: 15.24, w: 60.96, h: 2.54, note: "GND, pins 0 to 12 (serial ports, PWM and SPI), 3.3V, then 24 to 32." },
    { id: "usb", label: "Micro-USB", kind: "port", x: -1.3, y: 5.14, w: 5.6, h: 7.5, note: "USB at 480 Mbit/s straight into the main chip: programming, serial, MIDI, audio or keyboard emulation." },
    { id: "program", label: "Program button", kind: "button", x: 5.4, y: 7.3, w: 3.2, h: 3.2, note: "Press once to put the board in programming mode. The loader program on your computer then sends the new sketch." },
    { id: "led", label: "Pin 13 LED", kind: "led", x: 32.7, y: 4.8, w: 1.6, h: 0.8, note: "Orange; on pin 13, which is also SCK. It lights when pin 13 is high." },
    { id: "reg", label: "3.3 V regulator", kind: "power", x: 5.6, y: 11.9, w: 2.8, h: 2.2, note: "Makes 3.3 V from USB or VIN. It gives 250 mA to the 3.3V pins, and the board itself uses part of that." },
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
    { name: "0–41", role: "digital", note: "55 digital pins at 3.3 V, not 5 V tolerant; 35 with PWM. 0–41 are on the side pins, the rest on pads on the back." },
    { name: "A0–A17", role: "analog", note: "18 analog inputs on pins 14–27 and 38–41, 12-bit, 0–3.3 V" },
    { name: "0 / 1, 7 / 8, 14 / 15 …", role: "uart", note: "Eight hardware serial ports" },
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
      { id: "flash", label: "Flash", sub: "8 MB", kind: "ic", col: 2, row: 0, at: "flash", note: "Program storage, read over a fast QSPI bus." },
      { id: "sd", label: "microSD", sub: "SDIO", kind: "connector", col: 3, row: 0, at: "sd", note: "Fast storage for logs and audio." },
      { id: "gpio", label: "GPIO", sub: "55 × 3.3 V", kind: "pin", col: 3, row: 1, at: "pins-bottom", note: "Digital, PWM, 8 UART, 3 SPI, 3 I2C, 3 CAN." },
      { id: "adc", label: "Analog inputs", sub: "A0–A17", kind: "pin", col: 3, row: 2, at: "pins-top", note: "12-bit, 0–3.3 V." },
    ],
    links: [
      { from: "usb", to: "mcu", kind: "data", label: "USB", both: true },
      { from: "usb", to: "reg", kind: "power", label: "5 V" },
      { from: "boot", to: "mcu", kind: "data", label: "program" },
      { from: "reg", to: "mcu", kind: "power", label: "3.3 V" },
      { from: "xtal", to: "mcu", kind: "signal", label: "24 MHz" },
      { from: "mcu", to: "flash", kind: "data", both: true },
      { from: "mcu", to: "sd", kind: "data", both: true },
      { from: "mcu", to: "gpio", kind: "signal", both: true },
      { from: "adc", to: "mcu", kind: "analog" },
    ],
    steps: [
      "USB or VIN is regulated to 3.3 V; the chip itself is not 5 V tolerant.",
      "The i.MX RT1062 talks USB natively and runs your code at 600 MHz from the 8 MB flash.",
      "The MKL02 chip loads each new program when you press the button, so a crashed sketch never locks the board.",
      "55 pins carry GPIO, 18 analog inputs and eight serial ports, and the SD slot gives fast storage.",
    ],
  },
  facts: [
    { label: "Logic", value: "3.3 V (not 5 V tolerant)" },
    { label: "Clock", value: "600 MHz Cortex-M7" },
    { label: "Memory", value: "8 MB flash, 1 MB RAM" },
    { label: "Pins", value: "55 digital (35 PWM), 18 analog" },
    { label: "Extras", value: "microSD, 8 UART, 3 SPI, 3 I2C, 3 CAN (one CAN FD), Ethernet 10/100 with a MagJack kit, USB host" },
    { label: "Size", value: "61 × 17.8 mm" },
  ],
  spec: {
    form: {
      mount: "breadboard",
      pitch: 2.54,
      note: "Two rows of 24 pins, 15.24 mm apart, on the underside: it straddles a breadboard's center gap with room left on each side for jumper wires. The board is 60.96 × 17.78 mm (2.4 × 0.7 inch). There are no mounting holes.",
    },
    power: {
      supply: { min: 3.6, max: 5.5, typ: 5 },
      logic: 3.3,
      tolerant5V: false,
      draw: { idle: 100, active: 100 },
      rails: [{ pin: "3V3", volts: 3.3, maxMa: 250, note: "From the on-board regulator, which also feeds the chip, so some of the 250 mA is already used." }],
      gpio: { maxMa: 4 },
      interface: "NXP i.MX RT1062, Cortex-M7 at 600 MHz, 8 MB flash, 1 MB RAM; microSD, 10/100 Ethernet, USB 2.0 device and host",
      note: "At 600 MHz the board draws about 100 mA. The chip runs the same speed in an empty loop as in a busy one, so slowing the clock is what saves current.",
    },
    sourcing: { mpn: "TEENSY41", maker: "PJRC (chip: NXP MIMXRT1062DVL6A)", lifecycle: "active", usd: [30, 40], note: "Sold with or without header pins attached. Buy the pin version for a breadboard; the Ethernet jack and the extra PSRAM or flash are separate." },
    limits: [
      "The pins are NOT 5 V tolerant. 5 V on any pin can destroy the chip. A 5 V sensor needs a level shifter or a divider.",
      "Each pin is meant to give about 4 mA, 10 mA at most. An LED with a 330 Ω resistor from 3.3 V takes about 4 mA; a motor or a relay needs a driver.",
      "The 3.3V pin gives 250 mA, shared with the board.",
      "At 600 MHz the board draws about 100 mA from USB or VIN. A battery lasts hours, not days.",
      "VIN takes 3.6 V to 5.5 V. Above that the regulator is outside its range. USB power and VIN are joined on the board: do not feed VIN from a second 5 V source while USB is plugged in unless you cut the link on the back first.",
      "The board is 17.78 mm wide, so a breadboard leaves only one free hole beside each pin. Pins 24 to 41 are on the side pins; pads on the back hold the rest.",
      "When space matters, the Teensy 4.0 is the same chip on a 35.6 mm board with 24 pins on the sides, but no SD slot, Ethernet pads or USB host, and 2 MB of flash.",
    ],
    upgrade: [],
    refs: ["https://www.pjrc.com/store/teensy41.html", "https://www.pjrc.com/teensy/techspecs.html", "https://www.nxp.com/products/i.MX-RT1060"],
  },
  animate: { lit: ["led"] },
  experiment: { title: "Audio from an SD card", idea: "Play a WAV file from the SD slot through the audio library, then add a volume knob on A0." },
  tags: ["teensy", "pjrc", "arm", "cortex-m7", "fast", "audio", "3.3v", "board", "mcu", "breadboard", "sd", "ethernet"],
});
