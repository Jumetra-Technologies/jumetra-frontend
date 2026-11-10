import { MATERIAL, PCB_TOP, board, definePart, gnd, name, pin, pinHeader, polygonPath, silk, smd, vcc, type Solid } from "../../sdk";

/** The display block: 30 × 14 mm, pale body on short legs, digits 9.14 mm tall (0.36 inch). */
const BODY = { x: 8, y: 5, w: 30, h: 14, z: 3, d: 6.5 };
const FACE = BODY.z + BODY.d;
const CY = BODY.y + BODY.h / 2;
const DIGIT_X = [12.3, 18.9, 27.1, 33.7];

const UNLIT = "#4a1515";
const LIT = "#ff2a1a";

/** A slim hexagon, `len` long and `t` thick, centered on (cx, cy); `vertical` stands it up. */
function segmentPath(cx: number, cy: number, len: number, t: number, vertical: boolean): string {
  const a = len / 2;
  const b = t / 2;
  const pts: Array<[number, number]> = [[-a, 0], [-a + b, -b], [a - b, -b], [a, 0], [a - b, b], [-a + b, b]];
  return polygonPath(pts.map(([x, y]) => (vertical ? [cx + y, cy + x] : [cx + x, cy + y]) as [number, number]));
}

/** The seven segments a to g of one digit: path, and its name. */
function digit(cx: number): Array<{ key: string; d: string }> {
  const lh = 3.7;
  const lv = 3.6;
  const t = 0.95;
  const dx = 2.3;
  const up = CY - 2.1;
  const dn = CY + 2.1;
  return [
    { key: "a", d: segmentPath(cx, CY - 4.1, lh, t, false) },
    { key: "b", d: segmentPath(cx + dx, up, lv, t, true) },
    { key: "c", d: segmentPath(cx + dx, dn, lv, t, true) },
    { key: "d", d: segmentPath(cx, CY + 4.1, lh, t, false) },
    { key: "e", d: segmentPath(cx - dx, dn, lv, t, true) },
    { key: "f", d: segmentPath(cx - dx, up, lv, t, true) },
    { key: "g", d: segmentPath(cx, CY, lh, t, false) },
  ];
}

/** The demo number 12:34. */
const SHOWN = ["bc", "abged", "abgcd", "fgbc"];
const lit: string[] = [];
const segments: Solid[] = DIGIT_X.flatMap((cx, n) =>
  digit(cx).map(({ key, d }): Solid => {
    const on = SHOWN[n].includes(key);
    const id = on ? `d${n + 1}${key}` : undefined;
    if (id) lit.push(id);
    return { kind: "extrude", id, path: d, d: 0.3, z: FACE, top: on ? LIT : UNLIT, side: on ? "#c01a10" : "#3f0a0a", glow: on ? LIT : undefined, finish: "epoxy" };
  }),
);
const colon: Solid[] = [CY - 2, CY + 2].map((y, i): Solid => {
  const id = `colon${i + 1}`;
  lit.push(id);
  return { kind: "cyl", id, cx: 23, cy: y, r: 0.6, d: 0.3, z: FACE, top: LIT, glow: LIT, finish: "epoxy" };
});

const header = pinHeader(3, 8.4, 4, { dir: "y", style: "down" });

const holes = [
  { x: 2.5, y: 2.5, d: 2.5 },
  { x: 2.5, y: 21.5, d: 2.5 },
  { x: 39.5, y: 2.5, d: 2.5 },
  { x: 39.5, y: 21.5, d: 2.5 },
];

export default definePart({
  id: "tm1637",
  name: "TM1637 4-digit display",
  aka: ["4-digit 7-segment display", "TM1637 LED module", "0.36 inch clock display"],
  group: "displays",
  rank: 3,
  summary: "Four red seven-segment digits and a colon, run by a TM1637 chip over two wires. Numbers, clocks and counters without wiring thirty segments.",
  size: { w: 42, h: 24, d: 9.8 },
  solids: [
    board(42, 24, "#101215", { radius: 1, holes }),
    header,
    // The display block stands on its own legs, a little above the board.
    { kind: "box", x: BODY.x + 1.5, y: BODY.y + 1.5, w: BODY.w - 3, h: BODY.h - 3, d: BODY.z - PCB_TOP, z: PCB_TOP, top: "#17181b", finish: "plastic" },
    // The display block: white plastic sides, and the dark gray face the red segments shine through.
    { kind: "box", id: "display", x: BODY.x, y: BODY.y, w: BODY.w, h: BODY.h, d: BODY.d, z: BODY.z, top: "#232427", side: "#dcdad2", finish: "plastic", radius: 0.5 },
    segments,
    colon,
    // The few parts on the front: a decoupling cap, a pull resistor and the reverse-polarity diode.
    smd(30, 20.8, "c", "x"),
    smd(33, 20.8, "r", "x"),
    smd(36, 20.8, "r", "x"),
    ...["CLK", "DIO", "VCC", "GND"].map((label, i) => silk(4.8, 8.7 + i * 2.54, label, 0.8, MATERIAL.silk)),
    silk(8.4, 22.3, "TM1637", 1.2, MATERIAL.silk, { weight: 700 }),
  ],
  features: [
    { id: "display", label: "4 digits and colon", kind: "other", x: BODY.x, y: BODY.y, w: BODY.w, h: BODY.h, note: "Four digits of seven red segments, 9.14 mm tall, with a colon between digits 2 and 3. Each segment is an LED." },
    { id: "colon", label: "Colon", kind: "led", x: 22, y: CY - 3, w: 2, h: 6, note: "Two dots. They are the decimal point of digit 2, so they follow that digit's data." },
    { id: "pins", label: "CLK, DIO, VCC, GND", kind: "pins", x: 1.7, y: 7.1, w: 2.6, h: 10.2, note: "Two data wires and power. Not I2C: the two signal wires can go to any two free pins." },
    { id: "chip", label: "TM1637 (on the back)", kind: "chip", x: 16.5, y: 8, w: 13, h: 7.5, note: "The driver chip is on the back, under the display. It scans the segments and keeps the digits." },
    { id: "holes", label: "Mounting holes (×4)", kind: "mechanical", x: 1.2, y: 1.2, w: 39.6, h: 21.6, note: "M2.5, one in each corner." },
  ],
  pins: [
    pin("CLK", "clock", "drive", "Clock from your board. Any free digital pin.", { label: "CLK" }),
    pin("DIO", "data", "io", "Data, both ways: the chip pulls it low to say it got a byte.", { label: "DIO" }),
    vcc("VCC", "3.3 V to 5 V. Brighter at 5 V; up to 80 mA with every segment lit."),
    gnd("GND"),
  ],
  pinAt: name(header, "CLK", "DIO", "VCC", "GND"),
  circuit: {
    blocks: [
      { id: "clk", label: "CLK", sub: "clock in", kind: "pin", col: 0, row: 0, at: "CLK", note: "Your board ticks this wire for every bit." },
      { id: "dio", label: "DIO", sub: "data, both ways", kind: "pin", col: 0, row: 1, at: "DIO", note: "Bits go in on the ticks; the chip pulls it low to say it got a byte." },
      { id: "tm", label: "TM1637", sub: "driver + memory", kind: "driver", col: 1, row: 0, at: "chip", note: "Keeps what each digit shows and scans the segments by itself." },
      { id: "digits", label: "4 digits + colon", sub: "common-anode LEDs", kind: "display", col: 2, row: 0, at: "display", note: "One digit is lit at a time, over and over, fast enough to look steady." },
      { id: "light", label: "Red light", kind: "world", col: 3, row: 0, note: "What you see." },
      { id: "vcc", label: "VCC 3.3–5 V", kind: "power", col: 0, row: 2, at: "VCC", note: "About 2.5 mA a lit segment: 80 mA when all are on at full brightness." },
    ],
    links: [
      { from: "clk", to: "tm", kind: "signal" },
      { from: "dio", to: "tm", kind: "data", both: true },
      { from: "tm", to: "digits", kind: "signal", label: "segment + digit select" },
      { from: "digits", to: "light", kind: "light" },
      { from: "vcc", to: "tm", kind: "power" },
    ],
    steps: [
      "Your board sends a start signal, a command, then a byte for each digit, one bit per tick of CLK. There is no address, so it is not I2C.",
      "The TM1637 keeps those bytes in its memory. Bit 7 of the second digit's byte turns the colon on.",
      "It lights one digit at a time and moves on, thousands of times a second, so all four look lit.",
      "A brightness level from 0 to 7 sets how long each digit is on in that cycle.",
    ],
  },
  facts: [
    { label: "Digits", value: "4, with colon" },
    { label: "Digit height", value: "9.14 mm (0.36 in)" },
    { label: "Driver", value: "TM1637, two-wire" },
    { label: "Supply", value: "3.3–5.5 V, up to 80 mA" },
    { label: "Brightness", value: "8 levels" },
    { label: "Size", value: "42 × 24 mm" },
  ],
  spec: {
    form: {
      mass: 10,
      mount: "jumpers",
      pitch: 2.54,
      holes,
      note: "Four pins on the left edge take jumper wires or a breadboard; four M2.5 holes bolt it behind a panel.",
    },
    power: {
      supply: { min: 3.3, max: 5.5, typ: 5 },
      logic: 5,
      tolerant5V: true,
      draw: { idle: 1, active: 40, peak: 80 },
      interface: "TM1637 two-wire, CLK and DIO, 500 kHz at most (100 kHz or less is usual)",
    },
    sourcing: { mpn: "TM1637", maker: "Titan Micro Electronics", lifecycle: "active", usd: [1, 3] },
    limits: [
      "Up to 80 mA with every segment on: power it from the 5 V rail, never from an I/O pin.",
      "It is not I2C. It cannot share a bus, and it needs two pins of its own.",
      "The colon is the decimal point of digit 2, so it only blinks with that digit's data. Modules without the colon have a point on every digit.",
      "Only eight brightness steps, the same for all four digits.",
      "Some boards print the pins in another order (GND, VCC, DIO, CLK). Read the silkscreen.",
      "The digits are scanned, so a phone camera may show flicker at low brightness.",
    ],
    upgrade: [
      { name: "HT16K33 4-digit 7-segment I2C backpack", why: "Real I2C on a shared bus (0x70 to 0x77), 16 brightness steps and a constant-current segment drive." },
      { part: "max7219", name: "MAX7219 module", why: "Adjustable segment current up to 40 mA, 10 MHz SPI and chaining; the 8 × 8 matrix module is in the library." },
    ],
    refs: [
      "https://protosupplies.com/product/tm1637-4-digit-0-36-red-display/",
      "https://shillehtek.com/blogs/shillehtek-product-manuals/4-bits-tm1637-red-led-display-module-clock-manual",
      "https://tinkered.ai/components/tm1637-4digit-display",
    ],
  },
  sim: { kind: "output" },
  animate: { lit },
  experiment: { title: "Count down", idea: "Show a number that counts down from 60 once a second, and blink the colon every half second." },
  tags: ["tm1637", "7-segment", "seven segment", "led", "display", "clock", "counter", "4-digit"],
});
