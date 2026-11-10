import { MATERIAL, board, definePart, gnd, name, pin, pinHeader, silk, smd, smdLed, soic, tactileButton, sot23, vcc } from "../../sdk";
import { COPPER, qfn, serpentine, smdCrystal } from "./_shared";

const CARRIER = "#1f4fb0";
const TOP = 1.6;
/** The green HC-05 core sits on the carrier; its own board is 1 mm thick. */
const MOD = TOP + 1;

const header = pinHeader(1.65, 35.1, 6, { style: "up" });

/** Castellated edge pads down both long sides of the core, with the solder that joins them to the carrier. */
const edgePads = Array.from({ length: 12 }, (_, i) => 12.2 + i * 1.27).flatMap((y) => [
  { kind: "disc" as const, cx: 1.5, cy: y, r: 0.62, color: MATERIAL.tin, z: TOP },
  { kind: "disc" as const, cx: 14.5, cy: y, r: 0.62, color: MATERIAL.tin, z: TOP },
  { kind: "disc" as const, cx: 1.9, cy: y, r: 0.4, color: MATERIAL.gold, z: MOD },
  { kind: "disc" as const, cx: 14.1, cy: y, r: 0.4, color: MATERIAL.gold, z: MOD },
]);

export default definePart({
  id: "hc-05",
  name: "HC-05 Bluetooth",
  aka: ["HC05", "ZS-040", "Bluetooth serial module", "HC-06 cousin"],
  group: "radios",
  rank: 1,
  summary: "A wireless serial cable. Pair it with an Android phone or a PC and whatever your board prints arrives there; whatever you type comes back. Classic Bluetooth, 9600 baud, done in an afternoon.",
  size: { w: 16, h: 37, d: 10.1 },
  solids: [
    board(16, 37, CARRIER, { radius: 0.5 }),
    // The green HC-05 core, soldered on top by its castellated edges.
    { kind: "box", id: "module", x: 1.5, y: 0.6, w: 13, h: 27.2, d: 1, z: TOP, top: "#1f7a52", side: "#0f3a2a", radius: 0.3, finish: "soldermask" },
    edgePads,
    // The gold zig-zag PCB antenna at the far end, with no metal near it.
    serpentine(3, 2, 10, 6, 1.1, { z: MOD + 0.01, width: 0.45 }),
    { kind: "path", d: "M 3 2 L 3 12.4", color: COPPER, width: 0.4, z: MOD + 0.01 },
    ...qfn(5.8, 14.4, 5.2, "BC417", { id: "bc417", z: MOD, perSide: 7, labelSize: 0.9 }),
    ...soic(11.2, 14.9, 4, "FLASH", { id: "flash", z: MOD, dir: "y" }),
    ...smdCrystal(6, 19.2, MOD),
    ...smd(10, 19.6, "c", "x", "0603", MOD),
    ...smd(10, 21, "r", "x", "0603", MOD),
    ...smd(3.4, 19.4, "c", "y", "0603", MOD),
    ...smd(3.4, 21.8, "r", "y", "0603", MOD),
    ...smd(6.4, 22.6, "c", "x", "0603", MOD),
    smdLed(7.2, 24.8, "#ff3b3b", "led", MOD),
    silk(8, 26.6, "HC-05", 1.1, MATERIAL.silk, { anchor: "middle", weight: 700, z: MOD + 0.01 }),
    // The carrier's own parts: 3.3 V regulator, two capacitors, the small button.
    sot23(3.6, 30.5, { five: true, label: "662K", z: TOP }),
    ...smd(6.2, 29.9, "c", "y", "0603", TOP),
    ...smd(7.9, 29.9, "c", "y", "0603", TOP),
    ...tactileButton(11.4, 28.4, 3.4, "btn", TOP),
    silk(8, 33.6, "ZS-040", 0.9, MATERIAL.silk, { anchor: "middle" }),
    header,
    ...["STATE", "RXD", "TXD", "GND", "VCC", "EN"].map((label, i) => silk(1.65 + i * 2.54 + 0.3, 33.4, label, 0.85, MATERIAL.silk, { rotate: -90 })),
  ],
  features: [
    { id: "module", label: "HC-05 core", kind: "chip", x: 1.5, y: 0.6, w: 13, h: 27.2, note: "The green board that is the real radio, soldered by its edge pads onto the blue carrier. A CSR BC417 chip plus a flash chip: classic Bluetooth 2.0 with the Serial Port Profile." },
    { id: "antenna", label: "PCB antenna", kind: "antenna", x: 2.6, y: 1.4, w: 10.8, h: 7.4, note: "A zig-zag of copper tuned to 2.4 GHz. Keep metal and fingers away from this end." },
    { id: "bc417", label: "BC417 chip", kind: "chip", x: 3.2, y: 11.8, w: 5.2, h: 5.2, note: "The Bluetooth radio and processor in one chip." },
    { id: "flash", label: "Flash chip", kind: "chip", x: 9.2, y: 12.4, w: 4.2, h: 5, note: "Holds the Bluetooth firmware and your name, PIN and baud rate. They survive power-off." },
    { id: "led", label: "Status LED", kind: "led", x: 7.2, y: 24.8, w: 1.6, h: 0.8, note: "Fast blink: waiting to pair. Two blinks every couple of seconds: connected. Slow blink: AT mode." },
    { id: "reg", label: "3.3 V regulator", kind: "power", x: 2.2, y: 29.3, w: 2.9, h: 2.4, note: "Lets VCC take 3.6 V to 6 V and feeds the core 3.3 V. The signal pins stay at 3.3 V." },
    { id: "btn", label: "EN button", kind: "button", x: 11.4, y: 28.4, w: 3.4, h: 3.4, note: "Hold it while powering up to enter AT command mode (38400 baud) and change the name, PIN or baud rate." },
    { id: "pins", label: "STATE, RXD, TXD, GND, VCC, EN", kind: "pins", x: 0.4, y: 33.8, w: 15.3, h: 2.6, note: "Cross the serial wires over: the module's TXD goes to your board's RX and the module's RXD to your board's TX." },
  ],
  pins: [
    pin("STATE", "digital", "opt", "Output: low while no one is connected, high once a phone has paired.", { required: false }),
    pin("RXD", "uart", "rx", "Serial in, 3.3 V logic. From a 5 V board's TX, use a 1 kΩ and 2 kΩ divider.", { label: "RXD" }),
    pin("TXD", "uart", "tx", "Serial out, 3.3 V. A 5 V board reads it fine.", { label: "TXD" }),
    gnd("GND"),
    vcc("VCC", "3.6 V to 6 V. The on-board regulator makes the 3.3 V the core runs on."),
    pin("EN", "digital", "opt", "High at power-up: AT command mode. Also toggled by the button.", { label: "EN / KEY", required: false }),
  ],
  pinAt: name(header, "STATE", "RXD", "TXD", "GND", "VCC", "EN"),
  circuit: {
    blocks: [
      { id: "uart", label: "RXD / TXD", sub: "9600 baud default", kind: "pin", col: 0, row: 1, at: "RXD", note: "Plain serial, like the USB monitor." },
      { id: "bc", label: "BC417", sub: "Bluetooth 2.0 + EDR", kind: "ic", col: 1, row: 1, at: "bc417", note: "Radio, baseband and the whole Bluetooth stack in one chip." },
      { id: "ant", label: "PCB antenna", sub: "2.4 GHz", kind: "antenna", col: 2, row: 1, at: "antenna", note: "Printed copper; no part to lose." },
      { id: "phone", label: "Phone or PC", sub: "SPP, about 10 m", kind: "world", col: 3, row: 1, note: "Any Bluetooth serial terminal app. Android and Windows work; an iPhone cannot see it." },
      { id: "vcc", label: "VCC 3.6–6 V", kind: "power", col: 0, row: 0, at: "VCC", note: "About 30 mA searching, 8 to 10 mA once connected, up to 45 mA while pairing." },
      { id: "reg", label: "3.3 V regulator", kind: "regulator", col: 1, row: 0, at: "reg", note: "The core is a 3.3 V part." },
      { id: "flash", label: "Flash", sub: "stack, name, PIN", kind: "ic", col: 2, row: 0, at: "flash", note: "Settings survive power-off here." },
      { id: "en", label: "EN / KEY", sub: "AT mode", kind: "pin", col: 0, row: 2, at: "btn", note: "High at boot switches to command mode." },
      { id: "led", label: "Status LED", kind: "actuator", col: 1, row: 2, at: "led", note: "Blink patterns tell you the state." },
    ],
    links: [
      { from: "uart", to: "bc", kind: "data", label: "serial", both: true },
      { from: "bc", to: "ant", kind: "rf", both: true },
      { from: "ant", to: "phone", kind: "rf", label: "radio", both: true },
      { from: "vcc", to: "reg", kind: "power" },
      { from: "reg", to: "bc", kind: "power", label: "3.3 V" },
      { from: "flash", to: "bc", kind: "data", both: true },
      { from: "en", to: "bc", kind: "signal" },
      { from: "bc", to: "led", kind: "signal" },
    ],
    steps: [
      "Power on VCC is dropped to 3.3 V; the BC417 boots the Bluetooth stack from flash and blinks fast: discoverable as 'HC-05', PIN 1234.",
      "A phone or PC pairs and opens a Serial Port Profile link: a two-way wireless serial cable at 9600 baud.",
      "Whatever your board writes to TXD goes out over the antenna; whatever the phone sends arrives on RXD. Classic Bluetooth, up to about 10 m.",
      "Hold EN high at power-up for AT mode (38400 baud) to rename it, change the PIN, or make it a master that connects to another HC-05.",
    ],
  },
  facts: [
    { label: "Bluetooth", value: "2.0 + EDR, Classic" },
    { label: "Profile", value: "SPP (serial)" },
    { label: "Range", value: "about 10 m" },
    { label: "Defaults", value: "9600 baud, PIN 1234" },
    { label: "Supply", value: "3.6–6 V, 8–45 mA" },
    { label: "Logic", value: "3.3 V" },
  ],
  spec: {
    form: {
      mass: 5,
      mount: "jumpers",
      pitch: 2.54,
      note: "Six pins in a row on the 2.54 mm grid, so it plugs into a breadboard or takes jumper wires. There are no mounting holes.",
    },
    power: {
      supply: { min: 3.6, max: 6, typ: 5 },
      logic: 3.3,
      tolerant5V: false,
      draw: { idle: 8, active: 30, peak: 45 },
      interface: "UART 8N1, 9600 baud for data and 38400 baud in AT mode",
      note: "Pairing takes up to 45 mA. The core is Class 2, about +4 dBm.",
    },
    sourcing: { mpn: "HC-05 (ZS-040 carrier)", maker: "Generic (Guangzhou HC Information Technology core, CSR BC417 chip)", lifecycle: "generic", usd: [3, 8], note: "Many clones. Some ZS-040 boards carry slave-only HC-06 firmware." },
    limits: [
      "RXD is a 3.3 V input: a 5 V board's TX pin driven straight into it over-volts the chip. Use a 1 kΩ and 2 kΩ divider (about 3.3 V out).",
      "It is classic Bluetooth 2.0 only, so an iPhone cannot connect to it with the serial profile. Android and PCs can.",
      "Draws 30 to 45 mA while searching and pairing and 8 to 10 mA when connected: heavy for a coin cell.",
      "AT mode is 38400 baud but data mode is 9600 baud, and how EN behaves differs between clones.",
      "Real throughput is about 100 to 200 kbit/s and the range about 10 m.",
    ],
    upgrade: [
      { name: "HM-10 BLE module (CC2541)", why: "Bluetooth 4.0 Low Energy: iPhones and Android both connect. About 8 mA active and under 1 mA idle, with 3.3 V logic like the HC-05." },
      { part: "esp32", name: "ESP32 board", why: "Has both classic Bluetooth serial and BLE built in, so there is no extra module and no divider. 3.3 V logic and USB programming." },
    ],
    refs: [
      "https://protosupplies.com/product/hc-05-zs-040-bluetooth-module/",
      "https://www.martyncurrey.com/?p=1294",
    ],
  },
  animate: { lit: ["led"] },
  experiment: { title: "Phone remote", idea: "Pair with a Bluetooth serial app on an Android phone and toggle an LED with the letters you type; then stream a sensor reading back." },
  tags: ["hc-05", "hc05", "bluetooth", "serial", "wireless", "uart", "phone", "radio", "zs-040"],
});
