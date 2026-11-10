import { board, definePart, gnd, ground, inductor, rail, silk, smd, smdDiode, sot23, trimmer, vcc } from "../../sdk";
import { MODULE_BLUE, PAD_PRINT, c1206 } from "./_modules";

// The blue MT3608 step-up module, 37.2 × 17.2 mm. Input pads on the left edge, output pads on the right.
const W = 37.2;
const H = 17.2;
const VIN_POS = { x: 2.2, y: 2.4 };
const VIN_NEG = { x: 2.2, y: 14.8 };
const VOUT_POS = { x: 35, y: 2.4 };
const VOUT_NEG = { x: 35, y: 14.8 };

export default definePart({
  id: "boost-converter",
  name: "MT3608 boost converter module",
  aka: ["MT3608 step-up", "DC-DC step up module", "adjustable boost converter", "2A step up module"],
  group: "power",
  rank: 9,
  summary: "A thumb-sized board that raises a low voltage to a higher one: one LiPo cell (3.7 V) to 5 V, 9 V or 12 V. Turn the brass screw to set it. It is sold as 2 A, but from a single cell you get about 0.65 A at 5 V.",
  size: { w: W, h: H, d: 11.6 },
  solids: [
    board(W, H, MODULE_BLUE, {
      radius: 0,
      holes: [
        { x: VIN_POS.x, y: VIN_POS.y, d: 1.5 },
        { x: VIN_NEG.x, y: VIN_NEG.y, d: 1.5 },
        { x: VOUT_POS.x, y: VOUT_POS.y, d: 1.5 },
        { x: VOUT_NEG.x, y: VOUT_NEG.y, d: 1.5 },
      ],
    }),
    // The chip is a six-pin SOT-23; the board is marked for the maker's own code.
    sot23(21.5, 8.5, { five: true, label: "A2SHB", dir: "x" }),
    inductor(13.5, 8.6, 6, "220", 3),
    smdDiode(24.6, 13.2, "x", 1, "sma"),
    c1206(5.9, 6.7, "x"),
    c1206(5.9, 10.5, "x"),
    c1206(30.4, 10.6, "y"),
    c1206(32.6, 10.6, "y"),
    trimmer(27.5, 3.6, "x", 1, "trimmer"),
    smd(18.6, 5.4, "r", "x"),
    smd(18.6, 11.4, "r", "x"),
    smd(24.2, 8.1, "r", "y"),
    smd(25.9, 8.1, "c", "y"),
    silk(4.3, 3, "IN+", 1.1, PAD_PRINT),
    silk(4.3, 16, "IN−", 1.1, PAD_PRINT),
    silk(33.2, 3, "OUT+", 1.1, PAD_PRINT, { anchor: "end" }),
    silk(33.2, 16, "OUT−", 1.1, PAD_PRINT, { anchor: "end" }),
    silk(9.5, 16.3, "MT3608", 1.1, PAD_PRINT),
    silk(13.6, 14.6, "DC-DC STEP UP", 1, PAD_PRINT),
  ],
  features: [
    { id: "pads-in", label: "Input pads (IN+, IN−)", kind: "power", x: 0.8, y: 1, w: 2.8, h: 14.8, note: "The low voltage goes here, 2 V to 24 V. It must be lower than the output you set." },
    { id: "pads-out", label: "Output pads (OUT+, OUT−)", kind: "power", x: 33.6, y: 1, w: 2.8, h: 14.8, note: "The boosted voltage, 5 V to 28 V. Never set it above 28 V: the chip dies." },
    { id: "chip", label: "MT3608 chip (SOT-23)", kind: "chip", x: 19.9, y: 7.4, w: 3.2, h: 2.2, note: "A tiny switch that turns the input on and off 1.2 million times a second. Its 4 A limit caps the current you can draw." },
    { id: "inductor", label: "Inductor (22 µH)", kind: "other", x: 10.5, y: 5.6, w: 6, h: 6, note: "A coil that is charged while the chip is on and dumps its energy to the output while it is off. This is the step-up trick." },
    { id: "diode", label: "Schottky diode (SS14)", kind: "other", x: 22.2, y: 11.9, w: 5.4, h: 2.6, note: "Lets the coil's energy out to the output but stops it flowing back. Drops about 0.4 V. With the chip off, input passes through it to the output." },
    { id: "cap-in", label: "Input capacitors", kind: "other", x: 4.3, y: 5.9, w: 3.4, h: 5.4, note: "22 µF ceramic. Takes the pulses of input current, which are bigger than the output current." },
    { id: "cap-out", label: "Output capacitors", kind: "other", x: 29.5, y: 8.9, w: 4.2, h: 3.4, note: "22 µF ceramic. Smooths the output. Ripple is under 100 mV." },
    { id: "trimmer", label: "Voltage trimmer", kind: "mechanical", x: 22.7, y: 1.2, w: 9.6, h: 4.8, note: "A multi-turn screw that sets the output. Turn it clockwise to raise the output on most boards. It is touchy: set it with a meter first." },
  ],
  pins: [
    vcc("IN_POS", "Input +, 2 V to 24 V. It must be below the output voltage.", { label: "IN+", accepts: [2, 24] }),
    gnd("IN_NEG", "Input ground. Joined to OUT− on the board.", { label: "IN−" }),
    rail("OUT_POS", "OUT+", 5, "left", { note: "The set voltage, 5 V to 28 V (the shop sets it to 5 V on most boards). Only about 0.65 A at 5 V from one LiPo cell." }),
    ground("OUT_NEG", "left", "OUT−", { note: "Output ground. The same copper as IN−: this is not isolated." }),
  ],
  pinAt: { IN_POS: VIN_POS, IN_NEG: VIN_NEG, OUT_POS: VOUT_POS, OUT_NEG: VOUT_NEG },
  circuit: {
    blocks: [
      { id: "src", label: "LiPo cell", sub: "3.7 V", kind: "world", col: 0, row: 0, note: "One lithium cell, 3.0 V to 4.2 V. It must give more current than the load because the converter takes it all in as lower volts." },
      { id: "in", label: "IN+", sub: "input", kind: "power", col: 1, row: 0, at: "IN_POS", note: "The input pad." },
      { id: "cin", label: "Input capacitors", sub: "22 µF", kind: "passive", col: 2, row: 0, at: "cap-in", note: "Soak up the current pulses." },
      { id: "coil", label: "Inductor", sub: "22 µH", kind: "passive", col: 3, row: 0, at: "inductor", note: "Stores energy when the chip is on." },
      { id: "ic", label: "MT3608", sub: "switch", kind: "regulator", col: 4, row: 0, at: "chip", hot: true, note: "Connects the coil to ground, then lets go. The kick when it lets go is higher than the input." },
      { id: "diode", label: "SS14 diode", sub: "one way", kind: "passive", col: 5, row: 0, at: "diode", note: "Lets the kick through to the output and blocks the return." },
      { id: "cout", label: "Output capacitors", sub: "22 µF", kind: "passive", col: 6, row: 0, at: "cap-out", note: "Hold the output up between pulses." },
      { id: "trim", label: "Trimmer", sub: "sets Vout", kind: "passive", col: 4, row: 1, at: "trimmer", note: "Sets the point where the chip decides the output is high enough." },
      { id: "out", label: "OUT+", sub: "5–28 V", kind: "power", col: 7, row: 0, at: "OUT_POS", note: "Input current is output current times (Vout ÷ Vin) and more: 0.5 A at 5 V from 3.7 V takes about 0.76 A in." },
      { id: "gnd", label: "GND", kind: "ground", col: 7, row: 1, at: "OUT_NEG", note: "Shared by input and output." },
    ],
    links: [
      { from: "src", to: "in", kind: "power", label: "3.7 V" },
      { from: "in", to: "cin", kind: "power" },
      { from: "cin", to: "coil", kind: "power" },
      { from: "coil", to: "ic", kind: "power", label: "on / off" },
      { from: "ic", to: "diode", kind: "power", label: "kick" },
      { from: "diode", to: "cout", kind: "power" },
      { from: "cout", to: "out", kind: "power", label: "5 V" },
      { from: "out", to: "trim", kind: "signal", label: "feedback" },
      { from: "trim", to: "ic", kind: "signal" },
      { from: "out", to: "gnd", kind: "ground" },
    ],
    steps: [
      "The chip connects the coil's far end to ground, and current builds up in the coil from the battery.",
      "The chip lets go. A coil won't stop its current at once, so its voltage jumps up, higher than the input, and the current flows through the diode to the output.",
      "The trimmer feeds a share of the output back to the chip. It switches faster or longer until the output sits at the set voltage.",
      "Power in equals power out plus the loss, so the battery gives more current than the load takes: 5 V at 0.5 A from 3.7 V is about 0.76 A from the cell.",
    ],
  },
  facts: [
    { label: "Input", value: "2–24 V" },
    { label: "Output", value: "5–28 V, set by screw" },
    { label: "Current", value: "about 0.65 A (3.7 V to 5 V)" },
    { label: "Efficiency", value: "85–93%" },
    { label: "Switching", value: "1.2 MHz" },
    { label: "Size", value: "37 × 17 × 12 mm" },
  ],
  spec: {
    form: {
      mass: 3,
      mount: "solder",
      note: "Four solder pads and no mounting holes. Solder wires to the pads, and set the output with a meter before you connect anything.",
    },
    power: {
      supply: { min: 2, max: 24, typ: 3.7 },
      draw: { idle: 0.1, active: 0.1 },
      converter: { law: "boost", volts: 5, adjustable: [5, 28], efficiency: 0.88, maxMa: 650 },
      interface: "Analog: a multi-turn trimmer sets the output voltage",
      note: "Rated 2 A, but the chip's 4 A switch limit caps the output: output current is about 0.88 × input volts × input current limit ÷ output volts. With about 1 A from the cell that is 0.65 A at 5 V, 0.36 A at 9 V and 0.27 A at 12 V from 3.7 V.",
    },
    thermal: {
      thetaCW: 120,
      maxC: 85,
      typicalW: 0.4,
      at: "3.7 V to 5 V at 0.5 A",
      note: "The loss is about 0.2 × output power: 0.4 W at 2.5 W out and up to 1 W at 12 V and 0.5 A. The chip's own thermal resistance is not published for this board; about 100 °C per watt to 150 °C per watt is typical for a SOT-23-6 with this little copper. It has an over-temperature limit built in.",
    },
    sourcing: { mpn: "MT3608", maker: "Aerosemi Technology", lifecycle: "generic", usd: [0.5, 2], note: "Many makers and clone chips. Some boards add a micro-USB input or a voltage-adjust pad." },
    limits: [
      "The 2 A on the label is only true when the input is close to the output. From 3.7 V to 5 V expect about 0.65 A (a reviewer saw 5 V stay steady only to about 400 mA); to 12 V about 0.27 A.",
      "The cell must give more than the load takes: 5 V at 0.5 A from 3.7 V is 0.76 A from the cell, and at 1 A out a LiPo with a 1 A protection circuit shuts off.",
      "Above about 0.8 A of input current the output turns unstable (4.5 V to 5.7 V when set to 5 V) and the board whines.",
      "No short-circuit or reverse-polarity protection. The diode passes the input to the output even when the chip is off, so it never really switches off.",
      "Setting the output above 28 V kills the chip. The trimmer is touchy and can drift with vibration.",
    ],
    upgrade: [
      { name: "TPS61023 or SX1308 5 V boost", why: "About 1 A at 5 V from one cell at about 92% efficiency, with the load disconnected when it is off." },
      { name: "XL6009 module", why: "A 4 A switch for 12 V work, or choose a 2S LiPo and avoid boosting at all." },
    ],
    refs: ["https://components101.com/modules/mt3608-2a-dc-dc-step-up-power-module", "https://www.datasheetspdf.com/pdf/909246/AEROSEMI/MT3608/1", "https://finalrewind.org/interblag/entry/benchmarking-aliexpress-mt3608-boost-converter"],
  },
  sim: { kind: "converter", input: ["IN_POS", "IN_NEG"], output: ["OUT_POS", "OUT_NEG"] },
  lab: { strips: [["IN_NEG", "OUT_NEG"]] },
  experiment: { title: "5 V from one LiPo cell", idea: "Put a LiPo cell on IN and a meter on OUT, then turn the brass screw to 5.00 V. Add a load and watch the cell's current rise to about 1.5 times the load's." },
  tags: ["mt3608", "boost", "step up", "dc-dc", "converter", "power", "adjustable"],
});
