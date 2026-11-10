import { MATERIAL, board, definePart, gnd, name, pin, pinHeader, silk, smd, sot23, vcc, type Solid } from "../../sdk";

const RED = "#b81d24";
const TOP = 1.6;
/** The glass: 31.5 × 44 mm in a black mask, flush with the top of the board. */
const GLASS = { x: 1.5, y: 0.5, w: 31.5, h: 44, d: 2.8 };
const GLASS_TOP = TOP + GLASS.d;
/** The lit area: 28.03 × 35.04 mm (128 × 160 pixels), with the wide border below it where the flex is bonded. */
const PIX = { x: 3.235, y: 3, w: 28.03, h: 35.04 };

const header = pinHeader(8.36, 55.2, 8, { style: "down" });

const holes = [
  { x: 2, y: 56, d: 2 },
  { x: 32.5, y: 56, d: 2 },
];

/** The flex that joins the glass to the board: amber film bonded under the glass's lower edge and folded round it. */
const flex: Solid[] = [
  { kind: "box", id: "flex", x: 8, y: GLASS.y + GLASS.h, w: 18.5, h: 0.5, d: GLASS.d - 0.1, z: TOP, top: "#c9822f", side: "#8a5619", radius: 0.1 },
  { kind: "box", x: 8, y: GLASS.y + GLASS.h, w: 18.5, h: 2.6, d: 0.25, z: TOP, top: "#c9822f", side: "#8a5619", radius: 0.1 },
  { kind: "path", d: "M 9.5 47.2 H 25", color: "#e1b05a", width: 0.25, z: TOP + 0.27 },
];

/** The microSD socket is on the back; its card slot sticks out past the top edge. */
const sdSocket: Solid[] = [
  { kind: "box", id: "sd", x: 9.75, y: -1.5, w: 15, h: 14, d: 1.9, z: -1.9, top: "#c9ccd1", side: "#8f949b", finish: "metal", radius: 0.3 },
  { kind: "box", x: 11.75, y: -1.5, w: 11, h: 1.6, d: 0.3, z: -2.1, top: "#0c0d0f", finish: "plastic" },
];

export default definePart({
  id: "tft-display",
  name: "TFT 1.8″ color (ST7735)",
  aka: ["1.8 inch TFT", "ST7735 display", "SPI color screen"],
  group: "displays",
  rank: 5,
  summary: "A proper color screen, 160 × 128 pixels, with a microSD slot on the back. Gauges, photos, menus, over SPI.",
  size: { w: 34.5, h: 58, d: 4.4 },
  solids: [
    board(34.5, 58, RED, { radius: 0.5, holes }),
    header,
    { kind: "box", id: "glass", x: GLASS.x, y: GLASS.y, w: GLASS.w, h: GLASS.h, d: GLASS.d, z: TOP, top: "#07090d", side: "#15181e", finish: "glass", radius: 0.5 },
    { kind: "box", id: "pixels", x: PIX.x, y: PIX.y, w: PIX.w, h: PIX.h, d: 0.1, z: GLASS_TOP, top: "#27348b", side: "#27348b", fill: "#27348b", glow: "#c4b5fd", radius: 0.2 },
    silk(17.25, 19.5, "Kiungo", 6, "#ffffff", { id: "screen-demo", anchor: "middle", z: GLASS_TOP + 0.2, weight: 800 }),
    silk(17.25, 24.5, "160 × 128", 2.2, "#ede9fe", { id: "screen-demo", anchor: "middle", z: GLASS_TOP + 0.2 }),
    // Five text rows (20 characters) the lab writes to; blank in the library.
    ...[0, 1, 2, 3, 4].map((i) => silk(4.73, 7.5 + i * 4.4, "", 2.2, "#ffffff", { id: `screen:${i}`, z: GLASS_TOP + 0.2, weight: 600 })),
    { kind: "path", d: "M 5.7 29 h 22 M 5.7 32 h 15 M 5.7 35 h 18", color: "#ffffff", width: 0.9, z: GLASS_TOP + 0.2 },
    flex,
    // The 3.3 V regulator and its capacitors beside the header.
    sot23(29, 50.6, { five: true, label: "662K" }),
    smd(25.8, 52, "c", "x"),
    smd(30.6, 52.4, "c", "x"),
    smd(3, 50.2, "r", "y"),
    smd(3, 52.6, "r", "y"),
    sdSocket,
    ...["VCC", "GND", "CS", "RESET", "A0", "SDA", "SCK", "LED"].map((label, i) => silk(8.36 + i * 2.54 + 0.3, 53.3, label, 0.7, MATERIAL.silk, { rotate: -90 })),
    silk(17.25, 49.8, "1.8 TFT SPI", 1.3, MATERIAL.silk, { anchor: "middle", weight: 700 }),
  ],
  features: [
    { id: "pixels", label: "128 × 160 color pixels", kind: "other", x: PIX.x, y: PIX.y, w: PIX.w, h: PIX.h, note: "An LCD with a white LED backlight behind it; 16-bit color (65 k shades) per pixel." },
    { id: "glass", label: "Glass", kind: "other", x: GLASS.x, y: GLASS.y, w: GLASS.w, h: GLASS.h, note: "The ST7735 driver is bonded onto the glass's lower edge, under the black border." },
    { id: "header", label: "VCC, GND, CS, RESET, A0, SDA, SCK, LED", kind: "pins", x: 7.1, y: 52.5, w: 20.3, h: 5.4, note: "SPI: SDA is MOSI, SCK the clock, A0 (DC) picks command or data, LED feeds the backlight." },
    { id: "flex", label: "Flex tail", kind: "connector", x: 8, y: 44.5, w: 18.5, h: 2.6, note: "Joins the glass to the board, folded round the glass's edge. Don't bend it." },
    { id: "ldo", label: "3.3 V regulator", kind: "chip", x: 27.5, y: 49, w: 3, h: 3, note: "Drops VCC to 3.3 V for the panel. It does not shift the logic pins." },
    { id: "sd", label: "microSD slot (on the back)", kind: "connector", x: 9.75, y: 0, w: 15, h: 12.5, note: "Behind the screen, with the slot at the top edge. On the 8-pin version it is not wired to the header." },
    { id: "holes", label: "Mounting holes (×2)", kind: "mechanical", x: 1, y: 55, w: 32.5, h: 2, note: "Two M2 holes at the bottom corners." },
  ],
  pins: [
    vcc("VCC", "3.3 V to 5 V; a regulator on the board makes the 3.3 V the panel needs."),
    gnd("GND", "Ground."),
    pin("CS", "spi", "cs", "SPI chip select, active low.", { label: "CS" }),
    pin("RST", "digital", "drive", "Reset, active low. Printed RESET.", { label: "RST", required: false }),
    pin("DC", "digital", "drive", "Command or data: low means command, high means data. Printed A0.", { label: "A0 (DC)" }),
    pin("SDA", "spi", "mosi", "SPI data in (MOSI). Not I2C, despite the name.", { label: "SDA (MOSI)" }),
    pin("SCK", "spi", "sck", "SPI clock."),
    pin("LED", "power", "opt", "Backlight: 3.3 V for always on, or a PWM pin to dim.", { label: "LED", required: false }),
  ],
  pinAt: name(header, "VCC", "GND", "CS", "RST", "DC", "SDA", "SCK", "LED"),
  circuit: {
    blocks: [
      { id: "spi", label: "SPI", sub: "MOSI, SCK, CS, DC", kind: "pin", col: 0, row: 0, at: "SDA", note: "Hardware SPI pins; software SPI works but crawls." },
      { id: "st", label: "ST7735", sub: "controller, 40 KB RAM", kind: "ic", col: 1, row: 0, at: { x: 17.25, y: 41.5 }, note: "Bonded on the glass's lower edge. Holds the whole frame so your board doesn't have to." },
      { id: "lcd", label: "LCD panel", sub: "128 × 160 × RGB", kind: "display", col: 2, row: 0, at: "pixels", note: "Each pixel is three tiny shutters with color filters." },
      { id: "light", label: "Color image", kind: "world", col: 3, row: 0, note: "What you see." },
      { id: "bl", label: "Backlight LEDs", kind: "actuator", col: 2, row: 1, at: "glass", note: "White LEDs behind the panel. They take about 38 mA, most of the current." },
      { id: "led", label: "LED pin", sub: "3.3 V or PWM", kind: "pin", col: 1, row: 1, at: "LED", note: "Switch or dim the backlight." },
      { id: "vcc", label: "VCC", kind: "power", col: 0, row: 1, at: "VCC", note: "About 40 mA, mostly backlight." },
      { id: "sd", label: "microSD slot", sub: "same SPI bus", kind: "connector", col: 1, row: 2, at: "sd", note: "Images and logs. Only wired to pins on the 11-pin version." },
    ],
    links: [
      { from: "spi", to: "st", kind: "data", label: "commands + pixels" },
      { from: "st", to: "lcd", kind: "signal", label: "drives rows/cols" },
      { from: "lcd", to: "light", kind: "light" },
      { from: "bl", to: "lcd", kind: "light", label: "backlight" },
      { from: "led", to: "bl", kind: "power" },
      { from: "vcc", to: "st", kind: "power" },
      { from: "spi", to: "sd", kind: "data", both: true },
    ],
    steps: [
      "Over SPI your board sends commands and 16-bit pixel data; the ST7735 holds the whole frame in its own memory.",
      "The controller drives the LCD's rows and columns; each pixel is a tiny shutter with red, green and blue filters.",
      "White backlight LEDs shine through from behind; the LED pin switches or dims them.",
      "The logic pins are 3.3 V. A 5 V board needs a level shifter or a resistor in each line.",
    ],
  },
  facts: [
    { label: "Resolution", value: "128 × 160, 65 k colors" },
    { label: "Lit area", value: "1.8 in (28 × 35 mm)" },
    { label: "Controller", value: "ST7735" },
    { label: "Interface", value: "SPI + backlight pin" },
    { label: "Supply", value: "3.3–5 V, ~40 mA" },
    { label: "Extras", value: "microSD slot on the back" },
  ],
  spec: {
    form: {
      mass: 14,
      mount: "jumpers",
      pitch: 2.54,
      holes,
      note: "Plugs into a breadboard or takes jumper wires on its eight-pin header; two M2 holes bolt it behind a panel.",
    },
    power: {
      supply: { min: 3.3, max: 5, typ: 5 },
      logic: 3.3,
      tolerant5V: false,
      draw: { idle: 40, active: 42, peak: 55 },
      interface: "4-wire SPI (mode 0), write-only, plus CS, A0 and RESET; about 15 MHz at most",
    },
    sourcing: { mpn: "ST7735S", maker: "Sitronix (module is generic)", lifecycle: "generic", usd: [3, 7] },
    limits: [
      "The logic pins are 3.3 V. A 5 V Arduino's signals are over the chip's rating unless you shift them or put 1 to 2 kΩ in each line.",
      "The backlight takes 38 to 50 mA, more than ten times the rest of the board.",
      "On the 8-pin version the microSD socket is not wired to any pin, so it cannot be used.",
      "A full frame takes about 40 ms at 8 MHz, so animation tops out near 20 frames a second.",
      "Small and narrow: a 28 × 35 mm TN panel that shifts color when seen off-axis.",
      "Write-only SPI: you cannot read pixels back.",
    ],
    upgrade: [
      { name: "ST7789 1.3 to 1.54 inch 240 × 240 IPS module", why: "An IPS panel with a wide viewing angle and about 2.8 times the pixels, on the same seven-wire SPI at 3.3 V." },
      { name: "Adafruit 1.8 inch TFT breakout (product 358)", why: "Level shifters on every logic pin, so it takes 5 V signals, and a microSD slot that is wired to its own SPI pins." },
    ],
    refs: [
      "https://www.lcdwiki.com/1.8inch_SPI_Module_ST7735S_SKU:MSP1803",
      "https://eckstein-shop.de/18-inch-TFT-LCD-Display-Modul-8Pin-ST7735S-128x160-SPI-for-Arduino-with-SD-Card-Slot-EN",
    ],
  },
  lab: { logic: 5, supply: [3.3, 5], tolerates5V: true },
  animate: { lit: ["pixels"] },
  experiment: { title: "Live gauge", idea: "Draw a round gauge whose needle follows a potentiometer, then log the values to the microSD card." },
  tags: ["tft", "st7735", "spi", "display", "colour", "color", "screen", "lcd", "graphics"],
});
