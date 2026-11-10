import { MATERIAL, board, definePart, gnd, name, pin, pinHeader, silk, smd, smdLed, sot23, vcc } from "../../sdk";
import { axisArrow, lga, pinLabels, sclPin, sdaPin } from "./_breakouts";
import { MODULE_BLUE } from "./_ir";

// A GY-521: the blue board is 21 × 16 mm. The 8-pin header runs along the bottom edge, the chip sits in the middle.
const PINS = ["VCC", "GND", "SCL", "SDA", "XDA", "XCL", "AD0", "INT"];
const header = pinHeader(1.61, 14.4, 8, { style: "down" });

export default definePart({
  id: "mpu6050",
  name: "MPU-6050 motion sensor (GY-521)",
  aka: ["GY-521", "IMU", "accelerometer gyroscope", "MPU6050"],
  group: "sensors",
  rank: 7,
  summary: "Six axes of motion on a thumbnail: which way is down, how fast you're turning. The sensor inside phones, drones and self-balancing robots, over two I2C wires.",
  size: { w: 21, h: 16, d: 2.7 },
  solids: [
    board(21, 16, MODULE_BLUE, {
      radius: 0.5,
      holes: [
        { x: 2, y: 2, d: 3 },
        { x: 19, y: 2, d: 3 },
      ],
    }),
    // The MPU-6050: a 4 × 4 mm QFN with a dot at pin 1.
    ...lga(10.4, 7, 4, 4, 0.9, "6050", { id: "imu", labelSize: 0.9 }),
    // The 3.3 V regulator (a SOT-23-5 marked 662K) and the decoupling around it.
    ...sot23(5.0, 6.2, { five: true, label: "662K" }),
    ...smd(3.4, 8.8, "c", "x"),
    ...smd(6.4, 8.8, "c", "x"),
    ...smd(3.4, 3.6, "c", "x"),
    // Decoupling round the sensor, and the two 4.7 k pull-ups on SDA and SCL.
    ...smd(7.8, 10.1, "c", "x"),
    ...smd(10.6, 10.1, "c", "x"),
    ...smd(12.9, 5.0, "c", "y"),
    ...smd(17.4, 5.4, "r", "y"),
    ...smd(18.9, 5.4, "r", "y"),
    // Power LED and its resistor.
    smdLed(11.9, 1.1, "#ff3030", "led-pwr"),
    ...smd(13.9, 1.1, "r", "x"),
    header,
    ...pinLabels(PINS, 1.61, 12.8, { size: 0.75 }),
    // The axes, as printed beside the chip.
    ...axisArrow(14.0, 9.4, "right", 3.2, "X"),
    ...axisArrow(14.0, 9.4, "up", 3.2, "Y"),
    silk(8.6, 3.9, "GY-521", 1.1, MATERIAL.silk, { anchor: "middle", weight: 700 }),
  ],
  features: [
    { id: "imu", label: "MPU-6050", kind: "chip", x: 8.4, y: 5, w: 4, h: 4, note: "A 3-axis accelerometer and a 3-axis gyroscope on one chip, plus a small processor that can fuse them into orientation. It is 4 × 4 mm." },
    { id: "header", label: "VCC, GND, SCL, SDA, XDA, XCL, AD0, INT", kind: "pins", x: 0.34, y: 13.13, w: 20.3, h: 2.54, note: "Only four are needed to start: VCC, GND, SCL, SDA." },
    { id: "reg", label: "3.3 V regulator", kind: "chip", x: 3.5, y: 5.2, w: 3, h: 2.1, note: "Lets you feed 5 V on VCC; the chip itself runs at 3.3 V." },
    { id: "pullups", label: "I2C pull-ups", kind: "other", x: 17.4, y: 5.4, w: 3.0, h: 1.6, note: "Two 4.7 k resistors hold SDA and SCL high. Your board needs none of its own." },
    { id: "led-pwr", label: "Power LED", kind: "led", x: 11.9, y: 0.9, w: 3.6, h: 1.4, note: "Lit whenever VCC is present." },
    { id: "holes", label: "Mounting holes", kind: "mechanical", x: 0.5, y: 0.5, w: 20, h: 3, note: "Two 3 mm holes; screw it down firmly, or it measures the wobble of its wires." },
    { id: "axes", label: "Axis marking", kind: "other", x: 13.5, y: 5.6, w: 5.2, h: 4.4, note: "+X and +Y as printed; +Z points up out of the board. Readings follow this frame." },
  ],
  pins: [
    vcc("VCC", "3.3 V to 5 V supply. About 4 mA. The regulator on the board makes the chip's own 3.3 V."),
    gnd("GND"),
    sclPin("I2C clock. Wire it to your board's SCL pin. 3.3 V logic, held up by a resistor on the board."),
    sdaPin("I2C data. Wire it to your board's SDA pin. 3.3 V logic, held up by a resistor on the board."),
    pin("XDA", "i2c", "opt", "Second I2C bus, data. The chip uses it to read an outside magnetometer. Leave it open.", { required: false }),
    pin("XCL", "i2c", "opt", "Second I2C bus, clock. Leave it open.", { required: false }),
    pin("AD0", "digital", "opt", "Address select. Low (the default) is 0x68; high is 0x69, so two chips can share a bus.", { required: false }),
    pin("INT", "digital", "opt", "Interrupt output. Goes high when new data is ready or motion is seen.", { required: false }),
  ],
  pinAt: { ...name(header, ...PINS) },
  circuit: {
    blocks: [
      { id: "motion", label: "Motion", sub: "tilt, shake, turn", kind: "world", col: 0, row: 0, note: "Gravity counts as acceleration too, which is how it knows which way is down." },
      { id: "acc", label: "Accelerometer", sub: "±2 to ±16 g", kind: "sensor", col: 1, row: 0, at: "imu", note: "Tiny silicon masses on springs; their capacitance changes as they move." },
      { id: "gyro", label: "Gyroscope", sub: "±250 to ±2000 °/s", kind: "sensor", col: 1, row: 1, at: "imu", note: "Vibrating structures that twist when rotated." },
      { id: "adc", label: "16-bit ADCs", sub: "6 channels", kind: "ic", col: 2, row: 0, at: "imu", note: "Samples all six axes, the gyro at up to 8 kHz and the accelerometer at 1 kHz." },
      { id: "dmp", label: "DMP", sub: "motion processor", kind: "ic", col: 2, row: 1, at: "imu", note: "Can fuse the six readings into pitch and roll so your board doesn't have to." },
      { id: "i2c", label: "SDA / SCL", sub: "I2C 0x68", kind: "pin", col: 3, row: 0, at: "SDA", note: "Register reads at up to 400 kHz." },
      { id: "int", label: "INT", kind: "pin", col: 3, row: 1, at: "INT", note: "Wakes your board when new data is ready or motion is seen." },
      { id: "vcc", label: "VCC", kind: "power", col: 0, row: 2, at: "VCC", note: "3.3 V to 5 V, about 4 mA." },
      { id: "reg", label: "3.3 V regulator", kind: "regulator", col: 1, row: 2, at: "reg", note: "Gives the chip 3.3 V, so a 5 V board can power it." },
    ],
    links: [
      { from: "motion", to: "acc", kind: "physical" },
      { from: "motion", to: "gyro", kind: "physical" },
      { from: "acc", to: "adc", kind: "analog" },
      { from: "gyro", to: "adc", kind: "analog" },
      { from: "adc", to: "dmp", kind: "data" },
      { from: "dmp", to: "i2c", kind: "data", both: true },
      { from: "dmp", to: "int", kind: "signal", label: "data ready" },
      { from: "vcc", to: "reg", kind: "power" },
      { from: "reg", to: "dmp", kind: "power", label: "3.3 V" },
    ],
    steps: [
      "Tiny silicon springs move with acceleration and vibrate with rotation; capacitance changes measure both on three axes.",
      "Six 16-bit ADCs sample them; a temperature sensor rides along.",
      "You read the registers over I2C at address 0x68 (0x69 with AD0 high). It starts asleep: write 0 to register 0x6B first. INT can wake your board when new data is ready.",
      "The accelerometer gives tilt from gravity, the gyro gives rate of turn; fuse them (a complementary filter or the DMP) for a stable angle.",
    ],
  },
  facts: [
    { label: "Accelerometer", value: "±2 / 4 / 8 / 16 g" },
    { label: "Gyroscope", value: "±250 – 2000 °/s" },
    { label: "Interface", value: "I2C, 400 kHz" },
    { label: "Supply", value: "3.3–5 V, about 4 mA" },
    { label: "Extras", value: "Temperature, DMP, INT" },
    { label: "Size", value: "21 × 16 mm" },
  ],
  lab: { logic: 5, supply: [3.3, 5], tolerates5V: true },
  animate: { lit: ["led-pwr"] },
  spec: {
    form: {
      mount: "jumpers",
      pitch: 2.54,
      holes: [
        { x: 2, y: 2, d: 3 },
        { x: 19, y: 2, d: 3 },
      ],
      note: "A loose 8-pin header comes in the bag; solder it on the bottom edge to plug into a breadboard, or bolt the board down through the two top holes.",
    },
    power: {
      supply: { min: 3.3, max: 5, typ: 5 },
      logic: 3.3,
      tolerant5V: false,
      draw: { idle: 0.005, active: 3.9, peak: 5 },
      interface: "I2C, address 0x68 (AD0 low) or 0x69, up to 400 kHz",
    },
    sourcing: { mpn: "MPU-6050", maker: "TDK InvenSense", lifecycle: "nrnd", usd: [1, 4], note: "The chip is not recommended for new designs, but GY-521 boards are still made everywhere. Counterfeit chips report the same WHO_AM_I value." },
    limits: [
      "TDK lists the MPU-6050 as not recommended for new designs. It still ships on cheap boards, but the chip is at the end of its life.",
      "The chip is 3.3 V and the GY-521 has no level shifter. A 5 V board can talk to it through the pull-ups, but that is outside the chip's rating.",
      "The gyro drifts: its zero-rate offset is up to ±20 °/s and its noise is 0.005 °/s per √Hz.",
      "There is no magnetometer, so heading (yaw) drifts away within a minute. Pitch and roll stay anchored by gravity.",
      "Many cheap boards carry relabeled chips that answer the same WHO_AM_I value (0x68) but measure worse.",
    ],
    upgrade: [
      { part: "bno055", name: "BNO055 9-axis fusion sensor", why: "Adds a magnetometer and does the fusion on the chip, so it hands you a steady heading, pitch and roll as numbers, with no filter to write. It draws about 12 mA against 4 mA here, and costs more." },
      { name: "ICM-42688-P (TDK) or LSM6DSO (ST) class 6-axis chip", why: "The plain replacement. The ICM-42688-P has gyro noise of 2.8 mdps/√Hz and accelerometer noise of 65 to 70 µg/√Hz, against 5 mdps and 400 µg for the MPU-6050. It draws 0.88 mA in low-noise 6-axis mode, runs from 1.71 V to 3.6 V, talks I2C to 1 MHz and is 2.5 × 3 mm. Breakouts with level shifting are sold." },
    ],
    refs: [
      "https://tinkered.ai/components/mpu6050",
      "https://fluxworkshop.com/collections/abd-sensors/products/bdaa100044-gy-521-mpu-6050",
      "https://wiki.openelab.io/sensors/gy-521-mpu-6050-3-axis-gyroscope-and-acceleration-sensor",
      "https://adm.invensense.tdk.com/mpu-6050-not-new-design",
      "https://www.farnell.com/datasheets/3045877.pdf",
    ],
  },
  experiment: { title: "Digital spirit level", idea: "Print pitch and roll from the accelerometer, then light an LED when the board is level within 2°." },
  tags: ["mpu6050", "gy-521", "imu", "accelerometer", "gyroscope", "tilt", "motion", "i2c", "sensor"],
});
