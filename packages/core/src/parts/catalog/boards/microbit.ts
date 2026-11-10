import { MATERIAL, PCB_TOP, board, chip, definePart, ground, io, jst, microUsb, rail, silk, smd, tactileButton, type Solid } from "../../sdk";

const TOP = PCB_TOP;
const RING_X = [5, 15.5, 26, 36.5, 47];
const RING_Y = 38.5;
const RING_R = 2.7;
const PAD_Y = 40.8;

// The 20 small pads, five between each pair of big rings, left to right.
const SMALL = ["P3", "P4", "P5", "P6", "P7", "P8", "P9", "P10", "P11", "P12", "P13", "P14", "P15", "P16", "P17", "P18", "P19", "P20", "P21", "P22"];
const smallX = (i: number) => RING_X[Math.floor(i / 5)] + 5.25 + ((i % 5) - 2) * 1;

/** One LED of the 5 × 5 matrix: a small dark-red block that glows red. */
function led(i: number): Solid {
  const col = i % 5;
  const row = Math.floor(i / 5);
  const cx = 26 + (col - 2) * 3.4;
  const cy = 18.8 + (row - 2) * 3.4;
  return { kind: "box", id: `led-${i}`, x: cx - 1.1, y: cy - 0.7, w: 2.2, h: 1.4, d: 0.7, z: TOP, top: "#6b1d22", side: "#3a1013", glow: "#ff3b30", radius: 0.3, finish: "plastic" };
}

/** The gold touch logo, as a plain oval. */
function oval(cx: number, cy: number, rx: number, ry: number): Solid {
  const path = `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx - rx} ${cy} Z`;
  return { kind: "extrude", path, d: 0.12, z: TOP, top: MATERIAL.gold, finish: "gold" };
}

const battery = jst(13, 3.75, 2, "top");

const rings = RING_X.map((x) => ({ x, y: RING_Y, d: 3, ring: false as const }));

const smallPads: Solid[] = SMALL.map((_, i): Solid => ({ kind: "box", x: smallX(i) - 0.35, y: PAD_Y - 1.2, w: 0.7, h: 2.4, d: 0.05, z: TOP, top: MATERIAL.gold, finish: "gold", radius: 0.1 }));
const pad = (id: string) => ({ x: smallX(SMALL.indexOf(id)), y: PAD_Y });

export default definePart({
  id: "microbit",
  name: "BBC micro:bit",
  aka: ["micro:bit V2", "microbit", "BBC micro bit"],
  group: "boards",
  rank: 9,
  summary: "A classroom board with a 5×5 LED display, two buttons, motion sensors, a speaker, a microphone and radio, all built in. Programs in blocks, Python or C++ with nothing extra to buy.",
  size: { w: 52, h: 42, d: 7.6 },
  solids: [
    board(52, 42, "#17181b", { radius: 3, holes: rings }),
    // The five big rings: gold copper round a drilled hole, sized for crocodile clips and 4 mm plugs.
    ...RING_X.map((x): Solid => ({ kind: "disc", cx: x, cy: RING_Y, r: 1.5, color: "#0b0c0e", hole: true, ring: { color: MATERIAL.gold, width: RING_R - 1.5 } })),
    ...smallPads,
    ...Array.from({ length: 25 }, (_, i) => led(i)),
    tactileButton(5, 16, 6, "btn-a"),
    tactileButton(41, 16, 6, "btn-b"),
    microUsb(22, -1, TOP, "top"),
    tactileButton(31, 1.5, 3, "reset"),
    battery,
    chip(36, 3.5, 6, 6, "nRF52833", 0.9),
    // The little capacitors and resistors round the radio chip and the battery socket.
    smd(35, 4, "c", "y"),
    smd(35, 6.5, "c", "y"),
    smd(43, 4, "c", "y"),
    smd(43, 6.5, "r", "y"),
    smd(37, 10.6, "c", "x"),
    smd(40, 10.6, "r", "x"),
    smd(10, 8.6, "r", "x"),
    smd(17, 8.6, "c", "x"),
    // The microphone port, with its tiny indicator LED beside it.
    { kind: "disc", cx: 26, cy: 6, r: 0.55, color: "#0b0c0e", ring: { color: MATERIAL.tin, width: 0.35 } },
    { kind: "box", id: "led-mic", x: 27.6, y: 5.6, w: 0.9, h: 0.8, d: 0.4, z: TOP, top: "#8a5a12", side: "#4a3008", glow: "#ffb020", radius: 0.1, finish: "plastic" },
    // The touch logo.
    oval(26, 31.2, 3.2, 1.5),
    silk(8, 25.4, "A", 1.6, MATERIAL.silk, { weight: 700, anchor: "middle" }),
    silk(44, 25.4, "B", 1.6, MATERIAL.silk, { weight: 700, anchor: "middle" }),
    silk(5, 34.8, "0", 1.4, MATERIAL.silk, { anchor: "middle" }),
    silk(15.5, 34.8, "1", 1.4, MATERIAL.silk, { anchor: "middle" }),
    silk(26, 34.8, "2", 1.4, MATERIAL.silk, { anchor: "middle" }),
    silk(36.5, 34.8, "3V", 1.4, MATERIAL.silk, { anchor: "middle" }),
    silk(47, 34.8, "GND", 1.4, MATERIAL.silk, { anchor: "middle" }),
    silk(13, 9.8, "BATT", 0.9, MATERIAL.silk, { anchor: "middle" }),
    silk(32.5, 6.8, "RESET", 0.8, MATERIAL.silk, { anchor: "middle" }),
    silk(26, 9, "MIC", 0.8, MATERIAL.silk, { anchor: "middle" }),
  ],
  features: [
    { id: "matrix", label: "5×5 LED display", kind: "led", x: 18, y: 11.4, w: 16.4, h: 14.8, note: "25 red LEDs that show letters, numbers and small pictures. They can also sense light." },
    { id: "btn-a", label: "Button A", kind: "button", x: 5, y: 16, w: 6, h: 6, note: "A momentary button on GPIO; read with input or an event." },
    { id: "btn-b", label: "Button B", kind: "button", x: 41, y: 16, w: 6, h: 6, note: "The second button. Press both for a third event." },
    { id: "edge", label: "Edge connector", kind: "pins", x: 0, y: 35.5, w: 52, h: 6.5, note: "Five big rings for crocodile clips (0, 1, 2, 3V, GND) and 20 small pads between them for an edge-connector breakout." },
    { id: "usb", label: "Micro-USB", kind: "port", x: 22, y: -1, w: 7.5, h: 5.6, note: "Shows up as a drive; drop a .hex file on it to program." },
    { id: "batt", label: "Battery connector", kind: "connector", x: 10, y: 1.5, w: 6, h: 4.5, note: "JST socket for a 2×AAA pack." },
    { id: "mcu", label: "nRF52833", kind: "chip", x: 36, y: 3.5, w: 6, h: 6, note: "64 MHz Cortex-M4 with Bluetooth and the 2.4 GHz radio used for micro:bit-to-micro:bit messages." },
    { id: "mic", label: "Microphone", kind: "sensor", x: 24.5, y: 4.5, w: 5, h: 3, note: "Measures loudness; an LED beside it lights while it listens." },
    { id: "reset", label: "Reset button", kind: "button", x: 31, y: 1.5, w: 3, h: 3, note: "Restarts your program." },
    { id: "logo", label: "Touch logo", kind: "sensor", x: 22.8, y: 29.7, w: 6.4, h: 3, note: "A gold pad that works as a capacitive touch input." },
  ],
  pins: [
    rail("3V", "3V", 3.3, "left", { accepts: [1.8, 3.6], note: "3.3 V out. It can also feed the board from 1.8 to 3.6 V, for example from a battery pack." }),
    ground("GND1", "left"),
    io("P0", "P0", "left", ["analog", "digital", "pwm"]),
    io("P1", "P1", "left", ["analog", "digital", "pwm"]),
    io("P2", "P2", "left", ["analog", "digital", "pwm"]),
    ground("GND2", "right"),
    io("P8", "P8", "right", ["digital", "pwm"]),
    io("P12", "P12", "right", ["digital", "pwm"]),
    io("P13", "P13 SCK", "right", ["digital", "sck"]),
    io("P14", "P14 MISO", "right", ["digital", "miso"]),
    io("P15", "P15 MOSI", "right", ["digital", "mosi"]),
    io("P16", "P16", "right", ["digital", "pwm", "cs"]),
    io("P19", "P19 SCL", "right", ["digital", "scl"]),
    io("P20", "P20 SDA", "right", ["digital", "sda"]),
  ],
  pinTable: [
    { name: "P0 / P1 / P2", role: "analog", note: "Large rings; digital or analog, with crocodile clips" },
    { name: "P3–P16", role: "digital", note: "Small edge pads; some are shared with the display" },
    { name: "P19 / P20", role: "i2c", note: "SCL and SDA, shared with the onboard accelerometer" },
    { name: "P13 / P14 / P15", role: "spi", note: "SCK, MISO, MOSI" },
    { name: "3V", role: "power", note: "3.3 V out, about 190 mA spare on the V2 over USB (90 mA on the V1)" },
    { name: "GND", role: "ground", note: "Ground ring" },
  ],
  pinAt: {
    "3V": { x: RING_X[3], y: RING_Y },
    GND1: { x: RING_X[4], y: RING_Y },
    P0: { x: RING_X[0], y: RING_Y },
    P1: { x: RING_X[1], y: RING_Y },
    P2: { x: RING_X[2], y: RING_Y },
    GND2: pad("P21"),
    P8: pad("P8"),
    P12: pad("P12"),
    P13: pad("P13"),
    P14: pad("P14"),
    P15: pad("P15"),
    P16: pad("P16"),
    P19: pad("P19"),
    P20: pad("P20"),
  },
  lab: { controller: true, logic: 3.3, tolerates5V: false },
  circuit: {
    blocks: [
      { id: "usb", label: "Micro-USB", sub: "5 V, drag-and-drop", kind: "connector", col: 0, row: 0, at: "usb", note: "Power and programming." },
      { id: "batt", label: "Battery", sub: "2 × AAA", kind: "connector", col: 0, row: 2, at: "batt", note: "Runs it away from the computer." },
      { id: "iface", label: "Interface chip", sub: "KL27", kind: "ic", col: 1, row: 0, at: { x: 19, y: 8 }, note: "On the back of the board. Presents the board as a USB drive and programs the main chip." },
      { id: "reg", label: "3.3 V regulator", kind: "regulator", col: 1, row: 2, at: { x: 31, y: 9 }, note: "On the back of the board. Everything runs at 3.3 V." },
      { id: "mcu", label: "nRF52833", sub: "64 MHz, BLE", kind: "mcu", col: 2, row: 1, at: "mcu", note: "Runs your program and the radio." },
      { id: "display", label: "LED display", sub: "5 × 5", kind: "display", col: 3, row: 0, at: "matrix", note: "Scanned row by row, faster than the eye can see." },
      { id: "inputs", label: "Buttons + sensors", sub: "A, B, touch, motion", kind: "sensor", col: 3, row: 1, at: "btn-a", note: "Accelerometer and compass over I2C; microphone and buttons on GPIO." },
      { id: "edge", label: "Edge connector", sub: "P0–P20", kind: "pin", col: 3, row: 2, at: "edge", note: "Your pins, at 3.3 V." },
    ],
    links: [
      { from: "usb", to: "iface", kind: "data", label: "USB" },
      { from: "usb", to: "reg", kind: "power", label: "5 V" },
      { from: "batt", to: "reg", kind: "power", label: "3 V" },
      { from: "iface", to: "mcu", kind: "data", label: "SWD" },
      { from: "reg", to: "mcu", kind: "power", label: "3.3 V" },
      { from: "mcu", to: "display", kind: "signal" },
      { from: "inputs", to: "mcu", kind: "signal" },
      { from: "mcu", to: "edge", kind: "signal", both: true },
    ],
    steps: [
      "USB or the battery pack supplies power, regulated to 3.3 V.",
      "The interface chip shows the board as a USB drive and writes the .hex you drop on it into the nRF52833.",
      "The nRF52833 runs your program, scans the LED display, reads the buttons and sensors, and talks over Bluetooth or micro:bit radio.",
      "The edge connector carries the same GPIO out to crocodile clips or a breakout board.",
    ],
  },
  facts: [
    { label: "Logic", value: "3.3 V" },
    { label: "Clock", value: "64 MHz Cortex-M4" },
    { label: "Memory", value: "512 KB flash, 128 KB RAM" },
    { label: "Built in", value: "25 LEDs, 2 buttons, touch logo, motion, compass, mic, speaker, radio" },
    { label: "Pins", value: "3 big rings + 20 small edge pads" },
    { label: "Size", value: "52 × 42 mm" },
  ],
  spec: {
    form: {
      mass: 8,
      mount: "socket",
      pitch: 1.27,
      holes: rings.map(({ x, y, d }) => ({ x, y, d })),
      note: "Plugs into an edge-connector breakout, or the five big rings take crocodile clips and 4 mm banana plugs.",
    },
    power: {
      supply: { min: 1.8, max: 3.6, typ: 3 },
      logic: 3.3,
      tolerant5V: false,
      rails: [{ pin: "3V", volts: 3.3, maxMa: 190, note: "On the V2 while powered over USB (90 mA on the V1). On a battery pack the pack is the limit." }],
      gpio: { maxMa: 5 },
      interface: "nRF52833, 64 MHz Cortex-M4F, 512 KB flash, 128 KB RAM, Bluetooth LE and a 2.4 GHz radio",
    },
    sourcing: { mpn: "nRF52833", maker: "Micro:bit Educational Foundation (chip by Nordic Semiconductor)", lifecycle: "active", usd: [15, 25] },
    limits: [
      "Every pad is 3.3 V only. 5 V on a pin can damage the chip.",
      "One pin gives about 5 mA, which lights one LED and no more; use a transistor for a motor or a buzzer.",
      "While the LED matrix is on, P3, P4, P6, P7, P9 and P10 are used by it, and P5 and P11 by buttons A and B. That leaves P0, P1, P2, P8, P12 to P16 and the I2C pair P19 and P20.",
      "The 3V pad gives about 190 mA on the V2 over USB (90 mA on the V1). A servo or a strip of LEDs wants its own supply.",
      "Only the three big rings (and 3V and GND) take crocodile clips. The small pads are 1 mm apart: use an edge-connector breakout.",
    ],
    upgrade: [
      { part: "raspberry-pi-pico", name: "Raspberry Pi Pico", why: "26 GPIO instead of about 20, three 12-bit analog inputs, two cores at 133 MHz and 264 KB of RAM. Pins are on a breadboard-friendly 0.1 inch pitch." },
      { part: "esp32", name: "ESP32 DevKit", why: "About 25 usable pins, two cores at 240 MHz, 520 KB of RAM and Wi-Fi as well as Bluetooth. Its 3.3 V regulator gives around 500 mA to accessories." },
    ],
    refs: ["https://tech.microbit.org/hardware/", "https://tech.microbit.org/hardware/edgeconnector/", "https://infocenter.nordicsemi.com/pdf/nRF52833_PS_v1.5.pdf"],
  },
  animate: { lit: ["led-6", "led-8", "led-12", "led-16", "led-18"] },
  experiment: { title: "Dice", idea: "Show a random number on the display when the board is shaken, using the accelerometer." },
  tags: ["microbit", "micro:bit", "bbc", "classroom", "nrf52", "3.3v", "board", "education"],
});
