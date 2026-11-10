import { definePart, gnd, pin, vcc } from "../../sdk";

const W = 6;
const DEPTH = 5;
const H = 7;
const LEG_X = [0.46, 3, 5.54];

export default definePart({
  id: "ir-receiver",
  name: "VS1838B infrared receiver",
  aka: ["IR receiver", "TSOP1838", "38 kHz IR sensor", "KY-022", "IR remote receiver", "VS1838"],
  group: "controls",
  rank: 4,
  plan: "front",
  summary: "The eye that hears a TV remote. It answers only to infrared light that flashes 38,000 times a second, so sunlight and lamps do not fool it. Point the small 21-key remote at it and the output pin pulses low; your board turns those pulses into a button code.",
  size: { w: W, h: DEPTH, d: H },
  solids: [
    // The black epoxy body, with its dark IR-filter dome on the front face.
    { kind: "box", id: "body", x: 0, y: 0, w: W, h: DEPTH, d: H, z: 0, top: "#101114", side: "#08090a", radius: 0.5, finish: "epoxy", label: { text: "VS1838B", size: 0.9, color: "#9aa0a6" } },
    { kind: "cyl", id: "dome", cx: 3, cy: DEPTH + 0.35, r: 2.25, d: 0.7, z: H / 2 - 2.25 + 0.1, axis: "y", top: "#3a1515", finish: "epoxy" },
    { kind: "cyl", id: "dome-tip", cx: 3, cy: DEPTH + 1.0, r: 2.25, r2: 1.7, d: 0.6, z: H / 2 - 2.25 + 0.1, axis: "y", top: "#4d1c1c", finish: "epoxy" },
    // Three flat legs, 2.54 mm apart, about 12 mm long.
    { kind: "pins", x: LEG_X[0] - 1.27, y: 2.5 - 1.27, count: 3, pitch: 2.54, dir: "x", len: -12, z: 0, size: 0.5, finish: "tin" },
  ],
  features: [
    { id: "dome", label: "IR window", kind: "sensor", x: 0.8, y: 0.4, w: 4.4, h: 4.4, note: "A dark red lens that passes infrared and blocks most visible light. Behind it a tiny photodiode catches the flashes." },
    { id: "body", label: "Epoxy body", kind: "chip", x: 0, y: 0, w: 6, h: 7, note: "Black epoxy hides a photodiode and a small chip: amplifier, 38 kHz filter and demodulator. The 'VS1838B' mark is on it." },
    { id: "pins", label: "OUT, GND, VCC", kind: "pins", x: -0.1, y: 7, w: 6.2, h: 13, note: "Three legs, 2.54 mm apart. With the dome facing you the order is OUT, GND, VCC from left to right. On a KY-022 module the order is different, so read the printing." },
  ],
  pins: [
    pin("OUT", "digital", "out-digital", "Stays high while quiet. Goes low while a 38 kHz burst is coming in. A pull-up of 30 to 50 kΩ is built in.", { label: "OUT" }),
    gnd("GND"),
    vcc("VCC", "2.7 to 5.5 V. About 0.4 to 1.5 mA. A 100 nF capacitor close by keeps the output clean."),
  ],
  pinAt: {
    OUT: { x: LEG_X[0], y: H + 10 },
    GND: { x: LEG_X[1], y: H + 10 },
    VCC: { x: LEG_X[2], y: H + 10 },
  },
  circuit: {
    blocks: [
      { id: "remote", label: "Remote", sub: "IR LED, 38 kHz", kind: "world", col: 0, row: 0, note: "Each key sends a burst of infrared that flashes 38,000 times a second, switched on and off in a pattern that names the key." },
      { id: "window", label: "IR window", sub: "filters daylight", kind: "sensor", col: 1, row: 0, at: "dome", note: "Lets infrared in and blocks most visible light." },
      { id: "chip", label: "Amp and filter", sub: "38 kHz band-pass", kind: "ic", col: 2, row: 0, at: "body", note: "A photodiode, an amplifier that adjusts to bright light, a filter that passes only 38 kHz ±2 kHz, and a demodulator that strips the carrier." },
      { id: "out", label: "OUT", sub: "low while receiving", kind: "pin", col: 3, row: 0, at: "OUT", note: "Idle high. Each burst pulls it low; the gaps let it go high. The board sees the on-off pattern, not the 38 kHz." },
      { id: "vcc", label: "VCC", sub: "2.7 to 5.5 V", kind: "power", col: 2, row: 1, at: "VCC", note: "Powers the chip. About 1 mA." },
      { id: "gnd", label: "GND", kind: "ground", col: 3, row: 1, at: "GND", note: "Ground." },
    ],
    links: [
      { from: "remote", to: "window", kind: "light", label: "38 kHz bursts" },
      { from: "window", to: "chip", kind: "light" },
      { from: "chip", to: "out", kind: "signal", label: "low = burst" },
      { from: "vcc", to: "chip", kind: "power", label: "1 mA" },
      { from: "gnd", to: "chip", kind: "ground" },
    ],
    steps: [
      "You press a key. The remote's LED flashes at 38 kHz in bursts: a long start burst, then 32 short bits.",
      "The receiver passes only light flashing at about 38 kHz, so sunlight, lamps and screens are filtered out.",
      "The demodulator removes the 38 kHz. OUT falls for each burst and rises in each gap.",
      "Your board times those pulses. The IRremote library decodes the pattern into the remote's button code, such as 0xA2 for CH-.",
    ],
  },
  facts: [
    { label: "Carrier", value: "38 kHz" },
    { label: "Supply", value: "2.7 to 5.5 V" },
    { label: "Draw", value: "0.4 to 1.5 mA" },
    { label: "Range", value: "8 to 10 m, ±45°" },
    { label: "Output", value: "Active low" },
    { label: "Size", value: "6 × 5 × 7 mm" },
  ],
  spec: {
    form: {
      mass: 0.5,
      mount: "breadboard",
      pitch: 2.54,
      note: "Three legs 2.54 mm apart push into a breadboard row. On the KY-022 module the same chip sits on a 20 × 15 mm board with a 3-pin header: Ground, Vcc in the middle, Signal. The VS1838B-M module has VCC, OUT, GND.",
    },
    power: {
      supply: { min: 2.7, max: 5.5, typ: 5 },
      logic: 5,
      tolerant5V: true,
      draw: { idle: 0.5, active: 1, peak: 1.5 },
      interface: "Active-low demodulated output, 38 kHz carrier, NEC-style bursts",
      note: "The output has an internal pull-up of about 30 to 50 kΩ. Add a 100 nF capacitor and a 47 to 100 Ω resistor in the supply to keep noise off it. Works at 3.3 V.",
    },
    sourcing: { mpn: "VS1838B", maker: "Generic (a clone of the Vishay TSOP18xx)", lifecycle: "generic", usd: [0.1, 0.5], note: "The small remote that comes with it is an NEC-protocol, 21-key remote with a CR2025 cell." },
    limits: [
      "It answers only to a 38 kHz carrier. A plain IR LED switched on and off sends it nothing.",
      "Bright sunlight and incandescent bulbs can saturate it and hold the output low.",
      "The VS1838B reaches 8 to 10 m. A genuine Vishay part reaches much farther.",
      "The bare part's pin order (OUT, GND, VCC) is not the module's (GND, VCC, S). Check before you power it.",
      "IRremote uses a hardware timer. On an Uno that clashes with tone() and PWM on pins 3 and 11.",
    ],
    upgrade: [{ name: "Vishay TSOP38238 or TSOP4838", why: "The genuine part: range up to 45 m, much better at ignoring sunlight and noisy bursts, and the same pinout." }],
    refs: [
      "https://cdn.shopify.com/s/files/1/2822/2674/files/VS1838B-M-WCON_Manual.pdf",
      "https://protosupplies.com/product/ir-receiver-module/",
    ],
  },
  sim: {
    kind: "sensor",
    reads: [{ key: "burst", label: "Remote key", min: 0, max: 1, step: 1, start: 0, sweep: [0, 1, 3], states: ["Quiet", "Receiving"] }],
    trips: [{ pin: "OUT", key: "burst", when: "above", at: 0.5, activeLow: true }],
  },
  experiment: { title: "Read the remote", idea: "Print each button's code with the IRremote library, then make a different LED light for each of three keys." },
  tags: ["ir", "infrared", "receiver", "remote", "vs1838b", "38khz", "tsop1838", "ky-022", "input", "control"],
});
