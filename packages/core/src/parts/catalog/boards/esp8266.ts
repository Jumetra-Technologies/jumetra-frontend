import { MATERIAL, PCB_TOP, board, definePart, ground, io, microUsb, name, pinHeader, rail, silk, smd, smdLed, soic, tactileButton, type Solid } from "../../sdk";
import { MODULE_TOP, antennaTrace, padRow, pinLabels, regulator1117, shieldCan } from "./_esp-modules";

/** The rows as printed, read from the USB end: the top row is the left column of the board held upright. */
const TOP_LABELS = ["VIN", "GND", "RST", "EN", "3V3", "GND", "CLK", "SD0", "CMD", "SD1", "SD2", "SD3", "RSV", "RSV", "A0"];
const BOTTOM_LABELS = ["3V3", "GND", "TX", "RX", "D8", "D7", "D6", "D5", "GND", "3V3", "D4", "D3", "D2", "D1", "D0"];

// Rows 27.94 mm (1.1 in) apart, so the board spans the breadboard's center gap.
const TOP_Y = 1.53;
const BOTTOM_Y = 29.47;
const X0 = 3.27;
const topRow = pinHeader(X0, TOP_Y, 15, { style: "down" });
const bottomRow = pinHeader(X0, BOTTOM_Y, 15, { style: "down" });

/** The ESP-12E: 24 × 16 mm, flush with the board's far end; shield on the pad end, antenna at the bare end. */
const MX = 34;
const MY = 7.5;
const module12: Solid[] = [
  { kind: "box", id: "module", x: MX, y: MY, w: 24, h: 16, d: 0.8, z: PCB_TOP, top: "#17181b", finish: "soldermask", radius: 0.3 },
  // Eight pads down each long edge, six across the pad end, all at 2 mm.
  padRow(MX + 2, MY + 0.35, 8, 2, "x", 0.9),
  padRow(MX + 2, MY + 15.65, 8, 2, "x", 0.9),
  padRow(MX + 0.35, MY + 2.5, 6, 2, "y", 0.9),
  ...shieldCan(MX + 1.3, MY + 2.2, 14.2, 11.6, [
    { text: "ESP-12E", size: 1.5 },
    { text: "ISM 2.4GHz", size: 0.8 },
    { text: "PA 25dBm", size: 0.8 },
  ]),
  ...antennaTrace(MX + 15.8, MY, 8.2, 16, 9),
  // The blue LED on GPIO 2, at the foot of the antenna.
  smdLed(MX + 15.9, MY + 12.4, "#3b82f6", "led", MODULE_TOP),
];

/** CH340G: a 16-pin SOIC lying along the board, with the 12 MHz crystal beside it. */
const crystal12: Solid[] = [
  { kind: "box", x: 26.2, y: 13.6, w: 5, h: 3.2, d: 1.3, z: PCB_TOP, top: "#cfd2d7", side: "#8f949b", radius: 1.4, finish: "metal", label: { text: "12.000", size: 0.8, color: "#5d636b" } },
];

export default definePart({
  id: "esp8266",
  name: "ESP8266 NodeMCU",
  aka: ["NodeMCU", "ESP-12E board", "LoLin V3"],
  group: "boards",
  rank: 6,
  summary: "The cheapest way to put a project on Wi-Fi: an ESP-12E module on a USB-programmable board. One core, 3.3 V, fewer pins than an ESP32 but plenty for a sensor that reports online.",
  size: { w: 58, h: 31, d: 10 },
  solids: [
    board(58, 31, "#16181d", { radius: 1.2 }),
    topRow,
    bottomRow,
    microUsb(-1.5, 11.75),
    module12,
    tactileButton(8, 6.2, 4, "btn-rst"),
    tactileButton(8, 20.8, 4, "btn-flash"),
    soic(19, 16, 8, "CH340G", { dir: "x" }),
    crystal12,
    smd(24.9, 12.0, "c", "x"),
    smd(24.9, 19.8, "c", "x"),
    smd(12.6, 14.0, "c", "y"),
    smd(12.6, 18.2, "r", "y"),
    smd(29.6, 12.0, "c", "x"),
    smd(29.6, 18.8, "r", "x"),
    smd(31.2, 21.6, "r", "x"),
    // Regulator, with tantalum capacitors on its output (left) and input (right).
    regulator1117(17, 5.4, { cx: 26, cy: 8.2 }, { cx: 13.6, cy: 8.0 }),
    pinLabels(TOP_LABELS, X0, 4.5),
    pinLabels(BOTTOM_LABELS, X0, 27.1),
    silk(10, 12.6, "RST", 1.0, MATERIAL.silk, { anchor: "middle" }),
    silk(10, 19.6, "FLASH", 1.0, MATERIAL.silk, { anchor: "middle" }),
  ],
  features: [
    { id: "module", label: "ESP-12E module", kind: "chip", x: 34, y: 7.5, w: 15.8, h: 16, note: "The ESP8266 at 80 MHz with 4 MB flash and Wi-Fi, under a shield." },
    { id: "antenna", label: "PCB antenna", kind: "antenna", x: 49.8, y: 7.5, w: 8.2, h: 16, note: "Printed 2.4 GHz antenna; hang it over the edge of a breadboard for range." },
    { id: "usb", label: "Micro-USB", kind: "port", x: -1.5, y: 11.75, w: 5.6, h: 7.5, note: "Programming and 5 V power." },
    { id: "top-pins", label: "Pins, top row", kind: "pins", x: 2, y: 0.26, w: 38.1, h: 2.54, note: "VIN and GND by the USB, then RST, EN, 3V3, GND, the reserved flash pins (CLK, SD0 to SD3, CMD, RSV) and A0, the only analog input, at the antenna end." },
    { id: "bottom-pins", label: "Pins, bottom row", kind: "pins", x: 2, y: 28.2, w: 38.1, h: 2.54, note: "3V3 and GND by the USB, TX, RX, D8 to D5, then D4 to D0. Note the D numbers differ from the GPIO numbers." },
    { id: "rst", label: "RST button", kind: "button", x: 8, y: 6.2, w: 4, h: 4, note: "Restarts the chip; hold FLASH while pressing it to enter programming mode." },
    { id: "flash", label: "FLASH button", kind: "button", x: 8, y: 20.8, w: 4, h: 4, note: "Pulls GPIO 0 low. Hold it at reset to enter the bootloader by hand." },
    { id: "bridge", label: "CH340G USB bridge", kind: "chip", x: 13.4, y: 12.9, w: 11.2, h: 6.2, note: "USB to serial; needs a driver on some computers. Some boards use a CP2102 instead." },
    { id: "regulator", label: "AMS1117 3.3 V regulator", kind: "power", x: 17, y: 5.4, w: 6.5, h: 6, note: "Makes 3.3 V from the 5 V on USB or VIN. A linear regulator: it burns the difference as heat." },
    { id: "led", label: "Module LED", kind: "led", x: 49.4, y: 19.5, w: 2.6, h: 1.8, note: "Blue; on GPIO 2 (D4), lit when the pin is low." },
  ],
  pins: [
    rail("VIN", "VIN", 5, "left", { accepts: [5, 10], note: "5 V is the usual feed: USB gives it, or put 5 V to 10 V here. It goes to the AMS1117, which runs hot at the top of that range. From USB it is an output." }),
    rail("3V3", "3V3", 3.3, "left"),
    ground("GND1"),
    io("A0", "A0", "left", ["analog"], { inputOnly: true, note: "Analog in, 0–3.3 V" }),
    io("RX", "RX", "left", ["digital", "rx"]),
    io("TX", "TX", "left", ["digital", "tx"]),
    ground("GND2", "right"),
    io("D0", "D0", "right", ["digital"]),
    io("D1", "D1 SCL", "right", ["digital", "pwm", "scl"]),
    io("D2", "D2 SDA", "right", ["digital", "pwm", "sda"]),
    io("D3", "D3", "right", ["digital", "pwm"]),
    io("D4", "D4 LED", "right", ["digital", "pwm", "led"], { note: "Built-in LED, active low" }),
    io("D5", "D5 SCK", "right", ["digital", "pwm", "sck"]),
    io("D6", "D6 MISO", "right", ["digital", "pwm", "miso"]),
    io("D7", "D7 MOSI", "right", ["digital", "pwm", "mosi"]),
    io("D8", "D8 CS", "right", ["digital", "pwm", "cs"]),
  ],
  pinTable: [
    { name: "D0–D8", role: "digital", note: "Nine GPIO at 3.3 V; D0 has no PWM or interrupt, D3, D4 and D8 are boot pins" },
    { name: "A0", role: "analog", note: "The single 10-bit analog input, 0–3.3 V via the onboard divider (0–1 V on the bare module)" },
    { name: "D1 / D2", role: "i2c", note: "Default SCL and SDA" },
    { name: "D5 / D6 / D7 / D8", role: "spi", note: "SCK, MISO, MOSI, CS" },
    { name: "TX / RX", role: "uart", note: "Serial, shared with USB" },
    { name: "VIN", role: "power", note: "5 V in" },
    { name: "3V3", role: "power", note: "3.3 V out" },
    { name: "GND", role: "ground", note: "Several ground pins" },
  ],
  pinAt: {
    ...name(topRow, "VIN", "GND1", ...Array(12).fill(null), "A0"),
    ...name(bottomRow, "3V3", "GND2", "TX", "RX", "D8", "D7", "D6", "D5", null, null, "D4", "D3", "D2", "D1", "D0"),
  },
  lab: { controller: true, logic: 3.3, tolerates5V: false },
  circuit: {
    blocks: [
      { id: "usb", label: "Micro-USB", sub: "5 V, serial", kind: "connector", col: 0, row: 0, at: "usb", note: "Power and programming." },
      { id: "bridge", label: "USB bridge", sub: "CH340G", kind: "ic", col: 1, row: 0, at: "bridge", note: "USB to serial with auto-reset for uploads." },
      { id: "reg", label: "3.3 V regulator", sub: "AMS1117", kind: "regulator", col: 1, row: 2, at: "regulator", hot: true, note: "Everything on the board runs at 3.3 V. It burns the difference from 5 V as heat." },
      { id: "esp", label: "ESP8266", sub: "80 MHz", kind: "mcu", col: 2, row: 1, at: "module", note: "One core shared between your code and the Wi-Fi stack; keep loops short so Wi-Fi gets its turn." },
      { id: "antenna", label: "Antenna", sub: "2.4 GHz", kind: "antenna", col: 3, row: 0, at: "antenna", note: "Printed on the module." },
      { id: "gpio", label: "GPIO", sub: "D0–D8", kind: "pin", col: 3, row: 1, at: "bottom-pins", note: "Nine usable pins at 3.3 V." },
      { id: "adc", label: "A0", sub: "10-bit", kind: "pin", col: 3, row: 2, at: "A0", note: "One analog input." },
    ],
    links: [
      { from: "usb", to: "bridge", kind: "data", label: "USB" },
      { from: "usb", to: "reg", kind: "power", label: "5 V" },
      { from: "bridge", to: "esp", kind: "data", label: "serial", both: true },
      { from: "reg", to: "esp", kind: "power", label: "3.3 V" },
      { from: "esp", to: "antenna", kind: "rf", both: true },
      { from: "esp", to: "gpio", kind: "signal", both: true },
      { from: "adc", to: "esp", kind: "analog" },
    ],
    steps: [
      "USB supplies 5 V; the AMS1117 makes 3.3 V for the module.",
      "The CH340 bridge carries serial to the ESP8266 and resets it into bootloader mode for uploads.",
      "The single-core ESP8266 runs your sketch between Wi-Fi tasks and drives nine GPIO at 3.3 V plus one analog input.",
    ],
  },
  facts: [
    { label: "Logic", value: "3.3 V" },
    { label: "Clock", value: "80 MHz, 1 core" },
    { label: "Radio", value: "Wi-Fi 2.4 GHz" },
    { label: "Memory", value: "4 MB flash, 80 KB RAM" },
    { label: "Pins", value: "9 GPIO, 1 analog" },
    { label: "Size", value: "58 × 31 mm" },
  ],
  spec: {
    form: {
      mass: 10,
      mount: "breadboard",
      pitch: 2.54,
      note: "Two rows of 15 pins, 27.94 mm apart: it covers a half-size breadboard completely, so there is no free hole beside the pins. Use a full-size board, or jumper wires from the pins' other side.",
    },
    power: {
      supply: { min: 5, max: 10, typ: 5 },
      logic: 3.3,
      tolerant5V: false,
      draw: { idle: 70, active: 80, peak: 300 },
      rails: [
        { pin: "3V3", volts: 3.3, maxMa: 500, note: "The AMS1117 is rated 1 A and the module takes up to 300 mA of it in a Wi-Fi burst. About 500 mA is left for your parts before the regulator gets too hot." },
        { pin: "VIN", volts: 5, maxMa: 500, note: "Straight from the USB port, so the port's 500 mA limit is shared with the board itself." },
      ],
      gpio: { maxMa: 12 },
      interface: "Xtensa L106, 80 MHz, about 80 KB RAM, 4 MB flash; Wi-Fi 802.11 b/g/n; one 10-bit ADC on A0; CH340G USB to serial",
      note: "About 80 mA with Wi-Fi on, bursts to about 300 mA while transmitting. A0 reads 0 to 1 V on the bare ESP-12E; the NodeMCU's divider on the board stretches that to 0 to 3.3 V.",
    },
    thermal: {
      thetaCW: 90,
      maxC: 125,
      typicalW: 0.4,
      at: "5 V in and 250 mA drawn: (5 − 3.3) V × 0.25 A",
      note: "The AMS1117 on its small copper pad warms about 90 °C per watt. At 10 V in and 200 mA it loses 1.3 W and is near its limit.",
    },
    sourcing: {
      mpn: "ESP-12E",
      maker: "Ai-Thinker (module), Espressif Systems (ESP8266EX chip)",
      lifecycle: "generic",
      usd: [3, 7],
      note: "Sold as NodeMCU v2 (Amica) or v3 (LoLin). The v3 is wider (31 mm) and carries a CH340G; the v2 is narrower (about 25 mm) and usually carries a CP2102.",
    },
    limits: [
      "Few usable pins: 9 GPIO (D0 to D8) and one analog input. The reserved flash pins (SD0 to SD3, CMD, CLK) are not for your use.",
      "D3 (GPIO 0), D4 (GPIO 2) and D8 (GPIO 15) are boot pins: D3 and D4 must be high and D8 low at reset, or the board won't start or won't flash.",
      "D0 (GPIO 16) has no PWM and no interrupt.",
      "One analog input only, 10 bits. 0 to 3.3 V on the NodeMCU through its divider; the bare module takes only 0 to 1 V.",
      "Pins are 3.3 V only: 5 V on a pin can kill the chip. A pin gives about 12 mA, so an LED needs a resistor and a motor needs a driver.",
      "The Wi-Fi stack shares the single core: long loops without a delay or yield make it drop the connection.",
    ],
    upgrade: [
      { part: "esp32", name: "ESP32 DevKit", why: "Two cores at 240 MHz instead of one at 80, 520 KB of RAM instead of about 80, Bluetooth as well as Wi-Fi, 18 analog inputs at 12 bits instead of one at 10, and about 25 usable GPIO instead of 9." },
    ],
    refs: [
      "https://www.espressif.com/sites/default/files/documentation/0a-esp8266ex_datasheet_en.pdf",
      "https://www.espressif.com/sites/default/files/documentation/esp8266-technical_reference_en.pdf",
      "https://www.advanced-monolithic.com/pdf/ds1117.pdf",
    ],
  },
  animate: { lit: ["led"] },
  experiment: { title: "Web page from a chip", idea: "Serve a web page showing the A0 reading and refresh it every few seconds." },
  tags: ["esp8266", "nodemcu", "wifi", "iot", "3.3v", "board", "mcu"],
});
