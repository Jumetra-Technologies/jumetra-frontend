import { board, capacitor, definePart, gnd, inductor, rail, ground, silk, smd, trimmer, vcc } from "../../sdk";
import { MODULE_BLUE, PAD_PRINT, smcDiode, to263 } from "./_modules";

// The blue LM2596 module, 43 × 21 mm. Input pads on the left edge, output pads on the right.
const W = 43;
const H = 21;
const IN_POS = { x: 2.5, y: 2.8 };
const IN_NEG = { x: 2.5, y: 18.2 };
const OUT_POS = { x: 40.5, y: 2.8 };
const OUT_NEG = { x: 40.5, y: 18.2 };

export default definePart({
  id: "buck-converter",
  name: "LM2596 buck converter module",
  aka: ["LM2596 step-down", "DC-DC step down module", "adjustable buck converter", "LM2596S module"],
  group: "power",
  rank: 7,
  summary: "The little blue board that turns a 7 V to 12 V battery into a steady 5 V for a robot. Turn the brass screw until a meter reads what you want. It wastes far less as heat than a linear regulator, so it stays cool at 2 A.",
  size: { w: W, h: H, d: 13.6 },
  solids: [
    board(W, H, MODULE_BLUE, {
      radius: 0,
      holes: [
        { x: IN_POS.x, y: IN_POS.y, d: 1.8 },
        { x: IN_NEG.x, y: IN_NEG.y, d: 1.8 },
        { x: OUT_POS.x, y: OUT_POS.y, d: 1.8 },
        { x: OUT_NEG.x, y: OUT_NEG.y, d: 1.8 },
      ],
    }),
    to263(16, 7, "LM2596S-ADJ", "chip"),
    inductor(27, 11.5, 10, "330", 5),
    smcDiode(15, 17.2, "x", 1, "SS34"),
    capacitor(6.5, 10.5, 4, 12, 1.6, "smd"),
    capacitor(37, 11.5, 4, 11, 1.6, "smd"),
    trimmer(28.5, 3.4, "x", 1, "trimmer"),
    // The small parts round the chip: feedback divider, bypass capacitors and a compensation resistor.
    smd(22, 1.6, "r", "x"),
    smd(22, 4.3, "c", "y"),
    smd(21.6, 14.4, "r", "x"),
    smd(10.2, 15.6, "c", "y"),
    smd(19.2, 19.6, "r", "x"),
    smd(33.6, 18.9, "c", "x"),
    silk(4.7, 3.5, "IN+", 1.2, PAD_PRINT),
    silk(4.7, 19.1, "IN−", 1.2, PAD_PRINT),
    silk(38.3, 3.5, "OUT+", 1.2, PAD_PRINT, { anchor: "end" }),
    silk(38.3, 19.1, "OUT−", 1.2, PAD_PRINT, { anchor: "end" }),
    silk(22.4, 20, "DC-DC STEP DOWN", 1.1, PAD_PRINT),
  ],
  features: [
    { id: "pads-in", label: "Input pads (IN+, IN−)", kind: "power", x: 0.9, y: 1.2, w: 3.2, h: 18.6, note: "The battery or supply goes here. It must be at least 2 V above what you want out. Solder wires on; they will not plug into a breadboard." },
    { id: "pads-out", label: "Output pads (OUT+, OUT−)", kind: "power", x: 38.9, y: 1.2, w: 3.2, h: 18.6, note: "The regulated voltage comes out here. OUT− is joined to IN− on the board, so the grounds are shared." },
    { id: "chip", label: "LM2596 chip (TO-263)", kind: "chip", x: 10.9, y: 2.4, w: 10.2, h: 10.8, note: "The switch and its control, in one package. It turns the input on and off 150 000 times a second. Its flat tab is the only heatsink." },
    { id: "inductor", label: "Inductor (33 µH)", kind: "other", x: 22, y: 6.5, w: 10, h: 10, note: "A coil that stores energy while the chip is on and gives it out while the chip is off. It is what lets the converter step down without burning the difference." },
    { id: "diode", label: "Schottky diode (SS34)", kind: "other", x: 11.5, y: 14.2, w: 7, h: 6, note: "Carries the coil's current while the chip is off. It drops about 0.5 V, so a little power is lost in it." },
    { id: "cap-in", label: "Input capacitor", kind: "other", x: 2.2, y: 6.2, w: 8.6, h: 8.6, note: "Holds the input steady while the chip switches. Often only rated 35 V, even though the chip takes 40 V." },
    { id: "cap-out", label: "Output capacitor", kind: "other", x: 32.7, y: 7.2, w: 8.6, h: 8.6, note: "Smooths the output. Some ripple (30 mV to 300 mV) is left over: add a bigger capacitor for sensitive circuits." },
    { id: "trimmer", label: "Voltage trimmer", kind: "mechanical", x: 23.7, y: 1, w: 9.6, h: 4.8, note: "A multi-turn screw. Turn it clockwise to raise the output on most boards. Set it with a meter before you connect anything." },
  ],
  pins: [
    vcc("IN_POS", "Input +. 4 V to 40 V, but at least 1.5 V to 2 V above the output you set. Keep it under 30 V: the input capacitor may only be rated 35 V.", { label: "IN+", accepts: [4, 40] }),
    gnd("IN_NEG", "Input ground. Joined to OUT− on the board.", { label: "IN−" }),
    rail("OUT_POS", "OUT+", 5, "left", { note: "The set voltage, 1.25 V to 35 V. 5 V when the board comes from the shop set for a robot. Up to 2 A without a heatsink." }),
    ground("OUT_NEG", "left", "OUT−", { note: "Output ground. The same copper as IN−: this is not an isolated converter." }),
  ],
  pinAt: {
    IN_POS,
    IN_NEG,
    OUT_POS,
    OUT_NEG,
  },
  circuit: {
    blocks: [
      { id: "src", label: "Battery", sub: "7–12 V", kind: "world", col: 0, row: 0, note: "Anything from 4 V to 40 V, but 1.5 V to 2 V above the voltage you set." },
      { id: "in", label: "IN+", sub: "input", kind: "power", col: 1, row: 0, at: "IN_POS", note: "The input pad." },
      { id: "cin", label: "Input capacitor", sub: "220 µF", kind: "passive", col: 2, row: 0, at: "cap-in", note: "Gives the chip short bursts of current so the battery sees a steady draw." },
      { id: "ic", label: "LM2596", sub: "switch + control", kind: "regulator", col: 3, row: 0, at: "chip", hot: true, note: "Switches the input on and off. The longer it is on in each cycle, the higher the output. It loses about 1.3 W at 2 A." },
      { id: "coil", label: "Inductor", sub: "33 µH", kind: "passive", col: 4, row: 0, at: "inductor", note: "Smooths the chopped voltage into steady current." },
      { id: "diode", label: "SS34 diode", sub: "freewheel", kind: "passive", col: 3, row: 1, at: "diode", note: "Keeps the coil's current flowing while the chip is off." },
      { id: "cout", label: "Output capacitor", sub: "220 µF", kind: "passive", col: 4, row: 1, at: "cap-out", note: "Holds the output steady between pulses." },
      { id: "trim", label: "Trimmer", sub: "sets Vout", kind: "passive", col: 2, row: 2, at: "trimmer", note: "Sets what fraction of the output the chip compares with its 1.23 V reference. That is the voltage you choose." },
      { id: "out", label: "OUT+", sub: "set voltage", kind: "power", col: 4, row: 2, at: "OUT_POS", note: "At 2 A the output is the set voltage; the input current is about 0.5 A at 12 V in and 5 V out." },
      { id: "gnd", label: "GND", kind: "ground", col: 2, row: 1, at: "OUT_NEG", note: "Shared by input and output." },
    ],
    links: [
      { from: "src", to: "in", kind: "power", label: "12 V" },
      { from: "in", to: "cin", kind: "power" },
      { from: "cin", to: "ic", kind: "power" },
      { from: "ic", to: "coil", kind: "power", label: "pulses" },
      { from: "diode", to: "coil", kind: "power", label: "off-time current" },
      { from: "coil", to: "cout", kind: "power", label: "smooth" },
      { from: "cout", to: "out", kind: "power", label: "5 V" },
      { from: "out", to: "trim", kind: "signal", label: "feedback" },
      { from: "trim", to: "ic", kind: "signal", label: "adjusts" },
      { from: "gnd", to: "diode", kind: "ground" },
    ],
    steps: [
      "The chip joins the input to the coil for part of each cycle, 150 000 times a second.",
      "While it is on, current builds up in the coil and charges the output capacitor. While it is off, the coil keeps pushing current through the diode.",
      "The trimmer feeds a share of the output back to the chip. If the output is too high, the chip stays on for less time; too low, for more.",
      "Almost no energy is burned to make the drop from 12 V to 5 V. It is moved, a pulse at a time, so the loss is about 20% instead of 58%.",
    ],
  },
  facts: [
    { label: "Input", value: "4–40 V" },
    { label: "Output", value: "1.25–35 V, set by screw" },
    { label: "Current", value: "2 A (3 A with heatsink)" },
    { label: "Efficiency", value: "about 80%" },
    { label: "Switching", value: "150 kHz" },
    { label: "Size", value: "43 × 21 × 14 mm" },
  ],
  spec: {
    form: {
      mass: 10,
      mount: "solder",
      note: "Four solder pads, no header and no mounting holes. Solder wires or screw terminals to the pads, and set the output with a meter before you connect anything.",
    },
    power: {
      supply: { min: 4, max: 40, typ: 12 },
      draw: { idle: 5, active: 5 },
      converter: { law: "buck", volts: 5, adjustable: [1.25, 35], dropout: 1.5, efficiency: 0.8, maxMa: 2000 },
      interface: "Analog: a multi-turn trimmer sets the output voltage",
      note: "Input current is output power ÷ (efficiency × input volts): 5 V at 2 A from 12 V is about 1.04 A at 80%. The chip itself is rated 3 A; 2 A is what the bare board can carry without a heatsink.",
    },
    thermal: {
      thetaCW: 50,
      maxC: 125,
      typicalW: 1.3,
      at: "12 V to 5 V at 2 A",
      note: "The board loses about 2.2 W in all at 2 A; the chip's share is about 1.3 W. Its only heatsink is the copper under the tab. At 3 A the chip loses about 2.3 W and reaches about 100 °C above the room. It limits its own current and shuts down if it gets too hot.",
    },
    sourcing: { mpn: "LM2596S-ADJ", maker: "Texas Instruments", lifecycle: "generic", usd: [1, 3], note: "Sold under many names. Clone chips (HX2596 and others) are common and run hotter; test a new board with a load before you trust it." },
    limits: [
      "Needs the input at least 1.5 V to 2 V above the output: 12 V in gives about 10.5 V out at most, and 5 V cannot be held from a 6 V pack.",
      "Efficiency is 73% to 80% at 3 A and falls under 65% below about 0.1 A, where its own 5 mA draw is large (5 mA × 12 V = 0.06 W).",
      "About 2 A is the most the bare board carries for long. Above that the chip needs a heatsink on its tab.",
      "Output ripple is 30 mV to 300 mV at 150 kHz. A servo or sensor on the same supply may need an extra capacitor.",
      "The input capacitor may be rated only 35 V, below the chip's 40 V.",
    ],
    upgrade: [
      { name: "MP1584EN mini buck", why: "Smaller (17 × 11 mm) and up to 90% to 95% efficient at light load, for 1.5 A from up to 28 V. It suits a small robot on a 2S LiPo." },
      { name: "XL4015 or TPS5430 module", why: "5 A class and 88% to 92% efficient in about the same size, so a motor supply stays cool." },
    ],
    refs: ["https://www.onsemi.com/download/data-sheet/pdf/Lm2596-d.pdf", "https://hippo.fel.cvut.cz/katalog/pdf/2596.pdf", "https://protosupplies.com/product/lm2596s-adjustable-dc-dc-step-down-module/"],
  },
  sim: { kind: "converter", input: ["IN_POS", "IN_NEG"], output: ["OUT_POS", "OUT_NEG"] },
  lab: { strips: [["IN_NEG", "OUT_NEG"]] },
  experiment: { title: "Set 5 V from a 9 V battery", idea: "Connect a 9 V battery to IN, and a meter to OUT. Turn the brass screw until the meter reads 5.00 V, then load it with a motor and watch how the voltage holds." },
  tags: ["lm2596", "buck", "step down", "dc-dc", "regulator", "power", "adjustable"],
});
