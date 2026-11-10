import { MATERIAL, PCB_TOP, definePart, gnd, pin, ringPath, silk, vcc, type Solid } from "../../sdk";
import { pad, pixel } from "./_pixels";

const C = 18.4; // center of the ring, and of the 36.8 mm footprint
const OUTER = 18.4;
const INNER = 11.65; // 23.3 mm hole
const R = 15.05; // the pixels sit on this circle
const N = 12;

/** A point on the ring: radius r, angle a in degrees measured from 6 o'clock toward the right. */
const polar = (r: number, a: number) => ({ x: Math.round((C + r * Math.sin((a * Math.PI) / 180)) * 1000) / 1000, y: Math.round((C + r * Math.cos((a * Math.PI) / 180)) * 1000) / 1000 });

// Pixel k sits k × 30° round from the bottom, going clockwise on the page: the data runs that way.
const pixels: Solid[] = Array.from({ length: N }, (_, k) => {
  const a = -30 * k;
  const p = polar(R, a);
  return pixel(p.x, p.y, `px-${k}`, a);
}).flat();

// The four pads sit in the two gaps either side of pixel 0, two to a gap, with the printed name beside each.
const PW = 1.0;
const PH = 2.0;
const place = (r: number, a: number) => polar(r, a);
const spots = {
  VCC: place(16.2, 15),
  GND: place(12.9, 15),
  DIN: place(16.2, -15),
  DOUT: place(12.9, -15),
};
const tangent = (a: number, d: number) => ({ x: Math.cos((a * Math.PI) / 180) * d, y: -Math.sin((a * Math.PI) / 180) * d });
const padSolids: Solid[] = (["VCC", "GND", "DIN", "DOUT"] as const).flatMap((id) => {
  const a = id === "VCC" || id === "GND" ? 15 : -15;
  const s = spots[id];
  const t = tangent(a, -0.7);
  const l = tangent(a, 0.72);
  const text = { VCC: "5V", GND: "GND", DIN: "IN", DOUT: "OUT" }[id];
  return [pad(s.x + t.x, s.y + t.y, PW, PH, a), silk(s.x + l.x, s.y + l.y + 0.3, text, 0.85, MATERIAL.silk, { anchor: "middle", rotate: -90 + a })];
});
// The pins land on the middle of each pad.
const padAt = Object.fromEntries((["VCC", "GND", "DIN", "DOUT"] as const).map((id) => {
  const a = id === "VCC" || id === "GND" ? 15 : -15;
  const t = tangent(a, -0.7);
  return [id, { x: Math.round((spots[id].x + t.x) * 1000) / 1000, y: Math.round((spots[id].y + t.y) * 1000) / 1000 }];
}));

export default definePart({
  id: "neopixel-ring",
  name: "NeoPixel ring, 12 × WS2812B",
  aka: ["WS2812B ring", "RGB LED ring", "addressable LED ring", "Adafruit 1643"],
  group: "outputs",
  rank: 4,
  summary: "Twelve color LEDs on a black ring, each one a tiny chip you talk to over one wire. Clocks, spinners, status rings around a knob or a camera.",
  size: { w: 36.8, h: 36.8, d: 3.3 },
  solids: [
    // The board: a black ring, 36.8 mm across with a 23.3 mm hole.
    { kind: "extrude", id: "pcb", path: ringPath(C, C, OUTER, INNER), d: 1.6, top: "#17181c", side: "#08090a", finish: "soldermask" },
    ...pixels,
    ...padSolids,
  ],
  features: [
    { id: "pixels", label: "12 pixels", kind: "led", x: 0.8, y: 0.8, w: 35.2, h: 35.2, note: "Each pixel is a 5 × 5 mm WS2812B: a red, a green and a blue LED with a small chip beside them. The chip remembers a color and passes the rest of the data on." },
    { id: "px0", label: "Pixel 0", kind: "led", x: 15.9, y: 30.95, w: 5, h: 5, note: "The first pixel in the chain, at the bottom, next to the pads. The data enters here." },
    { id: "pads-in", label: "5V and GND pads", kind: "pins", x: 21.6, y: 29.2, w: 5, h: 6, note: "Solder pads for 5 V and ground, on the right of pixel 0. Add a 1000 µF capacitor across them." },
    { id: "pads-data", label: "IN and OUT pads", kind: "pins", x: 10.2, y: 29.2, w: 5, h: 6, note: "IN takes the data from your board (through 300 to 500 Ω). OUT passes it on to the next ring." },
    { id: "hole", label: "23.3 mm hole", kind: "mechanical", x: 6.75, y: 6.75, w: 23.3, h: 23.3, note: "Open in the middle, so the ring fits round a lens, a knob or a button." },
    { id: "board", label: "Black board", kind: "other", x: 0, y: 0, w: 36.8, h: 36.8, note: "A black circuit board 36.8 mm across and 1.6 mm thick. The black stops light leaking between pixels." },
  ],
  pins: [
    vcc("VCC", "5 V for the pixels. At full white all twelve take 720 mA: use a supply that can give it, not a pin.", { label: "5V" }),
    gnd("GND", "Ground, shared with your board. Connect it first."),
    pin("DIN", "data", "drive", "Data in, 800 kHz. A 3.3 V board needs a level shifter, and put 300 to 500 Ω in series.", { label: "DIN" }),
    pin("DOUT", "data", "opt", "Data out to the next ring's DIN. Leave it free on the last one.", { label: "DOUT", required: false }),
  ],
  pinAt: padAt,
  circuit: {
    blocks: [
      { id: "din", label: "DIN", sub: "800 kHz data", kind: "pin", col: 0, row: 0, at: "DIN", note: "Your board sends one long stream: 24 bits for each pixel, then a pause." },
      { id: "chip", label: "Pixel chip", sub: "WS2812B, ×12", kind: "ic", col: 1, row: 0, at: "px0", note: "Each pixel's chip keeps the first 24 bits it hears and hands the rest on." },
      { id: "dies", label: "R, G, B dies", sub: "18 mA per color", kind: "actuator", col: 2, row: 0, at: "pixels", note: "The chip dims each color with fast PWM, 256 steps." },
      { id: "light", label: "Light", sub: "up to 60 mA a pixel", kind: "world", col: 3, row: 0, note: "White is all three colors at full: 60 mA per pixel." },
      { id: "dout", label: "DOUT", sub: "the rest, passed on", kind: "pin", col: 1, row: 1, at: "DOUT", note: "What the chip did not keep goes out here to the next ring." },
      { id: "vcc", label: "5V", sub: "up to 720 mA", kind: "power", col: 0, row: 1, at: "VCC", note: "4.5 to 5.5 V. Colors shift if it sags: blue fades first." },
      { id: "gnd", label: "GND", kind: "ground", col: 0, row: 2, at: "GND", note: "Ground, shared with the board." },
    ],
    links: [
      { from: "din", to: "chip", kind: "data", label: "24 bits × 12" },
      { from: "chip", to: "dies", kind: "signal", label: "PWM" },
      { from: "dies", to: "light", kind: "light" },
      { from: "chip", to: "dout", kind: "data", label: "the rest" },
      { from: "vcc", to: "chip", kind: "power", label: "≤ 720 mA" },
      { from: "gnd", to: "chip", kind: "ground" },
    ],
    steps: [
      "Your board sends 24 bits per pixel (green, red, blue) on DIN, one after another, at 800 kHz.",
      "Pixel 0 keeps the first 24 bits and passes everything after them on. Pixel 1 does the same, all the way round.",
      "Each chip turns its three colors into fast PWM, 256 steps each, so you get any color.",
      "Hold DIN low for 50 µs or more and every pixel shows its new color together.",
    ],
  },
  facts: [
    { label: "Pixels", value: "12 × WS2812B" },
    { label: "Supply", value: "5 V (4.5–5.5 V)" },
    { label: "Current", value: "up to 720 mA" },
    { label: "Data", value: "1 wire, 800 kHz" },
    { label: "Diameter", value: "36.8 mm, 23.3 mm hole" },
    { label: "Colors", value: "16.7 million (24 bit)" },
  ],
  lab: { logic: 5, supply: [4.5, 5.5], tolerates5V: true },
  spec: {
    form: {
      mass: 3.3,
      mount: "solder",
      note: "Four solder pads, no connector and no mounting holes. Solder wires to the pads, or glue it on.",
    },
    power: {
      supply: { min: 4.5, max: 5.5, typ: 5 },
      logic: 5,
      tolerant5V: true,
      draw: { idle: 12, active: 240, peak: 720 },
      interface: "Single-wire data, 800 kHz, 24 bits a pixel (G, R, B)",
      note: "About 1 mA a pixel doing nothing, 20 mA per color, 60 mA a pixel at full white. 'Active' here is a third brightness on average. Data high must be at least 0.7 × the supply, so 3.5 V at 5 V.",
    },
    sourcing: { mpn: "WS2812B (Adafruit 1643 ring)", maker: "Worldsemi (chip), Adafruit (board)", lifecycle: "active", usd: [7, 12], note: "Some older boards carry the 6-pin WS2812S. Both work with the NeoPixel library." },
    limits: [
      "All twelve at full white take 720 mA, more than a USB port gives (500 mA). Dim to a quarter and it is about 180 mA.",
      "Data high must be 3.5 V at a 5 V supply. A 3.3 V pin (ESP32, Pico, Pi) is under that: it may work on short wires and fail when warm. Use a level shifter.",
      "The timing is strict, give or take 150 ns. It needs a fast chip or a hardware peripheral; interrupts glitch the colors on an AVR.",
      "One dead pixel cuts the data to every pixel after it.",
      "A charged supply hitting the first pixel can burn it: put a 1000 µF capacitor across the supply and 300 to 500 Ω in series with DIN.",
    ],
    upgrade: [
      { part: "level-shifter", name: "74AHCT125 or 74HCT245 level shifter", why: "Lifts a 3.3 V data pin to 5 V so the 3.5 V high level is met." },
      { name: "APA102 (DotStar) ring", why: "Clock and data, so the timing is relaxed and 3.3 V works with a shifter; it refreshes at 20 kHz against 400 Hz. It costs more and needs two wires." },
    ],
    refs: [
      "https://www.cl.cam.ac.uk/teaching/1516/ECAD+Arch/files/pcb/WS2812B.pdf",
      "https://forum.digikey.com/t/adafruit-industries-llc-1643-dimensions/28698",
      "https://core-electronics.com.au/neopixel-ring-12-x-ws2812-5050-rgb-led-with-integrated-drivers.html",
    ],
  },
  sim: { kind: "output" },
  animate: { lit: Array.from({ length: N }, (_, k) => `px-${k}`) },
  experiment: { title: "Spinner", idea: "Light one pixel and move it round the ring, then fade a tail behind it. Next make it show a sensor's value as an arc." },
  tags: ["neopixel", "ws2812b", "ring", "rgb", "addressable", "led", "output"],
});
