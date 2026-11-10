import { barrelJack, board, definePart, gnd, ground, jumperCap, name, pinHeader, rail, silk, smd, smdLed, sot223, usbA, vcc, type Solid } from "../../sdk";
import { PAD_PRINT, tantalum } from "./_modules";

// The MB102 breadboard power supply, 53 × 35 mm. The jack and USB socket are on the top edge;
// the two sets of pins on the underside at the bottom corners push into a breadboard's side rails.
const W = 53;
const H = 35;
const GREEN = "#1f7a45";

const jack = barrelJack(5.5, -1.5, 1.6, "top");
const usb = usbA(35.5, -1.5, 1.6, "top");
// Each side's rail has a 3-pin selector: 5V, OFF, 3.3V. The cap bridges the middle and one side.
const selectLeft = pinHeader(3.5, 26, 3, { style: "up" });
const selectRight = pinHeader(43.4, 26, 3, { style: "up" });
// The output header on top: two 5 V, two 3.3 V and four GND, for jumper wires.
const outputs = pinHeader(20.4, 24.6, 4, { style: "up", rows: 2 });
// Underside pins: + and − of each side rail.
const railLeft = pinHeader(3.5, 32.4, 2, { style: "down" });
const railRight = pinHeader(47, 32.4, 2, { style: "down" });

/** The latching push switch: a black case with a squarish cap that stays in when pressed. */
const latch: Solid[] = [
  { kind: "box", x: 21.4, y: 1.8, w: 8.2, h: 8.2, d: 4.4, z: 1.6, top: "#1d1e22", side: "#0b0b0d", radius: 0.5, finish: "plastic" },
  { kind: "box", id: "switch", x: 22.9, y: 3.3, w: 5.2, h: 5.2, d: 3.4, z: 6, top: "#2c2e34", side: "#15161a", radius: 0.5, finish: "plastic" },
  { kind: "box", x: 23.6, y: 4, w: 3.8, h: 3.8, d: 0.2, z: 9.4, top: "#3a3d44", radius: 0.4, finish: "plastic" },
];

export default definePart({
  id: "breadboard-power",
  name: "MB102 breadboard power supply",
  aka: ["MB102", "breadboard power module", "5V 3.3V breadboard supply", "breadboard power supply module"],
  group: "power",
  rank: 8,
  summary: "A board that plugs into the end of a breadboard and puts 5 V or 3.3 V on each side rail from a wall adapter, a 9 V battery or USB. Handy, but from 9 V or 12 V it gets hot above 0.3 A: it burns the extra voltage in two small linear regulators.",
  size: { w: W, h: H, d: 12.6 },
  solids: [
    board(W, H, GREEN, { radius: 0.5 }),
    jack,
    usb,
    latch,
    sot223(19, 15.5, "1117-5.0"),
    sot223(31, 15.5, "1117-3.3"),
    tantalum(16, 18.5, "x"),
    tantalum(28.2, 18.5, "x"),
    tantalum(39.7, 18.5, "x"),
    tantalum(22.4, 12.9, "x"),
    smd(33.6, 11.8, "r", "x"),
    smd(34.2, 14.3, "c", "x"),
    smd(36.5, 12.4, "r", "y"),
    smdLed(31, 11.5, "#37d36b", "led-pwr"),
    selectLeft,
    jumperCap(4.77, 26, "x", "#1e1f23"),
    selectRight,
    jumperCap(44.67, 26, "x", "#1e1f23"),
    outputs,
    railLeft,
    railRight,
    silk(10, 15, "DC 6.5-12V", 1, PAD_PRINT, { anchor: "middle" }),
    silk(42.2, 15, "USB 5V", 1, PAD_PRINT, { anchor: "middle" }),
    silk(25.5, 12.7, "ON/OFF", 0.9, PAD_PRINT, { anchor: "middle" }),
    silk(3.5, 29.6, "5V", 0.9, PAD_PRINT, { anchor: "middle" }),
    silk(6.04, 29.6, "OFF", 0.9, PAD_PRINT, { anchor: "middle" }),
    silk(8.58, 29.6, "3.3V", 0.9, PAD_PRINT, { anchor: "middle" }),
    silk(43.4, 29.6, "5V", 0.9, PAD_PRINT, { anchor: "middle" }),
    silk(45.94, 29.6, "OFF", 0.9, PAD_PRINT, { anchor: "middle" }),
    silk(48.48, 29.6, "3.3V", 0.9, PAD_PRINT, { anchor: "middle" }),
    silk(20.4, 23, "5V", 0.9, PAD_PRINT, { anchor: "middle" }),
    silk(22.94, 23, "5V", 0.9, PAD_PRINT, { anchor: "middle" }),
    silk(25.48, 23, "3V3", 0.9, PAD_PRINT, { anchor: "middle" }),
    silk(28.02, 23, "3V3", 0.9, PAD_PRINT, { anchor: "middle" }),
    silk(24.2, 30.6, "GND  GND  GND  GND", 0.9, PAD_PRINT, { anchor: "middle" }),
    silk(26.5, 33.7, "MB102", 2.4, PAD_PRINT, { anchor: "middle", weight: 700 }),
  ],
  features: [
    { id: "jack", label: "DC jack", kind: "connector", x: 5.5, y: -1.5, w: 9, h: 14, note: "A 5.5 × 2.1 mm barrel jack for a 6.5 V to 12 V adapter or a 9 V battery lead. The center is + on most boards; check the label, because some have no protection against the wrong way round." },
    { id: "usb", label: "USB socket", kind: "port", x: 35.5, y: -1.5, w: 13.5, h: 14.5, note: "A USB-A socket on the 5 V rail. Many listings call it an output for a phone cable; whether it can also feed the board varies between makers." },
    { id: "switch", label: "On/off switch", kind: "button", x: 21.4, y: 1.8, w: 8.2, h: 8.2, note: "A latching push switch. Push it in for on. It cuts the power to both regulators." },
    { id: "led-pwr", label: "Power LED", kind: "led", x: 31, y: 11.5, w: 1.6, h: 0.8, note: "Green while a rail is live. It goes dark if you short a rail." },
    { id: "reg-5v", label: "5 V regulator (AMS1117-5.0)", kind: "power", x: 19, y: 15.5, w: 6.5, h: 6.1, note: "A linear regulator. It needs about 1.3 V more than its output, and burns the rest as heat: 4 V at 0.3 A from 9 V is 1.2 W." },
    { id: "reg-3v3", label: "3.3 V regulator (AMS1117-3.3)", kind: "power", x: 31, y: 15.5, w: 6.5, h: 6.1, note: "The same chip for 3.3 V. From 9 V it wastes 5.7 V on every amp, so it gets hotter than the 5 V one for the same load." },
    { id: "select-left", label: "Left rail jumper", kind: "other", x: 2.2, y: 24.7, w: 7.7, h: 2.6, note: "Chooses the voltage on the left rail. Cap on the 5V side for 5 V, on the 3.3V side for 3.3 V, and take the cap off to turn the rail off." },
    { id: "select-right", label: "Right rail jumper", kind: "other", x: 42.1, y: 24.7, w: 7.7, h: 2.6, note: "The same for the right rail, set on its own." },
    { id: "outputs", label: "Output header (5 V, 3.3 V, GND)", kind: "pins", x: 19.1, y: 23.3, w: 10.2, h: 5.1, note: "Eight pins for jumper wires: two 5 V, two 3.3 V and four GND, taken from the regulators for a circuit that is not on the rails." },
    { id: "rail-pins", label: "Breadboard pins", kind: "pins", x: 2.2, y: 31.1, w: 48.6, h: 2.6, note: "Two pins on each side stand down from the underside. They push into the + and − rails at the end of a full-size breadboard." },
  ],
  pins: [
    vcc("IN_POS", "DC jack center pin, +. 6.5 V to 12 V. The AMS1117 chips are rated to 15 V, but from 12 V they run hot. 7 V to 9 V is best.", { label: "DC jack +", accepts: [6.5, 12] }),
    gnd("IN_NEG", "DC jack sleeve, ground.", { label: "DC jack −" }),
    rail("OUT_POS", "OUT+", 5, "left", { note: "The 5 V regulator, on the left and right rails when their jumpers say 5 V, and on the header's 5V pins. It shares a 700 mA limit with the 3.3 V one." }),
    ground("OUT_NEG", "left", "OUT−", { note: "Ground for the rails and the header." }),
    rail("OUT_3V3", "3.3 V", 3.3, "left", { note: "The 3.3 V regulator, on a rail whose jumper says 3.3 V and on the header's 3V3 pins. Up to 700 mA, shared with the 5 V one." }),
  ],
  pinAt: {
    IN_POS: { x: 10, y: -1.6 },
    IN_NEG: { x: 6.8, y: -1.6 },
    ...name(outputs, "OUT_POS", null, "OUT_3V3", null, "OUT_NEG"),
  },
  circuit: {
    blocks: [
      { id: "src", label: "Adapter", sub: "7–12 V", kind: "world", col: 0, row: 0, note: "A wall adapter or a 9 V battery." },
      { id: "dc", label: "DC jack", sub: "6.5–12 V", kind: "connector", col: 1, row: 0, at: "jack", note: "Brings the input in and sends it to the switch." },
      { id: "sw", label: "Switch", sub: "latching", kind: "passive", col: 2, row: 0, at: "switch", note: "Cuts the input to both regulators." },
      { id: "reg5", label: "AMS1117-5.0", sub: "5 V linear", kind: "regulator", col: 3, row: 0, at: "reg-5v", hot: true, note: "Burns (Vin − 5 V) × current: 4 W per amp from 9 V, 7 W per amp from 12 V. Its 165 °C limit is reached at about 0.4 A from 9 V." },
      { id: "reg33", label: "AMS1117-3.3", sub: "3.3 V linear", kind: "regulator", col: 3, row: 1, at: "reg-3v3", note: "The same, for 3.3 V: 5.7 W per amp from 9 V." },
      { id: "jl", label: "Left jumper", sub: "5V / OFF / 3.3V", kind: "passive", col: 4, row: 1, at: "select-left", note: "Picks which regulator feeds the left rail." },
      { id: "jr", label: "Right jumper", sub: "5V / OFF / 3.3V", kind: "passive", col: 4, row: 2, at: "select-right", note: "Picks which regulator feeds the right rail." },
      { id: "rails", label: "Rail pins", sub: "to the breadboard", kind: "connector", col: 3, row: 3, at: "rail-pins", note: "Push into the breadboard's side rails." },
      { id: "out", label: "5 V / 3.3 V", sub: "header", kind: "power", col: 4, row: 0, at: "OUT_POS", note: "The header shows both voltages at once, whatever the jumpers say." },
      { id: "gnd", label: "GND", kind: "ground", col: 2, row: 2, at: "OUT_NEG", note: "One ground for the whole board." },
      { id: "led", label: "Power LED", kind: "passive", col: 2, row: 1, at: "led-pwr", note: "Lights from the output." },
    ],
    links: [
      { from: "src", to: "dc", kind: "power", label: "9 V" },
      { from: "dc", to: "sw", kind: "power" },
      { from: "sw", to: "reg5", kind: "power" },
      { from: "sw", to: "reg33", kind: "power" },
      { from: "reg5", to: "jl", kind: "power", label: "5 V" },
      { from: "reg33", to: "jl", kind: "power", label: "3.3 V" },
      { from: "reg5", to: "jr", kind: "power", label: "5 V" },
      { from: "reg33", to: "jr", kind: "power", label: "3.3 V" },
      { from: "jl", to: "rails", kind: "power" },
      { from: "jr", to: "rails", kind: "power" },
      { from: "reg5", to: "out", kind: "power" },
      { from: "reg5", to: "gnd", kind: "ground" },
    ],
    steps: [
      "The adapter goes in the jack. The switch passes it to two AMS1117 regulators in parallel.",
      "One regulator holds 5 V and the other 3.3 V, whatever the input does, as long as it stays 1.3 V above the output.",
      "Each side's jumper picks which of the two voltages goes to that side's rail, or none (OFF). So the left rail can be 5 V while the right is 3.3 V.",
      "Every volt above the output is turned into heat in the chip: (input − output) × current. From 9 V that is 4 W per amp on the 5 V rail.",
    ],
  },
  facts: [
    { label: "Input", value: "6.5–12 V jack" },
    { label: "Outputs", value: "5 V and 3.3 V" },
    { label: "Current", value: "700 mA rated" },
    { label: "Dropout", value: "1.3 V" },
    { label: "Efficiency", value: "56% (9 V to 5 V)" },
    { label: "Size", value: "53 × 35 × 13 mm" },
  ],
  spec: {
    form: {
      mass: 12,
      mount: "breadboard",
      pitch: 2.54,
      note: "The two pairs of pins on the underside plug into the side rails at the end of an MB-102 830-point breadboard. The jack and USB socket stick out past the end.",
    },
    power: {
      supply: { min: 6.5, max: 12, typ: 9 },
      draw: { idle: 10, active: 10 },
      converter: { law: "linear", volts: 5, dropout: 1.3, maxMa: 700 },
      interface: "Passive: a jumper picks 5 V, 3.3 V or off for each side rail",
      note: "Rated 700 mA for the board. The regulator limits are 1.1 A each, but heat stops you long before: about 0.4 A on the 5 V one from 9 V, and about 0.22 A from a 12 V adapter. The input current is the sum of the two outputs, plus about 10 mA.",
    },
    thermal: {
      thetaCW: 90,
      maxC: 165,
      typicalW: 1.2,
      at: "9 V in, 5 V out at 300 mA",
      note: "Each AMS1117 shuts down at 165 °C. At 90 °C per watt that is about 1.5 W in a 25 °C room. From 12 V, 300 mA on the 5 V rail is 2.1 W: it will shut down over and over.",
    },
    sourcing: { mpn: "AMS1117-5.0 and AMS1117-3.3", maker: "Advanced Monolithic Systems", lifecycle: "generic", usd: [1, 3], note: "Sold as MB102 or YwRobot. Boards differ: some have a mini-USB input or a slide switch in place of the jumpers." },
    limits: [
      "From a 9 V adapter the 5 V regulator turns 4 V × current into heat: 1.2 W at 300 mA. From 12 V it is 2.1 W at 300 mA and 4.9 W at the rated 700 mA, which is far over what the chip can shed.",
      "The 3.3 V one is worse: 5.7 V × current from 9 V, and 8.7 V × current from 12 V.",
      "700 mA is the board's label. In practice 0.2 A to 0.4 A is the most it holds for long from 9 V to 12 V. Feed it 7 V to 9 V.",
      "Needs 6.5 V or more on the jack: the 5 V regulator drops 1.1 V to 1.3 V. A 5 V source works only through the USB socket.",
      "No reverse-polarity protection is documented, and some boards do not mark the jack's polarity.",
    ],
    upgrade: [
      { name: "LM2596 or MP1584 buck module set to 5 V", why: "From 9 V to 5 V at 0.5 A a buck module loses about 0.5 W where this board burns 2 W, and it gives 1.5 A to 3 A.", part: "buck-converter" },
      { name: "A 3.3 V LDO such as the AP2112K on the 5 V rail", why: "Dropping 1.7 V to 3.3 V instead of 5.7 V cuts the heat to a third: 0.1 W per 60 mA." },
    ],
    refs: ["https://components101.com/node/970", "https://microcontrollerslab.com/mb102-breadboard-power-supply-module-pinout-and-how-to-use-it/", "https://files.waveshare.com/upload/b/b8/AMS1117-datasheet.pdf"],
  },
  sim: { kind: "converter", input: ["IN_POS", "IN_NEG"], output: ["OUT_POS", "OUT_NEG"], also: [{ pin: "OUT_3V3", volts: 3.3, maxMa: 700 }] },
  lab: { strips: [["IN_NEG", "OUT_NEG"]] },
  experiment: { title: "Feel the regulator", idea: "Power the board from a 12 V adapter, draw 200 mA from the 5 V rail with a resistor, and touch the black chip after a minute. Then try a 7.5 V adapter and compare." },
  tags: ["mb102", "breadboard power", "ams1117", "5v", "3.3v", "regulator", "power"],
});
