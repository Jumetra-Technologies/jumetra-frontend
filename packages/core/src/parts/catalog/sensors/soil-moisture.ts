import { MATERIAL, PCB_TOP, definePart, gnd, lead, name, pin, pinHeader, roundedRect, shade, silk, smd, smdLed, soic, trimmer, vcc, type Solid } from "../../sdk";
import { MODULE_BLUE } from "./_ir";

// The YL-69 probe (a black fork, 60 × 20 mm) and the YL-38 comparator board (32 × 14 mm), joined by a two-wire lead.
// The board sits top right; the probe lies below it with its tines pointing left.
const BX = 28; // the comparator board's left edge
const PROBE = "M 60 20 H 3 L 0 23 V 27.5 H 40 V 32.5 H 0 V 37 L 3 40 H 60 Z";
const header = pinHeader(BX + 30.4, 3.19, 4, { dir: "y", style: "up" });

const pad = (cx: number, cy: number, r = 1.1): Solid[] => [
  { kind: "disc", cx, cy, r, color: MATERIAL.gold, z: PCB_TOP },
  { kind: "dome", cx, cy, r: r * 0.75, d: 0.45, z: PCB_TOP, color: MATERIAL.tin, finish: "tin" },
];

export default definePart({
  id: "soil-moisture",
  name: "Soil moisture sensor",
  aka: ["hygrometer probe", "FC-28", "YL-69", "soil sensor"],
  group: "sensors",
  rank: 19,
  summary: "A two-pronged probe you push into a flowerpot and a small board that turns 'how well does the soil conduct' into a number and a wet/dry switch.",
  size: { w: 60, h: 40, d: 12.4 },
  solids: [
    // The comparator board.
    { kind: "extrude", id: "pcb", path: roundedRect(BX, 0, 32, 14, 0.4), d: 1.6, top: MODULE_BLUE, side: shade(MODULE_BLUE, 0.55), finish: "soldermask" },
    ...soic(BX + 18, 7, 4, "LM393", { dir: "x", id: "lm393" }),
    ...trimmer(BX + 8.5, 7.4, "x", -1, "pot"),
    smdLed(BX + 22.2, 2.6, "#ff4d4d", "led-pwr"),
    smdLed(BX + 22.2, 11.4, "#ff4d4d", "led-d0"),
    ...smd(BX + 21.0, 4.9, "r", "y"),
    ...smd(BX + 21.0, 7.8, "r", "y"),
    ...smd(BX + 24.2, 5.2, "c", "y"),
    ...smd(BX + 14.6, 10.8, "r", "x"),
    ...pad(BX + 1.5, 5.73),
    ...pad(BX + 1.5, 8.27),
    header,
    silk(BX + 28.9, 3.19 + 0.3, "VCC", 0.8, MATERIAL.silk, { anchor: "end" }),
    silk(BX + 28.9, 5.73 + 0.3, "GND", 0.8, MATERIAL.silk, { anchor: "end" }),
    silk(BX + 28.9, 8.27 + 0.3, "D0", 0.8, MATERIAL.silk, { anchor: "end" }),
    silk(BX + 28.9, 10.81 + 0.3, "A0", 0.8, MATERIAL.silk, { anchor: "end" }),
    silk(BX + 23.8, 2.9, "PWR", 0.7, MATERIAL.silk),
    silk(BX + 23.8, 11.7, "D0", 0.7, MATERIAL.silk),
    silk(BX + 17, 13.2, "YL-38", 0.9, MATERIAL.silk, { anchor: "middle" }),
    // The probe: a black fork with two flat gold-plated tines.
    { kind: "extrude", id: "probe", path: PROBE, d: 1.6, top: "#17181b", side: "#0b0b0d", finish: "soldermask" },
    { kind: "path", d: "M 3 20.9 H 40.4 V 26.6 H 1.1 V 23.4 Z", fill: MATERIAL.gold, color: "#b08a3a", width: 0.15, z: PCB_TOP + 0.01 },
    { kind: "path", d: "M 3 39.1 H 40.4 V 33.4 H 1.1 V 36.6 Z", fill: MATERIAL.gold, color: "#b08a3a", width: 0.15, z: PCB_TOP + 0.01 },
    ...pad(46.5, 22.9),
    ...pad(49.5, 22.9),
    silk(50, 36.5, "YL-69", 1.1, "#d6d8dc", { anchor: "middle", weight: 700 }),
    silk(44, 31.0, "HL-69", 0.8, "#d6d8dc", { anchor: "middle" }),
    // The two-wire lead, lying on the bench between the board and the probe.
    ...lead(
      [
        [BX + 1.5, 5.73, 2.0],
        [26, 6.5, 1.0],
        [22, 10, 0.6],
        [24, 15.5, 0.6],
        [34, 17.2, 0.6],
        [42, 18.4, 1.2],
        [44.8, 20.8, 2.1],
        [49.5, 22.9, 2.1],
      ],
      "#d12d2d",
      { r: 0.4, strip: 0.8 },
    ),
    ...lead(
      [
        [BX + 1.5, 8.27, 2.0],
        [26.4, 9, 1.0],
        [23.8, 12, 0.6],
        [25.5, 16.4, 0.6],
        [34.5, 18.4, 0.6],
        [41, 19.3, 1.3],
        [43.6, 21.3, 2.1],
        [46.5, 22.9, 2.1],
      ],
      "#17181b",
      { r: 0.4, strip: 0.8 },
    ),
  ],
  features: [
    { id: "tines", label: "Probe tines", kind: "sensor", x: 0, y: 20, w: 40, h: 20, note: "Two bare gold-plated tracks. Wet soil between them conducts better, so the resistance between the tines drops. Current flows through the soil all the time, and that wears the plating away." },
    { id: "lead", label: "Probe lead", kind: "connector", x: 22, y: 5, w: 28, h: 19, note: "Two wires. To the board the probe is just a resistor that changes with moisture. The real lead is about 20 cm long." },
    { id: "pot", label: "Threshold trimmer", kind: "mechanical", x: BX + 3.75, y: 5, w: 9.5, h: 4.8, note: "Sets the moisture level at which D0 switches. Clockwise makes it trip on drier soil." },
    { id: "lm393", label: "LM393 comparator", kind: "chip", x: BX + 15.5, y: 5, w: 5, h: 4, note: "Compares the probe voltage with the trimmer and drives D0." },
    { id: "leds", label: "Power and D0 LEDs", kind: "led", x: BX + 21.4, y: 1.8, w: 1.6, h: 10.4, note: "The top one shows power; the bottom one lights when D0 says 'wet'." },
    { id: "header", label: "VCC, GND, D0, A0", kind: "pins", x: BX + 29.1, y: 1.9, w: 2.6, h: 10.2, note: "A0 gives the raw level to an analog pin; D0 is a wet/dry switch. Some boards print A0 D0 GND VCC from the other end; read yours." },
  ],
  pins: [
    vcc("VCC", "3.3 V to 5 V supply. About 15 mA, and the probe's current is part of it. Power it from a spare pin only while you read, so the tines last longer."),
    gnd("GND"),
    pin("D0", "digital", "out-digital", "Goes low when the soil is wetter than the trimmer setting. It swings to the supply voltage.", { label: "D0", required: false }),
    pin("A0", "analog", "out-analog", "The raw moisture level. Wetter soil gives a lower voltage.", { label: "A0", required: false }),
  ],
  pinAt: { ...name(header, "VCC", "GND", "D0", "A0") },
  circuit: {
    blocks: [
      { id: "soil", label: "Soil", sub: "water between tines", kind: "world", col: 0, row: 0, note: "Wet soil conducts; dry soil barely does." },
      { id: "probe", label: "Probe tines", sub: "resistance ↓ when wet", kind: "sensor", col: 1, row: 0, at: "tines", note: "The probe is simply a resistor made of soil." },
      { id: "div", label: "Divider", sub: "10 kΩ on module", kind: "passive", col: 2, row: 0, at: { x: BX + 22.6, y: 6.5 }, note: "Probe plus fixed resistor: a voltage that falls as the soil gets wetter." },
      { id: "a0", label: "A0", sub: "raw level", kind: "pin", col: 3, row: 0, at: "A0", note: "Read with analogRead; calibrate dry and wet for your soil." },
      { id: "cmp", label: "LM393", sub: "comparator", kind: "ic", col: 2, row: 1, at: "lm393", note: "Flips D0 when the divider crosses the trimmer setting." },
      { id: "pot", label: "Threshold pot", kind: "passive", col: 1, row: 1, at: "pot", note: "Your 'dry enough' setting." },
      { id: "d0", label: "D0", sub: "wet / dry", kind: "pin", col: 3, row: 1, at: "D0", note: "A clean digital yes/no." },
      { id: "vcc", label: "VCC 3.3–5 V", kind: "power", col: 0, row: 1, at: "VCC", note: "Power the probe only while reading to slow corrosion of the tines." },
    ],
    links: [
      { from: "soil", to: "probe", kind: "physical", label: "moisture" },
      { from: "vcc", to: "probe", kind: "power" },
      { from: "probe", to: "div", kind: "analog" },
      { from: "div", to: "a0", kind: "analog", label: "0–VCC" },
      { from: "div", to: "cmp", kind: "analog" },
      { from: "pot", to: "cmp", kind: "analog" },
      { from: "cmp", to: "d0", kind: "signal" },
    ],
    steps: [
      "Current passes from one tine to the other through the soil; the wetter it is, the lower the resistance.",
      "On the module the probe forms a divider with a fixed resistor, so A0 drops as the soil gets wetter: about 1023 dry and about 300 wet on a 10-bit ADC, but every probe and every soil is different.",
      "The LM393 compares that voltage with the trimmer and pulls D0 low past the threshold; the second LED shows it.",
      "Power the probe only while reading (use a digital pin as its VCC) to slow corrosion of the tines.",
    ],
  },
  facts: [
    { label: "Output", value: "Analog + digital" },
    { label: "Supply", value: "3.3–5 V, about 15 mA" },
    { label: "Probe", value: "60 × 20 mm" },
    { label: "Reading", value: "dry ≈ 1023, wet ≈ 300" },
    { label: "Threshold", value: "Trimmer on module" },
    { label: "Caveat", value: "Corrodes if powered constantly" },
  ],
  lab: { logic: 5, supply: [3.3, 5], tolerates5V: true },
  spec: {
    form: {
      mount: "jumpers",
      pitch: 2.54,
      note: "The probe pushes into the soil up to the head, never past it. The board stays dry, and its four pins take jumper wires.",
    },
    power: {
      supply: { min: 3.3, max: 5, typ: 5 },
      logic: 5,
      tolerant5V: true,
      draw: { idle: 5, active: 15, peak: 20 },
      interface: "A0 analog level (wet = lower), D0 wet/dry switch",
    },
    sourcing: { mpn: "YL-69 probe with YL-38 board (also sold as HL-69 and FC-28)", maker: "Generic", lifecycle: "generic", usd: [0.5, 2] },
    limits: [
      "The resistive fork corrodes: current runs through the tines and the soil all the time, so the plating wears away. Powered continuously, a probe can be ruined in a few weeks.",
      "Readings drift as the tines corrode, and they follow how salty the soil is as well as how wet.",
      "It is not calibrated. There is no percent-of-water reading; every probe needs its own dry and wet numbers.",
      "A0 runs backward: dry is high and wet is low.",
      "The current rises as the soil gets wetter, and the board's two LEDs add to it.",
    ],
    upgrade: [
      { name: "Capacitive soil moisture sensor v1.2", why: "No bare metal in the soil, so nothing corrodes. It is a black blade 98 × 23 mm with three pins (GND, VCC, AOUT), runs from 3.3 V to 5.5 V on a few mA, and gives about 3.0 V in dry air falling to about 1.5 V submerged at 3.3 V. Coat the board edges, or the unsealed edge wicks water and fails within weeks. Buy ones with a TLC555 timer: clones with an NE555 misbehave at 3.3 V." },
    ],
    refs: [
      "https://components101.com/node/797",
      "https://docs.cirkitdesigner.com/component/68732658-5ef5-45b1-9f77-2dd83ca25399/yl-69",
      "https://tinkered.ai/components/capacitive-soil-moisture-v12",
      "https://www.atomic14.com/esp32/sensors/capacitive-soil/",
    ],
  },
  experiment: { title: "Plant that asks for water", idea: "Read A0 every minute and print it, turn an LED on when it climbs above your 'dry' number, then water the pot and watch it fall." },
  tags: ["soil", "moisture", "hygrometer", "plant", "water", "analog", "lm393", "sensor"],
});
