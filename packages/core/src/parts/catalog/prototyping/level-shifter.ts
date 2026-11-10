import { MATERIAL, board, definePart, gnd, name, pin, pinHeader, silk, smd, vcc } from "../../sdk";
import { sot23Tall, withId } from "../drivers/_switching";

const RED = "#c8201e";
const S = MATERIAL.silk;

// Two rows of six pins, 0.4 in apart: low-voltage side on top, high-voltage side underneath. Pins go down into a breadboard.
const lvRow = pinHeader(1.675, 1.585, 6, { style: "down" });
const hvRow = pinHeader(1.675, 11.745, 6, { style: "down" });
// Channel columns: pins 1, 2, 5 and 6 of each row (3 and 4 are the supply and ground).
const col = (i: number) => +(1.675 + i * 2.54).toFixed(3);
const channels = [0, 1, 4, 5];

export default definePart({
  id: "level-shifter",
  name: "4-channel logic level shifter",
  aka: ["BSS138 level shifter", "bi-directional level converter", "logic level converter", "BOB-12009", "3.3 V to 5 V converter"],
  group: "prototyping",
  rank: 8,
  summary: "Lets a 5 V board and a 3.3 V part talk without burning anything. Four wires, each both ways, with no direction pin. It is good for I2C, serial and slow SPI, and too slow for anything fast.",
  size: { w: 16.05, h: 13.33, d: 2.7 },
  solids: [
    board(16.05, 13.33, RED, { radius: 0.5 }),
    lvRow,
    hvRow,
    // One BSS138 per channel, with a 10 kΩ pull-up on each side of it.
    channels.map((i, n) => [
      withId(sot23Tall(col(i), 6.67, "J1"), `bss138-${n + 1}`),
      smd(col(i) - 0.8, 4.2, "r", "x"),
      smd(col(i) - 0.8, 9.1, "r", "x"),
    ]).flat(2),
    silk(8.025, 5.9, "LOGIC", 0.7, S, { anchor: "middle" }),
    silk(8.025, 7.0, "LEVEL", 0.7, S, { anchor: "middle" }),
    silk(8.025, 8.1, "SHIFT", 0.7, S, { anchor: "middle" }),
    ...["LV1", "LV2", "LV", "GND", "LV3", "LV4"].map((t, i) => silk(col(i), 3.0, t, 0.65, S, { anchor: "middle" })),
    ...["HV1", "HV2", "HV", "GND", "HV3", "HV4"].map((t, i) => silk(col(i), 10.4, t, 0.65, S, { anchor: "middle" })),
  ],
  features: [
    { id: "lv-row", label: "Low-voltage side (LV1, LV2, LV, GND, LV3, LV4)", kind: "pins", x: 0.405, y: 0.315, w: 15.24, h: 2.54, note: "Wire the 3.3 V part here. LV takes its supply, 1.8 V to 5 V, and the four channel pins are its signals." },
    { id: "hv-row", label: "High-voltage side (HV1, HV2, HV, GND, HV3, HV4)", kind: "pins", x: 0.405, y: 10.475, w: 15.24, h: 2.54, note: "Wire the 5 V board here. HV takes its supply, up to 10 V, and each HV pin is the same channel as the LV pin straight above it." },
    { id: "fets", label: "BSS138 MOSFETs", kind: "chip", x: 0.5, y: 5.2, w: 14.3, h: 2.9, note: "One tiny MOSFET per channel. Its gate is held at LV and its two ends are the LV and HV pins. Pull one side low and the MOSFET passes the low to the other side." },
    { id: "pullups", label: "10 kΩ pull-up resistors", kind: "other", x: 0.8, y: 3.8, w: 14.3, h: 5.8, note: "Eight of them: each channel pulls its LV side up to LV and its HV side up to HV. That is what makes the 'high' on each side." },
  ],
  pins: [
    vcc("HV", "The higher logic voltage, for example 5 V. It pulls up the HV side of every channel through 10 kΩ. Keep it at or above LV and steady.", { accepts: [1.8, 10] }),
    vcc("LV", "The lower logic voltage, for example 3.3 V. It holds the MOSFET gates and pulls up the LV side. Both HV and LV must be fed.", { accepts: [1.8, 5] }),
    gnd("GND", "Ground on the HV row. Both sides must share this ground."),
    gnd("GND2", "Ground on the LV row, the same copper as GND.", { required: false }),
    pin("HV1", "digital", "opt", "Channel 1, high-voltage side. The same signal as LV1.", { label: "HV1" }),
    pin("HV2", "digital", "opt", "Channel 2, high-voltage side.", { label: "HV2" }),
    pin("HV3", "digital", "opt", "Channel 3, high-voltage side.", { label: "HV3" }),
    pin("HV4", "digital", "opt", "Channel 4, high-voltage side.", { label: "HV4" }),
    pin("LV1", "digital", "opt", "Channel 1, low-voltage side. The same signal as HV1.", { label: "LV1" }),
    pin("LV2", "digital", "opt", "Channel 2, low-voltage side.", { label: "LV2" }),
    pin("LV3", "digital", "opt", "Channel 3, low-voltage side.", { label: "LV3" }),
    pin("LV4", "digital", "opt", "Channel 4, low-voltage side.", { label: "LV4" }),
  ],
  pinAt: {
    ...name(hvRow, "HV1", "HV2", "HV", "GND", "HV3", "HV4"),
    ...name(lvRow, "LV1", "LV2", "LV", "GND2", "LV3", "LV4"),
  },
  lab: { strips: [["GND", "GND2"]] },
  sim: {
    kind: "shifter",
    pairs: [
      ["HV1", "LV1"],
      ["HV2", "LV2"],
      ["HV3", "LV3"],
      ["HV4", "LV4"],
    ],
  },
  circuit: {
    blocks: [
      { id: "hv", label: "HV", sub: "e.g. 5 V", kind: "power", col: 0, row: 0, at: "HV", note: "The high reference. It pulls the HV side of each channel up through 10 kΩ." },
      { id: "lv", label: "LV", sub: "e.g. 3.3 V", kind: "power", col: 3, row: 0, at: "LV", note: "The low reference. It pulls the LV side up and holds every gate." },
      { id: "hvpin", label: "HV1–HV4", sub: "5 V side", kind: "pin", col: 0, row: 1, at: "hv-row", note: "Wire your 5 V board's pins here." },
      { id: "fet", label: "BSS138", sub: "one per channel", kind: "ic", col: 1, row: 1, at: "fets", note: "Its source is on the LV side, its drain on the HV side, and its gate at LV. A low on either side makes it conduct, so the low shows up on the other side too." },
      { id: "pull", label: "10 kΩ pull-ups", kind: "passive", col: 2, row: 0, at: "pullups", note: "Make the 'high' on each side. They are also why edges are slow." },
      { id: "lvpin", label: "LV1–LV4", sub: "3.3 V side", kind: "pin", col: 3, row: 1, at: "lv-row", note: "Wire your 3.3 V part's pins here." },
      { id: "gnd", label: "GND", kind: "ground", col: 1, row: 2, at: "GND", note: "Shared by both sides." },
    ],
    links: [
      { from: "hv", to: "pull", kind: "power" },
      { from: "lv", to: "pull", kind: "power" },
      { from: "hvpin", to: "fet", kind: "signal", label: "0 V or 5 V", both: true },
      { from: "fet", to: "lvpin", kind: "signal", label: "0 V or 3.3 V", both: true },
      { from: "fet", to: "gnd", kind: "ground" },
    ],
    steps: [
      "Both sides idle high: each pull-up holds its side at its own supply, 5 V on the HV side and 3.3 V on the LV side. The MOSFET's gate is at 3.3 V and its source is also at 3.3 V, so it is off.",
      "The 3.3 V part pulls its pin low. The MOSFET's gate is now 3.3 V above its source, so it turns on and drags the HV side low too.",
      "The 5 V board pulls its pin low. The MOSFET's body diode drags the LV side down, which turns the MOSFET on, and both sides are low.",
      "When either side lets go, its pull-up brings both sides back up, each to its own level. Because the high is made by a pull-up it rises slowly, which is why this suits I2C and serial but not fast signals.",
    ],
  },
  facts: [
    { label: "Channels", value: "4, both ways" },
    { label: "LV side", value: "1.8 V and up" },
    { label: "HV side", value: "up to 10 V" },
    { label: "Speed", value: "about 1 to 2 MHz at best" },
    { label: "Pull-ups", value: "10 kΩ on each side" },
    { label: "Size", value: "16 × 13 mm" },
  ],
  spec: {
    form: {
      mass: 0.7,
      mount: "breadboard",
      pitch: 2.54,
      note: "Two rows of six pins go straight into a breadboard (you solder the strips on). There are no mounting holes: the pins hold it.",
    },
    power: {
      supply: { min: 1.8, max: 10, typ: 5 },
      logic: 3.3,
      tolerant5V: true,
      draw: { idle: 0, active: 0.5 },
      interface: "4 bidirectional open-drain channels, no direction pin",
      note: "The supply range is the HV side's. LV works down to 1.8 V and must not be above HV. Each 10 kΩ pull-up takes up to about 0.5 mA while its line is held low.",
    },
    sourcing: { mpn: "BSS138", maker: "onsemi", lifecycle: "generic", usd: [0.5, 3.5], note: "SparkFun BOB-12009, Adafruit 757 and many clones. The circuit is the one in NXP application note AN10441." },
    limits: [
      "Slow. A 10 kΩ pull-up with 20 pF to 100 pF on the line gives a rise time of about 0.4 µs to 2.2 µs, so about 1 to 2 MHz is the most you get. Fast SPI at 10 MHz fails.",
      "It is not a driver. The 'high' comes from a pull-up of 0.33 to 0.5 mA, so it can't drive LEDs, loads or long cables.",
      "HV must stay at or above LV. Powering one side and not the other can pass current through the MOSFET's body diode.",
      "Both LV and HV must be fed. With LV off the gates never turn on and nothing is shifted.",
      "For 400 kHz I2C keep the bus under about 100 pF.",
      "Only four channels: a 5 V SPI or UART with six signals needs two boards. It also can't shift an analog voltage.",
    ],
    upgrade: [
      { name: "TXB0104 or TXS0108E auto-direction shifter", why: "Push-pull and fast, up to 100 Mbit/s, so it is good for SPI at several MHz. It does not suit open-drain I2C, and can fight a strong pull-up." },
      { name: "74LVC245 or 74AHCT125 buffer", why: "A buffer with driven outputs, tens of MHz. The best choice for SPI, UART and NeoPixel data, in one direction." },
      { name: "PCA9306 or PCA9517 I2C translator", why: "Built for I2C, with controlled edges and bus buffering." },
    ],
    refs: [
      "https://www.sparkfun.com/products/12009",
      "https://learn.sparkfun.com/tutorials/bi-directional-logic-level-converter-hookup-guide/all",
      "https://www.adafruit.com/product/757",
      "https://www.mouser.com/pdfDocs/AN10441.pdf",
      "https://www.rcscomponents.kiev.ua/datasheets/bss138-d.pdf",
    ],
  },
  experiment: { title: "Read a 3.3 V sensor from a 5 V Uno", idea: "Put 5 V on HV and 3.3 V on LV, a shared ground, and run the two I2C lines through channels 1 and 2 to a 3.3 V sensor." },
  tags: ["level shifter", "level converter", "bss138", "3.3 v", "5 v", "i2c", "bidirectional", "prototyping"],
});
