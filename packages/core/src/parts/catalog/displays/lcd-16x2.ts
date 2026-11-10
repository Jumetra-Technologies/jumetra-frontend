import { MATERIAL, PCB_TOP, board, definePart, gnd, name, pin, pinHeader, silk, vcc, type Solid } from "../../sdk";

const GREEN = "#1f7a3c";
const BLUE = "#2d5bd1";
const BEZEL_TOP = 9;

/** Glass window: 64.5 × 16 mm, centered on the 71.2 × 24.2 mm bezel. */
const WIN = { x: 7.75, y: 10, w: 64.5, h: 16 };
/** The backpack hangs behind the board, 4 mm back from it; its parts face away from the LCD. */
const BP = { x: 5.4, y: 1, w: 42, h: 19, top: -4 };

const header = pinHeader(7.3, 2.5, 16, { style: "down" });

/** The window's steel frame: a 71.2 × 24.2 mm sheet with the viewing window cut out of it. */
const frame = `M 4.4 5.9 H 75.6 V 30.1 H 4.4 Z M ${WIN.x} ${WIN.y} V ${WIN.y + WIN.h} H ${WIN.x + WIN.w} V ${WIN.y} Z`;

/** Two rows of 16 character cells, each 2.95 × 5.55 mm on a 3.55 mm pitch. */
const cells = [11.1, 19.35]
  .flatMap((y) => Array.from({ length: 16 }, (_, i) => `M ${(WIN.x + 4.15 + i * 3.55).toFixed(2)} ${y} h 2.95 v 5.55 h -2.95 Z`))
  .join(" ");

/** The four tabs of the bezel, bent round the board edge and soldered. */
const tabs: Solid[] = [17, 63].flatMap((x) => [
  { kind: "box", x, y: 4.2, w: 4, h: 1.7, d: 0.6, z: PCB_TOP, top: "#b9bcc2", finish: "metal" } as Solid,
  { kind: "box", x, y: 30.1, w: 4, h: 1.7, d: 0.6, z: PCB_TOP, top: "#b9bcc2", finish: "metal" } as Solid,
  { kind: "disc", cx: x + 2, cy: 4.9, r: 0.8, color: MATERIAL.tin, z: PCB_TOP + 0.6 } as Solid,
  { kind: "disc", cx: x + 2, cy: 31, r: 0.8, color: MATERIAL.tin, z: PCB_TOP + 0.6 } as Solid,
]);

/** The I2C backpack seen through the board: a blue PCB with the PCF8574, the contrast trimmer and the 4-pin header on its far face. */
const bp = (z: number, d: number): number => z - d;
const backpack: Solid[] = [
  { kind: "box", id: "backpack", x: BP.x, y: BP.y, w: BP.w, h: BP.h, d: 1.4, z: BP.top - 1.4, top: "#1b4fa0", side: "#0f2b52", radius: 0.5, finish: "soldermask" },
  { kind: "box", id: "pcf", x: 16, y: 6.5, w: 10, h: 7.6, d: 2.2, z: bp(BP.top - 1.4, 2.2), top: "#1b1c1f", finish: "epoxy", radius: 0.3 },
  { kind: "box", id: "contrast", x: 30.5, y: 5, w: 9.5, h: 4.8, d: 5, z: bp(BP.top - 1.4, 5), top: "#2a5cc4", side: "#1c3f8a", radius: 0.4, finish: "plastic" },
  { kind: "box", x: 8, y: 14, w: 2.6, h: 5.2, d: 1.8, z: bp(BP.top - 1.4, 1.8), top: "#17181b", finish: "plastic" },
  { kind: "box", x: 40.5, y: 11, w: 4, h: 4.6, d: 1.6, z: bp(BP.top - 1.4, 1.6), top: "#c9ccd1", finish: "metal" },
];
const i2c = pinHeader(36.5, 18.4, 4, { style: "down", dir: "x", z: BP.top - 1.4 });

export default definePart({
  id: "lcd-16x2",
  name: "LCD 16×2 (I2C)",
  aka: ["1602 LCD", "HD44780 display", "character LCD", "I2C 1602"],
  group: "displays",
  rank: 1,
  summary: "Two lines of sixteen characters, readable from across the room, driven over two wires thanks to the I2C backpack on the back. The classic readout.",
  size: { w: 80, h: 36, d: 9 },
  solids: [
    board(80, 36, GREEN, {
      radius: 0,
      holes: [
        { x: 2.5, y: 2.5, d: 2.5 },
        { x: 77.5, y: 2.5, d: 2.5 },
        { x: 2.5, y: 33.5, d: 2.5 },
        { x: 77.5, y: 33.5, d: 2.5 },
      ],
    }),
    header,
    // Steel frame, with the glass lying in its window.
    { kind: "extrude", id: "bezel", path: frame, d: BEZEL_TOP - PCB_TOP, z: PCB_TOP, top: "#d3d6db", side: "#9aa0a8", finish: "metal" },
    tabs,
    { kind: "box", id: "glass", x: WIN.x, y: WIN.y, w: WIN.w, h: WIN.h, d: 0.6, z: 7.6, top: BLUE, side: "#1d3f94", glow: "#4fa0ff", finish: "glass" },
    { kind: "path", d: cells, fill: "#2551b8", color: "#2551b8", width: 0.05, z: 8.21 },
    // The two rows of the glass. In the library they show sample text; in the lab the sketch writes to them.
    silk(10, 15.6, "Hello, Kiungo!", 3.6, "#f2f7ff", { id: "screen:0", z: 8.3, weight: 700 }),
    silk(10, 23.4, "Temp: 24.5 C", 3.6, "#f2f7ff", { id: "screen:1", z: 8.3, weight: 700 }),
    silk(7.3, 4.7, "1", 1, MATERIAL.silk, { anchor: "middle" }),
    silk(45.4, 4.7, "16", 1, MATERIAL.silk, { anchor: "middle" }),
    silk(40, 34.2, "LCD1602  5V", 1.3, MATERIAL.silk, { anchor: "middle", weight: 700 }),
    silk(60, 3.3, "A", 1, MATERIAL.silk, { anchor: "middle" }),
    silk(63, 3.3, "K", 1, MATERIAL.silk, { anchor: "middle" }),
    backpack,
    i2c,
  ],
  features: [
    { id: "glass", label: "16 × 2 characters", kind: "other", x: WIN.x, y: WIN.y, w: WIN.w, h: WIN.h, note: "Two rows of sixteen 5 × 8 dot cells. The HD44780 controller remembers what you wrote; you only send changes." },
    { id: "bezel", label: "Metal bezel", kind: "mechanical", x: 4.4, y: 5.9, w: 71.2, h: 24.2, note: "A steel frame clipped over the glass; its bent tabs are soldered to the board. The LED backlight sits behind the glass." },
    { id: "header", label: "16 HD44780 pins", kind: "pins", x: 6, y: 1.2, w: 40.6, h: 2.6, note: "The bare LCD's 16 pads. The backpack is soldered to them from behind, so you never wire these yourself." },
    { id: "backpack", label: "I2C backpack (behind)", kind: "chip", x: BP.x, y: BP.y, w: BP.w, h: BP.h, note: "A small blue board soldered to the back. The PCF8574 on it turns two I2C wires into the LCD's data and control lines." },
    { id: "contrast", label: "Contrast trimmer", kind: "other", x: 30.5, y: 5, w: 9.5, h: 4.8, note: "Blue trimmer on the backpack. Blank screen or a row of black boxes: turn it with a small screwdriver." },
    { id: "i2c", label: "GND, VCC, SDA, SCL", kind: "pins", x: 35.2, y: 17.1, w: 10.2, h: 2.6, note: "Four pins on the backpack, pointing back. Four wires instead of twelve." },
    { id: "holes", label: "Mounting holes (×4)", kind: "mechanical", x: 1.2, y: 1.2, w: 2.6, h: 2.6, note: "M2.5, one at each corner." },
  ],
  pins: [
    gnd("GND", "Ground."),
    vcc("VCC", "5 V supply, about 30 mA with the backlight on. The 3.3 V pin is not enough."),
    pin("SDA", "data", "sda", "I2C data; A4 on an Uno."),
    pin("SCL", "clock", "scl", "I2C clock; A5 on an Uno."),
  ],
  pinAt: name(i2c, "SCL", "SDA", "VCC", "GND"),
  circuit: {
    blocks: [
      { id: "i2c", label: "SDA / SCL", sub: "I2C 0x27 or 0x3F", kind: "pin", col: 0, row: 0, at: "SDA", note: "Two wires carry every character." },
      { id: "pcf", label: "PCF8574", sub: "I/O expander", kind: "ic", col: 1, row: 0, at: "backpack", note: "The chip on the backpack: turns I2C into eight pins for the LCD." },
      { id: "hd", label: "HD44780", sub: "controller + DDRAM", kind: "ic", col: 2, row: 0, at: { x: 40, y: 31 }, note: "A black blob of epoxy on the back of the LCD board. Holds the text and a built-in font, and refreshes the glass on its own." },
      { id: "glass", label: "Glass", sub: "16 × 2 × 5 × 8 dots", kind: "display", col: 3, row: 0, at: "glass", note: "Liquid crystal that goes dark where it's driven." },
      { id: "bl", label: "Backlight LED", kind: "actuator", col: 3, row: 1, at: "bezel", note: "Lights the glass from behind. It is most of the current." },
      { id: "pot", label: "Contrast trimmer", sub: "V0", kind: "passive", col: 1, row: 1, at: "contrast", note: "On the backpack. Blank screen or black boxes: turn this." },
      { id: "vcc", label: "VCC 5 V", kind: "power", col: 0, row: 1, at: "VCC", note: "The backlight is most of the current." },
      { id: "gnd", label: "GND", kind: "ground", col: 0, row: 2, at: "GND", note: "Ground." },
    ],
    links: [
      { from: "i2c", to: "pcf", kind: "data", both: true },
      { from: "pcf", to: "hd", kind: "data", label: "4-bit bus" },
      { from: "hd", to: "glass", kind: "signal", label: "segment drive" },
      { from: "pcf", to: "bl", kind: "signal", label: "backlight" },
      { from: "pot", to: "hd", kind: "analog", label: "contrast" },
      { from: "vcc", to: "pcf", kind: "power" },
      { from: "pcf", to: "gnd", kind: "ground" },
    ],
    steps: [
      "Your board sends characters over I2C to the PCF8574 backpack, which fans them out onto the LCD's 4-bit data bus plus RS and E.",
      "The HD44780 keeps the text in its own memory and refreshes the glass itself: each cell is a 5 × 8 grid of dots.",
      "The glass only blocks light; the backlight LED shines through from behind. The contrast trimmer sets the dot voltage V0: turn it if you see nothing, or only black boxes.",
      "The address is 0x27 on most backpacks and 0x3F on some; run an I2C scanner if lcd.print shows nothing.",
    ],
  },
  facts: [
    { label: "Characters", value: "16 × 2" },
    { label: "Controller", value: "HD44780" },
    { label: "Interface", value: "I2C (PCF8574 backpack)" },
    { label: "Supply", value: "5 V, ~30 mA with backlight" },
    { label: "Address", value: "0x27 / 0x3F" },
    { label: "Size", value: "80 × 36 mm, glass 64.5 mm wide" },
  ],
  spec: {
    form: {
      mass: 30,
      mount: "jumpers",
      pitch: 2.54,
      holes: [
        { x: 2.5, y: 2.5, d: 2.5 },
        { x: 77.5, y: 2.5, d: 2.5 },
        { x: 2.5, y: 33.5, d: 2.5 },
        { x: 77.5, y: 33.5, d: 2.5 },
      ],
      note: "The four-pin header on the backpack takes jumper wires or a breadboard; four M2.5 holes bolt the board to a panel.",
    },
    power: {
      supply: { min: 4.7, max: 5.3, typ: 5 },
      logic: 5,
      tolerant5V: true,
      draw: { idle: 2, active: 30, peak: 60 },
      interface: "I2C through a PCF8574 backpack, 0x27 or 0x3F, 100 kHz",
    },
    sourcing: { mpn: "HD44780 + PCF8574T", maker: "Generic (Hitachi HD44780 controller, NXP PCF8574)", lifecycle: "generic", usd: [2, 5] },
    limits: [
      "It needs a real 5 V: at 3.3 V the contrast and the backlight are poor.",
      "The contrast is set by a trimmer. A wrong setting looks like a dead screen: nothing, or a row of black boxes.",
      "The I2C address is 0x27 on some backpacks and 0x3F on others, so scan or check yours.",
      "The backpack pulls SDA and SCL up to 5 V, which a 3.3 V board's pins may not survive.",
      "It is slow: about 40 µs a command and 1.5 ms to clear, so a full redraw takes tens of milliseconds.",
      "No graphics: only eight custom characters. The backlight is on or off; PWM makes it flicker.",
    ],
    upgrade: [
      { part: "oled-ssd1306", name: "SSD1306 0.96 inch OLED", why: "Runs on 3.3 V or 5 V at 8 to 20 mA in all, draws any font or picture, has no contrast trimmer and is 27 × 27 mm. It shows less text at once." },
      { name: "20×4 HD44780 LCD with the same backpack", why: "The same code and wiring, with four lines of 20 characters instead of two of 16." },
    ],
    refs: [
      "https://components101.com/displays/16x2-lcd-pinout-datasheet",
      "https://docs.sunfounder.com/projects/sf-components/en/latest/component_i2c_lcd.html",
      "https://probots.co.in/i2c-lcd-backpack-interface-module-pcf8574t.html",
    ],
  },
  lab: { supply: [4.5, 5.5] },
  animate: { lit: ["glass"] },
  experiment: { title: "Live readout", idea: "Print 'Hello' and a counter on the second row, then swap in a sensor reading and a custom degree symbol." },
  tags: ["lcd", "1602", "16x2", "hd44780", "i2c", "display", "text", "screen"],
});
