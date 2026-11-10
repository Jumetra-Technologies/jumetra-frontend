import { MATERIAL, board, definePart, gnd, name, pin, pinHeader, silk, smd, vcc } from "../../sdk";
import { gullWing, pinOneDot } from "./_chips";

const RED = "#b81d1d";
const TOP = 1.6;
const S = MATERIAL.silk;

// The generic red module: two 6-pin rows 12.7 mm (0.5 in) apart, pins down for a breadboard.
const outputs = pinHeader(3.15, 2.15, 6, { style: "down" });
const inputs = pinHeader(3.15, 14.85, 6, { style: "down" });

export default definePart({
  id: "drv8833",
  name: "DRV8833 dual motor driver",
  aka: ["DRV8833 module", "HW-627", "TI motor driver", "2.7 V motor driver"],
  group: "drivers",
  rank: 4,
  summary: "A tiny board that runs two small motors from one or two lithium cells. It loses only 0.36 V at 1 A and works from 2.7 V, so it suits a small battery robot. It stops at 10.8 V.",
  size: { w: 19, h: 17, d: 2.9 },
  solids: [
    board(19, 17, RED, { radius: 0.5 }),
    outputs,
    inputs,
    // The driver: a 16-pin TSSOP, 0.65 mm between legs.
    gullWing(9.5, 8.5, 8, 0.65, { length: 5.2, width: 4.4, height: 1.1, span: 6.4 }, { text: "8833", size: 1.1 }, { id: "chip" }),
    pinOneDot(7.3, 7.2, TOP + 1.22, 0.25),
    // The power capacitors: 10 µF on VM, 2.2 µF on VINT, 10 nF on VCP.
    smd(3.0, 6.3, "c", "y", "0805"),
    smd(3.0, 9.1, "c", "y", "0805"),
    smd(5.3, 6.5, "c", "y"),
    smd(14.2, 6.3, "c", "y", "0805"),
    smd(14.2, 9.1, "r", "y"),
    smd(16.0, 6.5, "r", "y"),
    smd(16.0, 9.3, "r", "y"),
    smd(5.3, 10.0, "r", "y"),
    // Printing: a label at every pin.
    silk(3.15, 4.7, "OUT1", 0.75, S, { anchor: "middle" }),
    silk(5.69, 4.7, "OUT2", 0.75, S, { anchor: "middle" }),
    silk(8.23, 4.7, "OUT3", 0.75, S, { anchor: "middle" }),
    silk(10.77, 4.7, "OUT4", 0.75, S, { anchor: "middle" }),
    silk(13.31, 4.7, "VCC", 0.75, S, { anchor: "middle" }),
    silk(15.85, 4.7, "GND", 0.75, S, { anchor: "middle" }),
    silk(3.15, 12.5, "EEP", 0.75, S, { anchor: "middle" }),
    silk(5.69, 12.5, "ULT", 0.75, S, { anchor: "middle" }),
    silk(8.23, 12.5, "IN1", 0.75, S, { anchor: "middle" }),
    silk(10.77, 12.5, "IN2", 0.75, S, { anchor: "middle" }),
    silk(13.31, 12.5, "IN3", 0.75, S, { anchor: "middle" }),
    silk(15.85, 12.5, "IN4", 0.75, S, { anchor: "middle" }),
  ],
  features: [
    { id: "chip", label: "DRV8833 chip", kind: "chip", x: 6.7, y: 5.1, w: 5.6, h: 6.8, note: "Two H-bridges built from MOSFETs. Each bridge loses about 0.36 V at 1 A and passes 1.5 A when the chip has a heat pad on a good board." },
    { id: "outputs", label: "Motor outputs (OUT1–OUT4)", kind: "connector", x: 1.88, y: 0.88, w: 10.16, h: 2.54, note: "Motor A goes on OUT1 and OUT2, motor B on OUT3 and OUT4. Swap a motor's two wires to turn it the other way." },
    { id: "supply", label: "Supply (VCC, GND)", kind: "power", x: 12.04, y: 0.88, w: 5.08, h: 2.54, note: "The battery goes on VCC and GND: 2.7 V to 10.8 V. The board calls the motor supply VCC; the chip has no separate logic supply." },
    { id: "control", label: "Control pins (IN1–IN4)", kind: "pins", x: 6.96, y: 13.58, w: 10.16, h: 2.54, note: "IN1 and IN2 pick motor A's direction, IN3 and IN4 motor B's. Put PWM on one input of a pair to set the speed." },
    { id: "sleep", label: "EEP and ULT", kind: "pins", x: 1.88, y: 13.58, w: 5.08, h: 2.54, note: "EEP is the sleep input: high wakes the chip. ULT is the fault output: it goes low on a short or overheat. Wire EEP high if the motors stay still." },
    { id: "caps", label: "Bypass capacitors", kind: "other", x: 2.3, y: 5.3, w: 3.7, h: 5.4, note: "Hold the supply steady while the motors switch." },
  ],
  pins: [
    vcc("VM", "Motor supply: 2.7 V to 10.8 V, printed VCC on the board. 12 V will kill it. Below 5 V it loses a little more, so the motors run slower.", { label: "VCC" }),
    gnd("GND", "Ground. It must also join your board's GND."),
    pin("IN1", "digital", "drive", "Motor A direction. IN1 high and IN2 low: one way. Put PWM on it for speed.", { required: false }),
    pin("IN2", "digital", "drive", "Motor A direction. IN2 high and IN1 low: the other way. Both high: brake. Both low: coast.", { required: false }),
    pin("IN3", "digital", "drive", "Motor B direction.", { required: false }),
    pin("IN4", "digital", "drive", "Motor B direction.", { required: false }),
    pin("OUT1", "other", "load", "Motor A, first wire."),
    pin("OUT2", "other", "load", "Motor A, second wire."),
    pin("OUT3", "other", "load", "Motor B, first wire."),
    pin("OUT4", "other", "load", "Motor B, second wire."),
    pin("SLEEP", "digital", "opt", "Sleep input (printed EEP). High: awake. Low: asleep, 1.6 µA. The chip pulls it low itself, so if the motors never move, wire it to your logic voltage.", { label: "EEP" }),
    pin("FAULT", "digital", "opt", "Fault output (printed ULT), open-drain. Goes low on over-current, over-heat or low voltage. Read it with INPUT_PULLUP. Some makers swap the EEP and ULT names: check yours.", { label: "ULT" }),
  ],
  pinAt: {
    ...name(outputs, "OUT1", "OUT2", "OUT3", "OUT4", "VM", "GND"),
    ...name(inputs, "SLEEP", "FAULT", "IN1", "IN2", "IN3", "IN4"),
  },
  circuit: {
    blocks: [
      { id: "battery", label: "Battery", sub: "2.7–10.8 V", kind: "world", col: 0, row: 0, note: "One or two lithium cells, or four AAs. Not 12 V: the chip's limit is 10.8 V." },
      { id: "vm", label: "VCC (VM)", sub: "motor supply", kind: "power", col: 1, row: 0, at: "VM", note: "The only supply. The motors and the chip's logic both run from it." },
      { id: "logic", label: "IN1–IN4", sub: "and EEP", kind: "pin", col: 0, row: 1, at: "control", note: "Four direction pins and a sleep pin from your board. They carry almost no current. They read high above 2 V, so 3.3 V works." },
      { id: "bridge", label: "Two H-bridges", sub: "DRV8833", kind: "driver", col: 2, row: 1, at: "chip", hot: true, note: "MOSFET switches. A motor path goes through two of them, 0.36 Ω in all when cold and 0.6 Ω when hot, so the chip loses 0.36 W per motor at 1 A." },
      { id: "out", label: "Motor outputs", sub: "OUT1–OUT4", kind: "connector", col: 3, row: 1, at: "outputs", note: "Battery volts minus about 0.4 V at 1 A." },
      { id: "fault", label: "ULT", sub: "fault out", kind: "pin", col: 2, row: 2, at: "FAULT", note: "Goes low if the chip shuts down, so your code can tell." },
      { id: "gnd", label: "GND", kind: "ground", col: 1, row: 2, at: "GND", note: "Shared by the battery and your board." },
    ],
    links: [
      { from: "battery", to: "vm", kind: "power", label: "up to 1.5 A each" },
      { from: "vm", to: "bridge", kind: "power" },
      { from: "logic", to: "bridge", kind: "signal", label: "direction, speed, sleep" },
      { from: "bridge", to: "out", kind: "power", label: "−0.36 V at 1 A" },
      { from: "bridge", to: "fault", kind: "signal", label: "low on a fault" },
      { from: "bridge", to: "gnd", kind: "ground" },
    ],
    steps: [
      "The battery feeds VCC. The chip runs on it alone: there is no separate logic supply.",
      "IN1 high and IN2 low: one switch joins OUT1 to the battery and another joins OUT2 to ground, so motor A turns. Swap the two and it reverses.",
      "PWM on IN1 or IN2 switches the bridge on and off; the longer it is on, the faster the motor.",
      "Each path loses 0.36 Ω, about 0.36 V and 0.36 W at 1 A. Hot, it is 0.6 Ω. If the chip passes about 150 °C it shuts off and ULT goes low.",
    ],
  },
  facts: [
    { label: "Motors", value: "2 DC or 1 stepper" },
    { label: "Current", value: "1.5 A per motor on the best chip" },
    { label: "Motor supply", value: "2.7–10.8 V" },
    { label: "Voltage lost", value: "0.36 V at 1 A" },
    { label: "Logic", value: "3.3 V or 5 V" },
    { label: "Size", value: "19 × 17 mm" },
  ],
  spec: {
    form: {
      mass: 2,
      mount: "breadboard",
      pitch: 2.54,
      note: "Two 6-pin rows 12.7 mm apart that plug into a breadboard or take jumper wires. No mounting holes. The order of the pins differs between makers, so follow the printing on yours.",
    },
    power: {
      supply: { min: 2.7, max: 10.8, typ: 6 },
      logic: 3.3,
      tolerant5V: true,
      draw: { idle: 1.7, active: 1.7 },
      bridge: { channels: 2, maxMa: 1500, peakMa: 2000, ohms: 0.36 },
      interface: "Two direction inputs per motor, PWM on either one; EEP sleeps the chip",
      note: "One supply for everything: the motor gets VCC minus 0.36 Ω × its current (0.6 Ω when hot). The 1.5 A figure holds only for the version with a heat pad, on a good board.",
    },
    thermal: { thetaCW: 70, maxC: 150, note: "Texas Instruments gives 40.5 °C per watt for the heat-pad version on its test board; this small module is worse, about 60 to 80 °C per watt (estimate). Shuts off near 160 °C." },
    sourcing: { mpn: "DRV8833", maker: "Texas Instruments", lifecycle: "active", usd: [2, 11], note: "A generic module costs $2 to $3; Pololu's carrier $11. Cheap modules may use the PW package, with no heat pad, which TI rates at only 500 mA." },
    limits: [
      "VCC stops at 10.8 V (11.8 V absolute maximum): no 12 V battery and no full 3S LiPo (12.6 V).",
      "The 1.5 A rating needs the heat-pad package. The plain TSSOP is rated 500 mA, and Pololu saw even the good one shut down after about a minute at 1.5 A in still air. Plan on 1.2 A.",
      "Its on-resistance rises from 0.36 Ω to 0.6 Ω as the chip heats from 25 °C to 85 °C, and below 5 V.",
      "Current limiting is off on most modules (the sense pins go to ground), so a stalled motor can pull 2 A and trip the shutdown.",
      "EEP and ULT are named differently by different makers, and EEP may need wiring high.",
    ],
    upgrade: [
      { part: "tb6612fng", name: "TB6612FNG", why: "Runs on a motor supply up to 13.5 V instead of 10.8 V, so a 3S LiPo or a 12 V pack works. It loses a little more, 0.5 Ω against 0.36 Ω." },
      { name: "DRV8871", why: "One bridge with 3.6 A peak and 6.5 V to 45 V, for a bigger motor. You need two for two motors." },
    ],
    refs: [
      "https://users.ece.utexas.edu/~valvano/Datasheets/drv8833.pdf",
      "https://www.ti.com/document-viewer/lit/html/SLVSAR1",
      "https://www.pololu.com/product/2130",
      "https://components101.com/node/2317",
    ],
  },
  sim: {
    kind: "driver",
    supply: "VM",
    ground: "GND",
    channels: [
      { outputs: ["OUT1", "OUT2"], inputs: ["IN1", "IN2"] },
      { outputs: ["OUT3", "OUT4"], inputs: ["IN3", "IN4"] },
    ],
  },
  experiment: { title: "Run a robot from one lithium cell", idea: "Power it from a single 3.7 V cell and drive two small gear motors. Compare how fast they turn with an L298N on the same cell." },
  tags: ["drv8833", "motor driver", "h-bridge", "dc motor", "lithium", "small robot", "driver"],
});
