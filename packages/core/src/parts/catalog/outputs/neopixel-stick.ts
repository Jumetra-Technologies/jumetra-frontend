import { MATERIAL, definePart, gnd, pin, roundedRect, silk, smd, vcc, type Solid } from "../../sdk";
import { pad, pixel } from "./_pixels";

const W = 51.1;
const H = 10.22;
const MID = H / 2;
const PITCH = 5.85;
const X0 = 5.08;
const N = 8;
const px = (k: number) => Math.round((X0 + PITCH * k) * 100) / 100;

const pixels: Solid[] = Array.from({ length: N }, (_, k) => pixel(px(k), MID, `px-${k}`)).flat();
// A small bypass capacitor under each pixel, in the strip along the bottom edge.
const caps: Solid[] = Array.from({ length: N }, (_, k) => smd(px(k) - 0.8, 8.45, "c", "x")).flat();

// Input end (left): four pads in a column, 2.54 mm apart. Output end (right): three.
const IN_Y = [-1.5, -0.5, 0.5, 1.5].map((i) => Math.round((MID + i * 2.54) * 100) / 100);
const OUT_Y = [-1, 0, 1].map((i) => Math.round((MID + i * 2.54) * 100) / 100);
const IN_X = 0.8;
const OUT_X = 50.0;
const inNames = ["GND", "5V", "DIN", "GND"];
const outNames = ["GND", "5V", "DOUT"];
const padSolids: Solid[] = [
  ...IN_Y.flatMap((y, i): Solid[] => [pad(IN_X, y, 1.2, 1.7), silk(2.0, y, inNames[i], 0.8, MATERIAL.silk, { anchor: "middle", rotate: -90 })]),
  ...OUT_Y.flatMap((y, i): Solid[] => [pad(OUT_X, y, 1.2, 1.7), silk(49.0, y, outNames[i], 0.8, MATERIAL.silk, { anchor: "middle", rotate: -90 })]),
];

export default definePart({
  id: "neopixel-stick",
  name: "NeoPixel stick, 8 × WS2812B",
  aka: ["WS2812B stick", "RGB LED stick", "addressable LED bar", "Adafruit 1426"],
  group: "outputs",
  rank: 5,
  summary: "Eight color LEDs in a row on a thin black bar, each one a tiny chip you talk to over one wire. Level meters, status bars, a bit of mood light.",
  size: { w: 51.1, h: 10.22, d: 3.3 },
  solids: [
    { kind: "extrude", id: "pcb", path: roundedRect(0, 0, W, H, 0.5), d: 1.6, top: "#17181c", side: "#08090a", finish: "soldermask" },
    ...pixels,
    ...caps,
    ...padSolids,
  ],
  features: [
    { id: "pixels", label: "8 pixels", kind: "led", x: 2.58, y: 2.61, w: 45.9, h: 5, note: "Each pixel is a 5 × 5 mm WS2812B: a red, a green and a blue LED with a small chip beside them. The chip remembers a color and passes the rest of the data on." },
    { id: "px0", label: "Pixel 0", kind: "led", x: 2.58, y: 2.61, w: 5, h: 5, note: "The first pixel in the chain, next to the input pads. The data enters here." },
    { id: "pads-in", label: "Input pads", kind: "pins", x: 0.2, y: 0.4, w: 2.4, h: 9.4, note: "GND, 5V, DIN and a second GND, top to bottom. The two GND pads are the same copper." },
    { id: "pads-out", label: "Output pads", kind: "pins", x: 48.5, y: 1.6, w: 2.6, h: 7.1, note: "GND, 5V and DOUT. Solder these to the next stick's input pads to chain them." },
    { id: "caps", label: "Bypass capacitors", kind: "other", x: 4.28, y: 8.45, w: 43.7, h: 0.8, note: "A small ceramic capacitor beside each pixel keeps its supply steady while the LEDs switch." },
    { id: "board", label: "Black board", kind: "other", x: 0, y: 0, w: 51.1, h: 10.22, note: "A black circuit board 51 × 10 mm and 1.6 mm thick." },
  ],
  pins: [
    vcc("VCC", "5 V for the pixels. At full white all eight take 480 mA: use a supply that can give it, not a pin.", { label: "5V" }),
    gnd("GND", "Ground, shared with your board. Connect it first."),
    gnd("GND2", "A second ground pad on the input end, the same copper as GND. Use either.", { required: false }),
    pin("DIN", "data", "drive", "Data in, 800 kHz. A 3.3 V board needs a level shifter, and put 300 to 500 Ω in series.", { label: "DIN" }),
    pin("DOUT", "data", "opt", "Data out to the next stick's DIN. Leave it free on the last one.", { label: "DOUT", required: false }),
  ],
  pinAt: {
    GND: { x: IN_X, y: IN_Y[0] },
    VCC: { x: IN_X, y: IN_Y[1] },
    DIN: { x: IN_X, y: IN_Y[2] },
    GND2: { x: IN_X, y: IN_Y[3] },
    DOUT: { x: OUT_X, y: OUT_Y[2] },
  },
  circuit: {
    blocks: [
      { id: "din", label: "DIN", sub: "800 kHz data", kind: "pin", col: 0, row: 0, at: "DIN", note: "Your board sends one long stream: 24 bits for each pixel, then a pause." },
      { id: "chip", label: "Pixel chip", sub: "WS2812B, ×8", kind: "ic", col: 1, row: 0, at: "px0", note: "Each pixel's chip keeps the first 24 bits it hears and hands the rest on." },
      { id: "dies", label: "R, G, B dies", sub: "18 mA per color", kind: "actuator", col: 2, row: 0, at: "pixels", note: "The chip dims each color with fast PWM, 256 steps." },
      { id: "light", label: "Light", sub: "up to 60 mA a pixel", kind: "world", col: 3, row: 0, note: "White is all three colors at full: 60 mA per pixel." },
      { id: "dout", label: "DOUT", sub: "the rest, passed on", kind: "pin", col: 1, row: 1, at: "DOUT", note: "What the chip did not keep goes out here to the next stick." },
      { id: "vcc", label: "5V", sub: "up to 480 mA", kind: "power", col: 0, row: 1, at: "VCC", note: "4.5 to 5.5 V. Colors shift if it sags: blue fades first." },
      { id: "gnd", label: "GND", kind: "ground", col: 0, row: 2, at: "GND", note: "Ground, shared with the board." },
    ],
    links: [
      { from: "din", to: "chip", kind: "data", label: "24 bits × 8" },
      { from: "chip", to: "dies", kind: "signal", label: "PWM" },
      { from: "dies", to: "light", kind: "light" },
      { from: "chip", to: "dout", kind: "data", label: "the rest" },
      { from: "vcc", to: "chip", kind: "power", label: "≤ 480 mA" },
      { from: "gnd", to: "chip", kind: "ground" },
    ],
    steps: [
      "Your board sends 24 bits per pixel (green, red, blue) on DIN, one after another, at 800 kHz.",
      "Pixel 0 keeps the first 24 bits and passes everything after them on. Pixel 1 does the same, down the bar.",
      "Each chip turns its three colors into fast PWM, 256 steps each, so you get any color.",
      "Hold DIN low for 50 µs or more and every pixel shows its new color together.",
    ],
  },
  facts: [
    { label: "Pixels", value: "8 × WS2812B" },
    { label: "Supply", value: "5 V (4.5–5.5 V)" },
    { label: "Current", value: "up to 480 mA" },
    { label: "Data", value: "1 wire, 800 kHz" },
    { label: "Size", value: "51 × 10 × 3.2 mm" },
    { label: "Colors", value: "16.7 million (24 bit)" },
  ],
  lab: { logic: 5, supply: [4.5, 5.5], tolerates5V: true, strips: [["GND", "GND2"]] },
  spec: {
    form: {
      mass: 2.57,
      mount: "solder",
      note: "Solder pads at both ends and no connector. The input end has GND, 5V, DIN and a second GND; the output end has GND, 5V and DOUT, for chaining a second stick.",
    },
    power: {
      supply: { min: 4.5, max: 5.5, typ: 5 },
      logic: 5,
      tolerant5V: true,
      draw: { idle: 8, active: 160, peak: 480 },
      interface: "Single-wire data, 800 kHz, 24 bits a pixel (G, R, B)",
      note: "About 1 mA a pixel doing nothing, 20 mA per color, 60 mA a pixel at full white. 'Active' here is a third brightness on average. Data high must be at least 0.7 × the supply, so 3.5 V at 5 V.",
    },
    sourcing: { mpn: "WS2812B (Adafruit 1426 stick)", maker: "Worldsemi (chip), Adafruit (board)", lifecycle: "active", usd: [4, 8] },
    limits: [
      "All eight at full white take 480 mA, about all a USB port gives (500 mA). Dim to a quarter and it is about 120 mA.",
      "Data high must be 3.5 V at a 5 V supply. A 3.3 V pin (ESP32, Pico, Pi) is under that: it may work on short wires and fail when warm. Use a level shifter.",
      "The timing is strict, give or take 150 ns. It needs a fast chip or a hardware peripheral; interrupts glitch the colors on an AVR.",
      "One dead pixel cuts the data to every pixel after it.",
      "A charged supply hitting the first pixel can burn it: put a 1000 µF capacitor across the supply and 300 to 500 Ω in series with DIN.",
    ],
    upgrade: [
      { part: "level-shifter", name: "74AHCT125 or 74HCT245 level shifter", why: "Lifts a 3.3 V data pin to 5 V so the 3.5 V high level is met." },
      { name: "APA102 (DotStar) strip", why: "Clock and data, so the timing is relaxed and 3.3 V works with a shifter; it refreshes at 20 kHz against 400 Hz. It costs more and needs two wires." },
    ],
    refs: ["https://www.cl.cam.ac.uk/teaching/1516/ECAD+Arch/files/pcb/WS2812B.pdf", "https://core-electronics.com.au/catalog/product/view/sku/ADA1426"],
  },
  sim: { kind: "output" },
  animate: { lit: Array.from({ length: N }, (_, k) => `px-${k}`) },
  experiment: { title: "Level meter", idea: "Light more pixels as a sensor's reading goes up: green at the bottom, red at the top." },
  tags: ["neopixel", "ws2812b", "stick", "strip", "rgb", "addressable", "led", "output"],
});
