import { MATERIAL, PCB_TOP, board, definePart, ground, io, jumperCap, microUsb, name, pinHeader, rail, silk, smd, sot23, tactileButton, type PinFn, type Solid } from "../../sdk";

const SILK = MATERIAL.silk;
const BLUE = "#1d50a8";

/** Two rows of 20 holes, 17.78 mm apart (0.7 inch), centered on the 53 x 22.5 mm board. */
const X0 = (53 - 19 * 2.54) / 2;
const ROW_A = (22.5 - 7 * 2.54) / 2;
const ROW_B = ROW_A + 7 * 2.54;

/** Seen with the USB socket on the left: the row that starts G, G, 3.3, R along the top. */
const rowA = pinHeader(X0, ROW_A, 20, { style: "down" });
/** and the row that starts B12, B13 … along the bottom. */
const rowB = pinHeader(X0, ROW_B, 20, { style: "down" });

const LABELS_A = ["G", "G", "3.3", "R", "B11", "B10", "B1", "B0", "A7", "A6", "A5", "A4", "A3", "A2", "A1", "A0", "C15", "C14", "C13", "VB"];
const LABELS_B = ["B12", "B13", "B14", "B15", "A8", "A9", "A10", "A11", "A12", "A15", "B3", "B4", "B5", "B6", "B7", "B8", "B9", "5V", "G", "3.3"];

/** The boot-mode header: two columns (BOOT0, BOOT1) of three pins, each with a yellow jumper. */
const bootHeader = pinHeader(9.5, 12.2, 3, { dir: "x", rows: 2, style: "up" });
/** The four-pin SWD header on the far end: 3.3 V, SWDIO, SWCLK, GND. */
const swd = pinHeader(50.4, 11.25 - 3.81, 4, { dir: "y", style: "up" });

const CHIP = { x: 26.5, y: 11.25 };

/**
 * The STM32F103 in LQFP-48, turned 45 degrees as on the real board: a 7 mm body
 * with its legs on all four sides. Each side's strip of legs is placed by hand
 * round the turned center.
 */
function mcu(): Solid[] {
  const k = 4 / Math.SQRT2;
  const strip = (dx: number, dy: number, along: "x" | "y"): Solid => ({ kind: "box", x: CHIP.x + dx - (along === "x" ? 3.4 : 0.55), y: CHIP.y + dy - (along === "x" ? 0.55 : 3.4), w: along === "x" ? 6.8 : 1.1, h: along === "x" ? 1.1 : 6.8, d: 0.3, z: PCB_TOP, top: MATERIAL.tin, finish: "tin", radius: 0.1, turn: 45 });
  return [
    strip(k, -k, "x"),
    strip(-k, k, "x"),
    strip(-k, -k, "y"),
    strip(k, k, "y"),
    { kind: "box", id: "mcu", x: CHIP.x - 3.5, y: CHIP.y - 3.5, w: 7, h: 7, d: 1.4, z: PCB_TOP + 0.1, top: "#1b1c1f", side: MATERIAL.icSide, finish: "epoxy", radius: 0.3, turn: 45 },
    { kind: "disc", cx: CHIP.x - 1.8, cy: CHIP.y, r: 0.4, color: "#3b3e44", z: PCB_TOP + 1.51 },
    silk(CHIP.x + 0.3, CHIP.y - 0.9, "STM32", 1, "#9aa0a6", { rotate: 45, anchor: "middle", z: PCB_TOP + 1.52 }),
    silk(CHIP.x - 0.4, CHIP.y + 0.2, "F103C8T6", 0.8, "#9aa0a6", { rotate: 45, anchor: "middle", z: PCB_TOP + 1.52 }),
  ];
}

/** The 8 MHz crystal in its steel can (HC-49S), lying across the board. */
const crystal8: Solid = { kind: "box", id: "crystal", x: 31.5, y: 8.9, w: 11, h: 4.65, d: 3.5, z: PCB_TOP, top: "#d4d7dc", side: MATERIAL.steelSide, fill: MATERIAL.steel, radius: 2.3, finish: "metal", turn: 90, label: { text: "8.000", size: 1.2, color: "#5d636b" } };

/** The 32.768 kHz watch crystal for the clock, a small SMD can. */
const crystal32: Solid[] = [
  { kind: "box", x: 29.9, y: 15.2, w: 3.2, h: 1.5, d: 0.9, z: PCB_TOP, top: "#bfc3c9", finish: "metal", radius: 0.2 },
  { kind: "box", x: 29.8, y: 15.2, w: 0.7, h: 1.5, d: 0.95, z: PCB_TOP, top: "#cdd0d4", finish: "tin", radius: 0.1 },
  { kind: "box", x: 32.5, y: 15.2, w: 0.7, h: 1.5, d: 0.95, z: PCB_TOP, top: "#cdd0d4", finish: "tin", radius: 0.1 },
];

/** The yellow jumpers in their usual place: both BOOT pins tied low, so the board runs your program. */
const jumpers = [12.2, 14.74].map((y) => jumperCap(13.31, y, "x", "#f2c200"));

const specks: Solid[] = [
  ...smd(5.3, 6.2, "r", "y"),
  ...smd(5.3, 16.9, "r", "y"),
  ...smd(17.7, 8.2, "c", "y"),
  ...smd(17.7, 14.1, "c", "y"),
  ...smd(33.4, 7.0, "c", "y"),
  ...smd(33.4, 14.6, "c", "y"),
  ...smd(40.2, 7.6, "c", "y"),
  ...smd(40.2, 14.2, "r", "y"),
  ...smd(28.4, 16.9, "c", "x"),
  ...smd(43.6, 6.3, "r", "x"),
  ...smd(43.6, 16.2, "r", "x"),
  ...smd(46.2, 12.8, "c", "y"),
];

const labels: Solid[] = [
  ...LABELS_A.map((text, i) => silk(X0 + i * 2.54 + 0.3, 4.1, text, 0.8, SILK, { rotate: 90, anchor: "start" })),
  ...LABELS_B.map((text, i) => silk(X0 + i * 2.54 + 0.3, 18.3, text, 0.8, SILK, { rotate: -90, anchor: "start" })),
  silk(8.0, 12.55, "BOOT0", 0.8, SILK, { anchor: "end" }),
  silk(8.0, 15.1, "BOOT1", 0.8, SILK, { anchor: "end" }),
  silk(7.0, 5.6, "RESET", 0.8, SILK),
  ...["3V3", "DIO", "CLK", "GND"].map((text, i) => silk(48.5, 7.75 + i * 2.54, text, 0.8, SILK, { anchor: "end" })),
];

const gpio = (id: string, label: string, side: "left" | "right", fns: PinFn[]) => io(id, label, side, fns);
const adc = (id: string, side: "left" | "right" = "left", extra: PinFn[] = ["pwm"]) => io(id, id, side, ["analog", "digital", ...extra]);

export default definePart({
  id: "stm32",
  name: "STM32 Blue Pill",
  aka: ["Blue Pill", "STM32F103C8T6 board", "STM32F103 board"],
  group: "boards",
  rank: 7,
  summary: "A tiny ARM Cortex-M3 board at 72 MHz with real hardware timers, three serial ports and some 5 V-tolerant pins, for when an Arduino is too slow and an ESP32 is too much.",
  size: { w: 53, h: 22.5, d: 10.1 },
  solids: [
    board(53, 22.5, BLUE, { radius: 0.5 }),
    rowA,
    rowB,
    microUsb(-1.5, 8.5),
    mcu(),
    crystal8,
    crystal32,
    bootHeader,
    jumpers,
    swd,
    tactileButton(7, 6.2, 3.5, "reset"),
    { kind: "box", id: "led-pwr", x: 42.0, y: 6.3, w: 1.6, h: 0.8, d: 0.6, z: PCB_TOP, top: "#7a1f1f", side: "#521414", glow: "#ff4d4d", radius: 0.2, finish: "plastic" },
    { kind: "box", id: "led-pc13", x: 42.0, y: 16.2, w: 1.6, h: 0.8, d: 0.6, z: PCB_TOP, top: "#1f6b3d", side: "#14452a", glow: "#3ddc84", radius: 0.2, finish: "plastic" },
    sot23(44.5, 11.25, { dir: "x", label: "662K" }),
    specks,
    labels,
  ],
  features: [
    { id: "mcu", label: "STM32F103C8T6", kind: "chip", x: 20.1, y: 4.85, w: 12.8, h: 12.8, note: "72 MHz Cortex-M3, 64 KB flash (most chips are good for 128 KB), 20 KB RAM, with hardware timers, three UARTs, two SPI, two I2C and a 12-bit ADC." },
    { id: "top-pins", label: "Pins, top row", kind: "pins", x: X0 - 1.27, y: ROW_A - 1.27, w: 50.8, h: 2.54, note: "G, G, 3.3, R (reset), B11, B10, B1, B0, A7 down to A0, C15, C14, C13 and VB (battery for the clock)." },
    { id: "bottom-pins", label: "Pins, bottom row", kind: "pins", x: X0 - 1.27, y: ROW_B - 1.27, w: 50.8, h: 2.54, note: "B12 to B15, A8 to A12, A15, B3 to B9, then 5V, G and 3.3." },
    { id: "usb", label: "Micro-USB", kind: "port", x: -1.5, y: 8.5, w: 7.5, h: 5.5, note: "5 V power and, with the right bootloader, programming." },
    { id: "boot", label: "BOOT0 / BOOT1 jumpers", kind: "connector", x: 8.2, y: 10.9, w: 7.6, h: 5.1, note: "Both on the 0 side: the board runs your program. Move BOOT0 to 1 and reset to load code through the serial bootloader." },
    { id: "swd", label: "SWD header", kind: "pins", x: 49.1, y: 6.2, w: 2.6, h: 10.2, note: "3.3 V, SWDIO, SWCLK, GND for an ST-Link programmer, the easiest way to flash it." },
    { id: "reset", label: "Reset button", kind: "button", x: 7, y: 6.2, w: 3.5, h: 3.5, note: "Restarts the program from the top." },
    { id: "crystal", label: "8 MHz crystal", kind: "chip", x: 34.7, y: 5.75, w: 4.7, h: 11, note: "The clock. The chip multiplies 8 MHz up to 72 MHz. A small 32.768 kHz crystal beside the chip keeps time for the real-time clock." },
    { id: "regulator", label: "3.3 V regulator", kind: "power", x: 43, y: 10.6, w: 3, h: 1.4, note: "A small linear regulator that turns USB's 5 V into 3.3 V. Clones differ: it gives 100 mA to 300 mA." },
    { id: "led-pc13", label: "PC13 LED", kind: "led", x: 42, y: 16.2, w: 1.6, h: 0.8, note: "Green; the user LED, lit when PC13 is low." },
    { id: "led-pwr", label: "Power LED", kind: "led", x: 42, y: 6.3, w: 1.6, h: 0.8, note: "Red; on with power." },
  ],
  pins: [
    rail("5V", "5V", 5, "left", { accepts: [4.5, 5.5], note: "5 V from USB, or feed 4.5–5.5 V here; it feeds the 3.3 V regulator" }),
    rail("3V3", "3.3", 3.3, "left"),
    ground("GND1", "left", "G"),
    adc("PA0"),
    adc("PA1"),
    adc("PA2"),
    adc("PA3"),
    io("PA4", "PA4 CS", "left", ["analog", "digital", "cs"]),
    io("PA5", "PA5 SCK", "left", ["analog", "digital", "sck"]),
    io("PA6", "PA6 MISO", "left", ["analog", "digital", "pwm", "miso"]),
    io("PA7", "PA7 MOSI", "left", ["analog", "digital", "pwm", "mosi"]),
    adc("PB0"),
    adc("PB1"),
    gpio("PB10", "PB10", "left", ["digital"]),
    gpio("PB11", "PB11", "left", ["digital"]),
    ground("GND2", "right", "G"),
    io("PC13", "PC13 LED", "right", ["digital", "led"], { note: "Built-in LED, active low" }),
    io("PB6", "PB6 SCL", "right", ["digital", "pwm", "scl"]),
    io("PB7", "PB7 SDA", "right", ["digital", "pwm", "sda"]),
    io("PB8", "PB8", "right", ["digital", "pwm"]),
    io("PB9", "PB9", "right", ["digital", "pwm"]),
    io("PA8", "PA8", "right", ["digital", "pwm"]),
    io("PA9", "PA9 TX", "right", ["digital", "pwm", "tx"]),
    io("PA10", "PA10 RX", "right", ["digital", "pwm", "rx"]),
    gpio("PA15", "PA15", "right", ["digital"]),
    gpio("PB12", "PB12", "right", ["digital"]),
    gpio("PB13", "PB13", "right", ["digital"]),
    gpio("PB14", "PB14", "right", ["digital"]),
    gpio("PB15", "PB15", "right", ["digital"]),
  ],
  pinAt: {
    ...name(rowA, "GND1", null, "3V3", null, "PB11", "PB10", "PB1", "PB0", "PA7", "PA6", "PA5", "PA4", "PA3", "PA2", "PA1", "PA0", null, null, "PC13", null),
    ...name(rowB, "PB12", "PB13", "PB14", "PB15", "PA8", "PA9", "PA10", null, null, "PA15", null, null, null, "PB6", "PB7", "PB8", "PB9", "5V", "GND2", null),
  },
  pinTable: [
    { name: "PA0–PA15, PB0–PB15", role: "digital", note: "3.3 V GPIO; many are 5 V tolerant as inputs (check the datasheet per pin)" },
    { name: "PA0–PA7, PB0–PB1", role: "analog", note: "12-bit ADC inputs, 0–3.3 V" },
    { name: "PC13", role: "digital", note: "Onboard LED; weak output, don't load it" },
    { name: "PA9 / PA10", role: "uart", note: "USART1 TX and RX" },
    { name: "PB6 / PB7", role: "i2c", note: "I2C1 SCL and SDA" },
    { name: "PA5 / PA6 / PA7", role: "spi", note: "SPI1 SCK, MISO, MOSI" },
    { name: "5V", role: "power", note: "From USB; feeds the 3.3 V regulator" },
    { name: "3.3", role: "power", note: "3.3 V out" },
    { name: "G", role: "ground", note: "Ground" },
    { name: "VB", role: "power", note: "Battery backup for the clock" },
  ],
  lab: { controller: true, logic: 3.3, tolerates5V: "some" },
  circuit: {
    blocks: [
      { id: "usb", label: "Micro-USB", sub: "5 V", kind: "connector", col: 0, row: 0, at: "usb", note: "Power, and USB straight into the chip." },
      { id: "swd", label: "SWD", sub: "ST-Link", kind: "connector", col: 0, row: 2, at: "swd", note: "The debug port most people program it through." },
      { id: "reg", label: "3.3 V regulator", kind: "regulator", col: 1, row: 1, at: "regulator", note: "Low-current regulator; power big loads elsewhere." },
      { id: "xtal", label: "Crystals", sub: "8 MHz, 32.768 kHz", kind: "passive", col: 1, row: 2, at: "crystal", note: "The 8 MHz crystal is multiplied up to 72 MHz; the small one keeps the clock." },
      { id: "mcu", label: "STM32F103", sub: "72 MHz, M3", kind: "mcu", col: 2, row: 1, at: "mcu", note: "An ARM chip with proper timers and DMA." },
      { id: "gpio", label: "GPIO", sub: "32 pins", kind: "pin", col: 3, row: 0, at: "top-pins", note: "3.3 V logic, many 5 V tolerant." },
      { id: "periph", label: "Peripherals", sub: "UART, SPI, I2C, CAN", kind: "pin", col: 3, row: 1, at: "bottom-pins", note: "Three UARTs, two SPI, two I2C, CAN and USB in hardware." },
      { id: "adc", label: "ADC", sub: "10 × 12-bit", kind: "pin", col: 3, row: 2, at: "PA0", note: "Up to 1 million samples a second." },
    ],
    links: [
      { from: "usb", to: "reg", kind: "power", label: "5 V" },
      { from: "usb", to: "mcu", kind: "data", label: "USB", both: true },
      { from: "swd", to: "mcu", kind: "data", label: "SWD", both: true },
      { from: "reg", to: "mcu", kind: "power", label: "3.3 V" },
      { from: "xtal", to: "mcu", kind: "signal", label: "clock" },
      { from: "mcu", to: "gpio", kind: "signal", both: true },
      { from: "mcu", to: "periph", kind: "data", both: true },
      { from: "adc", to: "mcu", kind: "analog" },
    ],
    steps: [
      "5 V from USB is regulated to 3.3 V for the chip.",
      "Programs go in through the SWD header with an ST-Link, or over serial with BOOT0 high.",
      "The Cortex-M3 runs at 72 MHz and exposes 32 GPIO, a 12-bit ADC and hardware UART, SPI, I2C and CAN.",
    ],
  },
  facts: [
    { label: "Logic", value: "3.3 V (some pins 5 V tolerant)" },
    { label: "Clock", value: "72 MHz Cortex-M3" },
    { label: "Memory", value: "64 KB flash, 20 KB RAM" },
    { label: "Pins", value: "32 GPIO, 10 analog" },
    { label: "Programming", value: "ST-Link (SWD) or serial bootloader" },
    { label: "Size", value: "53 × 22.5 mm" },
  ],
  spec: {
    form: {
      mass: 8,
      mount: "breadboard",
      pitch: 2.54,
      note: "Headers come soldered on, pins down, so it plugs into a breadboard. Rows are 17.78 mm apart: it leaves two free columns each side on a standard breadboard. No mounting holes.",
    },
    power: {
      supply: { min: 4.5, max: 5.5, typ: 5 },
      logic: 3.3,
      tolerant5V: false,
      draw: { idle: 10, active: 36, peak: 50 },
      rails: [
        { pin: "5V", volts: 5, maxMa: 500, note: "Straight from USB, so the computer's port is the limit. Most clones have no fuse." },
        { pin: "3V3", volts: 3.3, maxMa: 100, note: "The small regulator, shared with the chip itself. 100 mA is the cautious figure: some clones carry a regulator good for 300 mA, others for less." },
      ],
      gpio: { maxMa: 8, totalMa: 150 },
      interface: "STM32F103C8T6: Cortex-M3 at 72 MHz, 64 KB flash (rated), 20 KB RAM; 3 USART, 2 SPI, 2 I2C, USB full speed, CAN, 2 × 12-bit ADC",
    },
    sourcing: { mpn: "STM32F103C8T6", maker: "STMicroelectronics", lifecycle: "generic", usd: [2, 6], note: "The board is a generic design made by many; the chip is ST's. Look for the chip marking: fakes exist." },
    limits: [
      "Many clones fit a 10 kΩ resistor on the USB D+ line where a 1.5 kΩ one belongs, and the board never shows up on USB. Swap the resistor (R10) before you blame the code.",
      "Fake chips are common: some carry only 64 KB of flash, or a different chip with a re-marked top. Check the ID with an ST-Link.",
      "Only some pins are 5 V tolerant (the ones marked FT in the datasheet, including PB6–PB15 and PA8–PA15 but not the analog PA0–PA7 or PB0–PB1). 5 V on the others can destroy them.",
      "Each pin should give no more than about 8 mA; 25 mA is the absolute maximum. PC13, PC14 and PC15 can sink only 3 mA, must not source current (never drive an LED from them) and switch no faster than 2 MHz.",
      "The 3.3 V pin gives 100 mA to 300 mA depending on the clone: plan for 100 mA.",
      "It needs an ST-Link or a USB-serial adapter for its first upload, since the USB bootloader is not fitted.",
    ],
    upgrade: [
      { part: "raspberry-pi-pico", name: "Raspberry Pi Pico", why: "Easier to program: it shows up as a USB drive and runs MicroPython, with no ST-Link needed. Two cores at 133 MHz, 264 KB RAM and 2 MB flash against 72 MHz, 20 KB and 64 KB, and it costs about $4." },
      { part: "teensy", name: "Teensy 4.1", why: "Far faster: 600 MHz Cortex-M7 with 1 MB RAM and 8 MB flash, over eight times the clock. About $32." },
      { name: "Black Pill F411", why: "The same shape with an STM32F411 at 100 MHz, a floating-point unit, 128 KB RAM, 512 KB flash and a USB-C socket that loads code by itself, for about $6." },
    ],
    refs: [
      "https://www.st.com/resource/en/datasheet/stm32f103c8.pdf",
      "https://www.st.com/resource/en/reference_manual/rm0008-stm32f101xx-stm32f102xx-stm32f103xx-stm32f105xx-and-stm32f107xx-advanced-armbased-32bit-mcus-stmicroelectronics.pdf",
      "https://stm32-base.org/boards/STM32F103C8T6-Blue-Pill.html",
    ],
  },
  animate: { lit: ["led-pwr", "led-pc13"] },
  experiment: { title: "Fast analog capture", idea: "Sample A0 at 100 kHz into a buffer and stream it over serial." },
  tags: ["stm32", "blue pill", "arm", "cortex-m3", "3.3v", "board", "mcu"],
});
