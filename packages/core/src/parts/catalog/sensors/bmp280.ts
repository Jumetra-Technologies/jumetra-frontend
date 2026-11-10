import { MATERIAL, PCB_TOP, board, definePart, gnd, name, pin, pinHeader, silk, smd, vcc } from "../../sdk";
import { sclPin, sdaPin } from "./_breakouts";

const PURPLE = "#6a2c91";
const PINS = ["VCC", "GND", "SCL", "SDA", "CSB", "SDO"];
// The header runs down the left edge; its pins hang below the board and the solder dots show on top.
const header = pinHeader(1.3, 1.15, 6, { dir: "y", style: "down" });

export default definePart({
  id: "bmp280",
  name: "BMP280 pressure & altitude",
  aka: ["barometer", "GY-BMP280", "BMP280 breakout", "GY-BMP280-3.3"],
  group: "sensors",
  rank: 21,
  summary: "A barometer the size of a grain of rice. Air pressure to a hundredth of a hectopascal, which is enough to tell which floor of the building you're on.",
  size: { w: 11.5, h: 15, d: 2.6 },
  solids: [
    ...board(11.5, 15, PURPLE, { radius: 0.3 }),
    // The BMP280: a 2 × 2.5 mm metal-lid LGA with a tiny pressure port in the lid.
    { kind: "box", id: "bmp", x: 6, y: 6.25, w: 2, h: 2.5, d: 0.95, z: PCB_TOP, top: "#c3c7cc", side: "#8f949b", radius: 0.15, finish: "metal" },
    { kind: "disc", cx: 6.65, cy: 7.0, r: 0.22, color: "#1b1c1f", z: PCB_TOP + 0.96 },
    // Pull-ups and decoupling: CSB is tied high for I2C, SDO low for address 0x76.
    ...smd(5.3, 10.2, "r", "y"),
    ...smd(5.3, 12.2, "r", "y"),
    ...smd(8.6, 10.2, "c", "y"),
    ...smd(8.6, 12.2, "c", "y"),
    ...smd(8.9, 3.4, "c", "x"),
    header,
    ...PINS.map((text, i) => silk(2.85, 1.15 + i * 2.54 + 0.3, text, 0.75, MATERIAL.silk)),
    silk(10.5, 14.2, "GY-BMP280-3.3", 0.7, MATERIAL.silk, { rotate: -90 }),
    silk(7, 4.9, "BMP280", 0.8, MATERIAL.silk, { anchor: "middle", weight: 700 }),
  ],
  features: [
    { id: "bmp", label: "BMP280 (metal lid)", kind: "sensor", x: 6, y: 6.25, w: 2, h: 2.5, note: "The barometer lives under this lid; the tiny hole lets air pressure in. Keep it clean and dry, and don't block the hole." },
    { id: "header", label: "VCC, GND, SCL, SDA, CSB, SDO", kind: "pins", x: 0.03, y: 0, w: 2.54, h: 15.24, note: "Four for I2C (VCC, GND, SCL, SDA); CSB and SDO choose SPI or set the address." },
    { id: "pulls", label: "CSB and SDO resistors", kind: "other", x: 5.3, y: 10.2, w: 0.8, h: 3.6, note: "CSB is pulled high, which picks I2C. SDO is pulled low, which makes the address 0x76. Leave both pins open for the usual setup." },
    { id: "caps", label: "Decoupling capacitors", kind: "other", x: 8.6, y: 10.2, w: 0.8, h: 3.6, note: "Smooth the 3.3 V supply right at the chip." },
  ],
  pins: [
    vcc("VCC", "3.3 V supply. There is no regulator on this board: 5 V on this pin will damage it."),
    gnd("GND"),
    sclPin("I2C clock (SPI clock). Wire it to your board's SCL pin. 3.3 V logic."),
    sdaPin("I2C data (SPI MOSI). Wire it to your board's SDA pin. 3.3 V logic."),
    pin("CSB", "digital", "opt", "Chip select. High (the default, pulled up on the board) is I2C; low is SPI. Leave it open for I2C.", { label: "CSB", required: false }),
    pin("SDO", "digital", "opt", "I2C address bit: low (the default) is 0x76, high is 0x77. In SPI it is the data output.", { label: "SDO", required: false }),
  ],
  pinAt: { ...name(header, ...PINS) },
  circuit: {
    blocks: [
      { id: "air", label: "Air", sub: "pressure, temperature", kind: "world", col: 0, row: 0, note: "Pressure through the lid's hole; temperature by contact." },
      { id: "mems", label: "Pressure membrane", sub: "piezo-resistive", kind: "sensor", col: 1, row: 0, at: "bmp", note: "A silicon membrane that flexes with pressure; resistors on it change value." },
      { id: "temp", label: "Temp sensor", kind: "sensor", col: 1, row: 1, at: "bmp", note: "Needed to correct the pressure reading; you get it for free." },
      { id: "adc", label: "ADC", sub: "up to 20 bits", kind: "ic", col: 2, row: 0, at: "bmp", note: "Digitizes both, with optional oversampling for lower noise." },
      { id: "comp", label: "Compensation", sub: "calibration in NVM", kind: "ic", col: 2, row: 1, at: "bmp", note: "Factory constants turn raw counts into Pa and °C." },
      { id: "bus", label: "SDA / SCL", sub: "I2C 0x76, or SPI", kind: "pin", col: 3, row: 0, at: "SDA", note: "Read the result registers; libraries do the math." },
      { id: "vcc", label: "VCC 3.3 V", kind: "power", col: 3, row: 1, at: "VCC", note: "Microamps: it can run for years on a coin cell." },
    ],
    links: [
      { from: "air", to: "mems", kind: "physical", label: "pressure" },
      { from: "air", to: "temp", kind: "physical", label: "heat" },
      { from: "mems", to: "adc", kind: "analog" },
      { from: "temp", to: "adc", kind: "analog" },
      { from: "adc", to: "comp", kind: "data" },
      { from: "comp", to: "bus", kind: "data", both: true },
      { from: "vcc", to: "comp", kind: "power" },
    ],
    steps: [
      "Air pressure flexes a silicon membrane; piezo-resistors on it change value. A temperature sensor sits beside it for correction.",
      "An ADC digitizes both; factory calibration constants in the chip's memory turn raw counts into Pa and °C.",
      "Read the registers over I2C (0x76, or 0x77 with SDO high) or SPI.",
      "Altitude comes from pressure: about 8.4 m per hPa near sea level, so it can tell when you lift it from the desk to your head.",
    ],
  },
  facts: [
    { label: "Pressure", value: "300–1100 hPa" },
    { label: "Precision", value: "±0.12 hPa (≈ 1 m)" },
    { label: "Temperature", value: "−40–85 °C, ±1 °C" },
    { label: "Interface", value: "I2C or SPI" },
    { label: "Supply", value: "1.7–3.6 V, 2.7 µA" },
    { label: "Size", value: "11.5 × 15 mm" },
  ],
  lab: { logic: 3.3, supply: [1.7, 3.6], tolerates5V: false },
  spec: {
    form: {
      mount: "jumpers",
      pitch: 2.54,
      note: "Six header pins on the left edge fit a breadboard. There are no mounting holes: hold it by its header or with a zip tie, with the lid hole open to the air.",
    },
    power: {
      supply: { min: 1.71, max: 3.6, typ: 3.3 },
      logic: 3.3,
      tolerant5V: false,
      draw: { idle: 0.0001, active: 0.0034, peak: 1.12 },
      interface: "I2C (0x76 or 0x77, up to 3.4 MHz) or SPI (up to 10 MHz)",
    },
    sourcing: { mpn: "BMP280", maker: "Bosch Sensortec", lifecycle: "active", usd: [1, 4], note: "Bosch now points new designs to the BMP390 and BMP581. The GY-BMP280-3.3 breakout is made by many shops." },
    limits: [
      "3.3 V only. There is no regulator and no level shifter, so a 5 V Uno needs both before it can talk to this board.",
      "Absolute accuracy is ±1 hPa, about 8 m of altitude. Only changes (±0.12 hPa, about 1 m) are meter-grade.",
      "Temperature is ±1.0 °C and the board warms the chip a little, so it reads the board, not the room.",
      "It has no humidity sensor. The BME280 looks the same but has one; check the marking on the lid.",
      "A blocked or wet pressure port gives wrong readings.",
    ],
    upgrade: [
      { name: "BME280 (Bosch)", why: "The same size and pins, and it adds humidity (±3 %RH) with temperature at ±0.5 °C near 25 °C. Pressure is the same ±1 hPa, and it draws 3.6 µA at 1 Hz." },
      { name: "BMP390 (Bosch)", why: "A better barometer: ±0.5 hPa absolute and ±0.03 hPa relative (about 25 cm), 3.2 µA at 1 Hz, 1.65 V to 3.6 V, in a 2.0 × 2.0 mm package." },
    ],
    refs: [
      "https://components101.com/sensors/gy-bmp280-module",
      "https://startingelectronics.org/pinout/GY-BMP280-pressure-sensor-module",
      "https://bluerobotics.com/wp-content/uploads/2022/05/BMP280-DATASHEET.pdf",
      "https://cdn.sparkfun.com/assets/5/3/0/f/7/BME280_Datasheet.pdf",
      "https://bosch-sensortec.com/products/environmental-sensors/pressure-sensors/bmp390",
    ],
  },
  experiment: { title: "Staircase altimeter", idea: "Print pressure every second, convert it to altitude, then walk up a flight of stairs and watch it climb about three meters." },
  tags: ["bmp280", "barometer", "pressure", "altitude", "temperature", "weather", "i2c", "spi", "sensor"],
});
