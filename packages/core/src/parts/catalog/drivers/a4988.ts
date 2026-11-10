import { MATERIAL, board, definePart, gnd, heatsink, name, pin, pinHeader, silk, smd, vcc, type Solid } from "../../sdk";

const RED = "#c41f22";
const TOP = 1.6;
const S = MATERIAL.silk;

// Two straight 8-pin rows, 12.7 mm (0.5 in) apart, pins down for a breadboard or a RAMPS socket.
const control = pinHeader(1.27, 1.27, 8, { style: "down" });
const power = pinHeader(1.27, 13.97, 8, { style: "down" });

const CHIP = { x: 9.6, y: 7.6 };

/** The A4988: a 5 × 5 mm QFN with its leads under the edge, so only a row of pads shows round the body. */
const chip: Solid[] = [
  ...[-1, 1].flatMap((side) =>
    Array.from({ length: 7 }, (_, i): Solid[] => {
      const t = (i - 3) * 0.5;
      return [
        { kind: "box", x: +(CHIP.x + t - 0.12).toFixed(3), y: +(CHIP.y + side * 2.75 - 0.25).toFixed(3), w: 0.24, h: 0.5, d: 0.1, z: TOP, top: MATERIAL.tin, finish: "tin", radius: 0.02 },
        { kind: "box", x: +(CHIP.x + side * 2.75 - 0.25).toFixed(3), y: +(CHIP.y + t - 0.12).toFixed(3), w: 0.5, h: 0.24, d: 0.1, z: TOP, top: MATERIAL.tin, finish: "tin", radius: 0.02 },
      ];
    }).flat(),
  ),
  { kind: "box", id: "chip", x: CHIP.x - 2.5, y: CHIP.y - 2.5, w: 5, h: 5, d: 0.9, z: TOP + 0.02, top: "#1b1c1f", finish: "epoxy", radius: 0.2, label: { text: "A4988", size: 1.0, color: "#9aa0a6" } },
];

/** A 1206 current-sense resistor: black, with its value printed on it. */
const sense = (cx: number, cy: number): Solid[] => [
  { kind: "box", x: cx - 1.6, y: cy - 0.8, w: 3.2, h: 1.6, d: 0.6, z: TOP, top: "#17181b", finish: "epoxy", radius: 0.08, label: { text: "R100", size: 0.75, color: "#a3a7ad" } },
  { kind: "box", x: cx - 1.65, y: cy - 0.82, w: 0.55, h: 1.64, d: 0.62, z: TOP, top: MATERIAL.tin, finish: "tin", radius: 0.05 },
  { kind: "box", x: cx + 1.1, y: cy - 0.82, w: 0.55, h: 1.64, d: 0.62, z: TOP, top: MATERIAL.tin, finish: "tin", radius: 0.05 },
];

export default definePart({
  id: "a4988",
  name: "A4988 stepper motor driver",
  aka: ["A4988 StepStick", "StepStick", "Pololu A4988", "3D printer stepper driver", "RAMPS driver"],
  group: "drivers",
  rank: 8,
  summary: "The small red board in most 3D printers. Two wires, STEP and DIR, turn a stepper motor one tiny step per pulse, and a trimmer sets how much current the motor gets. Stick the little heatsink on, or it gets hot above 1 A.",
  size: { w: 20.3, h: 15.2, d: 7.5 },
  solids: [
    board(20.3, 15.2, RED, { radius: 0.4 }),
    control,
    power,
    chip,
    // The stick-on heatsink, glued to the chip: blue anodized aluminum with grooves.
    heatsink(5.2, 3.6, 8.8, 8, 5, { fins: 5, dir: "y", color: "#3f66a8", finish: "anodized", z: TOP + 0.9, base: 1.1 }),
    // The current-limit trimmer: a small body with a brass screw.
    { kind: "box", id: "trimmer", x: 15.0, y: 5.8, w: 3.6, h: 3.6, d: 2, z: TOP, top: "#d8d2bf", side: "#a39d88", finish: "plastic", radius: 0.3 },
    { kind: "cyl", cx: 16.8, cy: 7.6, r: 1.2, d: 0.5, z: TOP + 2, top: "#c2a04e", finish: "brass" },
    { kind: "path", d: "M 16.0 7.6 L 17.6 7.6", color: "#5a4a1e", width: 0.3, z: TOP + 2.52 },
    sense(3.5, 5.9),
    sense(3.5, 9.3),
    // Capacitors and resistors round the chip.
    smd(15.4, 4.4, "c", "y", "0805"),
    smd(17.4, 4.6, "r", "y"),
    smd(18.4, 7.0, "c", "y"),
    smd(18.4, 9.0, "r", "y"),
    smd(14.3, 9.7, "c", "y", "0805"),
    // Printing: a label at every pin.
    silk(1.27, 3.3, "EN", 0.75, S, { anchor: "middle" }),
    silk(3.81, 3.3, "MS1", 0.75, S, { anchor: "middle" }),
    silk(6.35, 3.3, "MS2", 0.75, S, { anchor: "middle" }),
    silk(8.89, 3.3, "MS3", 0.75, S, { anchor: "middle" }),
    silk(11.43, 3.3, "RST", 0.75, S, { anchor: "middle" }),
    silk(13.97, 3.3, "SLP", 0.75, S, { anchor: "middle" }),
    silk(16.51, 3.3, "STEP", 0.75, S, { anchor: "middle" }),
    silk(19.05, 3.3, "DIR", 0.75, S, { anchor: "middle" }),
    silk(1.27, 12.2, "VMOT", 0.7, S, { anchor: "middle" }),
    silk(3.81, 12.2, "GND", 0.75, S, { anchor: "middle" }),
    silk(6.35, 12.2, "2B", 0.75, S, { anchor: "middle" }),
    silk(8.89, 12.2, "2A", 0.75, S, { anchor: "middle" }),
    silk(11.43, 12.2, "1A", 0.75, S, { anchor: "middle" }),
    silk(13.97, 12.2, "1B", 0.75, S, { anchor: "middle" }),
    silk(16.51, 12.2, "VDD", 0.75, S, { anchor: "middle" }),
    silk(19.05, 12.2, "GND", 0.75, S, { anchor: "middle" }),
  ],
  features: [
    { id: "heatsink", label: "Stick-on heatsink", kind: "mechanical", x: 5.2, y: 3.6, w: 8.8, h: 8, note: "A small aluminum block glued to the chip. Above about 1 A per coil the chip needs it, and a fan on top as well." },
    { id: "chip", label: "A4988 chip", kind: "chip", x: 6.9, y: 5.4, w: 5.4, h: 5.4, note: "Two H-bridges and the logic that turns each STEP into one small step, with a chopper that holds each coil's current at the limit you set. Under the heatsink." },
    { id: "trimmer", label: "Current-limit trimmer", kind: "mechanical", x: 15.0, y: 5.8, w: 3.6, h: 3.6, note: "Turn the screw to set the current limit. Vref (volts at the screw) = 8 × current × sense resistor; with 0.1 Ω resistors, 1 A is 0.8 V. Measure it with the logic supply on." },
    { id: "sense", label: "Sense resistors", kind: "other", x: 1.8, y: 5.1, w: 3.4, h: 5, note: "One per coil. The chip reads the volts across it to find the coil current. R100 is 0.1 Ω, R068 is 0.068 Ω: the value changes what a given Vref means." },
    { id: "control", label: "Control pins (EN to DIR)", kind: "pins", x: 0, y: 0, w: 20.32, h: 2.54, note: "STEP: one pulse is one step. DIR: which way. MS1 to MS3 choose full step up to 1/16 step. EN low turns the outputs on. RST and SLP must be high; join them with a jumper." },
    { id: "coils", label: "Motor coils (2B, 2A, 1A, 1B)", kind: "connector", x: 5.08, y: 12.7, w: 10.16, h: 2.54, note: "A bipolar stepper has two coils: coil 1 goes on 1A and 1B, coil 2 on 2A and 2B. Never plug the motor in or out while the board is powered." },
    { id: "supply", label: "Supplies (VMOT, VDD, GND)", kind: "power", x: 0, y: 12.7, w: 5.08, h: 2.54, note: "VMOT is the motor battery, 8 V to 35 V, with a 47 µF or larger capacitor across VMOT and GND. VDD is the logic supply, 3 V to 5.5 V." },
  ],
  pins: [
    vcc("VMOT", "Motor supply, 8 V to 35 V. Put a 47 µF or larger capacitor right across VMOT and GND, and never unplug the motor while it is powered.", { accepts: [8, 35] }),
    vcc("VDD", "Logic supply, 3 V to 5.5 V. Inputs read high above 0.7 × VDD, so with VDD at 5 V a 3.3 V signal is not safe."),
    gnd("GND", "Logic ground. It must also join your board's GND."),
    gnd("GND2", "Motor ground, next to VMOT. Joined to the other GND.", { required: false }),
    pin("STEP", "digital", "drive", "Each rising edge makes the motor take one step (or microstep). Keep it at least 1 µs high and 1 µs low. Do not leave it floating."),
    pin("DIR", "digital", "drive", "High turns one way, low the other. Do not leave it floating."),
    pin("EN", "digital", "opt", "Enable, active low. Low or unconnected: the outputs are on. High: they switch off and the motor goes limp.", { label: "EN" }),
    pin("MS1", "digital", "opt", "Microstep select 1. All three open or low: full steps. MS1 high: half steps.", { label: "MS1" }),
    pin("MS2", "digital", "opt", "Microstep select 2. MS1 and MS2 high: 1/8 steps."),
    pin("MS3", "digital", "opt", "Microstep select 3. All three high: 1/16 steps, the finest."),
    pin("RST", "digital", "opt", "Reset, active low. It floats, so tie it to SLP (or to high) or the board will not run.", { label: "RST" }),
    pin("SLP", "digital", "opt", "Sleep, active low. High: awake. Tie it to RST if you don't use it.", { label: "SLP" }),
    pin("1A", "other", "load", "Coil 1, first wire."),
    pin("1B", "other", "load", "Coil 1, second wire."),
    pin("2A", "other", "load", "Coil 2, first wire."),
    pin("2B", "other", "load", "Coil 2, second wire."),
  ],
  pinAt: {
    ...name(control, "EN", "MS1", "MS2", "MS3", "RST", "SLP", "STEP", "DIR"),
    ...name(power, "VMOT", "GND2", "2B", "2A", "1A", "1B", "VDD", "GND"),
  },
  lab: { strips: [["GND", "GND2"]] },
  circuit: {
    blocks: [
      { id: "battery", label: "Battery", sub: "8–35 V", kind: "world", col: 0, row: 0, note: "The motor supply. 12 V is usual; 24 V makes the motor faster. A 2S LiPo (7.4 V) is too low." },
      { id: "vmot", label: "VMOT", sub: "motor supply", kind: "power", col: 1, row: 0, at: "VMOT", note: "Everything the coils draw comes in here. Put a 47 µF capacitor across it." },
      { id: "vdd", label: "VDD", sub: "logic supply", kind: "power", col: 1, row: 1, at: "VDD", note: "Powers the chip's logic, 5 mA to 8 mA." },
      { id: "logic", label: "STEP, DIR", sub: "and MS1–MS3", kind: "pin", col: 0, row: 1, at: "control", note: "Two pins do the work: a pulse on STEP is one step, DIR picks the way. They carry almost no current." },
      { id: "trim", label: "Trimmer", sub: "current limit", kind: "passive", col: 2, row: 0, at: "trimmer", note: "Sets Vref. The chip holds each coil's current to Vref ÷ (8 × the sense resistor)." },
      { id: "drive", label: "Two H-bridges", sub: "A4988", kind: "driver", col: 2, row: 1, at: "chip", hot: true, note: "MOSFET bridges that chop the coil current on and off to hold it at the limit. Each path loses about 0.64 Ω, so two coils at 1 A lose about 1.3 W." },
      { id: "sink", label: "Heatsink", sub: "sheds the heat", kind: "passive", col: 3, row: 0, at: "heatsink", note: "Glued to the chip. Without it the board is good for about 1 A per coil." },
      { id: "coils", label: "Motor coils", sub: "1A, 1B, 2A, 2B", kind: "connector", col: 3, row: 1, at: "coils", note: "The two coils of a bipolar stepper. The chip sends them current in a pattern that turns the shaft one microstep per STEP pulse." },
      { id: "gnd", label: "GND", kind: "ground", col: 1, row: 2, at: "GND", note: "Shared by the battery and your board." },
    ],
    links: [
      { from: "battery", to: "vmot", kind: "power", label: "up to 2 A per coil" },
      { from: "vmot", to: "drive", kind: "power" },
      { from: "vdd", to: "drive", kind: "power", label: "5–8 mA" },
      { from: "logic", to: "drive", kind: "signal", label: "step, direction" },
      { from: "trim", to: "drive", kind: "signal", label: "Vref" },
      { from: "drive", to: "coils", kind: "power", label: "chopped current" },
      { from: "drive", to: "sink", kind: "physical", label: "heat" },
      { from: "drive", to: "gnd", kind: "ground" },
    ],
    steps: [
      "Tie RST to SLP, set EN low, and feed 8 V or more to VMOT and 5 V to VDD. Set the trimmer first, with the motor wired.",
      "Your board sets DIR, then sends a pulse on STEP. On each rising edge the chip moves both coils' current one notch round its pattern: the shaft turns 1.8° in full-step mode, or 1/16 of that with MS1 to MS3 high.",
      "The chip chops each coil's current on and off tens of thousands of times a second to hold it at the limit the trimmer sets, so the motor gets the right current from any supply.",
      "The two bridges lose about 0.64 Ω per coil: 1.3 W at 1 A in both coils. The heatsink carries that away.",
    ],
  },
  facts: [
    { label: "Motors", value: "1 bipolar stepper" },
    { label: "Current", value: "1 A per coil bare, 2 A cooled" },
    { label: "Motor supply", value: "8–35 V" },
    { label: "Steps", value: "full to 1/16" },
    { label: "Logic", value: "3–5.5 V" },
    { label: "Size", value: "20 × 15 mm" },
  ],
  spec: {
    form: {
      mass: 2,
      mount: "breadboard",
      pitch: 2.54,
      note: "Two 8-pin rows 12.7 mm apart: they plug into a breadboard or a 3D printer board's StepStick sockets. No mounting holes. Pin 1 of the control row is EN; mind the direction when you plug it in.",
    },
    power: {
      supply: { min: 3, max: 5.5, typ: 5 },
      logic: 5,
      tolerant5V: true,
      draw: { idle: 5, active: 12 },
      bridge: { channels: 2, maxMa: 2000, ohms: 0.64 },
      interface: "STEP and DIR pulses; MS1 to MS3 set full to 1/16 step",
      note: "VDD is the logic supply, 3 V to 5.5 V. VMOT is the motor supply, 8 V to 35 V. Two coils at 1 A lose about 1.3 W. The chip limits current to Vref ÷ (8 × sense resistor), so the battery volts above the motor's rating are not wasted as heat in the motor.",
    },
    thermal: { thetaCW: 32, maxC: 150, note: "Allegro gives 32 °C per watt on a four-layer test board; this fits the board with its heatsink on. A bare small carrier is worse, about 50 to 60 °C per watt (estimate). Shuts off at 165 °C." },
    sourcing: { mpn: "A4988", maker: "Allegro MicroSystems", lifecycle: "active", usd: [1.5, 8], note: "Clones cost $1.50 to $3, Pololu's about $6 to $9. Sense resistors differ by maker (0.05, 0.068 or 0.1 Ω), which changes what Vref means." },
    limits: [
      "About 1 A per coil without a heatsink or airflow, though the chip is rated 2 A: 1.3 W at 1 A in both coils.",
      "VMOT must be 8 V or more, so a 5 V supply or a 2S LiPo (7.4 V) will not run it, and 35 V is the absolute limit.",
      "Needs a 47 µF or larger capacitor across VMOT and GND: its ceramics alone let a spike through that can pass 35 V.",
      "Finest microstep is 1/16, and the motor buzzes at some speeds.",
      "The same Vref gives a different current on boards with 0.05, 0.068 and 0.1 Ω sense resistors.",
      "Inputs read high above 0.7 × VDD: with VDD at 5 V a 3.3 V board's signal (needs 3.5 V) is not reliably high.",
      "No fault pin and no stall detection. Plugging the motor in while it is powered can kill the chip.",
    ],
    upgrade: [
      { name: "DRV8825", why: "Same size and pins, 1/32 microsteps and up to 45 V, but it needs a different Vref setting and runs hotter above 1.6 A without cooling." },
      { name: "TMC2209", why: "Fits the same sockets. Almost silent (StealthChop), 1/256 interpolated steps, about 2 A, 4.75 V to 29 V, and it runs cooler. It is set over a serial wire." },
    ],
    refs: [
      "https://mail.galexander.org/kossel/A4988-Datasheet.pdf",
      "https://www.pololu.com/product/1182",
      "https://lab127.karelia.ru/arduino/datasheets/A4988_carrier.pdf",
    ],
  },
  sim: {
    kind: "driver",
    supply: "VMOT",
    ground: "GND2",
    channels: [
      { outputs: ["1A", "1B"], inputs: ["STEP", "DIR"], enable: "EN" },
      { outputs: ["2A", "2B"], inputs: ["STEP", "DIR"], enable: "EN" },
    ],
  },
  experiment: { title: "One step per pulse", idea: "Wire a NEMA 17 stepper, tie RST to SLP and send 200 pulses on STEP: one turn in full-step mode. Raise MS1 to MS3 and send 3200 for the same turn, quieter." },
  tags: ["a4988", "stepstick", "stepper driver", "stepper motor", "3d printer", "microstepping", "driver"],
});
