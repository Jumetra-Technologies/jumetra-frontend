import { MATERIAL, PCB_TOP, board, definePart, gnd, name, pin, pinHeader, silk, smd, vcc, type Solid } from "../../sdk";
import { jumperPads, pinLabels, sclPin, sdaPin, sot23x8, terminal35 } from "./_breakouts";

const header = pinHeader(8.9, 20.6, 4, { style: "down" });
const terminal = terminal35(9.25, -0.4, 2, "top");

/** The 0.1 Ω sense resistor: a 2512 chip, 6.3 × 3.2 mm, black body with tinned ends, marked R100. */
const shunt: Solid[] = [
  { kind: "box", x: 9.6, y: 9.1, w: 6.3, h: 3.2, d: 0.35, z: PCB_TOP, top: "#c9ccd1", finish: "tin", radius: 0.1 },
  { kind: "box", id: "shunt", x: 11.0, y: 9.1, w: 3.5, h: 3.2, d: 0.65, z: PCB_TOP, top: "#1d1e21", finish: "epoxy", radius: 0.1, label: { text: "R100", size: 1.0, color: "#c9ccd1" } },
];

export default definePart({
  id: "ina219",
  name: "INA219 current and power monitor",
  aka: ["INA219", "current sensor", "power monitor", "CJMCU-219", "high-side current sensor"],
  group: "sensors",
  rank: 22,
  summary: "Put it in the power wire between a battery and a load. It measures the load's current and the bus voltage, works out the power and sends the numbers over I2C. A robot can watch its own battery and motors.",
  size: { w: 25.5, h: 22.9, d: 9.6 },
  solids: [
    board(25.5, 22.9, "#1b1c22", {
      radius: 0.8,
      holes: [
        { x: 2.4, y: 2.4, d: 2.5 },
        { x: 23.1, y: 2.4, d: 2.5 },
      ],
    }),
    terminal,
    ...shunt,
    sot23x8(12.75, 14.8, "219"),
    smd(9.2, 14.3, "r", "y"),
    smd(16.0, 14.3, "r", "y"),
    smd(8.0, 12.4, "c", "x"),
    smd(17.0, 12.4, "c", "x"),
    smd(12.2, 16.8, "c", "x"),
    smd(3.0, 14.4, "r", "x"),
    smd(3.0, 16.2, "c", "x"),
    ...jumperPads(20.7, 13.4),
    ...jumperPads(20.7, 16.0),
    header,
    silk(11.0, 8.6, "Vin+", 0.9, MATERIAL.silk, { anchor: "middle" }),
    silk(14.5, 8.6, "Vin−", 0.9, MATERIAL.silk, { anchor: "middle" }),
    silk(4.0, 12.0, "INA219", 1.2, MATERIAL.silk, { rotate: -90, weight: 700 }),
    silk(22.6, 13.4, "A0", 0.8, MATERIAL.silk),
    silk(22.6, 16.0, "A1", 0.8, MATERIAL.silk),
    ...pinLabels(["VIN", "GND", "SCL", "SDA"], 8.9, 19.0),
  ],
  features: [
    { id: "terminal", label: "Vin+ / Vin− terminal", kind: "connector", x: 9.25, y: -0.4, w: 7, h: 7.2, note: "Screw terminal for the wire you want to measure: the supply goes into Vin+, the load hangs on Vin−." },
    { id: "shunt", label: "0.1 Ω shunt (R100)", kind: "chip", x: 9.6, y: 9.1, w: 6.3, h: 3.2, note: "The measured current flows through this resistor. The chip reads the tiny voltage across it. At 3.2 A it drops 0.32 V and warms up." },
    { id: "chip", label: "INA219 chip", kind: "chip", x: 11.3, y: 14, w: 2.9, h: 1.6, note: "A 12-bit converter that reads the shunt voltage and the bus voltage and keeps current and power in registers." },
    { id: "addr", label: "A0 / A1 address pads", kind: "other", x: 19.2, y: 12.4, w: 3, h: 4.6, note: "Bridge a pad with solder to move the address from 0x40 to 0x41, 0x44 or 0x45." },
    { id: "pins", label: "VIN, GND, SCL, SDA", kind: "pins", x: 7.6, y: 19.3, w: 10.2, h: 2.6, note: "The I2C and logic supply header. Not the measured circuit." },
  ],
  pins: [
    vcc("VIN", "Chip supply, 3 to 5.5 V. This is the logic supply, not the rail you are measuring. About 1 mA."),
    gnd("GND", "Ground for the chip and the measured circuit. Share it with the load's ground."),
    sclPin("I2C clock, with a 10 k pull-up to VIN on the board."),
    sdaPin("I2C data, with a 10 k pull-up to VIN on the board. Address 0x40."),
    pin("VIN_POS", "power", "load", "Supply side of the shunt. The positive wire from the battery or power supply goes here. Up to 26 V.", { label: "VIN+" }),
    pin("VIN_NEG", "power", "load", "Load side of the shunt. The wire to the load's positive side goes here. Up to 26 V.", { label: "VIN−" }),
  ],
  pinAt: { ...name(header, "VIN", "GND", "SCL", "SDA"), ...name(terminal, "VIN_POS", "VIN_NEG") },
  lab: { strips: [["VIN_POS", "VIN_NEG"]] },
  circuit: {
    blocks: [
      { id: "pos", label: "VIN+", sub: "from the supply", kind: "pin", col: 0, row: 0, at: "VIN_POS", note: "The supply's positive wire comes in here." },
      { id: "shunt", label: "0.1 Ω shunt", sub: "drops I × 0.1 Ω", kind: "passive", col: 1, row: 0, at: "shunt", note: "A very small resistor in the power path. A current through it makes a small voltage: 100 mV at 1 A." },
      { id: "neg", label: "VIN−", sub: "to the load", kind: "pin", col: 2, row: 0, at: "VIN_NEG", note: "The load's positive side hangs here." },
      { id: "load", label: "Load", sub: "motor, LEDs, board", kind: "world", col: 3, row: 0, note: "What you are measuring." },
      { id: "adc", label: "INA219", sub: "12-bit ADC", kind: "ic", col: 1, row: 1, at: "chip", note: "Reads the voltage across the shunt and the voltage on the bus, and works out current and power." },
      { id: "vin", label: "VIN", sub: "3–5.5 V, 1 mA", kind: "power", col: 0, row: 1, at: "VIN", note: "The chip's own supply." },
      { id: "bus", label: "SDA / SCL", sub: "I2C 0x40", kind: "pin", col: 1, row: 2, at: "SDA", note: "Your board reads mA, volts and mW here." },
    ],
    links: [
      { from: "pos", to: "shunt", kind: "power", label: "current in" },
      { from: "shunt", to: "neg", kind: "power", label: "current out" },
      { from: "neg", to: "load", kind: "power" },
      { from: "shunt", to: "adc", kind: "analog", label: "mV across it" },
      { from: "vin", to: "adc", kind: "power", label: "1 mA" },
      { from: "adc", to: "bus", kind: "data", label: "mA, V, mW", both: true },
    ],
    steps: [
      "The wire you measure goes in at VIN+, through the 0.1 Ω shunt and out at VIN−. All the load's current flows through that one resistor.",
      "The chip reads the voltage across it (current × 0.1 Ω) and the voltage on the bus, 4 mV per step, up to 26 V.",
      "It multiplies them to get power and keeps current, voltage and power as numbers.",
      "Your board reads them over I2C. The ground of the measured circuit must also be wired to GND.",
    ],
  },
  facts: [
    { label: "Reads", value: "Current, bus voltage, power" },
    { label: "Range", value: "±3.2 A, 0–26 V" },
    { label: "Shunt", value: "0.1 Ω, 1 %" },
    { label: "Resolution", value: "0.8 mA at 3.2 A" },
    { label: "Interface", value: "I2C, 0x40–0x45" },
    { label: "Size", value: "25.5 × 22.9 mm" },
  ],
  spec: {
    form: {
      mount: "jumpers",
      pitch: 2.54,
      holes: [
        { x: 2.4, y: 2.4, d: 2.5 },
        { x: 23.1, y: 2.4, d: 2.5 },
      ],
      note: "A 1 × 4 header for the I2C wires and a 3.5 mm screw terminal for the measured wire. Some clone boards use plain pads instead of the terminal.",
    },
    power: {
      supply: { min: 3, max: 5.5, typ: 3.3 },
      logic: 3.3,
      tolerant5V: true,
      draw: { idle: 0.006, active: 1 },
      interface: "I2C 0x40; 0x41, 0x44 or 0x45 with the A0 and A1 pads bridged; up to 400 kHz",
      note: "The measured load's current flows through VIN+ and VIN−, not through the chip's supply.",
    },
    sourcing: { mpn: "INA219", maker: "Texas Instruments", lifecycle: "active", usd: [1, 10], note: "Adafruit #904 costs about $10. Clone boards (CJMCU-219) are $1 to $3 and may use a different shunt: check the marking, R100 is 0.1 Ω." },
    limits: [
      "The 0.1 Ω shunt limits it to ±3.2 A: the chip reads at most ±320 mV across it. At 3.2 A the shunt drops 0.32 V and burns about 1 W, so it is a poor fit for a 3 V motor circuit.",
      "In the 3.2 A range one step is 0.8 mA. Drop to the 400 mA range for 0.1 mA steps; past 400 mA in that range the reading clips.",
      "The shunt's voltage drop comes out of the load's supply: 0.1 V at 1 A, which counts on a battery-powered robot.",
      "The bus voltage tops out at 26 V on VIN−. A library setting for 32 V does not raise it; the chip's pins are rated at 26 V.",
      "It needs a shared ground, and it reads negative current if you wire the load backwards.",
      "Clone boards may carry another shunt, so the calibration must be redone for it.",
    ],
    upgrade: [
      { name: "INA260", why: "A built-in 2 mΩ shunt: ±15 A and 36 V, 1.25 mA a step and no calibration step. It drops only 0.03 V at 15 A." },
      { name: "INA226", why: "A 16-bit converter with 36 V bus, 2.5 µV steps across the shunt and an alert pin. Pair it with a smaller shunt for several amps." },
    ],
    refs: [
      "https://learn.adafruit.com/adafruit-ina219-current-sensor-breakout",
      "https://www.ti.com/lit/ds/symlink/ina219.pdf",
      "https://shillehtek.com/blogs/shillehtek-product-manuals/cjmcu-219-ina219-i2c-bi-directional-current-power-monitoring-sensor-module-with-soldering-and-foam-manual",
    ],
  },
  sim: {
    kind: "sensor",
    reads: [
      { key: "currentMa", label: "Load current", unit: "mA", min: 0, max: 3200, step: 10, start: 250, sweep: [40, 1800, 12], digits: 0 },
      { key: "busV", label: "Bus voltage", unit: "V", min: 0, max: 26, step: 0.1, start: 5, sweep: [4.6, 5.2, 7], digits: 2 },
      { key: "powerMw", label: "Power", unit: "mW", min: 0, max: 20000, step: 50, start: 1250, sweep: [200, 9000, 12], digits: 0 },
    ],
    badge: "currentMa",
  },
  experiment: { title: "How hungry is my robot?", idea: "Wire the battery through VIN+ and VIN− to the motor driver. Print the current every second, then drive, turn and stall a wheel to see what each takes." },
  tags: ["ina219", "current sensor", "power monitor", "voltage", "current", "battery", "shunt", "i2c", "sensor"],
});
