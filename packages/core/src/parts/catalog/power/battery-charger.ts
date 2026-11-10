import { board, definePart, gnd, ground, pin, rail, silk, smd, smdLed, soic, sot23, usbC, vcc } from "../../sdk";
import { MODULE_BLUE, PAD_PRINT } from "./_modules";

// The TP4056 charger with DW01A + FS8205A protection, USB-C version, 28 × 17.3 mm on a thin 1 mm board.
// USB-C on the left edge, charge pads beside it; battery and load pads on the right edge.
const W = 28;
const H = 17.3;
const T = 1;
const IN_POS = { x: 1.7, y: 2 };
const IN_NEG = { x: 1.7, y: 15.3 };
const OUT_POS = { x: 26.3, y: 2.3 };
const B_POS = { x: 26.3, y: 6.5 };
const B_NEG = { x: 26.3, y: 10.8 };
const OUT_NEG = { x: 26.3, y: 15 };

export default definePart({
  id: "battery-charger",
  name: "TP4056 lithium charger with protection",
  aka: ["TP4056", "TP4056 USB-C module", "LiPo charger module", "18650 charger board", "TP4056 DW01A"],
  group: "power",
  rank: 8,
  summary: "A thumbnail-size board that charges one lithium cell from a USB charger, 1 A at most, and cuts the cell off if it is over-discharged or shorted. It sits between a cell and a load. Mind the heat: it is a linear charger, so the board gets hot at 1 A.",
  size: { w: W, h: H, d: 4.2 },
  solids: [
    board(W, H, MODULE_BLUE, {
      t: T,
      radius: 0,
      holes: [
        { x: IN_POS.x, y: IN_POS.y, d: 1.2 },
        { x: IN_NEG.x, y: IN_NEG.y, d: 1.2 },
        { x: OUT_POS.x, y: OUT_POS.y, d: 1.3 },
        { x: B_POS.x, y: B_POS.y, d: 1.3 },
        { x: B_NEG.x, y: B_NEG.y, d: 1.3 },
        { x: OUT_NEG.x, y: OUT_NEG.y, d: 1.3 },
      ],
    }),
    usbC(-1.4, 4.15, T, "left"),
    // The three chips: the charger, the protection controller and the pair of MOSFETs.
    soic(11.6, 7.2, 4, "TP4056", { dir: "x", id: "chip", z: T }),
    sot23(19.5, 12.4, { five: true, dir: "x", label: "G1", z: T }),
    soic(19.3, 6.6, 4, "8205A", { dir: "y", z: T }),
    // The two status LEDs: red while charging, blue when full.
    smdLed(12.2, 12.5, "#ff3b30", "led-chg", T),
    smdLed(12.2, 14.5, "#2f7dff", "led-done", T),
    // PROG resistor (1.2 kΩ, marked 122) and the small parts round the chips.
    smd(7.6, 11.4, "r", "x", "0603", T),
    smd(7.6, 13.2, "r", "x", "0603", T),
    smd(9.8, 13.6, "r", "x", "0603", T),
    smd(10.2, 10.5, "r", "x", "0603", T),
    smd(13, 10.5, "r", "x", "0603", T),
    smd(8.3, 2.6, "c", "x", "0805", T),
    smd(15.6, 2.4, "c", "x", "0805", T),
    smd(16.2, 10.1, "c", "x", "0603", T),
    smd(22.4, 12.5, "r", "y", "0603", T),
    silk(3.4, 2.9, "IN+", 1, PAD_PRINT),
    silk(3.4, 16, "IN−", 1, PAD_PRINT),
    silk(24.8, 3, "OUT+", 1, PAD_PRINT, { anchor: "end" }),
    silk(24.8, 7.2, "B+", 1, PAD_PRINT, { anchor: "end" }),
    silk(24.8, 11.5, "B−", 1, PAD_PRINT, { anchor: "end" }),
    silk(24.8, 15.7, "OUT−", 1, PAD_PRINT, { anchor: "end" }),
    silk(14.5, 13.3, "CHRG", 0.8, PAD_PRINT),
    silk(14.5, 15.4, "STDBY", 0.8, PAD_PRINT),
    silk(8.3, 16.6, "1A", 0.9, PAD_PRINT),
  ],
  features: [
    { id: "usb", label: "USB-C socket", kind: "port", x: -1.4, y: 4.15, w: 7.5, h: 9, note: "The charging input, 5 V from any USB charger. It needs two 5.1 kΩ resistors to ask a USB-C charger for power; a few cheap boards leave them off." },
    { id: "pads-in", label: "Charge pads (IN+, IN−)", kind: "power", x: 0.4, y: 0.8, w: 2.6, h: 15.6, note: "Another way in for the 5 V charge supply, joined to the USB socket. Use one or the other." },
    { id: "chip", label: "TP4056 charger", kind: "chip", x: 8.8, y: 5.2, w: 5.6, h: 4, note: "Holds the charge at 1 A until the cell reaches 4.2 V, then holds 4.2 V until the current falls to 0.1 A. It is a linear charger, so it turns the input's extra volts into heat." },
    { id: "protect", label: "DW01A protection chip", kind: "chip", x: 17.9, y: 11.1, w: 3.2, h: 2.6, note: "Watches the cell. It opens the output if the cell goes above 4.3 V or below 2.4 V, or if the current is over about 3 A." },
    { id: "mosfet", label: "FS8205A MOSFET pair", kind: "chip", x: 16.9, y: 3.7, w: 4.8, h: 5.8, note: "Two switches in the cell's ground path. The DW01A turns them off to cut the cell away from the load. Each adds about 25 mΩ." },
    { id: "led-chg", label: "Charging LED (red)", kind: "led", x: 12.2, y: 12.5, w: 1.6, h: 0.8, note: "Red while the cell is charging." },
    { id: "led-done", label: "Charged LED (blue)", kind: "led", x: 12.2, y: 14.5, w: 1.6, h: 0.8, note: "Blue when charging has finished. On some boards the colors are swapped." },
    { id: "rprog", label: "PROG resistor (R3)", kind: "other", x: 7.6, y: 11.4, w: 1.6, h: 0.8, note: "A 1.2 kΩ resistor marked 122 sets the charge to 1 A. Charge current in mA is 1200 ÷ the resistor in kΩ: 2 kΩ gives 580 mA, 2.4 kΩ about 500 mA." },
    { id: "pads-bat", label: "Battery pads (B+, B−)", kind: "power", x: 25.1, y: 5.3, w: 2.4, h: 6.7, note: "The lithium cell goes here, with the + on B+. Anything wired here skips the protection." },
    { id: "pads-out", label: "Load pads (OUT+, OUT−)", kind: "power", x: 25.1, y: 1.1, w: 2.4, h: 15.1, note: "The load goes here. OUT+ is the same node as B+; OUT− is cut off from the cell by the protection chip if something is wrong. The pads are on the right edge, outside the battery pair." },
  ],
  pins: [
    vcc("IN_POS", "Battery +. A single lithium cell, 3.0 V to 4.2 V (the protection cuts off at 2.4 V and 4.3 V). The charge supply goes on USB or IN+, not here.", { label: "B+", accepts: [2.4, 4.3] }),
    gnd("IN_NEG", "Battery −.", { label: "B−" }),
    rail("OUT_POS", "OUT+", 3.7, "left", { note: "The load, on the same node as B+: the cell's voltage, 3.0 V to 4.2 V, up to about 3 A before the protection trips." }),
    ground("OUT_NEG", "left", "OUT−", { note: "The load's return, through the protection MOSFETs (about 50 mΩ). It opens if the cell is low or the current is too high." }),
    pin("USB_POS", "power", "opt", "Charge input +: the USB-C socket's 5 V, or the IN+ pad. Allow 4.5 V to 5.5 V and a cable good for 1 A.", { label: "IN+", required: false }),
    pin("USB_NEG", "ground", "opt", "Charge input −: the USB-C ground, or the IN− pad.", { label: "IN−", required: false }),
  ],
  pinAt: {
    IN_POS: B_POS,
    IN_NEG: B_NEG,
    OUT_POS,
    OUT_NEG,
    USB_POS: IN_POS,
    USB_NEG: IN_NEG,
  },
  circuit: {
    blocks: [
      { id: "usb5", label: "USB 5 V", sub: "charger", kind: "world", col: 0, row: 0, note: "Any USB charger. The cable should carry 1 A." },
      { id: "usb", label: "USB-C", sub: "IN+ / IN−", kind: "connector", col: 1, row: 0, at: "usb", note: "5 V and ground reach the charger chip." },
      { id: "ic", label: "TP4056", sub: "linear charger", kind: "ic", col: 2, row: 0, at: "chip", hot: true, note: "Drops the 5 V to the cell's voltage and keeps the current at 1 A. The difference times 1 A is the heat: 1.4 W into a 3.6 V cell." },
      { id: "prog", label: "R3", sub: "1.2 kΩ = 1 A", kind: "passive", col: 2, row: 1, at: "rprog", note: "Sets the charge current." },
      { id: "leds", label: "Two LEDs", sub: "red / blue", kind: "passive", col: 1, row: 1, at: "led-chg", note: "Red: charging. Blue: finished." },
      { id: "prot", label: "DW01A", sub: "protection", kind: "ic", col: 3, row: 1, at: "protect", note: "Watches the cell's voltage and the current through the MOSFETs." },
      { id: "fet", label: "FS8205A", sub: "two switches", kind: "ic", col: 4, row: 0, at: "mosfet", note: "The switches the DW01A turns off to protect the cell." },
      { id: "bat", label: "B+ / B−", sub: "the cell", kind: "power", col: 3, row: 0, at: "IN_POS", note: "Charged from the chip and drained into the output." },
      { id: "out", label: "OUT+ / OUT−", sub: "the load", kind: "power", col: 4, row: 1, at: "OUT_POS", note: "The cell's voltage, through the protection." },
    ],
    links: [
      { from: "usb5", to: "usb", kind: "power", label: "5 V" },
      { from: "usb", to: "ic", kind: "power" },
      { from: "prog", to: "ic", kind: "signal", label: "sets 1 A" },
      { from: "ic", to: "leds", kind: "signal", label: "status" },
      { from: "ic", to: "bat", kind: "power", label: "1 A, up to 4.2 V" },
      { from: "bat", to: "fet", kind: "power" },
      { from: "prot", to: "fet", kind: "signal", label: "cut off" },
      { from: "fet", to: "out", kind: "power" },
    ],
    steps: [
      "USB gives 5 V. The TP4056 holds the current into the cell at 1 A (set by R3) while the cell is below 4.2 V. The red LED is on.",
      "When the cell reaches 4.2 V the chip holds that voltage and lets the current fall. At 0.1 A it stops, and the blue LED comes on.",
      "A cell below 2.9 V gets only about 0.1 A at first (a trickle) so a flat cell is not shocked.",
      "The DW01A watches the cell. Above 4.3 V, below 2.4 V, or above about 3 A of load, it turns off the FS8205A and cuts the load off.",
    ],
  },
  facts: [
    { label: "Charge", value: "1 A (set by R3)" },
    { label: "Cell", value: "1S lithium, 4.2 V" },
    { label: "Input", value: "5 V USB-C" },
    { label: "Cut-off", value: "2.4 V / 4.3 V / 3 A" },
    { label: "Efficiency", value: "about 72% at 3.6 V" },
    { label: "Size", value: "28 × 17 × 4 mm" },
  ],
  spec: {
    form: {
      mass: 2.5,
      mount: "solder",
      note: "Six solder pads, no header and no mounting holes. Solder wires to B+, B−, OUT+ and OUT−. The USB-C socket (or IN+ and IN−) takes the 5 V charge.",
    },
    power: {
      supply: { min: 2.4, max: 4.3, typ: 3.7 },
      draw: { idle: 0.002, active: 0.002 },
      converter: { law: "pass", volts: 3.7, maxMa: 3000 },
      interface: "Pads only: USB or IN+/IN− in, B+/B− for the cell, OUT+/OUT− for the load",
      note: "The 5 V charge supply goes in at USB, not at B+. It is 4.5 V to 5.5 V and takes up to 1.2 A while charging (about 0.05 mA when done). The cell side leaks under 2 µA with USB unplugged.",
    },
    thermal: {
      thetaCW: 35,
      maxC: 85,
      typicalW: 1.4,
      at: "charging at 1 A",
      note: "Heat in the chip is (5 V − cell volts) × current: 2.0 W into a 3.0 V cell, 1.4 W into 3.6 V, 1.0 W into 4.0 V. It backs off the current if the chip reaches about 135 °C, which is why measured charge current is often only 850 mA. Expect the board at 60 °C to 80 °C in the first part of a charge.",
    },
    sourcing: { mpn: "TP4056 + DW01A + FS8205A", maker: "Nanjing Top Power ASIC", lifecycle: "generic", usd: [0.3, 1.5], note: "Many clone chips (TC4056A, XJS4056). A board with only four pads has no protection chips: do not use that one with a bare cell." },
    limits: [
      "It is a linear charger: it burns (5 V − cell volts) × current, 1.4 W to 2.0 W at 1 A into a flat cell. The board reaches 60 °C to 80 °C and the current falls back to about 850 mA.",
      "1 A is too much for a cell under 2000 mAh (about 0.5C is the usual advice). Change R3 to 2.4 kΩ for about 500 mA.",
      "The protection limits (2.4 V, 4.3 V, about 3 A) are fixed by the DW01A, not by your cell. They are too loose for a high-drain pack, and there is no balancing.",
      "No temperature sensor: the TEMP pin is grounded, so it charges a cold or hot cell. A cell below 2.0 V gets a trickle charge anyway.",
      "No safety timer. Anything wired straight to B+ and B− bypasses the protection, and the MOSFETs add about 50 mΩ in the load path.",
    ],
    upgrade: [
      { name: "MCP73831 charger (Adafruit, SparkFun)", why: "500 mA at most, so about 0.7 W in the worst case instead of 2 W, and it has a JST socket and a status LED." },
      { name: "IP5306 or IP2312 charge-and-boost board", why: "A switching charger at about 90% efficiency: cool at 1 A to 2 A, and it makes 5 V for a robot from the same cell." },
    ],
    refs: ["https://oe2.open-electronics.org/?p=48075", "https://mischianti.org/tp4056-lipo-battery-charger-high-resolution-pinout-datasheet-and-specs/", "https://goughlui.com/?p=59333"],
  },
  sim: { kind: "converter", input: ["IN_POS", "IN_NEG"], output: ["OUT_POS", "OUT_NEG"] },
  lab: { strips: [["IN_NEG", "OUT_NEG"]] },
  experiment: { title: "Feel it charge", idea: "Charge a half-flat 18650 from a USB charger and put a finger on the board after a minute. Then change R3 to 2.4 kΩ and compare how warm it gets." },
  tags: ["tp4056", "charger", "lipo", "18650", "battery", "usb-c", "protection", "dw01a"],
});
