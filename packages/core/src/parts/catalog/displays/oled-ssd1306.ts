import { MATERIAL, board, definePart, gnd, name, pin, pinHeader, silk, smd, vcc, type Solid } from "../../sdk";

const TOP = 1.6;
/** The glass: 26.7 × 19.3 mm, set low on the board so the holes at the top corners stay clear. */
const GLASS = { x: 0.15, y: 3.4, w: 26.7, h: 19.3, d: 1.45 };
const GLASS_TOP = TOP + GLASS.d;
/** The lit area: 21.74 × 10.86 mm, with a thin border above it and the wide bonding border below. */
const PIX = { x: 2.63, y: 5.8, w: 21.74, h: 10.86 };

const header = pinHeader(9.69, 25.4, 4, { style: "down" });

const holes = [
  { x: 1.7, y: 1.7, d: 2 },
  { x: 25.3, y: 1.7, d: 2 },
  { x: 1.7, y: 25.6, d: 2 },
  { x: 25.3, y: 25.6, d: 2 },
];

/** The glass's flex tail: a strip of amber film bonded along the bottom edge, folding round the edge behind the glass. */
const flex: Solid[] = [
  { kind: "box", id: "flex", x: 7, y: GLASS.y + GLASS.h, w: 13, h: 0.5, d: GLASS.d - 0.1, z: TOP, top: "#c9822f", side: "#8a5619", radius: 0.1 },
  { kind: "box", x: 7, y: GLASS.y + GLASS.h, w: 13, h: 1.6, d: 0.25, z: TOP, top: "#c9822f", side: "#8a5619", radius: 0.1 },
  { kind: "path", d: "M 8 23.4 H 19", color: "#e1b05a", width: 0.2, z: TOP + 0.27 },
];

export default definePart({
  id: "oled-ssd1306",
  name: "OLED 0.96″ (SSD1306)",
  aka: ["0.96 inch OLED", "128×64 OLED", "SSD1306 display", "I2C OLED"],
  group: "displays",
  rank: 2,
  summary: "A crisp little screen where every pixel makes its own light. Text, graphs and icons at 128 × 64, over the same two I2C wires.",
  size: { w: 27, h: 27.3, d: 3.2 },
  solids: [
    board(27, 27.3, MATERIAL.pcbBlue, { radius: 0.5, holes }),
    header,
    { kind: "box", id: "glass", x: GLASS.x, y: GLASS.y, w: GLASS.w, h: GLASS.h, d: GLASS.d, z: TOP, top: "#0a0c10", side: "#1b1f26", finish: "glass", radius: 0.3 },
    { kind: "box", id: "pixels", x: PIX.x, y: PIX.y, w: PIX.w, h: PIX.h, d: 0.1, z: GLASS_TOP, top: "#0b0d12", side: "#0b0d12", glow: "#e0f2fe", radius: 0.1 },
    { kind: "path", d: `M ${PIX.x - 0.4} ${PIX.y - 0.4} h ${PIX.w + 0.8} v ${PIX.h + 0.8} h ${-PIX.w - 0.8} Z`, color: "#262b34", width: 0.15, z: GLASS_TOP + 0.01 },
    silk(13.5, 12.6, "Kiungo", 4.2, "#e0f2fe", { id: "screen-demo", anchor: "middle", z: GLASS_TOP + 0.2, weight: 800 }),
    silk(13.5, 15.4, "ready  12:04", 1.7, "#93c5fd", { id: "screen-demo", anchor: "middle", z: GLASS_TOP + 0.2 }),
    // Four text rows (21 characters) the lab writes to; blank in the library.
    ...[0, 1, 2, 3].map((i) => silk(3.33, 8.2 + i * 2.45, "", 1.75, "#e0f2fe", { id: `screen:${i}`, z: GLASS_TOP + 0.2, weight: 600 })),
    flex,
    // The few parts on the front: two caps by the flex and the 0 Ω address resistor pair.
    smd(3.2, 23.4, "c", "x"),
    smd(22.2, 23.4, "c", "x"),
    smd(3.4, 21.6, "r", "x"),
    smd(21.9, 21.6, "r", "x"),
    ...["GND", "VCC", "SCL", "SDA"].map((label, i) => silk(9.69 + i * 2.54, 27.1, label, 0.75, MATERIAL.silk, { anchor: "middle" })),
  ],
  features: [
    { id: "pixels", label: "128 × 64 pixels", kind: "other", x: PIX.x, y: PIX.y, w: PIX.w, h: PIX.h, note: "Each pixel is its own tiny OLED; black pixels are simply off, which is why the contrast is so deep." },
    { id: "glass", label: "Glass", kind: "other", x: GLASS.x, y: GLASS.y, w: GLASS.w, h: GLASS.h, note: "The SSD1306 driver chip is bonded onto the glass itself, under the wide black border at the bottom." },
    { id: "header", label: "GND, VCC, SCL, SDA", kind: "pins", x: 8.4, y: 24.1, w: 10.2, h: 2.6, note: "Check the order printed on yours: some boards swap GND and VCC, and wiring by position then reverses the supply." },
    { id: "flex", label: "Flex tail", kind: "connector", x: 7, y: 22.7, w: 13, h: 1.6, note: "Carries the thirty-odd lines from the glass to the board, folded round the glass's edge. Don't bend it." },
    { id: "addr", label: "Address resistors", kind: "other", x: 3.2, y: 21.4, w: 20.5, h: 2.6, note: "Moving a 0 Ω resistor changes the I2C address from 0x3C to 0x3D." },
    { id: "holes", label: "Mounting holes (×4)", kind: "mechanical", x: 0.7, y: 0.7, w: 2, h: 2, note: "Four M2 holes, one in each corner of the board." },
  ],
  pins: [
    gnd("GND", "Ground."),
    vcc("VCC", "3.3 V to 5 V supply, about 20 mA with half the pixels lit."),
    pin("SCL", "clock", "scl", "I2C clock."),
    pin("SDA", "data", "sda", "I2C data; the address is 0x3C."),
  ],
  pinAt: name(header, "GND", "VCC", "SCL", "SDA"),
  circuit: {
    blocks: [
      { id: "i2c", label: "SDA / SCL", sub: "I2C 0x3C, 400 kHz", kind: "pin", col: 0, row: 0, at: "SDA", note: "A whole frame is 1 KB; at 400 kHz that's about 25 ms." },
      { id: "ssd", label: "SSD1306", sub: "1 KB frame buffer", kind: "ic", col: 1, row: 0, at: { x: 13.5, y: 19.6 }, note: "Bonded onto the glass under the black border. Keeps the picture and scans it onto the pixels." },
      { id: "pump", label: "Charge pump", sub: "makes 7.5 V", kind: "regulator", col: 1, row: 1, at: { x: 13.5, y: 19.6 }, note: "OLEDs need more than 3.3 V; this boosts it on the chip." },
      { id: "pixels", label: "128 × 64 OLEDs", kind: "display", col: 2, row: 0, at: "pixels", note: "Organic LEDs, one per pixel." },
      { id: "light", label: "Light", sub: "self-emitting", kind: "world", col: 3, row: 0, note: "No backlight: lit pixels glow, dark ones are off." },
      { id: "vcc", label: "VCC 3.3–5 V", kind: "power", col: 0, row: 1, at: "VCC", note: "About 20 mA with half the pixels lit." },
    ],
    links: [
      { from: "i2c", to: "ssd", kind: "data", both: true },
      { from: "ssd", to: "pixels", kind: "signal", label: "row/column scan" },
      { from: "pixels", to: "light", kind: "light" },
      { from: "vcc", to: "pump", kind: "power" },
      { from: "pump", to: "pixels", kind: "power", label: "7.5 V" },
      { from: "vcc", to: "ssd", kind: "power" },
    ],
    steps: [
      "Your board draws into a 1 KB buffer in RAM (128 × 64 bits) and ships it over I2C to the SSD1306 at 0x3C.",
      "An internal charge pump boosts 3.3 V to about 7.5 V for the organic LEDs.",
      "The driver scans rows and columns; every lit pixel emits its own light, so there is no backlight and black is truly off.",
      "Leave a static image up for days and it can burn in; keep text moving or dim it.",
    ],
  },
  facts: [
    { label: "Resolution", value: "128 × 64" },
    { label: "Lit area", value: "0.96 in (21.7 × 10.9 mm)" },
    { label: "Interface", value: "I2C (SPI variants exist)" },
    { label: "Supply", value: "3.3–5 V, 4–23 mA" },
    { label: "Color", value: "Mono: white, blue or yellow/blue" },
    { label: "Size", value: "27 × 27 mm" },
  ],
  spec: {
    form: {
      mass: 3,
      mount: "jumpers",
      pitch: 2.54,
      holes,
      note: "Plugs into a breadboard or takes jumper wires on its four-pin header; four M2 holes bolt it behind a panel.",
    },
    power: {
      supply: { min: 3, max: 5, typ: 3.3 },
      logic: 3.3,
      tolerant5V: true,
      draw: { idle: 4, active: 15, peak: 23 },
      interface: "I2C, 0x3C (0x3D by moving a resistor), up to 400 kHz",
    },
    sourcing: { mpn: "SSD1306", maker: "Solomon Systech (module is generic)", lifecycle: "generic", usd: [2, 5] },
    limits: [
      "Burn-in: a static picture ages the pixels. Expect 10,000 to 30,000 hours at half brightness, less if it never changes.",
      "The address is 0x3C on most boards and 0x3D on some, so scan for yours.",
      "Some boards print VCC and GND the other way round. Wire by the labels, never by position, or you reverse the supply.",
      "Small: 21.7 × 10.9 mm shows about 21 characters by 8 lines at the 6 × 8 font.",
      "A full frame buffer is 1 KB, half the RAM of an Uno or Nano.",
      "Current follows the picture: about 4 mA blank to 23 mA with every pixel lit.",
      "Some modules sold as SSD1306 are SH1106 (132 columns): garbled edge columns give them away.",
    ],
    upgrade: [
      { name: "1.3 inch SH1106 or 1.54 inch SSD1309 OLED", why: "A bigger window, about 29 × 15 mm and 35 × 18 mm, on the same I2C wiring." },
      { name: "ST7789 1.3 inch 240 × 240 SPI IPS display", why: "Full color and no burn-in, but six or seven wires and about 30 mA of backlight." },
    ],
    refs: [
      "https://wiki.dfrobot.com/dfr0486/",
      "https://docs.circuit.rocks/displays/oled-ssd1306/",
      "https://reach.dog/shop/robotistan/products/0-96-inch-i2c-oled-display-ssd1306",
    ],
  },
  lab: { logic: 5, supply: [3.3, 5], tolerates5V: true },
  animate: { lit: ["pixels"] },
  experiment: { title: "Dashboard", idea: "Show a sensor value large in the middle with a bar graph underneath; refresh ten times a second." },
  tags: ["oled", "ssd1306", "i2c", "display", "128x64", "screen", "graphics"],
});
