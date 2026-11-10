import { MATERIAL, board, definePart, gnd, name, pin, pinHeader, silk, smd, smdLed, terminalBlock, vcc, type PinInfo, type Solid } from "../../sdk";
import { gullWing, pinOneDot } from "./_chips";
import { emptyFootprint, solderJumper } from "./_switching";

const BLUE = "#1e5fa8";
const TOP = 1.6;
const S = MATERIAL.silk;

// Sixteen servo plugs: four blocks of four columns, each column a signal, a V+ and a ground pin (rows run along x).
const SIG_Y = 19.0;
const BLOCK_X = [8.4, 21.1, 33.8, 46.5];
const blocks = BLOCK_X.map((x) => pinHeader(x, SIG_Y, 4, { rows: 3, style: "up" }));
// The two six-pin I2C headers, wired in parallel so boards can be chained: one in, one out.
const busIn = pinHeader(2.0, 6.9, 6, { dir: "y", style: "up" });
const busOut = pinHeader(60.4, 6.9, 6, { dir: "y", style: "up" });
const power = terminalBlock(9.5, 0.3, 2, { mouth: "top", pitch: 5.08 });

const channelX = (n: number) => BLOCK_X[Math.floor(n / 4)] + (n % 4) * 2.54;

/** One 220 Ω resistor array: the four resistors that sit in series with a block's four outputs. */
const array = (cx: number, cy: number): Solid[] => [
  { kind: "box", x: cx - 2.4, y: cy - 0.8, w: 4.8, h: 1.6, d: 0.5, z: TOP, top: "#17181b", finish: "epoxy", radius: 0.08, label: { text: "221", size: 0.7, color: "#a3a7ad" } },
  { kind: "box", x: cx - 2.42, y: cy - 0.82, w: 0.5, h: 1.64, d: 0.52, z: TOP, top: MATERIAL.tin, finish: "tin", radius: 0.05 },
  { kind: "box", x: cx + 1.92, y: cy - 0.82, w: 0.5, h: 1.64, d: 0.52, z: TOP, top: MATERIAL.tin, finish: "tin", radius: 0.05 },
];

const outputs = Array.from({ length: 16 }, (_, i) => `PWM${i}`);

const pinTable: PinInfo[] = [
  { name: "VCC", role: "power", note: "Logic supply, 3 V to 5 V. It sets the level of the outputs. Never join it to V+." },
  { name: "GND", role: "ground", note: "Ground, shared by the logic and the servos." },
  { name: "SDA", role: "i2c", note: "I2C data." },
  { name: "SCL", role: "i2c", note: "I2C clock. Both I2C lines have 10 kΩ pull-ups to VCC on the board." },
  { name: "OE", role: "digital", note: "Output enable, active low. Pulled low on the board, so the outputs are on. Drive it high to switch all 16 off at once." },
  { name: "V+", role: "power", note: "Servo power, on the screw terminal. 5 V to 6 V is usual. It runs straight to every servo plug and the chip does not use it." },
  { name: "PWM0–PWM15", role: "pwm", note: "Sixteen servo signal pins, each through a 220 Ω resistor. One shared frequency, 12-bit steps. Each can sink 25 mA and source 10 mA." },
];

export default definePart({
  id: "pca9685",
  name: "PCA9685 16-channel servo driver",
  aka: ["PCA9685", "16-channel PWM servo driver", "Adafruit 815", "16 channel 12-bit PWM driver"],
  group: "drivers",
  rank: 7,
  summary: "Gives your board sixteen more PWM outputs over two wires, laid out as sixteen servo plugs. It sends the signals; the servos' power comes in separately on the screw terminal.",
  size: { w: 62.5, h: 25.4, d: 12.1 },
  solids: [
    board(62.5, 25.4, BLUE, {
      radius: 1,
      holes: [
        { x: 3, y: 3, d: 2.5 },
        { x: 59.5, y: 3, d: 2.5 },
        { x: 3, y: 22.4, d: 2.5 },
        { x: 59.5, y: 22.4, d: 2.5 },
      ],
    }),
    ...blocks,
    busIn,
    busOut,
    power,
    // The chip: a 28-pin TSSOP, 0.65 mm between legs.
    gullWing(31, 8, 14, 0.65, { length: 9.7, width: 4.4, height: 1.1, span: 6.4 }, { text: "PCA9685", size: 1.0 }, { id: "chip" }),
    pinOneDot(26.6, 6.6, TOP + 1.22),
    // The 220 Ω resistors, in four arrays, one in front of each block of servo pins.
    BLOCK_X.flatMap((x) => array(x + 3.81, 14.6)),
    // The footprint for the big capacitor on V+. Adafruit leaves it empty.
    emptyFootprint(22.4, 3.4),
    emptyFootprint(22.4, 6.2),
    // Pull-ups, filter capacitors and the power LED.
    smd(14.6, 11.2, "r", "x"),
    smd(14.6, 12.7, "r", "x"),
    smd(24.0, 10.4, "c", "y"),
    smd(37.4, 10.2, "c", "y"),
    smd(28.2, 12.8, "c", "x"),
    smd(33.6, 12.8, "r", "x"),
    smdLed(18.8, 12.0, "#3ddc68", "led-pwr"),
    // Six address solder jumpers, all open: the address is 0x40.
    [0, 1, 2, 3, 4, 5].flatMap((i) => solderJumper(40.5 + i * 2.3, 5.4, "y")),
    // Printing.
    silk(31, 12.8, "16-Channel 12-bit PWM/Servo Driver", 1.0, S, { anchor: "middle" }),
    silk(12.04, 10.0, "V+", 0.9, S, { anchor: "middle" }),
    silk(17.12, 10.0, "GND", 0.9, S, { anchor: "middle" }),
    silk(4.2, 7.5, "GND", 0.8, S),
    silk(4.2, 10.04, "OE", 0.8, S),
    silk(4.2, 12.58, "SCL", 0.8, S),
    silk(4.2, 15.12, "SDA", 0.8, S),
    silk(4.2, 17.66, "VCC", 0.8, S),
    silk(4.2, 20.2, "V+", 0.8, S),
    silk(58.5, 7.5, "GND", 0.8, S, { anchor: "end" }),
    silk(58.5, 10.04, "OE", 0.8, S, { anchor: "end" }),
    silk(58.5, 12.58, "SCL", 0.8, S, { anchor: "end" }),
    silk(58.5, 15.12, "SDA", 0.8, S, { anchor: "end" }),
    silk(58.5, 17.66, "VCC", 0.8, S, { anchor: "end" }),
    silk(58.5, 20.2, "V+", 0.8, S, { anchor: "end" }),
    ["A0", "A1", "A2", "A3", "A4", "A5"].map((t, i) => silk(40.5 + i * 2.3, 8.6, t, 0.75, S, { anchor: "middle" })),
    outputs.map((_, i) => silk(channelX(i), 17.1, String(i), 0.9, S, { anchor: "middle" })),
    silk(6.5, SIG_Y + 0.35, "PWM", 0.7, S, { anchor: "end" }),
    silk(6.5, SIG_Y + 2.89, "V+", 0.7, S, { anchor: "end" }),
    silk(6.5, SIG_Y + 5.43, "GND", 0.7, S, { anchor: "end" }),
  ],
  features: [
    { id: "chip", label: "PCA9685 chip", kind: "chip", x: 25.5, y: 4.9, w: 11, h: 6.2, note: "Counts 4096 steps in every cycle, one pulse width for each output, and keeps doing it on its own after your board sends the numbers over I2C." },
    { id: "servos", label: "Servo plugs, 16 columns", kind: "pins", x: 7.13, y: 17.73, w: 47.28, h: 7.62, note: "Each column is signal on top, V+ in the middle and ground at the bottom edge. A servo plug goes on with its brown or black wire toward the board's edge." },
    { id: "power", label: "V+ terminal", kind: "power", x: 9.5, y: 0.3, w: 10.16, h: 7.6, note: "The servos' power goes in here, 5 V to 6 V. It is joined to the V+ pin of every plug. This terminal has reverse-polarity protection; the plug pins do not." },
    { id: "bus-in", label: "I2C header (in)", kind: "pins", x: 0.73, y: 5.63, w: 2.54, h: 15.24, note: "GND, OE, SCL, SDA, VCC and V+. Wire your board here." },
    { id: "bus-out", label: "I2C header (chain out)", kind: "pins", x: 59.13, y: 5.63, w: 2.54, h: 15.24, note: "The same six pins wired in parallel, to chain another board on. Up to 62 boards share one bus." },
    { id: "address", label: "Address jumpers A0–A5", kind: "other", x: 39.3, y: 3.6, w: 13.5, h: 5.4, note: "Open pads read 0. Bridge one with solder to change the I2C address from 0x40, so more than one board can share the bus." },
    { id: "resistors", label: "220 Ω resistors", kind: "other", x: 9.5, y: 13.8, w: 43.6, h: 1.6, note: "One in series with each output. They protect the chip and the servo's input if the two are ever wired wrong." },
    { id: "cap", label: "Capacitor footprint", kind: "other", x: 20.8, y: 1.8, w: 3.2, h: 6, note: "Left empty. Solder in a 100 µF or bigger capacitor for each servo you run, so a servo starting doesn't dip the supply." },
    { id: "led-pwr", label: "Power LED", kind: "led", x: 18.8, y: 12, w: 1.6, h: 0.8, note: "Lit while the logic supply is up." },
  ],
  pins: [
    vcc("VCC", "Logic supply, 3 V to 5 V. It sets the level of the outputs and of the I2C pull-ups. Never join it to V+."),
    gnd("GND", "Ground. Join it to your board's GND and the servo supply's ground."),
    pin("SDA", "i2c", "sda", "I2C data."),
    pin("SCL", "i2c", "scl", "I2C clock."),
    pin("OE", "digital", "opt", "Output enable, active low. Pulled low on the board, so leave it open and the outputs run. High switches all 16 off.", { required: false }),
    vcc("VPLUS", "Servo power on the screw terminal, 5 V to 6 V (up to about 12 V if every servo allows it). The chip does not use it. It is joined to the V+ pin of every servo plug.", { label: "V+", accepts: [5, 12], required: false }),
    ...outputs.map((id) => pin(id, "pwm", "opt", `Servo signal ${id.slice(3)}. 12-bit PWM, shared frequency, 220 Ω in series. It can sink 25 mA and source 10 mA.`, { label: id })),
  ],
  pinTable,
  pinAt: {
    ...name(busIn, "GND", "OE", "SCL", "SDA", "VCC", null),
    ...name(power, "VPLUS", null),
    ...Object.fromEntries(outputs.map((id, i) => [id, { x: +channelX(i).toFixed(2), y: SIG_Y }])),
  },
  sim: { kind: "expander", outputs },
  circuit: {
    blocks: [
      { id: "i2c", label: "SDA, SCL", sub: "from your board", kind: "pin", col: 0, row: 0, at: "SDA", note: "Two wires carry every command. The board answers at address 0x40 until you bridge an address jumper." },
      { id: "vcc", label: "VCC", sub: "logic supply", kind: "power", col: 0, row: 1, at: "VCC", note: "3 V to 5 V. Powers the chip and sets the outputs' level." },
      { id: "chip", label: "PCA9685", sub: "16 PWM counters", kind: "ic", col: 1, row: 0, at: "chip", note: "A 12-bit counter and sixteen comparators. Each output has its own on and off time, so it keeps its pulse with no help from your board." },
      { id: "res", label: "220 Ω", sub: "one per output", kind: "passive", col: 2, row: 0, at: "resistors", note: "Limits the current if an output is shorted." },
      { id: "out", label: "PWM0–PWM15", sub: "signal pins", kind: "connector", col: 3, row: 0, at: "servos", note: "The top pin of each servo plug." },
      { id: "vplus", label: "V+", sub: "servo supply", kind: "power", col: 2, row: 1, at: "power", note: "Does not go through the chip. It runs on the board's copper straight to the middle pin of every plug." },
      { id: "servo", label: "Servos", kind: "world", col: 3, row: 1, note: "Each one pulls its own current from V+: a few hundred mA moving, over 1 A under load." },
      { id: "gnd", label: "GND", kind: "ground", col: 1, row: 2, at: "GND", note: "Shared by the logic, the servos and your board." },
    ],
    links: [
      { from: "i2c", to: "chip", kind: "data", label: "I2C", both: true },
      { from: "vcc", to: "chip", kind: "power" },
      { from: "chip", to: "res", kind: "signal", label: "PWM" },
      { from: "res", to: "out", kind: "signal" },
      { from: "out", to: "servo", kind: "signal", label: "pulse width" },
      { from: "vplus", to: "servo", kind: "power", label: "5–6 V" },
      { from: "chip", to: "gnd", kind: "ground" },
    ],
    steps: [
      "Your board sends a number over I2C for one channel: how far into each cycle to switch on and off.",
      "The chip keeps its own clock and counts 4096 steps in each cycle. The output goes high at the 'on' count and low at the 'off' count, over and over, with no more help from your board.",
      "The pulse goes through a 220 Ω resistor to the signal pin of the servo plug. At 50 Hz a pulse of 1 ms to 2 ms turns the servo's horn from one end to the other.",
      "The servo's power does not come from the chip. It comes from the V+ terminal through the middle pin, so the supply must be able to give every servo's current.",
    ],
  },
  facts: [
    { label: "Outputs", value: "16, 12-bit PWM" },
    { label: "Bus", value: "I2C, address 0x40 to 0x7F" },
    { label: "Frequency", value: "one for all, 24 to 1526 Hz" },
    { label: "Logic supply", value: "3 V to 5 V" },
    { label: "Per pin", value: "25 mA sink, 10 mA source" },
    { label: "Size", value: "62.5 × 25.4 mm" },
  ],
  spec: {
    form: {
      mass: 9,
      mount: "jumpers",
      pitch: 2.54,
      holes: [
        { x: 3, y: 3, d: 2.5 },
        { x: 59.5, y: 3, d: 2.5 },
        { x: 3, y: 22.4, d: 2.5 },
        { x: 59.5, y: 22.4, d: 2.5 },
      ],
      note: "Servo plugs go straight onto the pins. Your board connects to the six-pin header with jumper wires; the servo supply goes under the screw terminal.",
    },
    power: {
      supply: { min: 3, max: 5.5, typ: 5 },
      logic: 3.3,
      tolerant5V: true,
      draw: { idle: 6, active: 10 },
      interface: "I2C, 7-bit address 0x40 to 0x7F, up to 1 MHz",
      note: "The chip itself takes about 6 mA (10 mA at most, NXP datasheet). Servo current comes from V+ and is the servos' own.",
    },
    sourcing: { mpn: "PCA9685PW", maker: "NXP", lifecycle: "active", usd: [3, 15], note: "The Adafruit board costs about $15. Clones with the same pinout cost $3 to $6." },
    limits: [
      "It sends signals only. Each output sources 10 mA and sinks 25 mA through 220 Ω, so it can light an LED but can't drive a motor or power a servo.",
      "All 16 outputs share one frequency, 24 to 1526 Hz. A servo wants about 50 Hz and LEDs want much more, so don't mix them on one board.",
      "The board doesn't limit or regulate servo power. Sixteen servos stalling at 1 A each would need 16 A, far more than the terminal and traces carry, and one shared supply sags when several servos move at once.",
      "At 50 Hz one count is 4.88 µs, about 0.4° on a typical servo: coarser than some digital servos can use.",
      "If the I2C bus hangs, the chip keeps sending the last pulse widths. A servo can be held against its stop.",
      "Only the screw terminal has reverse-polarity protection. The V+ pins on the side headers and servo plugs have none, and joining VCC to V+ damages the board.",
    ],
    upgrade: [
      { name: "The same board on its own 5 V to 6 V, 5 A to 10 A supply", why: "Servos at 0.5 A to 1 A each need 5 A to 10 A for ten of them. The board only passes the power on, so give it a supply that can." },
      { name: "TLC5947 or TLC59711 constant-current LED driver", why: "For LEDs: 30 mA per channel at a steady current, where this chip gives only 10 mA." },
    ],
    refs: [
      "https://learn.adafruit.com/16-channel-pwm-servo-driver.md?view=all",
      "https://thepihut.com/products/adafruit-16-channel-12-bit-pwm-servo-driver-i2c-interface-pca9685",
      "https://www.rlocman.es/datasheet/pdf.html?di=127265",
      "https://www.phippselectronics.com/support/pca9685-16-channel-12-bit-pwm-servo-driver-users-guide/",
    ],
  },
  animate: { lit: ["led-pwr"] },
  experiment: { title: "Sweep sixteen servos", idea: "Plug in two or three small servos on their own 5 V supply and sweep them one at a time, then all together. Watch the supply voltage while they move." },
  tags: ["pca9685", "servo", "pwm", "i2c", "16 channel", "expander", "adafruit", "driver"],
});
