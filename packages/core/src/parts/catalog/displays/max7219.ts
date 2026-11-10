import { MATERIAL, PCB_TOP, board, definePart, gnd, name, pin, pinHeader, silk, smd, soic, vcc, type Solid } from "../../sdk";

const GREEN = "#0f7a40";
/** The matrix block: 32 × 32 mm, standing on two 8-pin sockets so it sits 2.5 mm above the board. */
const RISE = 2.5;
const MATRIX_Z = PCB_TOP + RISE;
const MATRIX_D = 8;
const FACE = MATRIX_Z + MATRIX_D;
/** 8 × 8 round LEDs on a 3.75 mm pitch, centered. */
const PITCH = 3.75;
const FIRST = 16 - (7 * PITCH) / 2;

/** A smiley: 1 is lit. */
const FACE_PATTERN = ["00111100", "01000010", "10100101", "10000001", "10100101", "10011001", "01000010", "00111100"];

const lit: string[] = [];
const dots: Solid[] = FACE_PATTERN.flatMap((row, r) =>
  [...row].map((c, col): Solid => {
    const on = c === "1";
    const id = on ? `led${r}${col}` : undefined;
    if (id) lit.push(id);
    return { kind: "cyl", id, cx: FIRST + col * PITCH, cy: FIRST + r * PITCH, r: 1.5, d: 0.4, z: FACE, top: on ? "#ff2a2a" : "#4a1216", side: on ? "#c01818" : "#2a0a0c", glow: on ? "#ff3030" : undefined, finish: "epoxy", segments: 14 };
  }),
);

const input = pinHeader(2.3, 10.92, 5, { dir: "y", style: "down" });
const output = pinHeader(29.7, 10.92, 5, { dir: "y", style: "down" });

const holes = [
  { x: 2, y: 2, d: 3 },
  { x: 30, y: 2, d: 3 },
  { x: 2, y: 30, d: 3 },
  { x: 30, y: 30, d: 3 },
];

export default definePart({
  id: "max7219",
  name: "MAX7219 8×8 LED matrix",
  aka: ["MAX7219 dot matrix module", "FC-16 matrix", "8x8 LED matrix module"],
  group: "displays",
  rank: 4,
  summary: "An 8 × 8 grid of red LEDs run by a MAX7219 chip over three wires. Draw pictures, scroll text, and chain several modules end to end.",
  size: { w: 32, h: 32, d: 12.6 },
  solids: [
    board(32, 32, GREEN, { radius: 0, holes }),
    input,
    output,
    // The MAX7219 on the back, as on the FC-16: wide SOIC-24, with its Rset and caps beside it.
    soic(16, 16, 12, "MAX7219", { wide: true, z: -2.4 }),
    smd(25, 22, "r", "x", "0805", -1.1),
    smd(25, 25, "c", "x", "0805", -1.1),
    // Sockets, then the matrix block on top.
    { kind: "box", x: 5.5, y: 2, w: 20.3, h: 2.54, d: RISE, z: PCB_TOP, top: MATERIAL.header, side: MATERIAL.headerSide, finish: "plastic", radius: 0.2 },
    { kind: "box", x: 5.5, y: 27.5, w: 20.3, h: 2.54, d: RISE, z: PCB_TOP, top: MATERIAL.header, side: MATERIAL.headerSide, finish: "plastic", radius: 0.2 },
    { kind: "box", id: "matrix", x: 0, y: 0, w: 32, h: 32, d: MATRIX_D, z: MATRIX_Z, top: "#17181b", side: "#0c0d0f", finish: "plastic", radius: 0.4 },
    dots,
    silk(16, 31.1, "1088AS", 0.9, "#8a8f96", { anchor: "middle", z: FACE + 0.01 }),
  ],
  features: [
    { id: "matrix", label: "8 × 8 LED matrix", kind: "other", x: 0, y: 0, w: 32, h: 32, note: "Sixty-four red LEDs, 3 mm each, in eight rows and eight columns. The chip lights them one row at a time, fast enough to look steady." },
    { id: "chip", label: "MAX7219 (on the back)", kind: "chip", x: 8.3, y: 12.2, w: 15.4, h: 7.5, note: "The driver chip: it scans the matrix, remembers the picture and sets the brightness. Wide SOIC-24 on this board." },
    { id: "in", label: "IN: VCC, GND, DIN, CS, CLK", kind: "pins", x: 1, y: 9.6, w: 2.6, h: 12.7, note: "The five wires from your board." },
    { id: "out", label: "OUT: VCC, GND, DOUT, CS, CLK", kind: "pins", x: 28.4, y: 9.6, w: 2.6, h: 12.7, note: "Feeds the next module's IN header. DOUT carries the data on; the rest are joined to the IN pins." },
    { id: "rset", label: "Rset", kind: "other", x: 24, y: 21.4, w: 2.4, h: 1.5, note: "One resistor sets the current in every LED. About 10 kΩ here; 9.53 kΩ is the datasheet's 40 mA." },
    { id: "holes", label: "Mounting holes (×4)", kind: "mechanical", x: 0.5, y: 0.5, w: 31, h: 31, note: "M3, one in each corner, under the matrix." },
  ],
  pins: [
    vcc("VCC", "5 V supply. 4 V to 5.5 V; the LEDs need a real 5 V.", { label: "VCC" }),
    gnd("GND"),
    pin("DIN", "spi", "mosi", "Serial data in, most significant bit first, 16 bits per update.", { label: "DIN" }),
    pin("CS", "spi", "cs", "Latch (LOAD): the new data takes effect when this goes high.", { label: "CS" }),
    pin("CLK", "spi", "sck", "Serial clock, up to 10 MHz.", { label: "CLK" }),
    pin("DOUT", "spi", "opt", "Data out to the next module in a chain.", { label: "DOUT", side: "right", required: false }),
    pin("VCC2", "power", "opt", "Output header supply, joined to VCC. Feeds the next module.", { label: "VCC", side: "right", required: false }),
    pin("GND2", "ground", "opt", "Output header ground, joined to GND.", { label: "GND", side: "right", required: false }),
    pin("CS2", "spi", "opt", "Output header chip select, joined to CS.", { label: "CS", side: "right", required: false }),
    pin("CLK2", "spi", "opt", "Output header clock, joined to CLK.", { label: "CLK", side: "right", required: false }),
  ],
  pinAt: { ...name(input, "VCC", "GND", "DIN", "CS", "CLK"), ...name(output, "VCC2", "GND2", "DOUT", "CS2", "CLK2") },
  circuit: {
    blocks: [
      { id: "din", label: "DIN, CLK, CS", sub: "3-wire serial", kind: "pin", col: 0, row: 0, at: "DIN", note: "16 bits per update: 4 spare bits, a register address and 8 bits of data." },
      { id: "max", label: "MAX7219", sub: "scan + memory", kind: "driver", col: 1, row: 0, at: "chip", note: "Holds eight rows of eight bits and lights the matrix one row at a time." },
      { id: "rset", label: "Rset", sub: "sets LED current", kind: "passive", col: 1, row: 1, at: "rset", note: "9.53 kΩ gives 40 mA peak in each LED. A lower value runs them too hard." },
      { id: "matrix", label: "8 × 8 matrix", sub: "64 red LEDs", kind: "display", col: 2, row: 0, at: "matrix", note: "Rows and columns, with an LED at every crossing." },
      { id: "light", label: "Red light", kind: "world", col: 3, row: 0, note: "What you see." },
      { id: "dout", label: "DOUT", sub: "to next module", kind: "pin", col: 2, row: 1, at: "DOUT", note: "Whatever came in 16 clocks ago goes on to the next module." },
      { id: "vcc", label: "VCC 5 V", kind: "power", col: 0, row: 1, at: "VCC", note: "Up to 330 mA when all 64 are on at full brightness." },
    ],
    links: [
      { from: "din", to: "max", kind: "data", label: "16-bit frames" },
      { from: "rset", to: "max", kind: "analog", label: "LED current" },
      { from: "max", to: "matrix", kind: "signal", label: "row + column drive" },
      { from: "matrix", to: "light", kind: "light" },
      { from: "max", to: "dout", kind: "data", label: "passes it on" },
      { from: "vcc", to: "max", kind: "power" },
    ],
    steps: [
      "Your board pulls CS low, clocks in 16 bits (a register address and 8 bits of data), then lets CS go high to latch them.",
      "The MAX7219 stores eight bytes, one per row. Each bit is one LED.",
      "It switches on one row at a time, eight times faster than the eye can follow, so the picture looks steady.",
      "Chain modules by wiring each OUT to the next IN. Send one frame per module, then raise CS once.",
    ],
  },
  facts: [
    { label: "LEDs", value: "64, red, 3 mm" },
    { label: "Driver", value: "MAX7219, 3-wire serial" },
    { label: "Supply", value: "4–5.5 V" },
    { label: "Current", value: "up to 330 mA, all on" },
    { label: "Brightness", value: "16 levels" },
    { label: "Size", value: "32 × 32 mm" },
  ],
  spec: {
    form: {
      mass: 15,
      mount: "jumpers",
      pitch: 2.54,
      holes,
      note: "Five pins on each side edge: IN takes jumper wires, and OUT joins the next module's IN, so modules chain edge to edge. Four M3 holes bolt it down.",
    },
    power: {
      supply: { min: 4, max: 5.5, typ: 5 },
      logic: 5,
      tolerant5V: true,
      draw: { idle: 8, active: 100, peak: 330 },
      interface: "3-wire serial (DIN, CLK, CS), 16-bit frames, 10 MHz at most; chains through DOUT",
    },
    sourcing: { mpn: "MAX7219", maker: "Analog Devices (Maxim); many modules carry a clone", lifecycle: "active", usd: [1.5, 4] },
    limits: [
      "It wants 5 V logic: the chip's high level is 3.5 V at a 5 V supply, so a 3.3 V board often needs a level shifter.",
      "All 64 LEDs on at full brightness take about 330 mA, 150 mA in typical use. Four chained modules need over 0.6 A: do not power them from a pin or a weak USB port.",
      "Rset sets the LED current. Below 9.53 kΩ the LEDs run past 40 mA peak.",
      "Only 16 brightness levels, and one color: no gray scale.",
      "Every chained module adds 16 clocks of delay, and all of them must be re-sent on each update.",
      "The display-test register lights all 64 LEDs at once, a surprise for a weak supply.",
    ],
    upgrade: [
      { name: "HT16K33 8 × 8 I2C backpack", why: "I2C on a shared bus, 16 brightness steps, a constant-current LED drive and 3.3 V to 5 V supply." },
      { name: "WS2812B 8 × 8 RGB matrix", why: "Full color from one data wire, but up to 3.8 A at full white, so it needs a stronger supply." },
    ],
    refs: [
      "https://docs.sunfounder.com/projects/raphael-kit/en/latest/_shared/component/cpn_max7219_module.html",
      "https://manualmachine.com/maxim/max7219/8354807-user-manual",
    ],
  },
  lab: { strips: [["VCC", "VCC2"], ["GND", "GND2"], ["CS", "CS2"], ["CLK", "CLK2"]] },
  sim: { kind: "output" },
  animate: { lit },
  experiment: { title: "Scroll a heart", idea: "Draw a heart in eight bytes, then make it beat by switching between two sizes." },
  tags: ["max7219", "led matrix", "8x8", "dot matrix", "fc-16", "display", "spi", "chain"],
});
