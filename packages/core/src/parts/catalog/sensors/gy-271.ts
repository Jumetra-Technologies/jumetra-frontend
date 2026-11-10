import { MATERIAL, board, definePart, gnd, name, pin, pinHeader, silk, smd, sot23, vcc } from "../../sdk";
import { lga, pinLabels, sclPin, sdaPin } from "./_breakouts";

const header = pinHeader(2.17, 11.7, 5, { style: "down" });

export default definePart({
  id: "gy-271",
  name: "GY-271 compass (QMC5883L / HMC5883L)",
  aka: ["GY-271", "QMC5883L", "HMC5883L", "magnetometer", "digital compass", "3-axis compass"],
  group: "sensors",
  rank: 14,
  summary: "A tiny 3-axis magnetometer that feels the Earth's magnetic field. A program turns its sideways readings into a compass heading. Sold as an HMC5883L, but most boards today carry a QMC5883L.",
  size: { w: 14.5, h: 13.3, d: 2.6 },
  solids: [
    board(14.5, 13.3, "#3b2a8c", { radius: 0.5, holes: [{ x: 12.2, y: 2.3, d: 3.0 }] }),
    // The magnetometer: a 3 × 3 × 0.9 mm LGA-16 with its marking and a pin-1 dot.
    lga(7.0, 4.6, 3, 3, 0.9, "5883", { id: "chip", labelSize: 0.8 }),
    // The 3.3 V regulator and the two MOSFETs that shift the I2C lines.
    sot23(2.7, 4.0, { label: "662K" }),
    sot23(10.4, 5.5),
    sot23(10.4, 7.3),
    smd(5.0, 7.0, "c", "x"),
    smd(7.6, 7.0, "r", "x"),
    smd(4.8, 1.4, "c", "x"),
    smd(7.4, 1.4, "r", "x"),
    smd(0.6, 5.6, "r", "y"),
    smd(13.4, 4.4, "r", "y"),
    smd(13.4, 6.0, "r", "y"),
    header,
    silk(1.0, 1.9, "GY-271", 0.9, MATERIAL.silk, { weight: 700 }),
    ...pinLabels(["VCC", "GND", "SCL", "SDA", "DRDY"], 2.17, 10.3),
  ],
  features: [
    { id: "chip", label: "Magnetometer chip", kind: "sensor", x: 5.5, y: 3.1, w: 3, h: 3, note: "A 3 × 3 mm chip that measures the magnetic field along X, Y and Z. The marking says which one you have: QMC5883L on most boards, HMC5883L on old ones." },
    { id: "reg", label: "3.3 V regulator", kind: "power", x: 1.2, y: 3.2, w: 3, h: 1.6, note: "Makes the chip's 3.3 V from VCC, so the board runs from 3 to 6 V." },
    { id: "shift", label: "I2C level shifters", kind: "chip", x: 8.9, y: 4.8, w: 3, h: 3, note: "Two MOSFETs that let a 5 V board talk to the 3.3 V chip. Some QMC boards leave them out." },
    { id: "hole", label: "Mounting hole", kind: "mechanical", x: 10.7, y: 0.8, w: 3, h: 3, note: "One hole for an M3 screw." },
    { id: "pins", label: "VCC, GND, SCL, SDA, DRDY", kind: "pins", x: 0.9, y: 10.4, w: 12.7, h: 2.6, note: "Wire VCC, GND, SCL and SDA. DRDY is optional." },
  ],
  pins: [
    vcc("VCC", "Supply, 3 to 6 V. The on-board regulator makes the chip's 3.3 V."),
    gnd("GND"),
    sclPin("I2C clock. The board's pull-ups go to VCC, so the bus idles at VCC."),
    sdaPin("I2C data. A QMC5883L answers at 0x0D; an HMC5883L at 0x1E."),
    pin("DRDY", "digital", "opt", "Goes active when a new reading is ready. Often left unwired; on some QMC boards it is not connected at all.", { label: "DRDY" }),
  ],
  pinAt: { ...name(header, "VCC", "GND", "SCL", "SDA", "DRDY") },
  circuit: {
    blocks: [
      { id: "vcc", label: "VCC", sub: "3–6 V", kind: "power", col: 0, row: 0, at: "VCC", note: "Supply from your board. The chip itself takes about 0.1 mA." },
      { id: "reg", label: "Regulator", sub: "3.3 V", kind: "regulator", col: 1, row: 0, at: "reg", note: "Gives the chip a steady 3.3 V." },
      { id: "chip", label: "Magnetometer", sub: "X, Y, Z field", kind: "sensor", col: 2, row: 0, at: "chip", note: "Measures the field in three directions and turns it into 16-bit numbers." },
      { id: "earth", label: "Magnetic field", sub: "Earth + nearby metal", kind: "world", col: 3, row: 0, note: "The Earth's field is weak, 22 to 64 µT. A motor or a steel screw nearby can be stronger." },
      { id: "bus", label: "SDA / SCL", sub: "I2C 0x0D", kind: "pin", col: 0, row: 1, at: "SDA", note: "Your board reads the X, Y and Z numbers here and works out the heading itself." },
      { id: "shift", label: "Level shifter", kind: "passive", col: 1, row: 1, at: "shift", note: "Lets SDA and SCL work with a 5 V board." },
    ],
    links: [
      { from: "vcc", to: "reg", kind: "power", label: "3–6 V" },
      { from: "reg", to: "chip", kind: "power", label: "3.3 V" },
      { from: "earth", to: "chip", kind: "physical", label: "field" },
      { from: "shift", to: "bus", kind: "data" },
      { from: "chip", to: "shift", kind: "data", label: "X Y Z", both: true },
    ],
    steps: [
      "The chip feels the magnetic field in three directions. Held flat, the field points to magnetic north.",
      "It turns each direction into a 16-bit number and holds them for your board to read over I2C.",
      "Your program takes the X and Y numbers and works out heading = atan2(Y, X), then adds your local declination to get true north.",
      "If the board isn't level, the heading is wrong. Add an accelerometer to correct for tilt, or use a BNO055 that does it for you.",
    ],
  },
  facts: [
    { label: "Reads", value: "Magnetic field X, Y, Z" },
    { label: "Resolution", value: "16-bit (QMC5883L)" },
    { label: "Supply", value: "3–6 V" },
    { label: "Interface", value: "I2C, 0x0D or 0x1E" },
    { label: "Chip", value: "3 × 3 mm LGA-16" },
    { label: "Size", value: "14.5 × 13.3 mm" },
  ],
  spec: {
    form: {
      mount: "jumpers",
      pitch: 2.54,
      holes: [{ x: 12.2, y: 2.3, d: 3.0 }],
      note: "A flat 1 × 5 header for a breadboard or jumper wires, one M3 hole. Mount it flat, as far as you can from motors, batteries and steel.",
    },
    power: {
      supply: { min: 3, max: 6, typ: 5 },
      logic: 3.3,
      tolerant5V: true,
      draw: { idle: 0.003, active: 0.1, peak: 2.6 },
      interface: "I2C: QMC5883L at 0x0D, HMC5883L at 0x1E; up to 400 kHz",
      note: "Chip figures: about 3 µA in standby, about 100 µA measuring, about 2.6 mA peak (QMC datasheet).",
    },
    sourcing: { mpn: "QMC5883L", maker: "QST (HMC5883L: Honeywell, discontinued)", lifecycle: "generic", usd: [1, 4], note: "The silkscreen says HMC5883L, but most boards carry the QMC5883L. QST's newer part is the QMC5883P." },
    limits: [
      "Many boards sold as HMC5883L carry the QMC5883L, which answers at 0x0D, not 0x1E. An HMC library then returns zeros. Run an I2C scanner to see which address answers, and pick the library to match.",
      "The QMC5883L has only two ranges (±2 G and ±8 G) and is noisier and less sensitive than the real Honeywell part.",
      "Motors, batteries, speakers and steel nearby add tens of µT to a field of only 22 to 64 µT, so the heading turns wrong. Keep it 10 cm or more away and calibrate by turning it through a full circle.",
      "Heading needs tilt correction from an accelerometer if the board isn't level.",
      "The address is fixed, so two of them can't share a bus without a multiplexer.",
    ],
    upgrade: [
      { part: "bno055", name: "BNO055 orientation sensor", why: "A fused 9-axis chip that gives a calibrated absolute heading directly, with tilt correction, so you write no calibration code. It costs more." },
      { name: "LIS3MDL magnetometer", why: "A maintained part with ±4 to ±16 gauss and lower noise than the QMC5883L, at address 0x1C or 0x1E." },
    ],
    refs: [
      "https://components101.com/ics/hmc5883l-magnetometer-module",
      "https://siliconchip.com.au/Issue/2018/November/El+cheapo+modules%2C+part+20%3A+two+tiny+compass+modules",
      "https://zbotic.in/hmc5883l-vs-qmc5883l-3-axis-magnetometer-comparison-for-arduino/",
    ],
  },
  sim: {
    kind: "sensor",
    reads: [{ key: "headingDeg", label: "Heading", unit: "°", min: 0, max: 360, step: 1, start: 0, sweep: [0, 360, 24], digits: 0 }],
  },
  experiment: { title: "Point to north", idea: "Work out the heading from X and Y, print it, then light one of four LEDs for N, E, S and W as you turn the board. Move a screwdriver near it and watch the heading jump." },
  tags: ["gy-271", "qmc5883l", "hmc5883l", "compass", "magnetometer", "heading", "i2c", "sensor"],
});
