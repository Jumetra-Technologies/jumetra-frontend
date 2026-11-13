import { MATERIAL, barrelJack, board, capacitor, crystal, definePart, ground, io, name, pinHeader, qfp, rail, silk, smd, smdDiode, smdLed, soic, socketHeader, sot223, sot23, tactileButton, usbB, type Solid } from "../../sdk";

const TOP = 1.6;
const TEAL = MATERIAL.pcbTeal;

/* ----- Headers, from the Uno's shield pattern out to the 2 × 18 block at the end ----- */

const ROW_TOP = 2.54;
const ROW_BOTTOM = 50.76;

/** SCL, SDA, AREF, GND, 13 … 8. */
const topA = socketHeader(18.796, ROW_TOP, 10);
/** 7 … 0. */
const topB = socketHeader(48.26, ROW_TOP, 8);
/** 14 … 21: TX3, RX3, TX2, RX2, TX1, RX1, SDA, SCL. */
const topC = socketHeader(68.9, ROW_TOP, 8);
/** NC, IOREF, RESET, 3V3, 5V, GND, GND, VIN. */
const powerRow = socketHeader(25.4, ROW_BOTTOM, 8);
const analogA = socketHeader(48.26, ROW_BOTTOM, 8);
const analogB = socketHeader(71.12, ROW_BOTTOM, 8);
/** The 2 × 18 block: 5V, then 22/23 down to 52/53, then GND. Left column first, then the right one. */
const wide = socketHeader(96.52, 4.5, 18, { dir: "y", rows: 2 });
/** The ATmega2560's ICSP header: MISO, SCK, RESET down the left column and 5V, MOSI, GND down the right one. */
const icsp = pinHeader(80.5, 24.5, 3, { dir: "y", rows: 2 });
/** The ATmega16U2's own ICSP header. */
const icsp16u2 = pinHeader(37, 27.6, 3, { dir: "y", rows: 2 });

/* ----- Little things that make it look real ----- */

/** A label printed under or over a header pin. */
const tag = (text: string, x: number, y: number, size = 0.95): Solid => silk(x, y, text, size, MATERIAL.silk, { anchor: "middle" });

const labels = (texts: string[], x0: number, y: number, pitch = 2.54, size = 0.95): Solid[] => texts.map((text, i) => tag(text, x0 + i * pitch, y, size));

/** A pair of numbers beside a row of the 2 × 18 block. */
const pairLabels: Solid[] = Array.from({ length: 18 }, (_, row) => {
  const text = row === 0 ? "5V 5V" : row === 17 ? "GND GND" : `${20 + 2 * row} ${21 + 2 * row}`;
  return silk(94.7, 4.5 + row * 2.54 + 0.38, text, 0.95, MATERIAL.silk, { anchor: "end" });
});

/** The beige 500 mA resettable fuse beside the USB socket. */
const fuse: Solid[] = [
  { kind: "box", x: 12, y: 12.4, w: 4.6, h: 3.2, d: 1.1, z: TOP, top: "#c9b27c", side: "#9c8a5c", radius: 0.2, finish: "ceramic" },
  { kind: "box", x: 11.9, y: 12.4, w: 0.9, h: 3.2, d: 1.15, z: TOP, top: MATERIAL.tin, finish: "tin", radius: 0.05 },
  { kind: "box", x: 15.8, y: 12.4, w: 0.9, h: 3.2, d: 1.15, z: TOP, top: MATERIAL.tin, finish: "tin", radius: 0.05 },
];

/** The 16 MHz ceramic resonator that clocks the ATmega2560: a pale body with three dark terminals. */
const resonator: Solid[] = [
  { kind: "box", id: "xtal", x: 53, y: 29.2, w: 4.4, h: 2, d: 1.2, z: TOP, top: "#cdbf9a", side: "#9a8d6c", radius: 0.3, finish: "ceramic" },
];

/** The ring of tiny resistors and capacitors round the ATmega2560. */
const decoupling: Solid[] = [
  ...smd(56.4, 23.4, "c", "y"),
  ...smd(56.4, 35.4, "r", "y"),
  ...smd(56.4, 38.2, "c", "y"),
  ...smd(61, 39.8, "c", "x"),
  ...smd(64.6, 39.8, "r", "x"),
  ...smd(76.6, 24, "c", "y"),
  ...smd(76.6, 33, "r", "y"),
];

/** Resistors and capacitors round the USB chip and the regulators. */
const powerParts: Solid[] = [
  ...smd(23.4, 26.6, "c", "x"),
  ...smd(26.6, 26.6, "r", "x"),
  ...smd(29.8, 26.6, "c", "x"),
  ...smd(12.6, 21.2, "r", "y"),
];

export default definePart({
  id: "arduino-mega",
  name: "Arduino Mega 2560",
  aka: ["Mega", "Mega 2560 R3", "ATmega2560 board"],
  group: "boards",
  rank: 5,
  summary: "The Uno's big sibling: 54 digital pins, 16 analog inputs, four serial ports and far more memory, for projects that run out of pins on an Uno. Same 16 MHz 8-bit chip family, same 5 V logic.",
  size: { w: 101.6, h: 53.3, d: 12.6 },
  solids: [
    board(101.6, 53.3, TEAL, {
      radius: 1,
      holes: [
        { x: 14, y: 50.8, d: 3.2 },
        { x: 15.3, y: 2.6, d: 3.2 },
        { x: 66.1, y: 45.7, d: 3.2 },
        { x: 66.1, y: 17.8, d: 3.2 },
        { x: 90.2, y: 2.6, d: 3.2 },
        { x: 96.5, y: 50.8, d: 3.2 },
      ],
    }),
    // The two connectors on the left edge.
    usbB(-6, 5.5),
    barrelJack(-3, 39),
    // The headers.
    topA,
    topB,
    topC,
    powerRow,
    analogA,
    analogB,
    wide,
    icsp,
    icsp16u2,
    // The big chip: ATmega2560 in a 100-pin TQFP, sitting square.
    qfp(59.5, 22, 16, 25, "ATMEGA2560", "mcu"),
    { kind: "text", x: 67.5, y: 32.4, text: "16AU  2149", size: 0.95, color: "#9aa0a6", anchor: "middle", z: TOP + 1.41 },
    { kind: "disc", cx: 61.4, cy: 24, r: 0.4, color: "#4b5058", z: TOP + 1.41 },
    // The USB chip, ATmega16U2 in a 32-pin QFN, with its own crystal.
    { kind: "box", id: "bridge", x: 16.3, y: 19.4, w: 5, h: 5, d: 0.9, z: TOP, top: MATERIAL.ic, side: MATERIAL.icSide, radius: 0.2, finish: "epoxy" },
    { kind: "disc", cx: 17.3, cy: 20.4, r: 0.35, color: "#4b5058", z: TOP + 0.91 },
    crystal(22.8, 19.6, "16.000", 11, 4.65),
    resonator,
    fuse,
    // The reset button and the ATmega2560's reset.
    tactileButton(12.2, 5, 4.6, "reset"),
    // Regulator, the diode and the two big capacitors by the barrel jack.
    sot223(13.8, 33.4, "1117"),
    ...smdDiode(17.8, 44.4, "y", 1),
    capacitor(25, 33, 2.5, 5.4, TOP, "smd"),
    capacitor(31, 33, 2.5, 5.4, TOP, "smd"),
    sot23(25.2, 41, { five: true }),
    soic(31.5, 47, 4),
    // The four lights.
    smdLed(30, 8.6, "#ffb020", "led-l"),
    smdLed(30, 11.6, "#ffb020", "led-tx"),
    smdLed(30, 14.6, "#ffb020", "led-rx"),
    smdLed(36, 22, "#3ddc84", "led-on"),
    decoupling,
    powerParts,
    // Silkscreen: a name at every pin.
    labels(["SCL", "SDA", "AREF", "GND", "13", "12", "11", "10", "9", "8"], 18.796, 6.2),
    labels(["7", "6", "5", "4", "3", "2", "1", "0"], 48.26, 6.2),
    labels(["TX3", "RX3", "TX2", "RX2", "TX1", "RX1", "SDA", "SCL"], 68.9, 6.2),
    labels(["NC", "IOREF", "RESET", "3V3", "5V", "GND", "GND", "VIN"], 25.4, 47.2, 2.54, 0.85),
    labels(["A0", "A1", "A2", "A3", "A4", "A5", "A6", "A7"], 48.26, 47.2),
    labels(["A8", "A9", "A10", "A11", "A12", "A13", "A14", "A15"], 71.12, 47.2),
    pairLabels,
    silk(33.5, 9, "L", 1.2),
    silk(33.5, 12, "TX", 1.2),
    silk(33.5, 15, "RX", 1.2),
    silk(39.5, 22.6, "ON", 1.2),
    silk(14.5, 12, "RESET", 0.9, MATERIAL.silk, { anchor: "middle" }),
    silk(29, 3.9, "PWM", 1.1, MATERIAL.silk, { anchor: "middle" }),
    silk(77.9, 3.9, "COMMUNICATION", 1.0, MATERIAL.silk, { anchor: "middle" }),
    silk(34.3, 49.2, "POWER", 1.1, MATERIAL.silk, { anchor: "middle" }),
    silk(80, 49.2, "ANALOG IN", 1.1, MATERIAL.silk, { anchor: "middle" }),
    silk(98, 2.4, "DIGITAL", 1.0, MATERIAL.silk, { anchor: "middle" }),
  ],
  features: [
    { id: "pwm", label: "Pins 2–13, AREF, SDA, SCL", kind: "pins", x: 17.5, y: 1.3, w: 25.4, h: 2.54, note: "Digital pins 8–13 with the pin-13 LED, plus AREF and a second SDA and SCL. All of 2–13 can do PWM. Shields made for the Uno fit here." },
    { id: "pins-0-7", label: "Pins 0–7", kind: "pins", x: 47, y: 1.3, w: 20.3, h: 2.54, note: "Pins 0 and 1 are the USB serial port: leave them free while you upload." },
    { id: "comm", label: "Serial pins 14–21", kind: "pins", x: 67.6, y: 1.3, w: 20.3, h: 2.54, note: "Three extra hardware serial ports (TX1–TX3, RX1–RX3). Pins 20 and 21 are SDA and SCL." },
    { id: "digital", label: "Digital pins 22–53", kind: "pins", x: 95.2, y: 3.2, w: 5.1, h: 45.7, note: "A double row of 36 pins at the end of the board: 32 more digital pins, 5 V and ground. 50–53 are SPI." },
    { id: "power", label: "Power pins", kind: "power", x: 24.1, y: 49.5, w: 20.3, h: 2.54, note: "IOREF, RESET, 3.3 V (50 mA), 5 V, two grounds and VIN." },
    { id: "analog", label: "Analog inputs A0–A15", kind: "pins", x: 47, y: 49.5, w: 43.2, h: 2.54, note: "Sixteen 10-bit analog inputs, 0–5 V. Each also works as a digital pin." },
    { id: "usb", label: "USB-B port", kind: "port", x: -6, y: 5.5, w: 16.3, h: 12, note: "Programming, serial and 5 V power. The fuse next to it opens above 500 mA." },
    { id: "jack", label: "Barrel jack", kind: "port", x: -3, y: 39, w: 14, h: 9, note: "7–12 V DC in, center positive. The regulator makes 5 V from it." },
    { id: "mcu", label: "ATmega2560", kind: "chip", x: 59.5, y: 22, w: 16, h: 16, note: "A 100-pin chip with 256 KB flash, 8 KB RAM and 4 KB EEPROM, running at 16 MHz." },
    { id: "bridge", label: "ATmega16U2", kind: "chip", x: 16.3, y: 19.4, w: 5, h: 5, note: "Turns USB into serial for the uploads and the Serial Monitor." },
    { id: "xtal", label: "16 MHz crystal and resonator", kind: "chip", x: 22.8, y: 19.6, w: 11, h: 4.65, note: "The metal crystal clocks the USB chip. The small ceramic resonator beside the big chip clocks the ATmega2560." },
    { id: "reg", label: "5 V regulator", kind: "power", x: 13.8, y: 33.4, w: 6.5, h: 6, note: "A linear regulator. It turns every volt above 5 into heat, so a 12 V supply makes it hot." },
    { id: "icsp", label: "ICSP header", kind: "pins", x: 79.2, y: 23.2, w: 5.1, h: 7.6, note: "Six pins that talk straight to the ATmega2560, for a programmer or to burn a new bootloader." },
    { id: "led-l", label: "L LED (pin 13)", kind: "led", x: 29.5, y: 8, w: 2.6, h: 1.8, note: "Wired to digital pin 13. TX and RX under it blink on USB serial traffic." },
    { id: "led-on", label: "ON LED", kind: "led", x: 35.5, y: 21.4, w: 2.6, h: 1.8, note: "Lit while the board has 5 V." },
    { id: "reset", label: "Reset button", kind: "button", x: 12.2, y: 5, w: 4.6, h: 4.6, note: "Restarts the sketch." },
  ],
  pins: [
    rail("VIN", "VIN", 5, "left", { accepts: [7, 12], note: "7–12 V in from a battery, or the barrel jack's voltage out" }),
    rail("5V", "5V", 5, "left"),
    rail("3V3", "3.3V", 3.3, "left"),
    ground("GND1", "left", "GND"),
    ground("GND2", "left", "GND"),
    ...["A0", "A1", "A2", "A3", "A4", "A5", "A6", "A7"].map((id) => io(id, id, "left", ["analog", "digital"])),
    ...[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => io(`D${n}`, `D${n} ~`, "right", ["digital", "pwm"])),
    io("D13", "D13 ~", "right", ["digital", "pwm", "led"], { note: "Built-in LED L" }),
    io("D18", "D18 TX1", "right", ["digital", "tx"]),
    io("D19", "D19 RX1", "right", ["digital", "rx"]),
    io("D20", "D20 SDA", "right", ["digital", "sda"]),
    io("D21", "D21 SCL", "right", ["digital", "scl"]),
    io("D22", "D22", "right", ["digital"]),
    io("D23", "D23", "right", ["digital"]),
    io("D24", "D24", "right", ["digital"]),
    io("D25", "D25", "right", ["digital"]),
    io("D50", "D50 MISO", "right", ["digital", "miso"]),
    io("D51", "D51 MOSI", "right", ["digital", "mosi"]),
    io("D52", "D52 SCK", "right", ["digital", "sck"]),
    io("D53", "D53 SS", "right", ["digital", "cs"]),
    ground("GND3", "right", "GND"),
    rail("5V_ICSP", "5V ICSP", 5, "right", { note: "5 V on the ICSP header", programmingHeader: true }),
  ],
  pinTable: [
    { name: "D0–D53", role: "digital", note: "54 digital pins at 5 V; 2–13 and 44–46 can output PWM (15 in all)" },
    { name: "A0–A15", role: "analog", note: "16 analog inputs, 10-bit, 0–5 V" },
    { name: "TX0–TX3 / RX0–RX3", role: "uart", note: "Four hardware serial ports; port 0 (pins 0 and 1) is shared with USB" },
    { name: "SDA / SCL (20 / 21)", role: "i2c", note: "I2C, also repeated beside AREF" },
    { name: "50–53", role: "spi", note: "MISO, MOSI, SCK and SS; also on the ICSP header" },
    { name: "5V / 3.3V", role: "power", note: "Regulated outputs; the 3.3 V pin gives only 50 mA" },
    { name: "GND", role: "ground", note: "Five ground pins" },
    { name: "VIN", role: "power", note: "7–12 V in, or the barrel jack's voltage out" },
  ],
  pinAt: {
    ...name(powerRow, null, null, null, "3V3", "5V", "GND1", "GND2", "VIN"),
    ...name(analogA, "A0", "A1", "A2", "A3", "A4", "A5", "A6", "A7"),
    ...name(topA, null, null, null, null, "D13", "D12", "D11", "D10", "D9", "D8"),
    ...name(topB, "D7", "D6", "D5", "D4", "D3", "D2", null, null),
    ...name(topC, null, null, null, null, "D18", "D19", "D20", "D21"),
    // The wide block: left column is 5V, 22, 24 … 52, GND; right column is 5V, 23, 25 … 53, GND.
    D22: wide.spots[1],
    D24: wide.spots[2],
    D50: wide.spots[15],
    D52: wide.spots[16],
    GND3: wide.spots[17],
    D23: wide.spots[19],
    D25: wide.spots[20],
    D51: wide.spots[33],
    D53: wide.spots[34],
    ...name(icsp, null, null, null, "5V_ICSP"),
  },
  lab: { controller: true, logic: 5, tolerates5V: true },
  circuit: {
    blocks: [
      { id: "usb", label: "USB-B", sub: "5 V in, serial", kind: "connector", col: 0, row: 0, at: "usb", note: "Power and programming." },
      { id: "jack", label: "Barrel jack", sub: "7–12 V in", kind: "connector", col: 0, row: 2, at: "jack", note: "External supply." },
      { id: "bridge", label: "USB bridge", sub: "ATmega16U2", kind: "ic", col: 1, row: 0, at: "bridge", note: "USB to serial for uploads." },
      { id: "reg", label: "5 V regulator", sub: "NCP1117", kind: "regulator", col: 1, row: 2, at: "reg", note: "Steady 5 V for the board. A linear regulator: it burns the extra volts as heat." },
      { id: "mcu", label: "ATmega2560", sub: "16 MHz, 100 pins", kind: "mcu", col: 2, row: 1, at: "mcu", note: "The same family as the Uno's chip with far more pins and memory." },
      { id: "digital", label: "Digital pins", sub: "D0–D53", kind: "pin", col: 3, row: 0, at: "digital", note: "54 digital, 15 with PWM." },
      { id: "serial", label: "Serial ports", sub: "4 × UART", kind: "pin", col: 3, row: 1, at: "comm", note: "Talk to a GPS, a Bluetooth module and a computer at once." },
      { id: "analog", label: "Analog inputs", sub: "A0–A15", kind: "pin", col: 3, row: 2, at: "analog", note: "16 inputs, 0–5 V." },
    ],
    links: [
      { from: "usb", to: "bridge", kind: "data", label: "USB" },
      { from: "usb", to: "reg", kind: "power", label: "5 V" },
      { from: "jack", to: "reg", kind: "power", label: "VIN" },
      { from: "bridge", to: "mcu", kind: "data", label: "TX/RX", both: true },
      { from: "reg", to: "mcu", kind: "power", label: "5 V" },
      { from: "mcu", to: "digital", kind: "signal", both: true },
      { from: "mcu", to: "serial", kind: "data", both: true },
      { from: "analog", to: "mcu", kind: "analog" },
    ],
    steps: [
      "Power comes from USB or the jack and is regulated to 5 V, exactly as on the Uno.",
      "The ATmega16U2 bridge handles USB; the ATmega2560 runs your sketch with 256 KB of flash.",
      "Its 100 pins fan out to 54 digital pins, 16 analog inputs and four serial ports.",
    ],
  },
  facts: [
    { label: "Logic", value: "5 V" },
    { label: "Clock", value: "16 MHz, 8-bit" },
    { label: "Memory", value: "256 KB flash, 8 KB RAM" },
    { label: "Pins", value: "54 digital (15 PWM), 16 analog" },
    { label: "Serial", value: "4 hardware UARTs" },
    { label: "Size", value: "101.6 × 53.3 mm" },
  ],
  spec: {
    form: {
      mass: 37,
      mount: "jumpers",
      pitch: 2.54,
      holes: [
        { x: 14, y: 50.8, d: 3.2 },
        { x: 15.3, y: 2.6, d: 3.2 },
        { x: 66.1, y: 45.7, d: 3.2 },
        { x: 66.1, y: 17.8, d: 3.2 },
        { x: 90.2, y: 2.6, d: 3.2 },
        { x: 96.5, y: 50.8, d: 3.2 },
      ],
      note: "Female headers take jumper wires and Uno-style shields. Six M3 holes; the four on the Uno's pattern line up with an Uno's.",
    },
    power: {
      supply: { min: 7, max: 12, typ: 9 },
      logic: 5,
      tolerant5V: true,
      rails: [
        { pin: "5V", volts: 5, maxMa: 500, note: "From USB it is held to 500 mA by the fuse. From the jack the regulator can pass more, but it turns the extra volts into heat." },
        { pin: "3V3", volts: 3.3, maxMa: 50, note: "A small 3.3 V regulator that the USB chip shares." },
      ],
      gpio: { maxMa: 20, totalMa: 200 },
      interface: "ATmega2560, 16 MHz, 256 KB flash, 8 KB RAM, 4 KB EEPROM; 4 UART, SPI, I2C",
      note: "The jack and VIN take 6 V to 20 V without damage, but 7 V to 12 V is what it is made for: below 7 V the 5 V pin can sag, above 12 V the regulator overheats.",
    },
    sourcing: { mpn: "A000067", maker: "Arduino (chip: Microchip ATmega2560-16AU)", lifecycle: "active", usd: [20, 48], note: "Clones with a CH340 USB chip are common and cost about half. Same pins; they need a CH340 driver on some computers." },
    limits: [
      "It is the same 16 MHz 8-bit chip family as the Uno: more pins and memory, not more speed. A float calculation still takes microseconds, not nanoseconds.",
      "Each pin gives or takes at most 20 mA (40 mA absolute maximum), and all pins together about 200 mA. A motor or a strip of LEDs needs a driver.",
      "The 3.3 V pin gives only 50 mA. A 3.3 V sensor board is fine; a radio module that bursts at 100 mA or more is not.",
      "The 5 V pin from USB is limited to 500 mA by the fuse; from a 12 V jack the regulator gets hot at 200 mA or more.",
      "Pins 0 and 1 share the serial port with USB. Anything wired there blocks uploads.",
      "8 KB of RAM runs out fast with strings and big arrays. There is no Wi-Fi, no Bluetooth and no hardware floating point.",
    ],
    upgrade: [
      { part: "esp32", name: "ESP32", why: "A 240 MHz dual-core chip, 15 times the Mega's clock, with 520 KB of RAM, Wi-Fi and Bluetooth built in, for about a quarter of the price. It runs at 3.3 V and has about 25 usable pins, so it wins on speed and connectivity but not on pin count." },
      { part: "teensy", name: "Teensy 4.0", why: "A 600 MHz Cortex-M7, 37 times the Mega's clock, with 1 MB of RAM and hardware floating point, in a package about a fifth of the size. It has 40 pins at 3.3 V and no 5 V tolerance, and it runs the same Arduino sketches." },
    ],
    refs: ["https://docs.arduino.cc/hardware/mega-2560/", "https://ww1.microchip.com/downloads/en/devicedoc/atmel-2549-8-bit-avr-microcontroller-atmega640-1280-1281-2560-2561_datasheet.pdf"],
  },
  animate: { lit: ["led-on", "led-l"] },
  experiment: { title: "Many sensors, one board", idea: "Read six sensors on six analog pins and print them as a table over Serial every second." },
  tags: ["arduino", "mega", "atmega2560", "5v", "board", "mcu", "many pins"],
});
