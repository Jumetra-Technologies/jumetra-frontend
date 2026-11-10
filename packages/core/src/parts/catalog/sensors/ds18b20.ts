import { MATERIAL, definePart, gnd, pin, silk, vcc, type Solid } from "../../sdk";

/**
 * A TO-92 DS18B20 lying on its back on the bench: the flat face with its
 * marking up, the half-round back down, three tinned legs leaving from the
 * base and running away along the bench.
 */

const R = 2.5; // radius of the round back
const CUT = 1.6; // from the axis to the flat face
const LEN = 4.8; // body length along the legs
const CX = 2.5;
const AXIS = R; // height of the axis above the bench: the round back just touches it
const FLAT = AXIS + CUT;
const LEG_X = [CX - 1.27, CX, CX + 1.27];
const LEG_END = 20.8;
const BLACK = "#1b1c1f";
const HALF_FLAT = Math.sqrt(R * R - CUT * CUT);
const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** The molded body, cut into thin strips across its width so the round back reads as round. */
function body(): Solid[] {
  const strips: Solid[] = [];
  const n = 30;
  const w = (2 * R) / n;
  for (let i = 0; i < n; i++) {
    const t = -R + (i + 0.5) * w;
    const reach = Math.sqrt(Math.max(0, R * R - t * t));
    const top = Math.min(CUT, reach);
    strips.push({ kind: "box", id: i === Math.floor(n / 2) ? "body" : undefined, x: r3(CX + t - w / 2), y: 0, w: r3(w + 0.01), h: LEN, d: r3(top + reach), z: r3(AXIS - reach), top: BLACK, side: "#101113", finish: "epoxy" });
  }
  return strips;
}

function leg(x: number): Solid {
  return {
    kind: "wire",
    points: [
      [x, LEN - 1, AXIS],
      [x, LEN + 1.2, AXIS - 0.05],
      [x, LEN + 4, 1.4],
      [x, LEN + 7, 0.45],
      [x, LEG_END, 0.3],
    ],
    r: 0.23,
    color: MATERIAL.tin,
    finish: "tin",
  };
}

export default definePart({
  id: "ds18b20",
  name: "DS18B20 temperature sensor",
  aka: ["Dallas temperature sensor", "1-Wire thermometer", "DS18B20 TO-92", "18B20"],
  group: "sensors",
  rank: 18,
  summary: "A thermometer in a transistor case. Digital, ±0.5 °C, and dozens can share one wire, each with its own serial number. The waterproof version is this chip in a steel probe.",
  size: { w: 5, h: LEG_END, d: r3(FLAT + 0.1) },
  solids: [
    body(),
    // The flat face: a slightly lighter plate with the marking printed on it.
    { kind: "box", x: r3(CX - HALF_FLAT), y: 0, w: r3(2 * HALF_FLAT), h: LEN, d: 0.06, z: FLAT, top: "#222327", finish: "epoxy" },
    silk(CX, 1.9, "DS18B20", 0.85, "#d5d8dd", { anchor: "middle", z: FLAT + 0.07, weight: 700 }),
    silk(CX, 3.4, "2415A4", 0.7, "#9aa0a8", { anchor: "middle", z: FLAT + 0.07 }),
    ...LEG_X.map(leg),
  ],
  features: [
    { id: "body", label: "TO-92 body", kind: "chip", x: 0, y: 0, w: 5, h: LEN, note: "The whole sensor is inside: a temperature core, a 12-bit converter and a 64-bit serial number burned in at the factory." },
    { id: "mark", label: "Marking", kind: "other", x: 0.7, y: 1.1, w: 3.6, h: 2.8, note: "DS18B20 and a date code on the flat face. Fakes often print the same thing, so test accuracy against a known thermometer." },
    { id: "gnd", label: "GND (left)", kind: "pin", x: LEG_X[0] - 0.4, y: LEN, w: 0.8, h: LEG_END - LEN, note: "Ground, with the flat face towards you and the legs pointing down." },
    { id: "dq", label: "DQ (middle)", kind: "pin", x: LEG_X[1] - 0.4, y: LEN, w: 0.8, h: LEG_END - LEN, note: "The 1-Wire data line. Add a 4.7 kΩ pull-up to VDD." },
    { id: "vdd", label: "VDD (right)", kind: "pin", x: LEG_X[2] - 0.4, y: LEN, w: 0.8, h: LEG_END - LEN, note: "3 V to 5.5 V. Tie it to GND for parasite power from DQ." },
  ],
  pins: [
    gnd("GND", "Ground. Pin 1, on the left with the flat face towards you."),
    pin("DQ", "data", "io", "1-Wire data; 4.7 kΩ pull-up to VDD. Many sensors can share this one wire.", { label: "DQ" }),
    vcc("VDD", "3 V to 5.5 V supply, up to 1.5 mA while converting. Or tie to GND for parasite power."),
  ],
  pinAt: { GND: { x: LEG_X[0], y: LEG_END }, DQ: { x: LEG_X[1], y: LEG_END }, VDD: { x: LEG_X[2], y: LEG_END } },
  circuit: {
    blocks: [
      { id: "host", label: "DQ", sub: "1-Wire, one pin", kind: "pin", col: 0, row: 1, at: "DQ", note: "Your board talks to every sensor on the wire through this single pin." },
      { id: "logic", label: "1-Wire logic", sub: "64-bit ROM address", kind: "ic", col: 1, row: 1, at: "body", note: "Decodes commands and answers only when its own address is called." },
      { id: "core", label: "Temperature core", sub: "12-bit, ±0.5 °C", kind: "sensor", col: 2, row: 1, at: "body", note: "A band-gap sensor and a counter that turns temperature into a 12-bit number." },
      { id: "world", label: "Surroundings", sub: "−55 to 125 °C", kind: "world", col: 3, row: 1, note: "Air, water, a heatsink: whatever the case touches." },
      { id: "pullup", label: "4.7 kΩ pull-up", sub: "yours, to VDD", kind: "passive", col: 0, row: 0, note: "Holds the wire high between pulses; without it nothing answers." },
      { id: "vdd", label: "VDD 3–5.5 V", kind: "power", col: 1, row: 0, at: "VDD", note: "Normal power; parasite mode steals it from the data line instead." },
      { id: "scratch", label: "Scratchpad", sub: "9 bytes + CRC", kind: "ic", col: 2, row: 0, at: "body", note: "Where the result waits until you read it." },
      { id: "gnd", label: "GND", kind: "ground", col: 1, row: 2, at: "GND", note: "Ground." },
    ],
    links: [
      { from: "host", to: "logic", kind: "data", label: "1 wire", both: true },
      { from: "world", to: "core", kind: "physical", label: "heat" },
      { from: "core", to: "scratch", kind: "data", label: "result" },
      { from: "scratch", to: "logic", kind: "data" },
      { from: "pullup", to: "host", kind: "power" },
      { from: "vdd", to: "logic", kind: "power" },
      { from: "logic", to: "gnd", kind: "ground" },
    ],
    steps: [
      "Your board resets the bus, then addresses this sensor by its unique 64-bit ROM code, so many can share one wire.",
      "Convert T starts a measurement; at 12 bits it takes 750 ms, less at lower resolution.",
      "The result lands in the scratchpad with a CRC; the host reads nine bytes and checks it. A reading of exactly 85.0 °C means it was read before the conversion finished.",
      "Temperature = raw ÷ 16 in °C. The waterproof version is this chip sealed in a steel probe on a cable.",
    ],
  },
  facts: [
    { label: "Range", value: "−55 to 125 °C" },
    { label: "Accuracy", value: "±0.5 °C (−10 to 85 °C)" },
    { label: "Resolution", value: "9–12 bit" },
    { label: "Supply", value: "3–5.5 V" },
    { label: "Interface", value: "1-Wire" },
    { label: "Package", value: "TO-92" },
  ],
  spec: {
    form: {
      mount: "breadboard",
      pitch: 1.27,
      note: "Three legs 1.27 mm apart. Spread them gently to fit a breadboard's 2.54 mm holes. The waterproof version is the same chip in a 6 mm steel tube on a cable.",
    },
    power: {
      supply: { min: 3, max: 5.5, typ: 5 },
      logic: 5,
      tolerant5V: true,
      draw: { idle: 0.00075, active: 1, peak: 1.5 },
      interface: "1-Wire, family code 0x28, 64-bit ROM; 750 ms per 12-bit reading",
      note: "Parasite mode (VDD tied to GND) takes its power from DQ and needs a strong pull-up within 10 µs of the convert command.",
    },
    sourcing: { mpn: "DS18B20", maker: "Analog Devices (Maxim)", lifecycle: "active", usd: [1, 4], note: "Counterfeits are common." },
    limits: [
      "±0.5 °C only between −10 °C and 85 °C; near −55 °C and 125 °C it is ±2 °C.",
      "A 12-bit reading takes 750 ms. Wait for it, or read it asynchronously.",
      "Before its first conversion it reads 85.0 °C. Treat that value as no reading.",
      "No pull-up, no data. Long wire runs need 4.7 kΩ or less and tidy wiring.",
      "Fake DS18B20 chips with different accuracy are widespread.",
    ],
    upgrade: [
      { name: "TMP117 (TI)", why: "±0.1 °C from −20 °C to 50 °C, 16 bits over I2C, about 3.5 µA at one reading a second. 3.3 V only, and no sharing one wire." },
      { name: "MAX31820 (Analog Devices)", why: "The same 1-Wire protocol and ±0.5 °C, for 3.3 V systems (1.7 V to 3.7 V)." },
    ],
    refs: ["https://manualmachine.com/dallassemiconductor/ds18b20/3912569-datasheet", "https://www.adafruit.com/product/381"],
  },
  experiment: { title: "Many probes, one pin", idea: "Read one sensor and print its address, then add a second on the same wire and show both temperatures side by side." },
  tags: ["ds18b20", "1-wire", "onewire", "temperature", "probe", "dallas", "waterproof", "sensor"],
});
