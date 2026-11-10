import { MATERIAL, PCB_TOP, board, definePart, ground, io, microUsb, pinHeader, rail, silk, smd, smdDiode, smdLed, sot23, tactileButton, type Solid } from "../../sdk";
import { antennaTrace, padRow, pinLabels, regulator1117, shieldCan } from "./_esp-modules";

/** The two 15-pin rows, read from the USB end: the lab's pin ids, null where the lab has no pin (EN). */
const TOP = ["VIN", "GND1", "D13", "D12", "D14", "D27", "D26", "D25", "D33", "D32", "D35", "D34", "D39", "D36", null] as const;
const BOTTOM = ["3V3", "GND2", "D15", "D2", "D4", "D16", "D17", "D5", "D18", "D19", "D21", "RX", "TX", "D22", "D23"] as const;
const TOP_LABELS = ["VIN", "GND", "D13", "D12", "D14", "D27", "D26", "D25", "D33", "D32", "D35", "D34", "VN", "VP", "EN"];
const BOTTOM_LABELS = ["3V3", "GND", "D15", "D2", "D4", "RX2", "TX2", "D5", "D18", "D19", "D21", "RX0", "TX0", "D22", "D23"];

// The same arithmetic as the lab's old canvas, so every hole lands where saved wires expect it.
const holeX = (i: number) => 0.5 + 1.27 + i * 2.54;
const TOP_Y = 1 + 1.27;
const BOTTOM_Y = 24.5 + 1.27;
const pinAt: Record<string, { x: number; y: number }> = {};
TOP.forEach((id, i) => id && (pinAt[id] = { x: holeX(i), y: TOP_Y }));
BOTTOM.forEach((id, i) => id && (pinAt[id] = { x: holeX(i), y: BOTTOM_Y }));

// Pins hang under the board: black plastic below, solder joints on top.
const topRow = pinHeader(1.77, TOP_Y, 15, { style: "down" });
const bottomRow = pinHeader(1.77, BOTTOM_Y, 15, { style: "down" });

/** The ESP-WROOM-32: its own black board at the right-hand end, shield on the pad end, antenna at the bare end. */
const MX = 29.5;
const MY = 5;
const module32: Solid[] = [
  { kind: "box", id: "module", x: MX, y: MY, w: 25.5, h: 18, d: 0.8, z: PCB_TOP, top: "#17181b", finish: "soldermask", radius: 0.3 },
  // 15 pads down each long edge and 9 across the pad end.
  padRow(MX + 1.3, MY + 0.35, 15, 1.27, "x"),
  padRow(MX + 1.3, MY + 17.65, 15, 1.27, "x"),
  padRow(MX + 0.4, MY + 4.0, 9, 1.27, "y"),
  ...shieldCan(MX + 1, MY + 1.2, 18, 15.6, [
    { text: "ESP-WROOM-32", size: 1.35 },
    { text: "2AC7Z-ESPWROOM32", size: 0.8 },
    { text: "21098-ESPWROOM32", size: 0.8 },
  ]),
  ...antennaTrace(MX + 19.8, MY, 5.7, 18, 7),
];

/** CP2102: a 5 × 5 mm leadless package, its pads showing at the four edges. */
const CX = 16;
const CY = 10.5;
const bridge: Solid[] = [
  { kind: "box", x: CX, y: CY, w: 5, h: 5, d: 0.9, z: PCB_TOP, top: MATERIAL.ic, side: MATERIAL.icSide, radius: 0.25, finish: "epoxy", label: { text: "CP2102", size: 0.85, color: "#9aa0a6" } },
  { kind: "pins", x: CX + 0.35, y: CY - 0.25, count: 7, pitch: 0.65, dir: "x", len: 0.1, z: PCB_TOP, size: 0.3, color: MATERIAL.tin, finish: "tin" },
  { kind: "pins", x: CX + 0.35, y: CY + 4.95, count: 7, pitch: 0.65, dir: "x", len: 0.1, z: PCB_TOP, size: 0.3, color: MATERIAL.tin, finish: "tin" },
  { kind: "pins", x: CX - 0.25, y: CY + 0.35, count: 7, pitch: 0.65, dir: "y", len: 0.1, z: PCB_TOP, size: 0.3, color: MATERIAL.tin, finish: "tin" },
  { kind: "pins", x: CX + 4.95, y: CY + 0.35, count: 7, pitch: 0.65, dir: "y", len: 0.1, z: PCB_TOP, size: 0.3, color: MATERIAL.tin, finish: "tin" },
  { kind: "disc", cx: CX + 0.8, cy: CY + 0.8, r: 0.28, color: "#5d636b", z: PCB_TOP + 0.91 },
];

export default definePart({
  id: "esp32",
  name: "ESP32 DevKit",
  aka: ["ESP32 DevKit V1", "DOIT ESP32", "ESP-WROOM-32 board"],
  group: "boards",
  rank: 2,
  summary: "A fast dual-core board with Wi-Fi and Bluetooth built in, 3.3 V logic, and enough pins for a whole IoT project. The usual choice when a project needs the internet.",
  size: { w: 55, h: 28, d: 10 },
  solids: [
    board(55, 28, "#17191d", { radius: 1.2 }),
    topRow,
    bottomRow,
    microUsb(-1.5, 10.2),
    module32,
    // Reset and boot buttons, either side of the USB socket.
    tactileButton(8, 5.6, 4, "btn-en"),
    tactileButton(8, 18.4, 4, "btn-boot"),
    bridge,
    // The USB chip's bypass parts, and the diode that feeds VIN.
    smd(14, 10.8, "c", "y"),
    smd(14, 13.4, "c", "y"),
    smd(22.1, 10.8, "c", "y"),
    smd(22.1, 13.4, "r", "y"),
    smdDiode(7.6, 14, "y", 1, "sod123"),
    // The 3.3 V regulator and the two transistors of the auto-reset circuit.
    regulator1117(21.2, 5.6, { cx: 16.8, cy: 8.2 }, { cx: 24.6, cy: 13.8 }),
    sot23(25.6, 17.2, { dir: "x" }),
    sot23(25.6, 20.4, { dir: "x" }),
    smd(27.4, 16.2, "r", "y"),
    smd(27.4, 19.0, "r", "y"),
    // The two LEDs and their resistors.
    smdLed(15.6, 21, "#ef4444", "led-pwr"),
    smd(17.7, 20.6, "r", "x"),
    smdLed(21.6, 21, "#3b82f6", "led-io2"),
    smd(23.7, 20.6, "r", "x"),
    // Silkscreen.
    pinLabels(TOP_LABELS, 1.77, 4.7),
    pinLabels(BOTTOM_LABELS, 1.77, 24.0),
    silk(10, 11.2, "EN", 1.0, MATERIAL.silk, { anchor: "middle" }),
    silk(10, 17.6, "BOOT", 1.0, MATERIAL.silk, { anchor: "middle" }),
    silk(15.6, 23.1, "PWR", 0.9, MATERIAL.silk, { anchor: "middle" }),
    silk(21.6, 23.1, "IO2", 0.9, MATERIAL.silk, { anchor: "middle" }),
    silk(18.5, 18.4, "ESP32 DEVKIT V1", 1.0, MATERIAL.silk, { anchor: "middle" }),
  ],
  features: [
    { id: "module", label: "ESP-WROOM-32 module", kind: "chip", x: 29.5, y: 5, w: 19.2, h: 18, note: "The radio module: a dual-core ESP32 at 240 MHz, 4 MB flash, Wi-Fi and Bluetooth, under a metal shield." },
    { id: "antenna", label: "PCB antenna", kind: "antenna", x: 49.3, y: 5, w: 5.7, h: 18, note: "The printed Wi-Fi and Bluetooth antenna: the zig-zag of bare copper. Keep metal and fingers away from it for the best range." },
    { id: "usb", label: "Micro-USB", kind: "port", x: -1.5, y: 10.2, w: 5.6, h: 7.5, note: "Programming, serial monitor and 5 V power." },
    { id: "top-pins", label: "Pins, top row", kind: "pins", x: 0.5, y: 1, w: 38.1, h: 2.54, note: "15 pins: VIN (5 V in) and GND by the USB, GPIO 13 to 27, analog inputs 32–39 and EN at the antenna end. Everything is 3.3 V; 5 V on a GPIO will damage it." },
    { id: "bottom-pins", label: "Pins, bottom row", kind: "pins", x: 0.5, y: 24.5, w: 38.1, h: 2.54, note: "15 pins: 3V3 and GND by the USB, then GPIO 15 to 23, with TX2/RX2, the I²C pair (21, 22), TX0 and RX0." },
    { id: "en", label: "EN button", kind: "button", x: 8, y: 5.6, w: 4, h: 4, note: "Reset. Hold BOOT while pressing it to enter the bootloader by hand." },
    { id: "boot", label: "BOOT button", kind: "button", x: 8, y: 18.4, w: 4, h: 4, note: "Pulls GPIO 0 low. Hold it during an upload if the board refuses to connect." },
    { id: "bridge", label: "CP2102 USB bridge", kind: "chip", x: 16, y: 10.5, w: 5, h: 5, note: "Makes USB look like a serial port to the ESP32. Some boards carry a CH340 here instead." },
    { id: "regulator", label: "AMS1117 3.3 V regulator", kind: "power", x: 21.2, y: 5.6, w: 6.5, h: 6, note: "Turns the 5 V from USB or VIN into the 3.3 V everything else runs on. A linear regulator: it burns the difference as heat." },
    { id: "led-pwr", label: "Power LED", kind: "led", x: 15.1, y: 20.6, w: 2.6, h: 1.8, note: "Red; lit whenever the board has power." },
    { id: "led-io2", label: "GPIO2 LED", kind: "led", x: 21.1, y: 20.6, w: 2.6, h: 1.8, note: "Blue; the built-in LED, on GPIO 2." },
  ],
  pins: [
    rail("VIN", "VIN", 5, "left", { accepts: [5, 12], note: "5 V is the usual feed: USB gives it, or put 5 V here. It goes to the AMS1117, which runs hot above 9 V. From USB it is an output." }),
    ground("GND1"),
    io("D36", "GPIO36 VP", "left", ["analog", "digital"], { inputOnly: true, note: "Input only" }),
    io("D39", "GPIO39 VN", "left", ["analog", "digital"], { inputOnly: true, note: "Input only" }),
    io("D34", "GPIO34", "left", ["analog", "digital"], { inputOnly: true, note: "Input only" }),
    io("D35", "GPIO35", "left", ["analog", "digital"], { inputOnly: true, note: "Input only" }),
    io("D32", "GPIO32", "left", ["analog", "digital", "pwm"]),
    io("D33", "GPIO33", "left", ["analog", "digital", "pwm"]),
    io("D25", "GPIO25", "left", ["analog", "digital", "pwm"]),
    io("D26", "GPIO26", "left", ["analog", "digital", "pwm"]),
    io("D27", "GPIO27", "left", ["analog", "digital", "pwm"]),
    io("D14", "GPIO14", "left", ["analog", "digital", "pwm"]),
    io("D12", "GPIO12", "left", ["analog", "digital", "pwm"]),
    io("D13", "GPIO13", "left", ["analog", "digital", "pwm"]),
    rail("3V3", "3V3", 3.3, "right"),
    ground("GND2", "right"),
    io("D23", "GPIO23 MOSI", "right", ["digital", "pwm", "mosi"]),
    io("D22", "GPIO22 SCL", "right", ["digital", "pwm", "scl"]),
    io("TX", "TX0", "right", ["digital", "tx"]),
    io("RX", "RX0", "right", ["digital", "rx"]),
    io("D21", "GPIO21 SDA", "right", ["digital", "pwm", "sda"]),
    io("D19", "GPIO19 MISO", "right", ["digital", "pwm", "miso"]),
    io("D18", "GPIO18 SCK", "right", ["digital", "pwm", "sck"]),
    io("D5", "GPIO5 CS", "right", ["digital", "pwm", "cs"]),
    io("D17", "GPIO17 TX2", "right", ["digital", "pwm", "tx"]),
    io("D16", "GPIO16 RX2", "right", ["digital", "pwm", "rx"]),
    io("D4", "GPIO4", "right", ["analog", "digital", "pwm"]),
    io("D2", "GPIO2", "right", ["analog", "digital", "pwm", "led"], { note: "Built-in blue LED" }),
    io("D15", "GPIO15", "right", ["analog", "digital", "pwm"]),
  ],
  pinTable: [
    { name: "VIN", role: "power", note: "5 V in from USB or a supply; feeds the 3.3 V regulator" },
    { name: "3V3", role: "power", note: "3.3 V out, around 500 mA shared with the radio" },
    { name: "GND", role: "ground", note: "Two ground pins" },
    { name: "EN", role: "other", note: "Pull low to reset" },
    { name: "GPIO 0–39", role: "digital", note: "Up to 25 usable GPIO at 3.3 V; 34–39 are input only" },
    { name: "GPIO 32–39", role: "analog", note: "12-bit ADC inputs (ADC1); ADC2 pins stop working while Wi-Fi is on" },
    { name: "GPIO 2", role: "digital", note: "Built-in blue LED; keep low at boot" },
    { name: "TX0 / RX0", role: "uart", note: "Serial port shared with USB programming" },
    { name: "GPIO 21 / 22", role: "i2c", note: "Default SDA and SCL" },
    { name: "GPIO 18 / 19 / 23 / 5", role: "spi", note: "Default SCK, MISO, MOSI, CS (VSPI)" },
    { name: "GPIO 25 / 26", role: "analog", note: "Also 8-bit DAC outputs" },
  ],
  pinAt,
  lab: { controller: true, logic: 3.3, tolerates5V: false },
  canvas: { usb: { x: -1.5, y: 13.95, z: 3, from: "left" }, pinZ: 2.6 },
  circuit: {
    blocks: [
      { id: "usb", label: "Micro-USB", sub: "5 V in, serial", kind: "connector", col: 0, row: 0, at: "usb", note: "Power and programming from the computer." },
      { id: "bridge", label: "USB bridge", sub: "CP2102", kind: "ic", col: 1, row: 0, at: "bridge", note: "USB to serial, plus the auto-reset trick that puts the chip into bootloader mode for uploads." },
      { id: "reg", label: "3.3 V regulator", sub: "AMS1117", kind: "regulator", col: 1, row: 2, at: "regulator", hot: true, note: "Drops 5 V to the 3.3 V everything on the board runs at. It burns the difference as heat; Wi-Fi bursts pull 240 mA or more." },
      { id: "esp", label: "ESP32", sub: "2 cores, 240 MHz", kind: "mcu", col: 2, row: 1, at: "module", note: "Runs your code on one core while the other handles Wi-Fi and Bluetooth." },
      { id: "flash", label: "Flash", sub: "4 MB", kind: "ic", col: 2, row: 2, at: "module", note: "Your program and files live here, inside the module." },
      { id: "antenna", label: "Antenna", sub: "2.4 GHz", kind: "antenna", col: 3, row: 0, at: "antenna", note: "Printed on the module; shared by Wi-Fi and Bluetooth." },
      { id: "gpio", label: "GPIO pins", sub: "3.3 V logic", kind: "pin", col: 3, row: 1, at: "bottom-pins", note: "Digital, PWM, I2C, SPI and UART, chosen in software." },
      { id: "adc", label: "Analog inputs", sub: "12-bit", kind: "pin", col: 3, row: 2, at: "top-pins", note: "0–3.3 V read as 0–4095." },
    ],
    links: [
      { from: "usb", to: "bridge", kind: "data", label: "USB" },
      { from: "usb", to: "reg", kind: "power", label: "5 V" },
      { from: "bridge", to: "esp", kind: "data", label: "serial", both: true },
      { from: "reg", to: "esp", kind: "power", label: "3.3 V" },
      { from: "esp", to: "flash", kind: "data", both: true },
      { from: "esp", to: "antenna", kind: "rf", both: true },
      { from: "esp", to: "gpio", kind: "signal", both: true },
      { from: "adc", to: "esp", kind: "analog" },
    ],
    steps: [
      "5 V from USB (or VIN) goes through the AMS1117 regulator, which supplies 3.3 V to the module and the 3V3 pin.",
      "The CP2102 bridge turns USB into serial and can pull EN and GPIO0 to reset the chip into its bootloader for uploads.",
      "The ESP32 runs your sketch from the 4 MB flash, with the radio stack on its second core.",
      "GPIO pins work at 3.3 V; the analog pins on ADC1 (32–39) keep working while Wi-Fi is active, the others do not.",
    ],
  },
  facts: [
    { label: "Logic", value: "3.3 V" },
    { label: "Clock", value: "240 MHz, 2 cores" },
    { label: "Radio", value: "Wi-Fi, Bluetooth 4.2 + BLE" },
    { label: "Memory", value: "4 MB flash, 520 KB RAM" },
    { label: "Pins", value: "30, of which about 25 GPIO" },
    { label: "Size", value: "55 × 28 mm" },
  ],
  spec: {
    form: {
      mass: 10,
      mount: "breadboard",
      pitch: 2.54,
      note: "Two rows of 15 pins, 25.4 mm apart. On a full-size breadboard it leaves one free hole beside each row; on a half-size one it leaves none, so use jumper wires from the other side or a second board.",
    },
    power: {
      supply: { min: 5, max: 12, typ: 5 },
      logic: 3.3,
      tolerant5V: false,
      draw: { idle: 80, active: 100, peak: 240 },
      rails: [
        { pin: "3V3", volts: 3.3, maxMa: 500, note: "The AMS1117 is rated 1 A and the module takes up to 240 mA of it in a Wi-Fi burst. About 500 mA is left for your parts before the regulator gets too hot." },
        { pin: "VIN", volts: 5, maxMa: 500, note: "Straight from the USB port, so the port's 500 mA limit is shared with the board itself." },
      ],
      gpio: { maxMa: 20 },
      interface: "Dual-core Xtensa LX6, 240 MHz, 520 KB RAM, 4 MB flash; Wi-Fi 802.11 b/g/n, Bluetooth 4.2 and BLE; CP2102 USB to serial",
      note: "About 80 mA with the radio on and idle, up to 240 mA or more while transmitting. Power it from a supply that can give 500 mA, or it resets in the middle of a Wi-Fi burst.",
    },
    thermal: {
      thetaCW: 90,
      maxC: 125,
      typicalW: 0.5,
      at: "5 V in and 300 mA drawn: (5 − 3.3) V × 0.3 A",
      note: "The AMS1117 on its small copper pad warms about 90 °C per watt. At 12 V in and 200 mA it loses 1.7 W, far past its limit; keep VIN to 9 V or less.",
    },
    sourcing: {
      mpn: "ESP32-WROOM-32",
      maker: "Espressif Systems",
      lifecycle: "generic",
      usd: [4, 9],
      note: "The DevKit V1 board is copied by many makers. Some carry a CH340 instead of the CP2102 and need a different driver on some computers.",
    },
    limits: [
      "Pins are 3.3 V only: 5 V on any GPIO can kill the chip. Put a level shifter or a divider on 5 V signals.",
      "A pin may source 40 mA at the very most; 20 mA is a sensible limit. An LED needs a resistor, and a motor or relay needs a driver.",
      "ADC2 pins (GPIO 0, 2, 4, 12 to 15, 25 to 27) stop working while Wi-Fi is on. Use ADC1 (GPIO 32 to 39) for analog reads.",
      "GPIO 34 to 39 are input only and have no internal pull-up or pull-down.",
      "Strapping pins 0, 2, 12 and 15 set how the chip boots. Held at the wrong level at reset (a sensor pulling GPIO 12 high, for example) the board will not start or will not flash.",
      "The ADC is not linear near the ends: it reads flat below about 0.1 V and above about 3.1 V, and is best between about 0.15 V and 2.45 V.",
      "Only about 500 mA is left on the 3V3 pin, and the regulator runs hot above 9 V on VIN.",
    ],
    upgrade: [
      { name: "ESP32-S3-DevKitC-1", why: "The ESP32-S3 has more pins (up to 45 GPIO and 20 ADC channels), USB built into the chip so it needs no USB bridge, and vector instructions that speed up small neural networks and signal work. It runs Wi-Fi and Bluetooth LE 5 but drops classic Bluetooth." },
    ],
    refs: [
      "https://www.espressif.com/sites/default/files/documentation/esp32-wroom-32_datasheet_en.pdf",
      "https://www.espressif.com/sites/default/files/documentation/esp32_datasheet_en.pdf",
      "https://www.advanced-monolithic.com/pdf/ds1117.pdf",
    ],
  },
  animate: { lit: ["led-pwr", "led-io2"] },
  experiment: { title: "Blink over Wi-Fi", idea: "Join a Wi-Fi network, print the IP address, then flash the GPIO2 LED when the board is pinged." },
  docs: "/docs/hardware-knowledge/esp32-devkit",
  tags: ["esp32", "wifi", "bluetooth", "iot", "3.3v", "espressif", "board", "mcu"],
});
