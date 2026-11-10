import { MATERIAL, PCB_TOP, board, chip, definePart, grid, ground, io, pinHeader, rail, shieldCan, silk, smd, smdLed, smdRow, usbC, type Solid } from "../../sdk";

const TOP = PCB_TOP;
const DARK = "#0c0d0f";

/** A stacked pair of USB-A sockets on the right edge: steel shell, two dark mouths, a tongue in each. */
function usbStack(cy: number, tongue: string, id: string): Solid[] {
  const x = 69.85;
  const w = 17.15;
  const h = 15.6;
  const y = cy - h / 2;
  const solids: Solid[] = [{ kind: "box", id, x, y, w, h, d: 15.3, z: TOP, top: "linear-gradient(180deg,#d7dadf,#b9bdc3)", fill: MATERIAL.steel, side: MATERIAL.steelSide, finish: "metal", radius: 0.4 }];
  for (const lift of [0.9, 8.4]) {
    solids.push({ kind: "box", x: x + w - 0.55, y: y + 1.2, w: 0.6, h: h - 2.4, d: 5.8, z: TOP + lift, top: DARK, finish: "plastic", radius: 0.2 });
    solids.push({ kind: "box", x: x + w - 0.85, y: y + 2.6, w: 0.9, h: h - 5.2, d: 1.9, z: TOP + lift + 2, top: tongue, finish: "plastic", radius: 0.1 });
  }
  return solids;
}

/** The RJ45 Ethernet jack: a steel box, the dark socket with its gold contacts and the two small link LEDs above it. */
function ethernet(): Solid[] {
  const x = 64.9;
  const w = 21.3;
  const y = 2.25;
  const h = 16;
  return [
    { kind: "box", x, y, w, h, d: 13.5, z: TOP, top: "linear-gradient(180deg,#d7dadf,#b9bdc3)", fill: MATERIAL.steel, side: MATERIAL.steelSide, finish: "metal", radius: 0.4 },
    { kind: "box", x: x + w - 0.55, y: y + 2.1, w: 0.6, h: h - 4.2, d: 8.4, z: TOP + 1.6, top: DARK, finish: "plastic", radius: 0.3 },
    { kind: "box", x: x + w - 0.9, y: y + 3.4, w: 0.9, h: h - 6.8, d: 0.6, z: TOP + 2.2, top: "#c9a84c", finish: "gold", radius: 0.1 },
    { kind: "box", x: x + w - 0.45, y: y + 1.0, w: 0.5, h: 2.4, d: 1.2, z: TOP + 10.6, top: "#3fb34f", finish: "plastic", radius: 0.2 },
    { kind: "box", x: x + w - 0.45, y: y + h - 3.4, w: 0.5, h: 2.4, d: 1.2, z: TOP + 10.6, top: "#d9a521", finish: "plastic", radius: 0.2 },
  ];
}

/** A micro-HDMI socket on the bottom edge: a steel shell with a flat dark mouth and a pale tongue. */
function microHdmi(cx: number): Solid[] {
  const y = 50.5;
  return [
    { kind: "box", x: cx - 3.8, y, w: 7.6, h: 6, d: 3.3, z: TOP, top: "linear-gradient(180deg,#d7dadf,#b9bdc3)", fill: MATERIAL.steel, side: MATERIAL.steelSide, finish: "metal", radius: 0.5 },
    { kind: "box", x: cx - 3.2, y: y + 6 - 0.45, w: 6.4, h: 0.5, d: 2.1, z: TOP + 0.6, top: DARK, finish: "plastic", radius: 0.3 },
    { kind: "box", x: cx - 2.4, y: y + 6 - 0.7, w: 4.8, h: 0.75, d: 0.5, z: TOP + 1.4, top: "#3a3c42", finish: "plastic", radius: 0.1 },
  ];
}

/** A flat-cable (ribbon) socket standing along y: a dark housing and its pale lock bar. */
function ribbon(x: number, y: number, len: number): Solid[] {
  return [
    { kind: "box", x, y, w: 4.2, h: len, d: 2.6, z: TOP, top: "#2b2c30", finish: "plastic", radius: 0.3 },
    { kind: "box", x: x + 2.2, y: y + 0.7, w: 1.6, h: len - 1.4, d: 0.5, z: TOP + 2.6, top: "#d8d4c7", finish: "plastic", radius: 0.2 },
  ];
}

const header = pinHeader(8.37, 3.5, 20, { rows: 2, style: "up" });

// The 40-pin header, by physical pin. Outer row (nearest the edge) is the even pins, inner row the odd ones. Pin 1 is at the SD-card end.
const outerRow = ["5V", null, "GND2", "GPIO14", "GPIO15", "GPIO18", null, "GPIO23", "GPIO24", null, "GPIO25", "GPIO8", "GPIO7", null, null, "GPIO12", null, "GPIO16", "GPIO20", "GPIO21"];
const innerRow = ["3V3", "GPIO2", "GPIO3", "GPIO4", "GND1", "GPIO17", "GPIO27", "GPIO22", null, "GPIO10", "GPIO9", "GPIO11", null, null, "GPIO5", "GPIO6", "GPIO13", "GPIO19", "GPIO26", null];

const holes = [
  { x: 3.5, y: 3.5, d: 2.75 },
  { x: 61.5, y: 3.5, d: 2.75 },
  { x: 3.5, y: 52.5, d: 2.75 },
  { x: 61.5, y: 52.5, d: 2.75 },
];

export default definePart({
  id: "raspberry-pi-4",
  name: "Raspberry Pi 4",
  aka: ["Pi 4 Model B", "Raspberry Pi", "RPi 4"],
  group: "boards",
  rank: 8,
  summary: "A full Linux computer the size of a credit card, with 40 GPIO pins. Use it when a project needs a camera, a screen, networking or Python with real libraries.",
  size: { w: 85, h: 56, d: 17 },
  solids: [
    board(85, 56, "#2a7d3b", { radius: 3, holes }),
    header,
    // The BCM2711 wears a nickel heat spreader, not bare epoxy.
    { kind: "box", id: "soc", x: 22.5, y: 19.5, w: 15, h: 15, d: 2.2, z: TOP, top: "linear-gradient(180deg,#cfd3d8,#b5bac1)", fill: "#c2c7cd", finish: "metal", radius: 0.6, label: { text: "BCM2711", size: 1.6, color: "#5d636b" } },
    chip(39.5, 22, 14, 10, "LPDDR4", 1.1, "ram"),
    // The wireless module's can.
    shieldCan(9, 22, 10, 12, "CYW43455", 2.2),
    // The power manager, near the USB-C socket, and the USB 3 controller, near the ports.
    chip(17, 41, 5, 5, "MXL7704", 0.9),
    chip(59, 11.5, 5, 5, "VL805", 0.9),
    // The 54 MHz crystal.
    { kind: "box", x: 29, y: 39, w: 3.2, h: 2.5, d: 0.9, z: TOP, top: "linear-gradient(180deg,#d7dadf,#b9bdc3)", fill: MATERIAL.steel, finish: "metal", radius: 0.5, label: { text: "54", size: 0.9, color: "#5d636b" } },
    // The little capacitors and resistors round the chips.
    smdRow(23, 17.2, 5, 2.1, "x", "crcc", "x"),
    smdRow(23, 36.7, 5, 2.1, "x", "cccr", "x"),
    smdRow(20.5, 21, 4, 2.1, "y", "ccrc", "y"),
    smdRow(55, 23, 3, 2.2, "y", "rcc", "y"),
    smd(33, 39.4, "c", "x"),
    smd(35.5, 39.4, "r", "x"),
    // Connectors on the right end: the Ethernet jack at the top, USB 3 (blue) in the middle, USB 2 at the bottom.
    ethernet(),
    usbStack(29, "#2b5fd9", "usb-3"),
    usbStack(47, "#1d1e22", "usb-2"),
    // Along the bottom edge: USB-C power, two micro-HDMI, the 3.5 mm jack.
    usbC(6.7, 49.5, TOP, "bottom"),
    microHdmi(25.8),
    microHdmi(39.2),
    { kind: "box", x: 50, y: 43.5, w: 7, h: 12.8, d: 5.6, z: TOP, top: "#1f2024", side: "#111214", finish: "plastic", radius: 0.5 },
    { kind: "cyl", cx: 53.5, cy: 56.05, r: 1.9, d: 0.5, z: TOP + 0.9, axis: "y", top: DARK, finish: "plastic" },
    // The camera and display flat-cable sockets.
    ribbon(44.2, 34.5, 19.5),
    ribbon(2, 8.5, 19.5),
    // The microSD slot is on the underside; its steel shell shows at the left edge.
    { kind: "box", x: -1, y: 22, w: 4, h: 12, d: 1.4, z: -1.5, top: "linear-gradient(180deg,#d7dadf,#b9bdc3)", fill: MATERIAL.steel, side: MATERIAL.steelSide, finish: "metal", radius: 0.3 },
    { kind: "box", x: -1.05, y: 23, w: 0.5, h: 10, d: 0.7, z: -1.15, top: DARK, finish: "plastic", radius: 0.2 },
    smdLed(3, 41.6, "#ef4444", "led-pwr"),
    smdLed(3, 44, "#3ddc84", "led-act"),
    silk(5.2, 42.5, "PWR", 1),
    silk(5.2, 44.9, "ACT", 1),
    silk(8.37, 9.1, "1", 1, MATERIAL.silk, { anchor: "middle" }),
    silk(56.63, 9.1, "39", 1, MATERIAL.silk, { anchor: "middle" }),
    silk(8.37, 2, "2", 1, MATERIAL.silk, { anchor: "middle" }),
    silk(56.63, 2, "40", 1, MATERIAL.silk, { anchor: "middle" }),
    silk(11.2, 48.7, "PWR IN", 0.9, MATERIAL.silk, { anchor: "middle" }),
    silk(25.8, 49.5, "HDMI0", 0.9, MATERIAL.silk, { anchor: "middle" }),
    silk(39.2, 49.5, "HDMI1", 0.9, MATERIAL.silk, { anchor: "middle" }),
    silk(53.5, 42.4, "AUDIO", 0.9, MATERIAL.silk, { anchor: "middle" }),
    silk(7.8, 27, "DISPLAY", 0.9, MATERIAL.silk, { rotate: -90 }),
    silk(43.2, 53.5, "CAMERA", 0.9, MATERIAL.silk, { rotate: -90 }),
    silk(30, 8.7, "GPIO", 1.1, MATERIAL.silk, { anchor: "middle" }),
  ],
  features: [
    { id: "gpio", label: "40-pin GPIO header", kind: "pins", x: 7.1, y: 2.23, w: 50.8, h: 5.08, note: "26 GPIO at 3.3 V plus 5 V, 3.3 V and ground pins. Pin 1 (3.3 V) is the inner pin nearest the SD-card end. No analog inputs; use an ADC chip." },
    { id: "soc", label: "BCM2711", kind: "chip", x: 22.5, y: 19.5, w: 15, h: 15, note: "Four Cortex-A72 cores at 1.5 GHz under a metal lid. It gets warm; a heatsink helps." },
    { id: "ram", label: "RAM", kind: "chip", x: 39.5, y: 22, w: 14, h: 10, note: "1, 2, 4 or 8 GB of LPDDR4 depending on the model." },
    { id: "wifi", label: "Wi-Fi and Bluetooth", kind: "antenna", x: 9, y: 22, w: 10, h: 12, note: "Dual-band Wi-Fi and Bluetooth 5 under the small metal can." },
    { id: "usb", label: "USB ports", kind: "port", x: 69.85, y: 21.2, w: 17.15, h: 33.6, note: "Two USB 3.0 (blue) on top and two USB 2.0 below, for keyboards, cameras and drives. They share 1.2 A." },
    { id: "eth", label: "Gigabit Ethernet", kind: "port", x: 64.9, y: 2.25, w: 21.3, h: 16, note: "Wired network; can take power over Ethernet with a HAT." },
    { id: "usbc", label: "USB-C power", kind: "port", x: 6.7, y: 49.5, w: 9, h: 7.5, note: "5 V at 3 A in. A weak supply is the most common cause of trouble." },
    { id: "hdmi", label: "Micro-HDMI ×2", kind: "port", x: 22, y: 50.5, w: 21, h: 6, note: "Two displays, up to 4K each." },
    { id: "audio", label: "3.5 mm jack", kind: "port", x: 50, y: 43.5, w: 7, h: 12.8, note: "Stereo audio out and composite video." },
    { id: "camera", label: "Camera connector", kind: "connector", x: 44.2, y: 34.5, w: 4.2, h: 19.5, note: "Ribbon socket for the official camera (CSI)." },
    { id: "display", label: "Display connector", kind: "connector", x: 2, y: 8.5, w: 4.2, h: 19.5, note: "Ribbon socket for the official touch display (DSI)." },
    { id: "sd", label: "microSD slot", kind: "port", x: -1, y: 22, w: 4, h: 12, note: "On the underside, with its mouth at the left edge. The operating system and your files live on this card." },
    { id: "leds", label: "PWR and ACT LEDs", kind: "led", x: 2.2, y: 40.8, w: 2.6, h: 4.4, note: "Red for power; green flickers with SD-card activity." },
  ],
  pins: [
    rail("3V3", "3V3", 3.3, "left"),
    rail("5V", "5V", 5, "left", { accepts: [4.75, 5.25], note: "5 V out. Feeding 5 V in here bypasses the USB-C socket's protection." }),
    ground("GND1", "left"),
    io("GPIO2", "GPIO2 SDA", "left", ["digital", "sda"]),
    io("GPIO3", "GPIO3 SCL", "left", ["digital", "scl"]),
    io("GPIO4", "GPIO4", "left", ["digital"]),
    io("GPIO17", "GPIO17", "left", ["digital"]),
    io("GPIO27", "GPIO27", "left", ["digital"]),
    io("GPIO22", "GPIO22", "left", ["digital"]),
    io("GPIO10", "GPIO10 MOSI", "left", ["digital", "mosi"]),
    io("GPIO9", "GPIO9 MISO", "left", ["digital", "miso"]),
    io("GPIO11", "GPIO11 SCLK", "left", ["digital", "sck"]),
    io("GPIO5", "GPIO5", "left", ["digital"]),
    io("GPIO6", "GPIO6", "left", ["digital"]),
    io("GPIO13", "GPIO13 PWM1", "left", ["digital", "pwm"]),
    io("GPIO19", "GPIO19 PWM1", "left", ["digital", "pwm"]),
    io("GPIO26", "GPIO26", "left", ["digital"]),
    ground("GND2", "right"),
    io("GPIO14", "GPIO14 TXD", "right", ["digital", "tx"]),
    io("GPIO15", "GPIO15 RXD", "right", ["digital", "rx"]),
    io("GPIO18", "GPIO18 PWM0", "right", ["digital", "pwm"]),
    io("GPIO23", "GPIO23", "right", ["digital"]),
    io("GPIO24", "GPIO24", "right", ["digital"]),
    io("GPIO25", "GPIO25", "right", ["digital"]),
    io("GPIO8", "GPIO8 CE0", "right", ["digital", "cs"]),
    io("GPIO7", "GPIO7 CE1", "right", ["digital", "cs"]),
    io("GPIO12", "GPIO12 PWM0", "right", ["digital", "pwm"]),
    io("GPIO16", "GPIO16", "right", ["digital"]),
    io("GPIO20", "GPIO20", "right", ["digital"]),
    io("GPIO21", "GPIO21", "right", ["digital"]),
  ],
  pinTable: [
    { name: "GPIO 2–27", role: "digital", note: "26 GPIO at 3.3 V; not 5 V tolerant" },
    { name: "GPIO 2 / 3", role: "i2c", note: "SDA and SCL, with onboard pull-ups" },
    { name: "GPIO 14 / 15", role: "uart", note: "TXD and RXD" },
    { name: "GPIO 9 / 10 / 11 / 8 / 7", role: "spi", note: "MISO, MOSI, SCLK, CE0, CE1" },
    { name: "GPIO 12 / 13 / 18 / 19", role: "pwm", note: "Hardware PWM" },
    { name: "5V", role: "power", note: "Two pins, straight from the USB-C input" },
    { name: "3V3", role: "power", note: "Two pins, 3.3 V out" },
    { name: "GND", role: "ground", note: "Eight ground pins" },
  ],
  pinAt: grid([outerRow, innerRow], 8.37, 3.5),
  lab: { controller: true, logic: 3.3, tolerates5V: false },
  circuit: {
    blocks: [
      { id: "usbc", label: "USB-C", sub: "5 V 3 A", kind: "connector", col: 0, row: 1, at: "usbc", note: "All power enters here." },
      { id: "pmic", label: "Power manager", sub: "MXL7704", kind: "regulator", col: 1, row: 1, at: { x: 19.5, y: 43.5 }, note: "Makes the half-dozen voltages the processor and memory need." },
      { id: "soc", label: "BCM2711", sub: "4 × A72, 1.5 GHz", kind: "mcu", col: 2, row: 0, at: "soc", note: "Runs Linux from the microSD card." },
      { id: "ram", label: "LPDDR4", sub: "up to 8 GB", kind: "ic", col: 2, row: 2, at: "ram", note: "Working memory." },
      { id: "usb", label: "USB 3 controller", sub: "VL805", kind: "ic", col: 3, row: 0, at: { x: 61.5, y: 14 }, note: "Four USB ports over PCIe." },
      { id: "gpio", label: "GPIO header", sub: "40 pins", kind: "pin", col: 3, row: 1, at: "gpio", note: "3.3 V GPIO, I2C, SPI, UART, PWM." },
      { id: "net", label: "Network", sub: "Ethernet, Wi-Fi, BT", kind: "antenna", col: 3, row: 2, at: "wifi", note: "Gigabit wired, dual-band wireless." },
    ],
    links: [
      { from: "usbc", to: "pmic", kind: "power", label: "5 V" },
      { from: "pmic", to: "soc", kind: "power" },
      { from: "pmic", to: "ram", kind: "power" },
      { from: "soc", to: "ram", kind: "data", both: true },
      { from: "soc", to: "usb", kind: "data", label: "PCIe", both: true },
      { from: "soc", to: "gpio", kind: "signal", both: true },
      { from: "soc", to: "net", kind: "data", both: true },
    ],
    steps: [
      "5 V at up to 3 A enters by USB-C; the power manager chip converts it into the core, memory and I/O voltages.",
      "The BCM2711 boots Linux from the microSD card (underneath) using the RAM beside it.",
      "The GPIO header exposes 26 pins at 3.3 V; USB, Ethernet, HDMI and wireless are handled by their own controllers.",
    ],
  },
  facts: [
    { label: "Logic", value: "3.3 V" },
    { label: "Processor", value: "4 × Cortex-A72, 1.5 GHz" },
    { label: "Memory", value: "1–8 GB RAM, microSD storage" },
    { label: "Pins", value: "26 GPIO, no analog" },
    { label: "Network", value: "Gigabit Ethernet, Wi-Fi, Bluetooth 5" },
    { label: "Size", value: "85 × 56 mm" },
  ],
  spec: {
    form: {
      mass: 46,
      mount: "jumpers",
      pitch: 2.54,
      holes,
      note: "Four M2.5 holes, 58 × 49 mm apart. Jumper wires and HATs push onto the 2 × 20 header along the top edge.",
    },
    power: {
      supply: { min: 4.75, max: 5.25, typ: 5.1 },
      logic: 3.3,
      tolerant5V: false,
      draw: { idle: 600, active: 1200 },
      rails: [
        { pin: "3V3", volts: 3.3, maxMa: 500, note: "From the board's own regulator, shared with everything on the 3.3 V rail." },
        { pin: "5V", volts: 5, maxMa: 1800, note: "Straight from the supply, so a 3 A supply minus what the board itself takes when busy. The USB ports share it." },
      ],
      gpio: { maxMa: 16, totalMa: 50 },
      interface: "BCM2711, 4 × Cortex-A72 at 1.5 GHz, 1–8 GB LPDDR4, microSD boot",
    },
    sourcing: { mpn: "BCM2711", maker: "Raspberry Pi Ltd", lifecycle: "active", usd: [35, 80], note: "Price depends on RAM: 1 GB is the cheapest, 8 GB the dearest." },
    limits: [
      "Needs a 5 V, 3 A supply. A weaker one makes the board drop below 4.63 V and show a lightning-bolt warning, then freeze or corrupt the card.",
      "Every GPIO pin is 3.3 V only. 5 V on one can kill the processor, and one pin gives at most 16 mA (about 50 mA for all pins together).",
      "No analog inputs. Reading a pot or an LDR needs an ADC chip such as the MCP3008.",
      "It is a computer, not a microcontroller: Linux can pause your program for milliseconds, so pin timing is not exact. Use a Pico for real-time work.",
      "Shut it down from the software before pulling the power; cutting it while it writes can corrupt the microSD card.",
      "Without a heatsink the processor slows itself down (throttles) at 80 °C.",
      "Feeding 5 V into the 5V pin of the header skips the USB-C socket's protection, so a wrong voltage there goes straight to the board.",
    ],
    upgrade: [
      { name: "Raspberry Pi 5", why: "About two to three times the speed (four Cortex-A76 cores at 2.4 GHz), a PCIe connector and a real-time clock. It wants a 5 V, 5 A supply and an active cooler." },
      { part: "raspberry-pi-pico", name: "Raspberry Pi Pico", why: "Use it beside the Pi for anything that needs exact pin timing: it runs your code with no operating system in the way, has three 12-bit analog inputs, and costs about 4 dollars." },
    ],
    refs: ["https://datasheets.raspberrypi.com/rpi4/raspberry-pi-4-datasheet.pdf", "https://www.raspberrypi.com/documentation/computers/raspberry-pi.html"],
  },
  animate: { lit: ["led-pwr", "led-act"] },
  experiment: { title: "Python reads a sensor", idea: "Wire a DHT11 to GPIO 4, read it from Python and log the values to a file every minute." },
  tags: ["raspberry pi", "pi 4", "linux", "sbc", "python", "3.3v", "board", "computer"],
});
