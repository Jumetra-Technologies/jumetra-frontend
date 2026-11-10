import { MATERIAL, board, capacitor, definePart, dpak, gnd, heatsinkUpright, jumperCap, name, pin, pinHeader, silk, smd, smdDiode, smdLed, terminalBlock, vcc, type Solid } from "../../sdk";

const RED = "#b3191c";
const TOP = 1.6;

const motorA = terminalBlock(0.2, 11.5, 2, { mouth: "left" });
const motorB = terminalBlock(35.2, 11.5, 2, { mouth: "right" });
const power = terminalBlock(4.2, 35.2, 3, { mouth: "bottom" });
const control = pinHeader(24.6, 40.3, 6, { style: "up" });
/** The spare 5 V pins behind ENA and ENB that the factory jumpers bridge to. */
const enableA5v = pinHeader(24.6, 37.76, 1, { style: "up" });
const enableB5v = pinHeader(37.3, 37.76, 1, { style: "up" });
const regulatorJumper = pinHeader(13.7, 31.4, 2, { style: "up" });

/** The L298N itself: a Multiwatt-15 package standing up, its steel tab bolted to the heatsink behind it. */
const chip: Solid[] = [
  { kind: "box", x: 11.6, y: 13.1, w: 19.8, h: 1.2, d: 21.5, z: TOP + 2.5, top: "#c9ccd1", finish: "metal", radius: 0.2 },
  { kind: "box", id: "chip", x: 11.7, y: 14.3, w: 19.6, h: 3.8, d: 15, z: TOP + 2.5, top: "#1b1c1f", finish: "epoxy", radius: 0.3, label: { text: "L298N", size: 1.5, color: "#9aa0a6" } },
  // Fifteen leads in two staggered rows, bent forward to the board.
  { kind: "pins", x: 12.3, y: 17.9, count: 8, pitch: 2.54, dir: "x", len: 4, z: TOP, size: 0.6, color: MATERIAL.tin, finish: "tin" },
  { kind: "pins", x: 13.57, y: 20.2, count: 7, pitch: 2.54, dir: "x", len: 3, z: TOP, size: 0.6, color: MATERIAL.tin, finish: "tin" },
  // The screw that clamps the tab to the heatsink.
  { kind: "cyl", cx: 21.5, cy: 13.4, r: 1.6, d: 1.6, z: TOP + 18.6, axis: "y", top: "#c9ccd1", finish: "metal" },
];

const diodes: Solid[] = [13, 18.6, 24.4, 30].flatMap((x) => [...smdDiode(x, 24.6, "y", -1), ...smdDiode(x, 29.6, "y", 1)]);

export default definePart({
  id: "l298n",
  name: "L298N motor driver",
  aka: ["L298N dual H-bridge", "red motor driver", "HW-095"],
  group: "drivers",
  rank: 1,
  summary: "The red board in most robot car kits. It lets two board pins run a motor forward or backward at up to 2 A, and it wastes about 2 V of your battery doing it: watch the heatsink.",
  size: { w: 43, h: 43, d: 26.6 },
  solids: [
    board(43, 43, RED, {
      radius: 1,
      holes: [
        { x: 3.2, y: 3.2, d: 3 },
        { x: 39.8, y: 3.2, d: 3 },
        { x: 3.2, y: 39.8, d: 3 },
        { x: 39.8, y: 39.8, d: 3 },
      ],
    }),
    heatsinkUpright(9.3, 1.6, 24.4, 11.5, 25, { spine: "bottom", fins: 9 }),
    chip,
    motorA,
    motorB,
    power,
    control,
    enableA5v,
    enableB5v,
    jumperCap(24.6, 39.03, "y", "#16181c"),
    jumperCap(37.3, 39.03, "y", "#16181c"),
    regulatorJumper,
    jumperCap(14.97, 31.4, "x", "#16181c"),
    dpak(8, 28.6, "bottom", "78M05"),
    capacitor(36.4, 28.6, 3.15, 11, TOP, "radial"),
    diodes,
    smdLed(22.4, 33.6, "#ff4d4d", "led-pwr"),
    smd(25.4, 33.6, "r"),
    silk(11.7, 34.4, "+12V  GND  +5V", 1.1, MATERIAL.silk, { anchor: "middle" }),
    silk(30.9, 36.2, "IN1 IN2 IN3 IN4", 0.95, MATERIAL.silk, { anchor: "middle" }),
    silk(22.6, 36.2, "ENA", 0.85, MATERIAL.silk, { anchor: "end" }),
    silk(39.2, 36.2, "ENB", 0.85, MATERIAL.silk, { anchor: "start" }),
    silk(9.4, 15.2, "OUT1", 0.95, MATERIAL.silk),
    silk(9.4, 20.2, "OUT2", 0.95, MATERIAL.silk),
    silk(33.6, 15.2, "OUT3", 0.95, MATERIAL.silk, { anchor: "end" }),
    silk(33.6, 20.2, "OUT4", 0.95, MATERIAL.silk, { anchor: "end" }),
    silk(18.6, 32.9, "5V EN", 0.85, MATERIAL.silk),
  ],
  features: [
    { id: "heatsink", label: "Heatsink", kind: "mechanical", x: 9.3, y: 1.6, w: 24.4, h: 11.5, note: "The chip turns about 2 W into heat for every amp a motor draws. The fins get rid of it; above about 1 A per motor they need moving air." },
    { id: "chip", label: "L298N chip", kind: "chip", x: 11.6, y: 13.1, w: 19.8, h: 8.4, note: "Two H-bridges built from bipolar transistors: four switches per motor that connect each terminal to the supply or to ground." },
    { id: "motor-a", label: "Motor A (OUT1, OUT2)", kind: "connector", x: 0.2, y: 11.5, w: 7.6, h: 10, note: "Screw one motor's two wires in here. Swap them if it turns the wrong way." },
    { id: "motor-b", label: "Motor B (OUT3, OUT4)", kind: "connector", x: 35.2, y: 11.5, w: 7.6, h: 10, note: "The second motor." },
    { id: "power", label: "Power (+12V, GND, +5V)", kind: "power", x: 4.2, y: 35.2, w: 15, h: 7.6, note: "The battery goes on +12V and GND. +5V gives 5 V out while the 5V EN jumper is on and the battery is 7 V to 12 V." },
    { id: "control", label: "Control pins", kind: "pins", x: 23.3, y: 36.4, w: 15.3, h: 5.3, note: "IN1 and IN2 choose motor A's direction, IN3 and IN4 motor B's. ENA and ENB set the speed with PWM; their jumpers hold them on at full speed." },
    { id: "regulator", label: "5 V regulator (78M05)", kind: "power", x: 4.7, y: 24.6, w: 6.6, h: 9.2, note: "Makes 5 V for the chip's logic from the battery. A linear regulator: it burns the difference as heat, so pull the jumper above 12 V." },
    { id: "jumper-5v", label: "5V EN jumper", kind: "other", x: 12.4, y: 30.1, w: 5.1, h: 2.6, note: "On: the regulator runs and +5V is an output. Off: you must feed 5 V into +5V yourself." },
    { id: "diodes", label: "Flyback diodes", kind: "other", x: 11.4, y: 22.2, w: 20.2, h: 9.8, note: "Eight diodes that catch the voltage spike a motor makes each time it is switched off, so the spike can't kill the chip." },
    { id: "led-pwr", label: "Power LED", kind: "led", x: 22.4, y: 33.6, w: 1.6, h: 0.8, note: "Lit while the 5 V logic supply is up." },
  ],
  pins: [
    vcc("VS", "Motor supply from the battery: 5 V to 35 V. It needs 7 V or more for the on-board 5 V regulator.", { label: "+12V" }),
    gnd("GND", "Battery ground, and it must also join the board's GND."),
    pin("5V", "power", "opt", "5 V out for a board (up to about 0.5 A) while the 5V EN jumper is on; 5 V in when it is off.", { label: "+5V" }),
    pin("ENA", "pwm", "pwm", "Speed of motor A by PWM. Leave its jumper on for full speed.", { required: false }),
    pin("IN1", "digital", "drive", "Motor A direction. IN1 high and IN2 low: forward.", { required: false }),
    pin("IN2", "digital", "drive", "Motor A direction. IN2 high and IN1 low: reverse. Both the same: brake.", { required: false }),
    pin("IN3", "digital", "drive", "Motor B direction.", { required: false }),
    pin("IN4", "digital", "drive", "Motor B direction.", { required: false }),
    pin("ENB", "pwm", "pwm", "Speed of motor B by PWM. Leave its jumper on for full speed.", { required: false }),
    pin("OUT1", "other", "load", "Motor A, first wire."),
    pin("OUT2", "other", "load", "Motor A, second wire."),
    pin("OUT3", "other", "load", "Motor B, first wire."),
    pin("OUT4", "other", "load", "Motor B, second wire."),
  ],
  pinAt: {
    ...name(power, "VS", "GND", "5V"),
    ...name(control, "ENA", "IN1", "IN2", "IN3", "IN4", "ENB"),
    ...name(motorA, "OUT1", "OUT2"),
    ...name(motorB, "OUT3", "OUT4"),
  },
  circuit: {
    blocks: [
      { id: "battery", label: "Battery", sub: "7–12 V", kind: "world", col: 0, row: 0, note: "The motor supply. Four AA cells are only 6 V: too little for the regulator, and the chip takes 2 V of it." },
      { id: "vs", label: "+12V", sub: "motor supply", kind: "power", col: 1, row: 0, at: "VS", note: "Everything the motors draw comes in here." },
      { id: "reg", label: "78M05", sub: "5 V regulator", kind: "regulator", col: 2, row: 0, at: "regulator", note: "Feeds the chip's logic. It burns (battery volts − 5) × current as heat." },
      { id: "logic", label: "Logic", sub: "IN1–IN4, ENA, ENB", kind: "pin", col: 0, row: 1, at: "control", note: "Six pins from your board. They carry almost no current: they only tell the bridges what to do." },
      { id: "bridge", label: "Two H-bridges", sub: "L298N", kind: "driver", col: 2, row: 1, at: "chip", hot: true, note: "Eight transistors as switches. Each one that is on drops about 0.9 V at 1 A, and that lost voltage becomes heat." },
      { id: "sink", label: "Heatsink", sub: "sheds the heat", kind: "passive", col: 3, row: 0, at: "heatsink", note: "At 1 A per motor the chip loses about 1.8 W per motor. The fins keep it under its 130 °C limit." },
      { id: "outa", label: "OUT1, OUT2", sub: "motor A", kind: "connector", col: 3, row: 1, at: "motor-a", note: "Battery volts minus about 1.8 V at 1 A." },
      { id: "outb", label: "OUT3, OUT4", sub: "motor B", kind: "connector", col: 3, row: 2, at: "motor-b", note: "The second bridge, the same way." },
      { id: "diodes", label: "Flyback diodes", kind: "passive", col: 2, row: 2, at: "diodes", note: "Give the motor's switch-off spike a path back to the supply." },
      { id: "gnd", label: "GND", kind: "ground", col: 1, row: 2, at: "GND", note: "Shared by the battery and your board. Without the shared ground the logic pins mean nothing." },
    ],
    links: [
      { from: "battery", to: "vs", kind: "power", label: "up to 2 A each" },
      { from: "vs", to: "reg", kind: "power" },
      { from: "reg", to: "bridge", kind: "power", label: "5 V, 36 mA" },
      { from: "vs", to: "bridge", kind: "power" },
      { from: "logic", to: "bridge", kind: "signal", label: "direction, PWM" },
      { from: "bridge", to: "outa", kind: "power", label: "−1.8 V at 1 A" },
      { from: "bridge", to: "outb", kind: "power" },
      { from: "bridge", to: "sink", kind: "physical", label: "heat" },
      { from: "diodes", to: "bridge", kind: "power", label: "spikes" },
      { from: "bridge", to: "gnd", kind: "ground" },
    ],
    steps: [
      "The battery feeds +12V. The 78M05 turns a little of it into 5 V for the chip's logic.",
      "Your board sets IN1 high and IN2 low: inside the chip one transistor joins OUT1 to the battery and another joins OUT2 to ground, so motor A turns. Swap the two pins and it reverses.",
      "PWM on ENA switches the bridge on and off thousands of times a second; the longer it is on, the faster the motor.",
      "Each transistor that is on loses about 0.9 V. At 1 A that is 1.8 V off your battery and 1.8 W of heat per motor, which the heatsink carries away.",
    ],
  },
  facts: [
    { label: "Motors", value: "2 DC or 1 stepper" },
    { label: "Current", value: "2 A per motor" },
    { label: "Motor supply", value: "5–35 V" },
    { label: "Voltage lost", value: "1.8 V at 1 A" },
    { label: "Logic", value: "5 V, works from 3.3 V" },
    { label: "Size", value: "43 × 43 × 27 mm" },
  ],
  spec: {
    form: {
      mass: 30,
      mount: "terminals",
      pitch: 2.54,
      holes: [
        { x: 3.2, y: 3.2, d: 3 },
        { x: 39.8, y: 3.2, d: 3 },
        { x: 3.2, y: 39.8, d: 3 },
        { x: 39.8, y: 39.8, d: 3 },
      ],
      note: "Bolts to a chassis on M3 standoffs. Motor and battery wires go under screws; the control pins take jumper wires.",
    },
    power: {
      supply: { min: 5, max: 35, typ: 12 },
      logic: 5,
      tolerant5V: true,
      draw: { idle: 24, active: 36 },
      bridge: { channels: 2, maxMa: 2000, peakMa: 3000, dropV: 1.2, ohms: 1.8 },
      interface: "Two direction pins and one PWM enable per motor",
      note: "The motor gets the battery voltage minus the drop: 1.8 V at 1 A, about 3.7 V at 2 A.",
    },
    thermal: { thetaCW: 20, maxC: 130, note: "About 35 °C per watt without the heatsink. The chip shuts itself down near 135 °C." },
    sourcing: { mpn: "L298N", maker: "STMicroelectronics", lifecycle: "active", usd: [2, 4], note: "Sold as HW-095 or 'L298N dual H-bridge module'. Many clones carry re-marked chips that run hotter." },
    limits: [
      "Loses about 1.8 V at 1 A and 3.7 V at 2 A: a 6 V pack leaves a 6 V motor about 4 V.",
      "Turns that loss into heat: 1.8 W per motor at 1 A. Above that the heatsink needs a fan.",
      "Its 5 V regulator needs 7 V or more, so two LiPo cells or four AAs can't run it alone.",
      "Draws 24–36 mA doing nothing, where a MOSFET driver draws 1–2 mA.",
    ],
    upgrade: [
      { part: "tb6612fng", name: "TB6612FNG", why: "MOSFET switches lose about 0.5 V at 1 A instead of 1.8 V, so the same battery drives the motor harder and the driver stays cool without a heatsink. Good for 1.2 A per motor up to 13.5 V." },
      { part: "drv8833", name: "DRV8833", why: "Loses about 0.36 V at 1 A and runs from 2.7 V, so it suits small robots on one or two lithium cells." },
    ],
    refs: ["https://www.st.com/resource/en/datasheet/l298.pdf"],
  },
  sim: {
    kind: "driver",
    supply: "VS",
    ground: "GND",
    channels: [
      { outputs: ["OUT1", "OUT2"], inputs: ["IN1", "IN2"], enable: "ENA" },
      { outputs: ["OUT3", "OUT4"], inputs: ["IN3", "IN4"], enable: "ENB" },
    ],
  },
  animate: { lit: ["led-pwr"] },
  experiment: { title: "Forward, stop, reverse", idea: "Wire one TT motor and a battery pack, then drive it forward for two seconds, stop, and reverse. Feel the heatsink after a minute." },
  tags: ["l298n", "motor driver", "h-bridge", "dc motor", "robot car", "stepper", "driver"],
});
