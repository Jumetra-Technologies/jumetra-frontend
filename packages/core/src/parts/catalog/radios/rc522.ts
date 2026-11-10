import { MATERIAL, board, crystal, definePart, gnd, name, pin, pinHeader, silk, smd, vcc, type Solid } from "../../sdk";
import { COPPER, qfn } from "./_shared";

const TOP = 1;
const BLUE = "#1b4fa8";

const header = pinHeader(11.11, 57.2, 8, { style: "up", z: TOP });

/** The printed antenna coil: a rectangular spiral of copper, four turns. */
function coil(x: number, y: number, w: number, h: number, turns: number, gap: number): Solid {
  let [left, top, right, bottom] = [x, y, x + w, y + h];
  let d = `M ${left} ${top}`;
  for (let i = 0; i < turns; i++) {
    d += ` L ${right} ${top} L ${right} ${bottom} L ${left} ${bottom} L ${left} ${top + gap}`;
    left += gap;
    top += gap;
    right -= gap;
    bottom -= gap;
    d += ` L ${left} ${top}`;
  }
  return { kind: "path", d, color: COPPER, width: 0.6, z: TOP };
}

export default definePart({
  id: "rc522",
  name: "RC522 RFID reader",
  aka: ["MFRC522", "RFID-RC522", "RFID reader", "NFC reader 13.56 MHz", "card reader"],
  group: "radios",
  rank: 4,
  summary: "The blue card reader from every RFID kit. Hold a card or key fob within a few centimeters of the printed coil and it reads the tag's ID. Runs from 3.3 V over SPI.",
  size: { w: 40, h: 60, d: 9.5 },
  solids: [
    board(40, 60, BLUE, { radius: 0.5, t: TOP }),
    // The antenna: a big rectangular coil printed round the far half of the board.
    coil(2.5, 2.5, 35, 32, 5, 1.2),
    qfn(9.5, 43, 5, "MFRC522", { id: "chip", z: TOP, perSide: 8, labelSize: 0.8 }),
    crystal(16, 40.8, "27.12", 8.6, 3.6, TOP),
    // The matching network round the chip: inductors and capacitors.
    ...smd(4.4, 38.6, "c", "x", "0603", TOP),
    ...smd(7.2, 38.6, "r", "x", "0603", TOP),
    ...smd(12.4, 38.6, "c", "x", "0603", TOP),
    ...smd(4.2, 42.2, "c", "y", "0603", TOP),
    ...smd(4.2, 45.4, "r", "y", "0603", TOP),
    ...smd(14.6, 45.6, "c", "x", "0603", TOP),
    ...smd(17.4, 45.6, "r", "x", "0603", TOP),
    ...smd(20.6, 45.6, "c", "x", "0603", TOP),
    ...smd(7.4, 48.2, "c", "x", "0603", TOP),
    ...smd(10.4, 48.2, "r", "x", "0603", TOP),
    ...smd(13.4, 48.2, "c", "x", "0603", TOP),
    { kind: "box", x: 26, y: 38, w: 3.2, h: 3.2, d: 1.6, z: TOP, top: "#2a2c31", side: "#111214", radius: 0.4, finish: "plastic", label: { text: "2R2", size: 0.8, color: "#9aa0a6" } },
    { kind: "box", x: 30.5, y: 38, w: 3.2, h: 3.2, d: 1.6, z: TOP, top: "#2a2c31", side: "#111214", radius: 0.4, finish: "plastic", label: { text: "2R2", size: 0.8, color: "#9aa0a6" } },
    silk(29.5, 46.5, "RC522", 3, MATERIAL.silk, { anchor: "middle", weight: 700, z: TOP }),
    silk(29.5, 49.6, "13.56 MHz", 1.3, MATERIAL.silk, { anchor: "middle", z: TOP }),
    header,
    ...["SDA", "SCK", "MOSI", "MISO", "IRQ", "GND", "RST", "3.3V"].map((label, i) => silk(11.11 + i * 2.54 + 0.35, 55.4, label, 0.95, MATERIAL.silk, { rotate: -90, z: TOP })),
  ],
  features: [
    { id: "coil", label: "Antenna coil", kind: "antenna", x: 2, y: 2, w: 36, h: 33, note: "Copper tracks in a spiral: a loop antenna for 13.56 MHz. It powers a passive card by induction and talks to it. Read range is about 3 to 5 cm; metal behind or near it shortens that." },
    { id: "chip", label: "MFRC522 chip", kind: "chip", x: 7, y: 40.5, w: 5, h: 5, note: "NXP's reader chip. It handles the ISO 14443A card protocol and speaks SPI (or I2C and UART) to your board." },
    { id: "xtal", label: "27.12 MHz crystal", kind: "chip", x: 16, y: 40.8, w: 8.6, h: 3.6, note: "Twice the carrier. The chip divides it down to the 13.56 MHz field." },
    { id: "match", label: "Matching network", kind: "other", x: 3.8, y: 37.8, w: 24, h: 11.4, note: "Inductors and capacitors that tune the coil to resonate at 13.56 MHz." },
    { id: "pins", label: "SDA, SCK, MOSI, MISO, IRQ, GND, RST, 3.3V", kind: "pins", x: 9.8, y: 55.9, w: 20.3, h: 2.6, note: "Eight pins in one row. SDA is the SPI chip select. Power is 3.3 V; the header is not keyed, so check the order before you wire it." },
  ],
  pins: [
    pin("SDA", "spi", "cs", "SPI chip select (SS), active low. On the I2C setting it is the data line.", { label: "SDA (SS)" }),
    pin("SCK", "spi", "sck", "SPI clock."),
    pin("MOSI", "spi", "mosi", "SPI data into the reader."),
    pin("MISO", "spi", "miso", "SPI data out of the reader."),
    pin("IRQ", "digital", "opt", "Interrupt: a card came into range. Most sketches leave it unwired.", { required: false }),
    gnd("GND"),
    pin("RST", "digital", "drive", "Reset, low to reset. Tie it to an output the library toggles."),
    vcc("VCC", "3.3 V only, 2.5 V to 3.3 V. 5 V can destroy the chip.", { label: "3.3V" }),
  ],
  pinAt: name(header, "SDA", "SCK", "MOSI", "MISO", "IRQ", "GND", "RST", "VCC"),
  circuit: {
    blocks: [
      { id: "spi", label: "SPI", sub: "SDA, SCK, MOSI, MISO", kind: "pin", col: 0, row: 1, at: "SDA", note: "Commands and card data, up to 10 Mbit/s." },
      { id: "chip", label: "MFRC522", sub: "reader chip", kind: "ic", col: 1, row: 1, at: "chip", note: "Drives the coil, listens for the card and decodes the answer." },
      { id: "xtal", label: "27.12 MHz crystal", kind: "passive", col: 1, row: 0, at: "xtal", note: "The clock the carrier is made from." },
      { id: "match", label: "Matching network", kind: "passive", col: 2, row: 0, at: "match", note: "Tunes the coil to 13.56 MHz." },
      { id: "coil", label: "Antenna coil", sub: "13.56 MHz", kind: "antenna", col: 2, row: 1, at: "coil", note: "The loop that makes the magnetic field." },
      { id: "tag", label: "Card or key fob", sub: "3–5 cm away", kind: "world", col: 3, row: 1, note: "A passive tag: it has no battery and lives on the reader's field." },
      { id: "vcc", label: "3.3 V", sub: "13 to 26 mA", kind: "power", col: 0, row: 0, at: "VCC", note: "About 13 mA idle and 26 mA while the field is on and reading." },
      { id: "rst", label: "RST / IRQ", kind: "pin", col: 0, row: 2, at: "RST", note: "RST resets the chip; IRQ says a card arrived." },
    ],
    links: [
      { from: "spi", to: "chip", kind: "data", both: true },
      { from: "xtal", to: "chip", kind: "signal", label: "clock" },
      { from: "chip", to: "match", kind: "rf" },
      { from: "match", to: "coil", kind: "rf" },
      { from: "coil", to: "tag", kind: "rf", label: "13.56 MHz field", both: true },
      { from: "vcc", to: "chip", kind: "power", label: "26 mA" },
      { from: "rst", to: "chip", kind: "signal" },
    ],
    steps: [
      "Your board sends a command over SPI and the MFRC522 switches its 13.56 MHz field on through the coil.",
      "A card in the field picks up power from it, with no battery of its own, and switches its load to answer.",
      "The chip hears that change in the field, decodes the card's ID and any data you asked for, and your board reads it back over SPI.",
      "Range is about 3 to 5 cm. A bigger coil or a metal-free spot helps; metal behind the board detunes it.",
    ],
  },
  facts: [
    { label: "Frequency", value: "13.56 MHz" },
    { label: "Tags", value: "MIFARE, NTAG (ISO 14443A)" },
    { label: "Range", value: "3–5 cm" },
    { label: "Interface", value: "SPI (also I2C, UART)" },
    { label: "Supply", value: "3.3 V, 13–26 mA" },
    { label: "Size", value: "60 × 40 mm" },
  ],
  spec: {
    form: {
      mass: 9,
      mount: "jumpers",
      pitch: 2.54,
      note: "A row of eight pins on the 2.54 mm grid, usually soldered on by you. There are no mounting holes; most builds stick it behind a plastic panel.",
    },
    power: {
      supply: { min: 2.5, max: 3.6, typ: 3.3 },
      logic: 3.3,
      tolerant5V: false,
      draw: { idle: 13, active: 26, peak: 26 },
      interface: "SPI up to 10 Mbit/s (the board is wired for SPI); the chip also does I2C and UART",
      note: "13 mA with the antenna off, 26 mA with the field on. Power-down is about 10 µA.",
    },
    sourcing: { mpn: "MFRC522", maker: "NXP Semiconductors (module: generic)", lifecycle: "generic", usd: [2, 5], note: "Kits include a MIFARE Classic 1K card and a key fob. Some 'magic' tags are clones." },
    limits: [
      "It is a 3.3 V part. A 5 V supply on the 3.3V pin destroys it.",
      "The inputs are widely run straight from 5 V boards such as the Uno, and it often works, but the chip is not rated for it. A divider or level shifter on SDA, SCK and MOSI is the safe way.",
      "Range is only about 3 to 5 cm (1 to 3 cm for a small fob).",
      "It reads only 13.56 MHz ISO 14443A tags, not 125 kHz EM4100 cards.",
      "MIFARE Classic's security is broken, so do not use the card ID alone to guard something that matters.",
    ],
    upgrade: [
      { name: "PN532 NFC module", why: "Reads and writes more tag types (ISO 14443 A and B, FeliCa) and emulates a card, with I2C, SPI or UART. The common blue board takes 5 V and has its own regulator. Range is about 5 cm." },
      { name: "RDM6300 125 kHz reader", why: "For the cheap 125 kHz EM4100 ID cards: UART output, a 5 V supply and about 5 to 8 cm of range." },
    ],
    refs: [
      "https://components101.com/node/517",
      "https://shillehtek.com/blogs/shillehtek-product-manuals/rc522-rfid-reader-writer-module-13-56mhz-spi-kit-for-arduino-manual",
    ],
  },
  sim: { kind: "output" },
  experiment: { title: "Door tag", idea: "Read a card's ID, store it in your sketch, and light a green LED for that card and a red one for any other." },
  tags: ["rc522", "mfrc522", "rfid", "nfc", "card reader", "13.56mhz", "spi", "mifare", "key fob"],
});
