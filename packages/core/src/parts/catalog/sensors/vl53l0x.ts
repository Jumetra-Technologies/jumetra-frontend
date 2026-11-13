import { MATERIAL, board, definePart, gnd, name, pin, pinHeader, silk, smd, sot23, vcc, type Solid } from "../../sdk";
import { pinLabels, sclPin, sdaPin } from "./_breakouts";

const TOP = 1.6;

/** The ST package: a 4.4 × 2.4 × 1.0 mm metal-lidded LGA with a small emitter window and a larger receiver window. */
function tofChip(cx: number, cy: number): Solid[] {
  const z = TOP + 1.0;
  return [
    { kind: "box", id: "tof", x: cx - 2.2, y: cy - 1.2, w: 4.4, h: 2.4, d: 1.0, z: TOP, top: "#a3a8ae", side: "#6f747b", finish: "metal", radius: 0.12 },
    // Emitter (VCSEL) window, left; receiver (SPAD array) window, right.
    { kind: "box", id: "emitter", x: cx - 1.75, y: cy - 0.55, w: 1.1, h: 1.1, d: 0.06, z: z - 0.03, top: "#14172a", finish: "glass", radius: 0.1 },
    { kind: "box", id: "receiver", x: cx - 0.1, y: cy - 0.75, w: 1.85, h: 1.5, d: 0.06, z: z - 0.03, top: "#1b2140", finish: "glass", radius: 0.1 },
    { kind: "path", d: `M ${cx + 0.2} ${cy - 0.45} L ${cx + 1.45} ${cy - 0.45} M ${cx + 0.2} ${cy} L ${cx + 1.45} ${cy} M ${cx + 0.2} ${cy + 0.45} L ${cx + 1.45} ${cy + 0.45}`, color: "#3a4472", width: 0.08, z: z + 0.04 },
    { kind: "disc", cx: cx - 1.95, cy: cy - 0.95, r: 0.12, color: "#e9f1ec", z: z + 0.01 },
  ];
}

const header = pinHeader(6.15, 9.2, 6, { style: "down" });

export default definePart({
  id: "vl53l0x",
  name: "VL53L0X time-of-flight distance sensor (GY-530)",
  aka: ["VL53L0X", "GY-530", "laser distance sensor", "ToF sensor", "time of flight"],
  group: "sensors",
  rank: 8,
  summary: "A tiny laser rangefinder. It sends out invisible light, times how long it takes to bounce back and tells your board the distance in millimeters over I2C. Reads surfaces that sound-based sensors miss.",
  size: { w: 25, h: 11, d: 2.7 },
  solids: [
    board(25, 11, "#5a2d8a", { radius: 0.5 }),
    tofChip(7.0, 3.9),
    // The 2.8 V regulator and the parts round it.
    sot23(17.3, 3.9, { label: "28" }),
    smd(11.2, 2.6, "r", "x"),
    smd(11.2, 4.5, "r", "x"),
    smd(13.6, 3.2, "c", "y"),
    smd(21.0, 5.2, "c", "x"),
    smd(21.0, 6.4, "c", "x"),
    smd(3.3, 2.4, "c", "y"),
    smd(3.3, 5.6, "r", "y"),
    header,
    silk(24.2, 2.7, "GY-530", 1.1, MATERIAL.silk, { anchor: "end", weight: 700 }),
    ...pinLabels(["VIN", "GND", "SCL", "SDA", "GPIO1", "XSHUT"], 6.15, 8.3),
  ],
  features: [
    { id: "tof", label: "VL53L0X chip", kind: "chip", x: 4.8, y: 2.7, w: 4.4, h: 2.4, note: "ST's laser rangefinder in a package the size of a grain of rice. It measures the time light takes to go out and come back." },
    { id: "emitter", label: "Emitter window", kind: "sensor", x: 5.25, y: 3.35, w: 1.1, h: 1.1, note: "A 940 nm infrared laser (VCSEL) you can't see. Class 1: safe for eyes." },
    { id: "receiver", label: "Receiver window", kind: "sensor", x: 6.9, y: 3.15, w: 1.85, h: 1.5, note: "An array of light detectors that catches the pulse coming back." },
    { id: "reg", label: "2.8 V regulator", kind: "power", x: 15.8, y: 3.1, w: 3, h: 1.6, note: "Turns the 2.6 to 5.5 V on VIN into the 2.8 V the chip needs." },
    { id: "pull", label: "I2C pull-ups", kind: "chip", x: 10.9, y: 2.3, w: 2, h: 3, note: "Resistors that hold SDA and SCL high when nobody is pulling them low." },
    { id: "pins", label: "VIN, GND, SCL, SDA, GPIO1, XSHUT", kind: "pins", x: 4.9, y: 7.9, w: 15.3, h: 2.6, note: "Wire VIN, GND, SCL and SDA. GPIO1 and XSHUT are optional." },
  ],
  pins: [
    vcc("VIN", "Supply, 2.6 to 5.5 V. The board's regulator makes the chip's 2.8 V from it. About 19 mA while measuring."),
    gnd("GND"),
    sclPin("I2C clock, up to 400 kHz."),
    sdaPin("I2C data. The sensor answers at address 0x29."),
    pin("GPIO1", "digital", "opt", "Interrupt output: goes low when a measurement is ready or crosses a threshold. 2.8 V logic. Often left unwired.", { label: "GPIO1" }),
    pin("XSHUT", "digital", "opt", "Shutdown, active low. Pull it low to switch the sensor off; use it to give several sensors different addresses at start-up. Pulled high on the board.", { label: "XSHUT" }),
  ],
  pinAt: { ...name(header, "VIN", "GND", "SCL", "SDA", "GPIO1", "XSHUT") },
  circuit: {
    blocks: [
      { id: "vin", label: "VIN", sub: "2.6–5.5 V", kind: "power", col: 0, row: 0, at: "VIN", note: "Supply from your board. About 19 mA while it measures, 3 µA when shut down." },
      { id: "reg", label: "Regulator", sub: "2.8 V", kind: "regulator", col: 1, row: 0, at: "reg", note: "Gives the chip a steady 2.8 V." },
      { id: "tof", label: "VL53L0X", sub: "times the light", kind: "ic", col: 2, row: 0, at: "tof", note: "Starts a pulse, runs a stopwatch in picoseconds and works the distance out on the chip." },
      { id: "emit", label: "Laser", sub: "940 nm pulse", kind: "sensor", col: 3, row: 0, at: "emitter", note: "A tiny infrared laser. Class 1: eye-safe." },
      { id: "bus", label: "SDA / SCL", sub: "I2C 0x29", kind: "pin", col: 0, row: 1, at: "SDA", note: "Your board asks for a reading and gets the distance in millimeters." },
      { id: "obj", label: "Object", sub: "3–120 cm away", kind: "world", col: 3, row: 1, note: "White, close things send back plenty of light. Dark, far or sunlit things send back little." },
      { id: "rx", label: "Detectors", sub: "catch the echo", kind: "sensor", col: 3, row: 2, at: "receiver", note: "A grid of single-photon detectors that notice when the pulse comes home." },
    ],
    links: [
      { from: "vin", to: "reg", kind: "power", label: "2.6–5.5 V" },
      { from: "reg", to: "tof", kind: "power", label: "2.8 V" },
      { from: "tof", to: "emit", kind: "signal", label: "fire" },
      { from: "emit", to: "obj", kind: "light", label: "pulse" },
      { from: "obj", to: "rx", kind: "light", label: "echo" },
      { from: "rx", to: "tof", kind: "signal", label: "arrived" },
      { from: "bus", to: "tof", kind: "data", label: "mm", both: true },
    ],
    steps: [
      "Your board asks over I2C for a reading. The chip fires a short pulse of invisible laser light.",
      "The light hits the nearest surface in a cone about 25° wide and part of it bounces back.",
      "The detectors see the pulse return. The chip times the trip: light covers 30 cm in a billionth of a second.",
      "Distance is half the trip times the speed of light. The chip hands your board the number in millimeters, about 30 times a second.",
    ],
  },
  facts: [
    { label: "Range", value: "30–1200 mm indoors" },
    { label: "Accuracy", value: "±3 % at best" },
    { label: "Beam", value: "25° cone" },
    { label: "Supply", value: "2.6–5.5 V, 19 mA" },
    { label: "Interface", value: "I2C, 0x29" },
    { label: "Size", value: "25 × 11 mm" },
  ],
  spec: {
    form: {
      mount: "jumpers",
      pitch: 2.54,
      note: "A flat 1 × 6 header for a breadboard or jumper wires. No mounting holes: hold it with tape, a clip or its header. Keep the two windows clear and facing the thing you measure.",
    },
    power: {
      supply: { min: 2.6, max: 5.5, typ: 3.3 },
      logic: 2.8,
      tolerant5V: true,
      draw: { idle: 0.003, active: 19 },
      interface: "I2C 0x29 up to 400 kHz, about 30 readings a second",
    },
    sourcing: { mpn: "VL53L0X", maker: "STMicroelectronics", lifecycle: "active", usd: [2, 6], note: "Boards sold as GY-530 or GY-VL53L0XV2. ST now points new designs at the VL53L1X and VL53L4CD." },
    limits: [
      "The 2 m figure is a best case in the dark on a white target. Indoors on white it reads to about 1.2 m, and about 2 m only in long-range mode.",
      "In direct sunlight the sensor's own laser is drowned out and the range falls to about 50 cm on a gray target.",
      "Dark surfaces send back little light: black or matte targets read much shorter than white ones, and the error grows from 3 % to as much as 12 %.",
      "It looks at a cone about 25° wide, so it can pick up a nearby wall corner or table edge instead of the thing in front.",
      "Every board answers at 0x29. Two on one bus need XSHUT wires and a start-up routine to give them different addresses.",
      "GPIO1 is a 2.8 V signal, and not every GY-530 shifts the I2C lines: check before putting 5 V pull-ups on SDA and SCL.",
    ],
    upgrade: [
      { name: "VL53L1X time-of-flight sensor", why: "Reads to 4 m, lets you shrink the area it looks at and runs at up to 50 Hz. Same 0x29 address and the same style of breakout." },
      { part: "hc-sr04", name: "HC-SR04 ultrasonic sensor", why: "Sound instead of light: it reads 2 cm to 4 m and doesn't care about sunlight or dark surfaces. Its beam is wider, it is slower and it needs 5 V." },
    ],
    refs: [
      "https://www.st.com/resource/en/datasheet/vl53l0x.pdf",
      "https://learn.adafruit.com/adafruit-vl53l0x-micro-lidar-distance-sensor-breakout",
      "https://shillehtek.com/blogs/shillehtek-product-manuals/gy-vl53l0xv2-laser-ranging-tof-sensor-module-manual",
    ],
  },
  sim: {
    kind: "sensor",
    reads: [{ key: "distance", label: "Distance", unit: "mm", min: 30, max: 1200, step: 10, start: 300, sweep: [60, 1100, 14], digits: 0 }],
  },
  experiment: { title: "Stop before the wall", idea: "Read the distance in millimeters ten times a second and drive a motor until the number drops under 150, then stop. Try a white wall and then a black one and watch how the range changes." },
  tags: ["vl53l0x", "gy-530", "time of flight", "tof", "laser", "distance", "range", "lidar", "i2c", "sensor"],
});
