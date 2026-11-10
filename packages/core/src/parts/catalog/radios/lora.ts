import { MATERIAL, board, definePart, gnd, pin, silk, smd, vcc, type Solid } from "../../sdk";
import { COPPER } from "./_shared";

const TOP = 1;
const BLACK = "#15171b";

/** Pad centers: 2 mm pitch, eight a side. */
const rows = Array.from({ length: 8 }, (_, i) => 1 + i * 2);

/** The board outline: a 17 × 16 rectangle with a half-round notch for every castellated pad. */
function outline(): string {
  let d = "M 0 0 H 17";
  for (const y of rows) d += ` V ${y - 0.5} A 0.5 0.5 0 0 0 17 ${y + 0.5}`;
  d += " V 16 H 0";
  for (const y of [...rows].reverse()) d += ` V ${y + 0.5} A 0.5 0.5 0 0 0 0 ${y - 0.5}`;
  return `${d} Z`;
}

/** A castellated pad: gold land on top with the plated half-hole at the board edge. */
function pad(side: "left" | "right", y: number): Solid[] {
  const x = side === "left" ? 0 : 17;
  const s = side === "left" ? 1 : -1;
  const land = `M ${x} ${y - 0.6} L ${x + s * 1.5} ${y - 0.6} L ${x + s * 1.5} ${y + 0.6} L ${x} ${y + 0.6} L ${x} ${y + 0.5} A 0.5 0.5 0 0 ${side === "left" ? 0 : 1} ${x} ${y - 0.5} Z`;
  return [{ kind: "path", d: land, color: MATERIAL.gold, fill: MATERIAL.gold, width: 0.05, z: TOP }];
}

export default definePart({
  id: "lora",
  name: "LoRa Ra-02 (SX1278)",
  aka: ["LoRa module", "SX1278", "433 MHz LoRa", "Ai-Thinker Ra-02"],
  group: "radios",
  rank: 5,
  summary: "Kilometers on a coin cell's worth of power. Slow, tiny packets that survive below the noise floor: farm sensors, weather stations, anything far from a plug. The bare module solders to a carrier board or a breakout.",
  size: { w: 17, h: 16, d: 3.4 },
  solids: [
    board(17, 16, BLACK, { t: TOP, outline: outline() }),
    ...rows.flatMap((y) => [...pad("left", y), ...pad("right", 15 - (y - 1))]),
    // The steel shield can over the SX1278, its crystal and the RF switch.
    { kind: "box", id: "shield", x: 1.9, y: 0.9, w: 13.2, h: 10.8, d: 2.2, z: TOP, top: "#d4d7dc", side: "#8f949b", fill: MATERIAL.steel, radius: 0.4, finish: "metal" },
    { kind: "path", d: "M 2.6 1.6 H 14.4 V 11 H 2.6 Z", color: "#b5bac1", width: 0.12, z: TOP + 2.21 },
    // The IPEX (u.FL) antenna socket and the trace from it to the ANT pad.
    { kind: "path", d: "M 12.6 13.8 H 15.4 L 16 15", color: COPPER, width: 0.5, z: TOP },
    { kind: "box", id: "ufl", x: 11.2, y: 12.4, w: 3, h: 3, d: 1.2, z: TOP, top: MATERIAL.steel, side: "#8f949b", radius: 0.5, finish: "metal" },
    { kind: "cyl", cx: 12.7, cy: 13.9, r: 0.9, d: 0.2, z: TOP + 1.2, top: "#1b1c1f", finish: "plastic" },
    { kind: "cyl", cx: 12.7, cy: 13.9, r: 0.35, d: 0.45, z: TOP + 1.2, top: MATERIAL.gold, finish: "gold" },
    // A few passives for the RF matching, along the bottom strip.
    ...smd(3.2, 12.6, "c", "x", "0603", TOP),
    ...smd(5.6, 12.6, "r", "x", "0603", TOP),
    ...smd(8, 12.6, "c", "x", "0603", TOP),
    silk(3, 15.2, "Ra-02", 1, MATERIAL.silk, { weight: 700, z: TOP }),
    silk(8, 15.2, "433", 0.9, MATERIAL.silk, { z: TOP }),
  ],
  features: [
    { id: "shield", label: "Shielded radio (SX1278)", kind: "chip", x: 1.9, y: 0.9, w: 13.2, h: 10.8, note: "The LoRa transceiver, its 32 MHz crystal and the RF switch sit under this steel lid. 410 to 525 MHz; the Ra-02 ships tuned for 433 MHz." },
    { id: "ufl", label: "IPEX (u.FL) antenna socket", kind: "connector", x: 11.2, y: 12.4, w: 3, h: 3, note: "Clip the antenna lead here. Never transmit without an antenna attached: the output stage can be damaged." },
    { id: "pads-left", label: "Left pads: GND, MISO, MOSI, SCK, NSS, RESET, DIO5, GND", kind: "pins", x: 0, y: 0.3, w: 1.6, h: 15.4, note: "Eight castellated half-hole pads at 2 mm pitch. This is the SPI side." },
    { id: "pads-right", label: "Right pads: ANT, GND, DIO3, DIO4, 3.3 V, DIO0, DIO1, DIO2", kind: "pins", x: 15.4, y: 0.3, w: 1.6, h: 15.4, note: "Eight more pads, numbered from the bottom up. 3.3 V is the 13th pad; DIO0 is the packet interrupt." },
  ],
  pins: [
    vcc("VCC", "3.3 V, 1.8 V to 3.7 V. It takes about 120 mA while sending.", { label: "3.3V" }),
    gnd("GND", "Ground. Four pads are ground."),
    pin("NSS", "spi", "cs", "SPI chip select, active low."),
    pin("MOSI", "spi", "mosi", "SPI data into the radio."),
    pin("MISO", "spi", "miso", "SPI data out of the radio."),
    pin("SCK", "spi", "sck", "SPI clock."),
    pin("RST", "digital", "opt", "Reset, active low.", { label: "RST", required: false }),
    pin("DIO0", "digital", "opt", "Interrupt: packet sent or received.", { required: false }),
    pin("DIO1", "digital", "opt", "A second interrupt: timeouts and channel activity.", { required: false }),
  ],
  pinAt: {
    GND: { x: 0.8, y: rows[0] },
    MISO: { x: 0.8, y: rows[1] },
    MOSI: { x: 0.8, y: rows[2] },
    SCK: { x: 0.8, y: rows[3] },
    NSS: { x: 0.8, y: rows[4] },
    RST: { x: 0.8, y: rows[5] },
    VCC: { x: 16.2, y: 15 - 8 },
    DIO0: { x: 16.2, y: 15 - 10 },
    DIO1: { x: 16.2, y: 15 - 12 },
  },
  circuit: {
    blocks: [
      { id: "spi", label: "SPI + NSS", kind: "pin", col: 0, row: 1, at: "NSS", note: "Registers and the packet FIFO." },
      { id: "sx", label: "SX1278", sub: "LoRa modem", kind: "ic", col: 1, row: 1, at: "shield", note: "Spreads each symbol into a chirp; decodes chirps below the noise." },
      { id: "fe", label: "RF front end", sub: "PA + LNA + switch", kind: "ic", col: 2, row: 1, at: "shield", note: "Up to +20 dBm out; a sensitive receiver in." },
      { id: "ant", label: "Antenna", sub: "433 MHz, via IPEX", kind: "antenna", col: 3, row: 1, at: "ufl", note: "A quarter-wave whip or spring, about 17 cm of wire at 433 MHz." },
      { id: "far", label: "Nodes km away", sub: "−148 dBm sensitivity", kind: "world", col: 3, row: 2, note: "Other LoRa radios on the same frequency and settings." },
      { id: "dio", label: "DIO0", sub: "interrupt", kind: "pin", col: 0, row: 0, at: "DIO0", note: "Goes high when a packet has gone out or come in." },
      { id: "xtal", label: "32 MHz crystal", kind: "passive", col: 1, row: 0, at: "shield", note: "Frequency reference; both ends must agree within a few kHz." },
      { id: "vcc", label: "3.3 V", sub: "120 mA sending", kind: "power", col: 0, row: 2, at: "VCC", note: "Sleeps at about 1 µA between packets." },
    ],
    links: [
      { from: "spi", to: "sx", kind: "data", both: true },
      { from: "sx", to: "fe", kind: "rf", both: true },
      { from: "fe", to: "ant", kind: "rf", both: true },
      { from: "ant", to: "far", kind: "rf", label: "LoRa chirps", both: true },
      { from: "sx", to: "dio", kind: "signal", label: "done" },
      { from: "xtal", to: "sx", kind: "signal" },
      { from: "vcc", to: "sx", kind: "power", label: "12 mA receive" },
    ],
    steps: [
      "Your board writes the frequency, spreading factor and bandwidth into the SX1278 over SPI and hands it a payload of up to 255 bytes.",
      "The modem spreads each symbol into a chirp that sweeps across the bandwidth; a receiver can pick chirps out well below the noise floor.",
      "The front end amplifies it (up to +20 dBm) and the antenna radiates at 433 MHz; DIO0 goes high when the packet has left, or when one arrives.",
      "Slow and far: a few hundred bits per second reach several kilometers in the open, and the chip sleeps at about 1 µA between packets.",
    ],
  },
  facts: [
    { label: "Band", value: "410–525 MHz (433 MHz)" },
    { label: "Modulation", value: "LoRa chirp spread spectrum" },
    { label: "Sensitivity", value: "−148 dBm" },
    { label: "Power", value: "up to +20 dBm" },
    { label: "Range", value: "3–10 km line of sight" },
    { label: "Supply", value: "1.8–3.7 V, 120 mA sending" },
  ],
  spec: {
    form: {
      mass: 2,
      mount: "solder",
      pitch: 2,
      note: "Sixteen castellated pads at 2 mm pitch, 17 × 16 mm. Not breadboard friendly: solder it to a carrier board, a breakout with a header, or an adapter.",
    },
    power: {
      supply: { min: 1.8, max: 3.7, typ: 3.3 },
      logic: 3.3,
      tolerant5V: false,
      draw: { idle: 0.0002, active: 12, peak: 120 },
      interface: "SPI mode 0 with NSS, RESET and the DIO interrupts",
      note: "Receive takes about 12 mA and sending at +20 dBm about 120 mA. Sleep is under 1 µA.",
    },
    sourcing: { mpn: "Ra-02", maker: "Ai-Thinker, with Semtech's SX1278", lifecycle: "active", usd: [3, 7], note: "Sold bare and on breakouts. Check the pin list of the breakout, which is not the bare module's order." },
    limits: [
      "3.3 V only and no pin is 5 V tolerant: a 5 V Arduino needs level shifters on SCK, MOSI, NSS and RESET, or use a 3.3 V board.",
      "It takes about 120 mA while sending. An Arduino's 3.3 V pin gives about 50 mA and sags: add 100 µF near the module or use its own regulator.",
      "The 2 mm castellated pads do not fit a breadboard.",
      "Data rate is only about 0.3 to 37 kbps, and the 433 MHz band has duty-cycle limits (1 % in much of Europe).",
      "Powering it and sending without an antenna can damage it. The IPEX socket is fragile.",
    ],
    upgrade: [
      { part: "esp32", name: "ESP32 board with LoRa (TTGO LoRa32, Heltec)", why: "A 3.3 V microcontroller, regulated supply and antenna come on one board, so there is no level shifting and no loose module." },
      { name: "SX1262 module (Ra-01SH, E22)", why: "Receives at about 4.6 mA instead of 12 mA, sends up to +22 dBm and has better sensitivity." },
    ],
    refs: [
      "https://www.smart-prototyping.com/LoRa-SX1278-10KM-433M-long-range-wireless-module-Ra-02",
      "https://shillehtek.com/blogs/shillehtek-product-manuals/sx1278-lora-433mhz-transceiver-module-manual",
      "https://docs.ai-thinker.com/_media/lora/docs/ra-02_datasheet_v1.1.pdf",
    ],
  },
  experiment: { title: "Long-range ping", idea: "Two nodes: send a counter every 5 s and print the signal strength on the other; walk away with one and find where the link drops." },
  tags: ["lora", "ra-02", "sx1278", "433mhz", "long range", "spi", "radio", "wireless", "iot"],
});
