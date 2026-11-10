import { MATERIAL, PCB_TOP, along, board, chip, definePart, ground, inductor, io, microUsb, rail, silk, smd, sot23, tactileButton, type PinFn, type Solid } from "../../sdk";

const GOLD = MATERIAL.gold;
const SILK = MATERIAL.silk;

/** Pads: 20 per long edge on a 0.1 inch pitch, centered on the 51 mm board. */
const PAD_X0 = (51 - 19 * 2.54) / 2;
const TOP_Y = 1.6;
const BOTTOM_Y = 19.4;
const padX = (i: number) => Math.round((PAD_X0 + i * 2.54) * 1000) / 1000;

/** Pins 40 to 21 along the top, from the USB end; null is a pad the lab doesn't model. */
const TOP_IDS = ["VBUS", "VSYS", "GND2", null, "3V3", null, "GP28", null, "GP27", "GP26", null, "GP22", null, "GP21", "GP20", "GP19", "GP18", null, "GP17", "GP16"];
/** Pins 1 to 20 along the bottom, from the USB end. */
const BOTTOM_IDS = ["GP0", "GP1", "GND1", "GP2", "GP3", "GP4", "GP5", null, "GP6", "GP7", "GP8", "GP9", null, "GP10", "GP11", "GP12", "GP13", null, "GP14", "GP15"];
/** What is printed beside every pad, the unmodeled ones too. */
const TOP_LABELS = ["VBUS", "VSYS", "GND", "EN", "3V3", "VREF", "GP28", "AGND", "GP27", "GP26", "RUN", "GP22", "GND", "GP21", "GP20", "GP19", "GP18", "GND", "GP17", "GP16"];
const BOTTOM_LABELS = ["GP0", "GP1", "GND", "GP2", "GP3", "GP4", "GP5", "GND", "GP6", "GP7", "GP8", "GP9", "GND", "GP10", "GP11", "GP12", "GP13", "GND", "GP14", "GP15"];

/** The board's outline: a rounded rectangle with a half-round castellation cut into the edge at every pad. */
function outline(): string {
  const r = 1;
  const n = 0.6;
  const parts = [`M ${r} 0`];
  for (let i = 0; i < 20; i++) parts.push(`L ${padX(i) - n} 0 A ${n} ${n} 0 0 0 ${padX(i) + n} 0`);
  parts.push(`L ${51 - r} 0 A ${r} ${r} 0 0 1 51 ${r} L 51 ${21 - r} A ${r} ${r} 0 0 1 ${51 - r} 21`);
  for (let i = 19; i >= 0; i--) parts.push(`L ${padX(i) + n} 21 A ${n} ${n} 0 0 0 ${padX(i) - n} 21`);
  parts.push(`L ${r} 21 A ${r} ${r} 0 0 1 0 ${21 - r} L 0 ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`);
  return parts.join(" ");
}

const holes = [
  ...Array.from({ length: 20 }, (_, i) => ({ x: padX(i), y: TOP_Y, d: 1, ring: GOLD })),
  ...Array.from({ length: 20 }, (_, i) => ({ x: padX(i), y: BOTTOM_Y, d: 1, ring: GOLD })),
  // The three debug pads at the far end: SWCLK, GND, SWDIO.
  ...Array.from({ length: 3 }, (_, i) => ({ x: 48.5, y: 8 + i * 2.54, d: 1, ring: GOLD })),
  // Four 2.1 mm mounting holes, 11.4 mm apart across the board.
  { x: 2, y: 4.8, d: 2.1, ring: GOLD },
  { x: 2, y: 16.2, d: 2.1, ring: GOLD },
  { x: 49, y: 4.8, d: 2.1, ring: GOLD },
  { x: 49, y: 16.2, d: 2.1, ring: GOLD },
];

/** The half-round plating on the inside of each castellation, one printed shape per edge. */
const castellations: Solid[] = [
  { kind: "path", d: Array.from({ length: 20 }, (_, i) => `M ${padX(i) - 0.6} 0 A 0.6 0.6 0 0 0 ${padX(i) + 0.6} 0`).join(" "), color: GOLD, width: 0.28 },
  { kind: "path", d: Array.from({ length: 20 }, (_, i) => `M ${padX(i) + 0.6} 21 A 0.6 0.6 0 0 0 ${padX(i) - 0.6} 21`).join(" "), color: GOLD, width: 0.28 },
];

/** Pin names printed along the edges, each reading in from its pad. */
const padLabels: Solid[] = [
  ...TOP_LABELS.map((text, i) => silk(padX(i) + 0.35, 3.1, text, 0.85, SILK, { rotate: 90, anchor: "start" })),
  ...BOTTOM_LABELS.map((text, i) => silk(padX(i) + 0.35, 17.9, text, 0.85, SILK, { rotate: -90, anchor: "start" })),
];

/** The RP2040: a 7 x 7 mm QFN-56 with its marking, pin-1 dot and the bare pads along the edge of the package. */
const rp2040: Solid[] = [
  chip(22, 7.3, 7, 7, "RP2040", 0.85, "rp2040"),
  { kind: "box", x: 22.6, y: 7.2, w: 5.8, h: 0.3, d: 0.3, z: PCB_TOP, top: MATERIAL.tin, finish: "tin", radius: 0.05 },
  { kind: "box", x: 22.6, y: 14.1, w: 5.8, h: 0.3, d: 0.3, z: PCB_TOP, top: MATERIAL.tin, finish: "tin", radius: 0.05 },
  { kind: "box", x: 21.9, y: 7.9, w: 0.3, h: 5.8, d: 0.3, z: PCB_TOP, top: MATERIAL.tin, finish: "tin", radius: 0.05 },
  { kind: "box", x: 28.8, y: 7.9, w: 0.3, h: 5.8, d: 0.3, z: PCB_TOP, top: MATERIAL.tin, finish: "tin", radius: 0.05 },
  { kind: "disc", cx: 22.9, cy: 8.2, r: 0.3, color: "#3b3e44", z: PCB_TOP + 0.86 },
];

/** The QSPI flash (W25Q16, 2 MB) in its tiny 3 x 4 mm package, with the pin-1 dot. */
const flash: Solid[] = [
  chip(31.5, 4.4, 4, 3, undefined, 0.55, "flash-chip"),
  { kind: "disc", cx: 32.1, cy: 5.0, r: 0.22, color: "#3b3e44", z: PCB_TOP + 0.56 },
];

/** The 12 MHz crystal: a ceramic SMD package with four pads. */
const xtal: Solid[] = [
  { kind: "box", x: 30.9, y: 10.2, w: 3.2, h: 2.5, d: 0.8, z: PCB_TOP, top: "#b8bcc2", finish: "metal", radius: 0.2 },
  { kind: "box", x: 31.0, y: 10.3, w: 0.8, h: 2.3, d: 0.84, z: PCB_TOP, top: "#cdd0d4", finish: "tin", radius: 0.1 },
  { kind: "box", x: 33.2, y: 10.3, w: 0.8, h: 2.3, d: 0.84, z: PCB_TOP, top: "#cdd0d4", finish: "tin", radius: 0.1 },
];

/** The buck-boost regulator, its inductor and the capacitors that go with them. */
const regulator: Solid[] = [
  ...sot23(38.6, 10.3, { dir: "x", five: true, label: "6150" }),
  ...inductor(42.8, 7.6, 3.6, "2R2", 1.6),
  ...smd(36.0, 8.4, "c", "y"),
  ...smd(36.0, 11.6, "c", "y"),
  ...smd(41.2, 12.6, "c", "x"),
  ...smd(44.2, 11.6, "c", "y"),
  ...smd(39.6, 13.2, "r", "x"),
  ...smd(35.8, 13.4, "c", "x"),
];

/** The specks that make a real board: bypass capacitors and resistors round the RP2040, the USB pair and the LED's resistor. */
const specks: Solid[] = [
  ...smd(20.3, 7.6, "c", "y"),
  ...smd(20.3, 10.2, "c", "y"),
  ...smd(20.3, 12.8, "r", "y"),
  ...smd(23.0, 5.7, "c", "x"),
  ...smd(25.4, 5.7, "r", "x"),
  ...smd(27.4, 5.7, "c", "x"),
  ...smd(29.8, 8.0, "c", "y"),
  ...smd(29.8, 13.0, "c", "y"),
  ...smd(22.6, 14.9, "c", "x"),
  ...smd(25.2, 14.9, "r", "x"),
  ...smd(27.4, 14.9, "c", "x"),
  ...smd(6.2, 8.4, "r", "y"),
  ...smd(6.2, 12.2, "r", "y"),
  ...smd(10.6, 5.0, "r", "x"),
  ...smd(18.2, 8.4, "r", "y"),
  ...smd(30.1, 6.0, "c", "y"),
  ...smd(36.3, 5.0, "c", "y"),
  ...smd(36.2, 6.8, "r", "y"),
];

const gp = (n: number, side: "left" | "right", bus?: PinFn, label = `GP${n}`) => io(`GP${n}`, label, side, bus ? ["digital", "pwm", bus] : ["digital", "pwm"]);
const adc = (n: number, ch: number) => io(`GP${n}`, `GP${n} ADC${ch}`, "right", ["analog", "digital", "pwm"]);

export default definePart({
  id: "raspberry-pi-pico",
  name: "Raspberry Pi Pico",
  aka: ["Pico", "RP2040 board", "Pi Pico"],
  group: "boards",
  rank: 3,
  summary: "A small, cheap RP2040 board with two cores, 26 GPIO and programmable I/O that can bit-bang almost any protocol. Programs in C or MicroPython, and shows up as a USB drive to flash.",
  size: { w: 51, h: 21, d: 6.6 },
  solids: [
    board(51, 21, "#1e7b3a", { outline: outline(), holes }),
    castellations,
    microUsb(-1.3, 7.75),
    rp2040,
    flash,
    xtal,
    regulator,
    specks,
    // The white BOOTSEL button.
    tactileButton(14, 8, 3.5, "bootsel", PCB_TOP, "#f3f1ea"),
    // The only LED: green, on GP25.
    { kind: "box", id: "led", x: 8, y: 5, w: 1.6, h: 0.8, d: 0.6, z: PCB_TOP, top: "#1f6b3d", side: "#14452a", glow: "#3ddc84", radius: 0.2, finish: "plastic" },
    padLabels,
    silk(15.75, 13.4, "BOOTSEL", 0.9, SILK, { anchor: "middle" }),
    silk(46.4, 6.3, "DEBUG", 0.8, SILK, { anchor: "middle" }),
    silk(2.4, 2.8, "1", 0.8, SILK),
    silk(46.2, 2.8, "40", 0.8, SILK),
  ],
  features: [
    { id: "gpio-top", label: "GPIO pads, top edge", kind: "pins", x: 0.1, y: 0.4, w: 50.8, h: 2.4, note: "Pins 40 to 21: VBUS, VSYS, 3V3, the three analog inputs (GP26–28), RUN and GP16–22, with GNDs between. Solder headers on for a breadboard." },
    { id: "gpio-bottom", label: "GPIO pads, bottom edge", kind: "pins", x: 0.1, y: 18.2, w: 50.8, h: 2.4, note: "Pins 1 to 20: GP0–GP15 from the USB end, with GND every fifth pad." },
    { id: "usb", label: "Micro-USB", kind: "port", x: -1.3, y: 7.75, w: 7.5, h: 5.5, note: "Power and programming. With BOOTSEL held it appears as a drive you drop firmware onto." },
    { id: "rp2040", label: "RP2040", kind: "chip", x: 22, y: 7.3, w: 7, h: 7, note: "Two Cortex-M0+ cores at 133 MHz, 264 KB RAM and 8 programmable I/O state machines." },
    { id: "flash", label: "2 MB flash", kind: "chip", x: 31.5, y: 4.4, w: 4, h: 3, note: "Program storage; the RP2040 has none of its own." },
    { id: "crystal", label: "12 MHz crystal", kind: "chip", x: 30.9, y: 10.2, w: 3.2, h: 2.5, note: "The clock the RP2040 builds its 125 MHz from. It also times USB." },
    { id: "regulator", label: "Buck-boost regulator", kind: "power", x: 35.4, y: 5.4, w: 10.2, h: 8.6, note: "Turns anything from 1.8 V to 5.5 V on VSYS into a steady 3.3 V, with the small coil beside it. It gives the 3V3 pin up to 300 mA." },
    { id: "bootsel", label: "BOOTSEL button", kind: "button", x: 14, y: 8, w: 3.5, h: 3.5, note: "Hold while plugging in USB to enter the USB mass-storage bootloader." },
    { id: "led", label: "Onboard LED", kind: "led", x: 8, y: 5, w: 1.6, h: 0.8, note: "Green, wired to GP25. The Pico has no power LED, so this is the one Blink flashes." },
    { id: "debug", label: "SWD debug pads", kind: "pins", x: 47.5, y: 7, w: 2, h: 7.6, note: "SWCLK, GND and SWDIO for a hardware debugger." },
  ],
  pins: [
    rail("VBUS", "VBUS", 5, "left", { note: "5 V straight from USB, only while a cable is plugged in" }),
    rail("VSYS", "VSYS", 5, "left", { accepts: [1.8, 5.5], note: "The board's power input, 1.8–5.5 V. About 4.7 V out when USB is plugged in." }),
    rail("3V3", "3V3 OUT", 3.3, "left", { note: "3.3 V out, up to 300 mA" }),
    ground("GND1", "left"),
    gp(0, "left", "tx", "GP0 TX"),
    gp(1, "left", "rx", "GP1 RX"),
    gp(2, "left"),
    gp(3, "left"),
    gp(4, "left", "sda", "GP4 SDA"),
    gp(5, "left", "scl", "GP5 SCL"),
    gp(6, "left"),
    gp(7, "left"),
    gp(8, "left"),
    gp(9, "left"),
    gp(10, "left"),
    gp(11, "left"),
    ground("GND2", "right"),
    adc(28, 2),
    adc(27, 1),
    adc(26, 0),
    gp(22, "right"),
    gp(21, "right"),
    gp(20, "right"),
    gp(19, "right", "mosi", "GP19 MOSI"),
    gp(18, "right", "sck", "GP18 SCK"),
    gp(17, "right", "cs", "GP17 CS"),
    gp(16, "right", "miso", "GP16 MISO"),
    gp(15, "right"),
    gp(14, "right"),
    gp(13, "right"),
    gp(12, "right"),
  ],
  pinAt: { ...along(TOP_IDS, PAD_X0, TOP_Y), ...along(BOTTOM_IDS, PAD_X0, BOTTOM_Y) },
  pinTable: [
    { name: "GP0–GP22", role: "digital", note: "3.3 V GPIO; any pin can do PWM, and I2C, SPI and UART are assigned in software" },
    { name: "GP26–GP28", role: "analog", note: "12-bit ADC inputs, 0–3.3 V" },
    { name: "GP25", role: "digital", note: "The onboard LED" },
    { name: "VBUS", role: "power", note: "5 V straight from USB" },
    { name: "VSYS", role: "power", note: "Main input, 1.8–5.5 V; power the board here from batteries" },
    { name: "3V3", role: "power", note: "3.3 V out from the onboard regulator, 300 mA" },
    { name: "GND", role: "ground", note: "Eight ground pads" },
    { name: "RUN", role: "other", note: "Pull low to reset" },
    { name: "SWCLK / SWDIO", role: "data", note: "Debug port" },
  ],
  lab: { controller: true, logic: 3.3, tolerates5V: false },
  canvas: { usb: { x: -1.3, y: 10.5, z: 3, from: "left" }, pinZ: 1.6 },
  circuit: {
    blocks: [
      { id: "usb", label: "Micro-USB", sub: "5 V, USB 1.1", kind: "connector", col: 0, row: 0, at: "usb", note: "The RP2040 speaks USB itself, so there is no bridge chip." },
      { id: "reg", label: "Buck-boost", sub: "3.3 V", kind: "regulator", col: 1, row: 1, at: "regulator", note: "Makes 3.3 V from anything between 1.8 and 5.5 V on VSYS." },
      { id: "xtal", label: "Crystal", sub: "12 MHz", kind: "passive", col: 1, row: 2, at: "crystal", note: "The clock. The chip multiplies it up to 125 MHz." },
      { id: "mcu", label: "RP2040", sub: "2 × M0+, 133 MHz", kind: "mcu", col: 2, row: 0, at: "rp2040", note: "Runs your program from external flash, with eight PIO state machines for custom protocols." },
      { id: "flash", label: "Flash", sub: "2 MB QSPI", kind: "ic", col: 2, row: 2, at: "flash", note: "Holds the program; the BOOTSEL button makes the chip boot from USB instead." },
      { id: "gpio", label: "GPIO pads", sub: "26 × 3.3 V", kind: "pin", col: 3, row: 0, at: "gpio-bottom", note: "Castellated so the board can be soldered flat onto another one." },
      { id: "adc", label: "ADC", sub: "GP26–28", kind: "pin", col: 3, row: 1, at: "GP26", note: "Three 12-bit analog inputs." },
      { id: "pwr", label: "Power pads", sub: "VSYS, VBUS, 3V3", kind: "power", col: 3, row: 2, at: "VSYS", note: "Feed the board or take 3.3 V from it." },
    ],
    links: [
      { from: "usb", to: "mcu", kind: "data", label: "USB", both: true },
      { from: "usb", to: "reg", kind: "power", label: "VBUS" },
      { from: "reg", to: "mcu", kind: "power", label: "3.3 V" },
      { from: "reg", to: "pwr", kind: "power" },
      { from: "xtal", to: "mcu", kind: "signal", label: "12 MHz" },
      { from: "mcu", to: "flash", kind: "data", both: true },
      { from: "mcu", to: "gpio", kind: "signal", both: true },
      { from: "adc", to: "mcu", kind: "analog" },
    ],
    steps: [
      "5 V from USB (VBUS) or anything from 1.8–5.5 V on VSYS feeds a buck-boost regulator that makes a steady 3.3 V.",
      "The RP2040 has USB built in, so the computer talks to it directly; holding BOOTSEL at power-up makes it appear as a drive.",
      "The chip executes code straight from the 2 MB flash next to it, on two Cortex-M0+ cores, timed by the 12 MHz crystal.",
      "The castellated pads carry 26 GPIO at 3.3 V, three of them analog, plus power and debug.",
    ],
  },
  facts: [
    { label: "Logic", value: "3.3 V" },
    { label: "Clock", value: "133 MHz, 2 cores" },
    { label: "Memory", value: "2 MB flash, 264 KB RAM" },
    { label: "Pins", value: "26 GPIO, 3 analog" },
    { label: "Languages", value: "C/C++, MicroPython" },
    { label: "Size", value: "51 × 21 mm" },
  ],
  spec: {
    form: {
      mass: 3,
      mount: "solder",
      pitch: 2.54,
      holes: [
        { x: 2, y: 4.8, d: 2.1 },
        { x: 2, y: 16.2, d: 2.1 },
        { x: 49, y: 4.8, d: 2.1 },
        { x: 49, y: 16.2, d: 2.1 },
      ],
      note: "Comes bare, with castellated pads: solder on 20-pin headers to use it on a breadboard, or solder it flat onto another board. The Pico H has the headers fitted.",
    },
    power: {
      supply: { min: 1.8, max: 5.5, typ: 5 },
      logic: 3.3,
      tolerant5V: false,
      draw: { idle: 18, active: 25 },
      rails: [
        { pin: "VBUS", volts: 5, maxMa: 500, note: "Raw USB 5 V, limited by what the computer's port gives. There is no fuse on the board." },
        { pin: "3V3", volts: 3.3, maxMa: 300, note: "The on-board buck-boost regulator. The RP2040 takes about 25 mA of it, so keep outside loads well under 300 mA." },
      ],
      gpio: { maxMa: 12, totalMa: 50 },
      interface: "RP2040: 2 × Cortex-M0+ at 133 MHz, 264 KB RAM, 2 MB QSPI flash; 2 UART, 2 SPI, 2 I2C, 16 PWM, 8 PIO state machines, USB 1.1",
    },
    sourcing: { mpn: "SC0915", maker: "Raspberry Pi Ltd", lifecycle: "active", usd: [4, 6], note: "The chip is the RP2040. The Pico H is the same board with headers fitted, and the Pico WH adds the radio too." },
    limits: [
      "3.3 V pins only: 5 V on a GPIO can damage the RP2040. Put a divider or a level shifter on 5 V signals.",
      "Each pin gives about 12 mA at most and all pins together 50 mA: use a transistor or a driver for LED strips, relays and motors.",
      "The 3V3 pin gives 300 mA at most, shared with the chip itself.",
      "Only three analog inputs (GP26–GP28), 12-bit on paper but noisy, with an offset of a few counts. Share the 3.3 V rail with a busy load and the readings wander.",
      "No Wi-Fi or Bluetooth: the Pico W adds them. The Pico has no power LED, only the one on GP25.",
      "VSYS has no protection: if you feed it from a battery while USB is plugged in, put a Schottky diode in series with the battery.",
    ],
    upgrade: [
      { name: "Raspberry Pi Pico 2 (RP2350)", why: "The same size and pinout with a 150 MHz dual-core chip, 520 KB RAM and 4 MB flash, for about the same price. Code for the Pico mostly runs unchanged." },
      { name: "Raspberry Pi Pico W", why: "The same RP2040 with 2.4 GHz Wi-Fi and Bluetooth 5.2 added, for about $2 more. The LED moves onto the radio chip." },
      { part: "esp32", name: "ESP32 DevKit", why: "When the project needs Wi-Fi and Bluetooth: two cores at 240 MHz, 520 KB RAM and 34 GPIO, with 18 analog inputs." },
    ],
    refs: [
      "https://datasheets.raspberrypi.com/pico/pico-datasheet.pdf",
      "https://datasheets.raspberrypi.com/rp2040/rp2040-datasheet.pdf",
      "https://datasheets.raspberrypi.com/pico/hardware-design-with-rp2040.pdf",
    ],
  },
  animate: { lit: ["led"] },
  experiment: { title: "Blink in MicroPython", idea: "Toggle GP25 from the REPL, then read the onboard temperature sensor on ADC channel 4." },
  tags: ["pico", "rp2040", "raspberry pi", "micropython", "3.3v", "board", "mcu"],
});
