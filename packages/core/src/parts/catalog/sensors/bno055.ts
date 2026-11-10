import { MATERIAL, board, definePart, gnd, name, pin, pinHeader, silk, smd, sot23, vcc, type Solid } from "../../sdk";
import { axisArrow, lga, pinLabels, sclPin, sdaPin } from "./_breakouts";

const TOP = 1.6;
const main = pinHeader(7.15, 18.2, 6, { style: "down" });
const extra = pinHeader(9.69, 1.8, 4, { style: "down" });

/** A 32.768 kHz crystal: a 3.2 × 1.5 mm steel can with a tin lid line. */
const crystal = (x: number, y: number): Solid[] => [
  { kind: "box", x, y, w: 3.2, h: 1.5, d: 0.9, z: TOP, top: "#c9ccd1", side: "#8f949b", finish: "metal", radius: 0.15 },
  { kind: "path", d: `M ${x + 0.6} ${y + 0.75} L ${x + 2.6} ${y + 0.75}`, color: "#8f949b", width: 0.1, z: TOP + 0.91 },
];

export default definePart({
  id: "bno055",
  name: "BNO055 9-axis orientation sensor",
  aka: ["BNO055", "absolute orientation sensor", "9-DOF IMU", "Adafruit BNO055"],
  group: "sensors",
  rank: 13,
  summary: "An accelerometer, gyroscope and compass with a small processor that fuses them. It tells your board its heading, pitch and roll directly, with no filter code to write and no heading drift.",
  size: { w: 27, h: 20, d: 2.7 },
  solids: [
    board(27, 20, "#1b1c22", {
      radius: 0.8,
      holes: [
        { x: 2.5, y: 2.5, d: 2.5 },
        { x: 24.5, y: 2.5, d: 2.5 },
        { x: 2.5, y: 17.5, d: 2.5 },
        { x: 24.5, y: 17.5, d: 2.5 },
      ],
    }),
    // The BNO055: LGA-28, 5.2 × 3.8 × 1.13 mm.
    lga(13.5, 9.0, 5.2, 3.8, 1.13, "BNO055", { id: "chip", labelSize: 0.9 }),
    ...crystal(7.4, 8.2),
    sot23(5.0, 12.2, { five: true }),
    sot23(22.6, 6.6),
    sot23(22.6, 8.6),
    smd(10.2, 6.1, "c", "x"),
    smd(12.7, 6.1, "r", "x"),
    smd(15.2, 6.1, "c", "x"),
    smd(10.4, 11.8, "c", "x"),
    smd(12.8, 11.8, "r", "x"),
    smd(15.6, 11.8, "r", "x"),
    smd(18.6, 5.0, "r", "y"),
    smd(18.6, 7.4, "c", "y"),
    smd(3.4, 7.4, "c", "y"),
    smd(3.4, 9.9, "r", "y"),
    main,
    extra,
    silk(13.5, 14.0, "BNO055 9-DOF IMU", 0.95, MATERIAL.silk, { anchor: "middle", weight: 700 }),
    ...axisArrow(20.6, 13.2, "right", 3.6, "X"),
    ...axisArrow(20.6, 13.2, "up", 3.2, "Y"),
    ...pinLabels(["Vin", "3vo", "GND", "SDA", "SCL", "RST"], 7.15, 16.5),
    ...pinLabels(["PS0", "PS1", "INT", "ADR"], 9.69, 3.7, { side: "above", size: 0.8 }),
  ],
  features: [
    { id: "chip", label: "BNO055", kind: "chip", x: 10.9, y: 7.1, w: 5.2, h: 3.8, note: "Accelerometer, gyroscope, compass and a small processor in one package. The processor does the sensor fusion for you." },
    { id: "xtal", label: "32.768 kHz crystal", kind: "chip", x: 7.4, y: 8.2, w: 3.2, h: 1.5, note: "A clock the fusion code uses. Without it the chip falls back to a less exact one inside." },
    { id: "reg", label: "3.3 V regulator", kind: "power", x: 3.5, y: 11.2, w: 3, h: 2, note: "Makes 3.3 V from Vin and shares up to about 50 mA of it on the 3vo pin." },
    { id: "shift", label: "I2C level shifter", kind: "chip", x: 21.1, y: 5.5, w: 3, h: 4.2, note: "Two MOSFETs and 10 k pull-ups, so a 5 V board can talk to the chip." },
    { id: "axes", label: "X and Y arrows", kind: "other", x: 20.4, y: 9.3, w: 5.2, h: 4.4, note: "The directions the chip counts as X and Y. Z points up out of the board." },
    { id: "pins", label: "Vin, 3vo, GND, SDA, SCL, RST", kind: "pins", x: 5.9, y: 16.9, w: 15.3, h: 2.6, note: "Wire Vin, GND, SDA and SCL." },
    { id: "extra", label: "PS0, PS1, INT, ADR", kind: "pins", x: 8.4, y: 0.5, w: 10.2, h: 2.6, note: "Optional pins: protocol select (leave alone for I2C), interrupt and address." },
  ],
  pins: [
    vcc("VIN", "Supply, 3.3 to 5 V. The on-board regulator makes the chip's 3.3 V. About 12 mA while fusing.", { label: "Vin" }),
    pin("V3O", "power", "opt", "3.3 V output from the regulator, up to about 50 mA to spare for another sensor.", { label: "3vo" }),
    gnd("GND"),
    sdaPin("I2C data, with a 10 k pull-up on the board. Safe at 3.3 V or 5 V."),
    sclPin("I2C clock, with a 10 k pull-up on the board. The chip holds the clock low at times (clock stretching)."),
    pin("RST", "digital", "opt", "Reset, active low. Optional. Safe at 5 V."),
    pin("INT", "digital", "opt", "Interrupt out at 3 V: motion, or no motion. Optional."),
    pin("ADR", "digital", "opt", "Tie high to move the I2C address from 0x28 to 0x29. Optional."),
    pin("PS0", "digital", "opt", "Protocol select. Leave it unwired for I2C.", { label: "PS0" }),
    pin("PS1", "digital", "opt", "Protocol select. Leave it unwired for I2C.", { label: "PS1" }),
  ],
  pinAt: { ...name(main, "VIN", "V3O", "GND", "SDA", "SCL", "RST"), ...name(extra, "PS0", "PS1", "INT", "ADR") },
  circuit: {
    blocks: [
      { id: "vin", label: "Vin", sub: "3.3–5 V", kind: "power", col: 0, row: 0, at: "VIN", note: "Supply from your board. About 12 mA in fusion mode." },
      { id: "reg", label: "Regulator", sub: "3.3 V", kind: "regulator", col: 1, row: 0, at: "reg", note: "Gives the chip 3.3 V and the 3vo pin up to about 50 mA to spare." },
      { id: "mems", label: "Accel, gyro, compass", sub: "three sensors", kind: "sensor", col: 2, row: 0, at: "chip", note: "Three tiny sensors in the same package: they feel gravity, spin and the Earth's magnetic field." },
      { id: "world", label: "Motion", sub: "tilt, turn, shake", kind: "world", col: 3, row: 0, note: "What you do to the board." },
      { id: "fuse", label: "Fusion processor", sub: "100 Hz", kind: "ic", col: 2, row: 1, at: "chip", note: "A small processor on the chip blends the three sensors so each one fixes the others' faults." },
      { id: "xtal", label: "Crystal", sub: "32.768 kHz", kind: "passive", col: 1, row: 1, at: "xtal", note: "The clock for the fusion code." },
      { id: "bus", label: "SDA / SCL", sub: "I2C 0x28", kind: "pin", col: 0, row: 1, at: "SDA", note: "Your board reads heading, pitch and roll here. It gets finished angles, not raw numbers." },
    ],
    links: [
      { from: "vin", to: "reg", kind: "power", label: "3.3–5 V" },
      { from: "reg", to: "mems", kind: "power", label: "3.3 V" },
      { from: "world", to: "mems", kind: "physical", label: "motion" },
      { from: "mems", to: "fuse", kind: "signal", label: "raw" },
      { from: "xtal", to: "fuse", kind: "signal", label: "clock" },
      { from: "fuse", to: "bus", kind: "data", label: "heading, pitch, roll", both: true },
    ],
    steps: [
      "The accelerometer feels which way gravity pulls, the gyroscope feels how fast you turn and the compass feels the Earth's field.",
      "The processor on the chip blends them 100 times a second. The compass keeps the heading from drifting; the gyro keeps it steady between compass readings.",
      "It works out heading (0 to 360°), pitch and roll, and can also give a quaternion.",
      "Your board reads the finished angles over I2C. There is no filter code to write.",
    ],
  },
  facts: [
    { label: "Reads", value: "Heading, pitch, roll" },
    { label: "Fusion rate", value: "100 Hz" },
    { label: "Supply", value: "3.3–5 V, 12 mA" },
    { label: "Interface", value: "I2C, 0x28 or 0x29" },
    { label: "Axes", value: "9 (accel, gyro, compass)" },
    { label: "Size", value: "27 × 20 mm" },
  ],
  spec: {
    form: {
      mass: 3,
      mount: "jumpers",
      pitch: 2.54,
      holes: [
        { x: 2.5, y: 2.5, d: 2.5 },
        { x: 24.5, y: 2.5, d: 2.5 },
        { x: 2.5, y: 17.5, d: 2.5 },
        { x: 24.5, y: 17.5, d: 2.5 },
      ],
      note: "A 1 × 6 row on the bottom edge and a 1 × 4 row on the top, both holes for a header or wires. Bolt it flat with four M2 screws, 10 cm or more from motors and steel.",
    },
    power: {
      supply: { min: 3.3, max: 5, typ: 5 },
      logic: 3.3,
      tolerant5V: true,
      draw: { idle: 0.04, active: 12.3 },
      interface: "I2C 0x28 (0x29 with ADR high) up to 400 kHz, fused data at 100 Hz",
      note: "The chip itself runs on 2.4 to 3.6 V behind the board's regulator.",
    },
    sourcing: { mpn: "BNO055", maker: "Bosch Sensortec", lifecycle: "active", usd: [12, 35], note: "The Adafruit board (#2472) costs about $35. Generic GY-BNO055 boards cost about $12." },
    limits: [
      "It forgets its calibration at power-off, since the chip has no memory. Save the offsets and load them at start-up; the compass still wants a figure-8 wave.",
      "Its I2C stretches the clock and breaks the rules at times: it is unreliable on an ESP32 and behind I2C multiplexers without care, and a Raspberry Pi needs its I2C slowed down.",
      "Heading drifts near motors, steel and speakers: the compass reads their fields. Mount it 10 cm or more away.",
      "Euler angles jump past 45° of pitch or roll. Use the quaternion output for anything that tumbles.",
      "It costs about five times as much as an MPU-6050.",
    ],
    upgrade: [{ name: "BNO085 / BNO086", why: "The same Bosch hardware with CEVA fusion software: a steadier heading, a 400 Hz rotation vector and calibration it stores itself." }],
    refs: ["https://learn.adafruit.com/adafruit-bno055-absolute-orientation-sensor", "https://www.pololu.com/product/960", "https://www.bosch-sensortec.com/products/smart-sensors/bno055/"],
  },
  sim: {
    kind: "sensor",
    reads: [
      { key: "headingDeg", label: "Heading", unit: "°", min: 0, max: 360, step: 1, start: 0, sweep: [0, 360, 20], digits: 0 },
      { key: "pitchDeg", label: "Pitch", unit: "°", min: -90, max: 90, step: 1, start: 0, sweep: [-25, 25, 8], digits: 0 },
      { key: "rollDeg", label: "Roll", unit: "°", min: -180, max: 180, step: 1, start: 0, sweep: [-40, 40, 11], digits: 0 },
    ],
    badge: "headingDeg",
  },
  experiment: { title: "Steer straight", idea: "Read the heading, note it as the goal, then make a two-wheel robot turn left or right until the heading matches it again. No filter code to write." },
  tags: ["bno055", "imu", "orientation", "heading", "compass", "gyro", "accelerometer", "9-dof", "i2c", "sensor"],
});
