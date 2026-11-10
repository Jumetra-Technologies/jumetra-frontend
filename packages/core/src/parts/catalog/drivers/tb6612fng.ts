import { MATERIAL, board, definePart, gnd, name, pin, pinHeader, silk, smd, vcc } from "../../sdk";
import { gullWing, pinOneDot } from "./_chips";

const RED = "#c01d20";
const TOP = 1.6;
const S = MATERIAL.silk;

// Two straight headers, 17.78 mm (0.7 in) apart, pins down for a breadboard.
const power = pinHeader(1.27, 1.27, 8, { style: "down" });
const control = pinHeader(1.27, 19.03, 8, { style: "down" });

export default definePart({
  id: "tb6612fng",
  name: "TB6612FNG dual motor driver",
  aka: ["TB6612", "TB6612FNG breakout", "Toshiba motor driver", "ROB-14450"],
  group: "drivers",
  rank: 2,
  summary: "A thumb-sized board that runs two small DC motors, or one stepper, forward, backward and at any speed. It loses about a quarter of what an L298N does, so it stays cool with no heatsink.",
  size: { w: 20.3, h: 20.3, d: 3.5 },
  solids: [
    board(20.3, 20.3, RED, { radius: 0.5 }),
    power,
    control,
    // The driver: a 24-pin SSOP, 0.65 mm between legs.
    gullWing(10.15, 10.15, 12, 0.65, { length: 8.4, width: 5.6, height: 1.6, span: 7.8 }, { text: "TB6612FNG", size: 1.05 }, { id: "chip" }),
    pinOneDot(6.6, 8.3, TOP + 1.72),
    // The supply filter capacitors: one on VM, one on VCC.
    smd(1.95, 5.2, "c", "y", "0805"),
    smd(4.5, 5.2, "c", "y", "0805"),
    // A few of the small resistors and capacitors that sit round the chip.
    smd(15.6, 6.6, "r", "y"),
    smd(15.6, 9.2, "r", "y"),
    smd(17.2, 6.6, "c", "y"),
    smd(17.2, 9.2, "r", "y"),
    smd(4.6, 12.4, "c", "y"),
    smd(15.6, 12.6, "r", "x"),
    // Printing: a label at every pin.
    silk(1.27, 3.9, "VM", 0.8, S, { anchor: "middle" }),
    silk(3.81, 3.9, "VCC", 0.8, S, { anchor: "middle" }),
    silk(6.35, 3.9, "GND", 0.8, S, { anchor: "middle" }),
    silk(8.89, 3.9, "AO1", 0.8, S, { anchor: "middle" }),
    silk(11.43, 3.9, "AO2", 0.8, S, { anchor: "middle" }),
    silk(13.97, 3.9, "BO2", 0.8, S, { anchor: "middle" }),
    silk(16.51, 3.9, "BO1", 0.8, S, { anchor: "middle" }),
    silk(19.05, 3.9, "GND", 0.8, S, { anchor: "middle" }),
    silk(1.27, 17.6, "PWMA", 0.7, S, { anchor: "middle" }),
    silk(3.81, 17.6, "AIN2", 0.7, S, { anchor: "middle" }),
    silk(6.35, 17.6, "AIN1", 0.7, S, { anchor: "middle" }),
    silk(8.89, 17.6, "STBY", 0.7, S, { anchor: "middle" }),
    silk(11.43, 17.6, "BIN1", 0.7, S, { anchor: "middle" }),
    silk(13.97, 17.6, "BIN2", 0.7, S, { anchor: "middle" }),
    silk(16.51, 17.6, "PWMB", 0.7, S, { anchor: "middle" }),
    silk(19.05, 17.6, "GND", 0.7, S, { anchor: "middle" }),
    silk(10.15, 15.6, "MOTOR DRIVER", 0.75, S, { anchor: "middle" }),
  ],
  features: [
    { id: "chip", label: "TB6612FNG chip", kind: "chip", x: 5.8, y: 6.25, w: 8.7, h: 7.8, note: "Two H-bridges built from MOSFETs: a pair of switches per motor terminal that join it to the supply or to ground. Each bridge loses only about 0.5 V at 1 A." },
    { id: "supply", label: "Supply pins (VM, VCC, GND)", kind: "power", x: 0, y: 0, w: 7.62, h: 2.54, note: "VM takes the motor battery, 4.5 V to 13.5 V. VCC takes the board's logic voltage, 2.7 V to 5.5 V. Join GND to your board's GND." },
    { id: "outputs", label: "Motor outputs (AO1, AO2, BO2, BO1)", kind: "connector", x: 7.62, y: 0, w: 10.16, h: 2.54, note: "Motor A goes on AO1 and AO2, motor B on BO1 and BO2. Swap a motor's two wires to turn it the other way." },
    { id: "control", label: "Control pins", kind: "pins", x: 0, y: 17.76, w: 20.3, h: 2.54, note: "AIN1 and AIN2 pick motor A's direction, BIN1 and BIN2 motor B's. PWMA and PWMB set the speed with PWM. STBY must be high or the chip sleeps." },
    { id: "stby", label: "STBY", kind: "pin", x: 7.62, y: 17.76, w: 2.54, h: 2.54, note: "Standby. Low: both bridges switch off and the chip draws 1 µA. Wire it to a 3.3 V or 5 V pin, or to a board pin you set high." },
    { id: "vm-cap", label: "VM capacitor", kind: "other", x: 1.3, y: 4.2, w: 1.3, h: 2.2, note: "Smooths the motor supply so a motor starting up doesn't dip your battery." },
    { id: "vcc-cap", label: "VCC capacitor", kind: "other", x: 3.85, y: 4.2, w: 1.3, h: 2.2, note: "Filters the 5 V or 3.3 V logic supply." },
  ],
  pins: [
    vcc("VM", "Motor supply from the battery: 4.5 V to 13.5 V. Below 5 V it can pass only 0.4 A.", { accepts: [4.5, 13.5] }),
    vcc("VCC", "Logic supply: 2.7 V to 5.5 V. Use your board's logic voltage (3.3 V or 5 V); inputs read high above 0.7 × VCC."),
    gnd("GND", "Ground. It must also join your board's GND."),
    gnd("GND2", "A second ground pin, joined to GND on the board.", { required: false }),
    gnd("GND3", "A third ground pin on the control side, joined to GND.", { required: false }),
    pin("AO1", "other", "load", "Motor A, first wire.", { label: "AO1" }),
    pin("AO2", "other", "load", "Motor A, second wire."),
    pin("BO1", "other", "load", "Motor B, first wire."),
    pin("BO2", "other", "load", "Motor B, second wire."),
    pin("PWMA", "pwm", "pwm", "Speed of motor A by PWM, up to 100 kHz. Tie it high for full speed.", { required: false }),
    pin("AIN1", "digital", "drive", "Motor A direction. AIN1 high and AIN2 low: one way. AIN1 low and AIN2 high: the other.", { required: false }),
    pin("AIN2", "digital", "drive", "Motor A direction. Both high: brake. Both low: coast.", { required: false }),
    pin("STBY", "digital", "drive", "Standby. High: the chip works. Low: both motors off. Left floating the board holds it low, so the motors stay dead."),
    pin("BIN1", "digital", "drive", "Motor B direction.", { required: false }),
    pin("BIN2", "digital", "drive", "Motor B direction.", { required: false }),
    pin("PWMB", "pwm", "pwm", "Speed of motor B by PWM. Tie it high for full speed.", { required: false }),
  ],
  pinAt: {
    ...name(power, "VM", "VCC", "GND", "AO1", "AO2", "BO2", "BO1", "GND2"),
    ...name(control, "PWMA", "AIN2", "AIN1", "STBY", "BIN1", "BIN2", "PWMB", "GND3"),
  },
  lab: { strips: [["GND", "GND2", "GND3"]] },
  circuit: {
    blocks: [
      { id: "battery", label: "Battery", sub: "4.5–13.5 V", kind: "world", col: 0, row: 0, note: "The motor supply. Two LiPo cells (8.4 V) or six AAs (9 V) suit it well." },
      { id: "vm", label: "VM", sub: "motor supply", kind: "power", col: 1, row: 0, at: "VM", note: "Everything the motors draw comes in here, through a filter capacitor." },
      { id: "vcc", label: "VCC", sub: "logic supply", kind: "power", col: 1, row: 1, at: "VCC", note: "Powers the chip's logic, about 1.5 mA. It also sets what counts as a high signal: 0.7 × VCC." },
      { id: "logic", label: "Control pins", sub: "IN1, IN2, PWM, STBY", kind: "pin", col: 0, row: 1, at: "control", note: "Seven pins from your board. They carry almost no current: they only tell the bridges what to do." },
      { id: "bridge", label: "Two H-bridges", sub: "TB6612FNG", kind: "driver", col: 2, row: 1, at: "chip", hot: true, note: "MOSFET switches. A motor path goes through one high-side and one low-side switch, about 0.5 Ω in all, so the chip loses 0.5 W per motor at 1 A." },
      { id: "out", label: "Motor outputs", sub: "A and B", kind: "connector", col: 3, row: 1, at: "outputs", note: "Battery volts minus about 0.5 V at 1 A." },
      { id: "gnd", label: "GND", kind: "ground", col: 1, row: 2, at: "GND", note: "Shared by the battery and your board. Without it the logic pins mean nothing." },
    ],
    links: [
      { from: "battery", to: "vm", kind: "power", label: "up to 1.2 A each" },
      { from: "vm", to: "bridge", kind: "power" },
      { from: "vcc", to: "bridge", kind: "power", label: "1.5 mA" },
      { from: "logic", to: "bridge", kind: "signal", label: "direction, speed, standby" },
      { from: "bridge", to: "out", kind: "power", label: "−0.5 V at 1 A" },
      { from: "bridge", to: "gnd", kind: "ground" },
    ],
    steps: [
      "Your board sets STBY high. That wakes the chip; low, it switches everything off and draws 1 µA.",
      "AIN1 high and AIN2 low: inside the chip one switch joins AO1 to the battery and another joins AO2 to ground, so motor A turns. Swap the two and it reverses.",
      "PWM on PWMA switches the bridge on and off thousands of times a second; the longer it is on, the faster the motor.",
      "The switches are MOSFETs with about 0.5 Ω between them. At 1 A that is 0.5 V off your battery and 0.5 W of heat per motor: no heatsink needed.",
    ],
  },
  facts: [
    { label: "Motors", value: "2 DC or 1 stepper" },
    { label: "Current", value: "1.2 A per motor, 3.2 A peak" },
    { label: "Motor supply", value: "4.5–13.5 V" },
    { label: "Voltage lost", value: "0.5 V at 1 A" },
    { label: "Logic", value: "2.7–5.5 V, 3.3 V works" },
    { label: "Size", value: "20 × 20 mm" },
  ],
  spec: {
    form: {
      mass: 2.5,
      mount: "breadboard",
      pitch: 2.54,
      note: "Two 8-pin rows, 17.78 mm apart, that plug into a breadboard or take jumper wires. No mounting holes: the pins hold it. Pin order differs a little between makers, so follow the printing on yours.",
    },
    power: {
      supply: { min: 2.7, max: 5.5, typ: 5 },
      logic: 3.3,
      tolerant5V: true,
      draw: { idle: 1.5, active: 1.5 },
      bridge: { channels: 2, maxMa: 1200, peakMa: 3200, ohms: 0.5 },
      interface: "Two direction pins and one PWM pin per motor, plus STBY",
      note: "VM is the motor supply (4.5 V to 13.5 V); VCC feeds only the logic. The motor gets VM minus about 0.5 Ω × its current. Below 5 V on VM the chip may pass only 0.4 A.",
    },
    thermal: { thetaCW: 160, maxC: 150, note: "160 °C per watt for the bare chip (Toshiba); the board's copper helps. Both motors at 1 A lose 1 W. The chip shuts itself down at 175 °C." },
    sourcing: { mpn: "TB6612FNG", maker: "Toshiba", lifecycle: "active", usd: [3, 15], note: "Sold on SparkFun-style red boards and on Pololu's black one, and as cheap blue and purple clones. Pin order differs between brands." },
    limits: [
      "VM stops at 13.5 V (15 V absolute maximum): no 4S LiPo (16.8 V) and no 24 V motors.",
      "1.2 A per motor, 3.2 A for a short pulse. A TT gear motor that stalls at 1.5 A to 2 A will trip it.",
      "Below 5 V on VM it passes only 0.4 A, so a single lithium cell is a poor supply.",
      "STBY is held low by the board: forget to drive it and both motors stay dead.",
      "Inputs read high above 0.7 × VCC. With VCC at 5 V a 3.3 V signal (needs 3.5 V) is not reliably high: set VCC to 3.3 V.",
      "Both motors at 1 A lose 1 W, more than the bare chip sheds (160 °C per watt), so run it below that or give the board copper and air.",
      "No current limit and no fault pin.",
    ],
    upgrade: [
      { part: "drv8833", name: "DRV8833", why: "Loses 0.36 Ω instead of 0.5 Ω, passes 1.5 A per motor and runs from 2.7 V, so it suits a one-cell battery robot. It stops at 10.8 V." },
      { name: "DRV8871", why: "One bridge with 3.6 A peak and 6.5 V to 45 V, for a motor that needs more current or voltage than this board gives; two are needed for two motors." },
    ],
    refs: [
      "https://faculty-web.msoe.edu/johnsontimoj/Common/FILES/TB6612FNG.pdf",
      "https://pololu.com/product/713/specs",
      "https://learn.sparkfun.com/tutorials/tb6612fng-hookup-guide/board-overview",
    ],
  },
  sim: {
    kind: "driver",
    supply: "VM",
    ground: "GND",
    standby: "STBY",
    channels: [
      { outputs: ["AO1", "AO2"], inputs: ["AIN1", "AIN2"], enable: "PWMA" },
      { outputs: ["BO1", "BO2"], inputs: ["BIN1", "BIN2"], enable: "PWMB" },
    ],
  },
  experiment: { title: "Drive two motors, then put it on standby", idea: "Wire two small motors and a 6 V pack. Run both forward, then reverse, then pull STBY low and watch both stop at once." },
  tags: ["tb6612fng", "tb6612", "motor driver", "h-bridge", "dc motor", "robot", "mosfet", "driver"],
});
