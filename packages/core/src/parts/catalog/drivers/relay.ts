import { MATERIAL, board, definePart, gnd, name, pin, pinHeader, silk, smd, smdDiode, smdLed, sot23, terminalBlock, vcc } from "../../sdk";
import { songleRelay, sop4, withId } from "./_switching";

const BLUE = "#1b4fa8";
const S = MATERIAL.silk;

// Three-pin signal header down the left edge; three-way screw terminal on the right, wires going in from the right.
const header = pinHeader(3.2, 9.4, 3, { dir: "y", style: "up" });
const terminal = terminalBlock(42.4, 5.5, 3, { mouth: "right" });

export default definePart({
  id: "relay",
  name: "Relay module, 5 V",
  aka: ["relay board", "1-channel relay", "SRD-05VDC", "Songle relay module", "SRD-05VDC-SL-C"],
  group: "drivers",
  rank: 5,
  summary: "A switch your board can throw. A small coil pulls a contact that can handle a lamp, a pump or a heater, and nothing electrical is shared between the two sides. It is slow and it clicks, so it suits on and off, never PWM.",
  size: { w: 50, h: 26, d: 17.7 },
  solids: [
    board(50, 26, BLUE, {
      radius: 0.5,
      holes: [
        { x: 2.5, y: 2.5, d: 3.1 },
        { x: 47.5, y: 2.5, d: 3.1 },
        { x: 2.5, y: 23.5, d: 3.1 },
        { x: 47.5, y: 23.5, d: 3.1 },
      ],
    }),
    header,
    terminal,
    songleRelay(17, 3.5, "relay"),
    // The input stage: optocoupler, driver transistor, flyback diode.
    sop4(12.4, 6.2, "opto"),
    withId(sot23(12.4, 11.6, { dir: "x", label: "J3Y" }), "transistor"),
    withId(smdDiode(12.4, 15.8, "x", 1, "sod123"), "diode"),
    // Resistors, and the two LEDs with theirs along the bottom.
    smd(15.2, 5.0, "r", "y"),
    smd(15.2, 8.2, "r", "y"),
    smd(15.2, 11.2, "r", "y"),
    smd(8.6, 18.6, "r", "x"),
    smd(13.0, 19.0, "r", "x"),
    smd(15.2, 14.6, "c", "y"),
    smdLed(5.6, 21.4, "#3ddc68", "led-pwr"),
    smdLed(10.2, 21.4, "#ff3b3b", "led"),
    // The white outline round the relay's footprint, and the printing.
    { kind: "path", d: "M 16.2 2.7 H 37.8 V 19.8 H 16.2 Z", color: S, width: 0.3 },
    silk(5.9, 9.9, "VCC", 0.95, S),
    silk(5.9, 12.44, "GND", 0.95, S),
    silk(5.9, 14.98, "IN", 0.95, S),
    silk(41.8, 8.5, "NO", 1.0, S, { anchor: "end" }),
    silk(41.8, 13.5, "COM", 1.0, S, { anchor: "end" }),
    silk(41.8, 18.5, "NC", 1.0, S, { anchor: "end" }),
    silk(27, 23.8, "RELAY  5V", 1.5, S, { anchor: "middle", weight: 700 }),
    silk(7.1, 24.4, "PWR", 0.75, S, { anchor: "middle" }),
    silk(11.6, 24.4, "RLY", 0.75, S, { anchor: "middle" }),
    silk(40.5, 24.0, "10A 250VAC", 0.8, S, { anchor: "middle" }),
  ],
  features: [
    { id: "relay", label: "Relay (SRD-05VDC-SL-C)", kind: "other", x: 17, y: 3.5, w: 19, h: 15.5, note: "A coil pulls a spring-loaded contact. The coil takes 5 V on one side; the contacts are rated 10 A at 250 V AC or 30 V DC on the other, with nothing electrical joining the two." },
    { id: "terminal", label: "Screw terminal (NO, COM, NC)", kind: "connector", x: 42.4, y: 5.5, w: 7.6, h: 15, note: "COM is the common contact. NO (normally open) joins COM only while the coil is on. NC (normally closed) is joined to COM while the coil is off. The order can differ on other boards, so read the print." },
    { id: "header", label: "Signal header (VCC, GND, IN)", kind: "pins", x: 1.93, y: 8.13, w: 2.54, h: 7.62, note: "VCC and GND feed the coil, about 90 mA from your 5 V pin. IN is the control signal. On this board a low IN turns the relay on." },
    { id: "opto", label: "Optocoupler (PC817)", kind: "chip", x: 10.2, y: 4.4, w: 4.4, h: 3.6, note: "An LED and a light sensor in one package. Your board's signal reaches the coil circuit as light, so the two sides share no wire." },
    { id: "transistor", label: "Driver transistor", kind: "chip", x: 10.95, y: 10.95, w: 2.9, h: 1.3, note: "Switches the 70 mA the coil needs. A board pin could not give that." },
    { id: "diode", label: "Flyback diode", kind: "other", x: 11.05, y: 15.0, w: 2.7, h: 1.6, note: "Catches the voltage spike the coil makes when it switches off, so the spike can't hurt the transistor." },
    { id: "led-pwr", label: "Power LED (green)", kind: "led", x: 5.6, y: 21.4, w: 1.6, h: 0.8, note: "Lit while the board has 5 V." },
    { id: "led", label: "Relay LED (red)", kind: "led", x: 10.2, y: 21.4, w: 1.6, h: 0.8, note: "Lit while the coil is on." },
  ],
  pins: [
    vcc("VCC", "5 V for the coil and the LEDs. About 90 mA while the relay is on."),
    gnd("GND", "Ground. Join it to your board's GND."),
    pin("IN", "digital", "drive", "Low energises the coil. Control input: low turns the relay on, high turns it off. It needs about 5 mA."),
    pin("COM", "other", "load", "Common contact. One wire of your load supply goes here.", { required: false }),
    pin("NO", "other", "load", "Normally open. Joined to COM only while the relay is on.", { required: false }),
    pin("NC", "other", "load", "Normally closed. Joined to COM while the relay is off, and opens when it turns on.", { required: false }),
  ],
  pinAt: {
    ...name(header, "VCC", "GND", "IN"),
    ...name(terminal, "NO", "COM", "NC"),
  },
  circuit: {
    blocks: [
      { id: "in", label: "IN", sub: "from your board", kind: "pin", col: 0, row: 0, at: "IN", note: "About 5 mA is all it asks of the pin." },
      { id: "opto", label: "Optocoupler", sub: "light, not wires", kind: "ic", col: 1, row: 0, at: "opto", note: "Keeps your board electrically apart from the coil circuit." },
      { id: "tr", label: "Transistor", sub: "sinks ~70 mA", kind: "driver", col: 2, row: 0, at: "transistor", note: "The muscle for the coil." },
      { id: "coil", label: "Coil", sub: "5 V, 70 mA", kind: "actuator", col: 3, row: 0, at: "relay", note: "An electromagnet inside the blue cube." },
      { id: "contacts", label: "Contacts", sub: "COM to NO or NC", kind: "actuator", col: 3, row: 1, at: "terminal", note: "The armature moves COM from NC over to NO." },
      { id: "load", label: "Your load", sub: "lamp, pump, up to 10 A", kind: "world", col: 3, row: 2, note: "Anything on its own supply, wired through COM and NO." },
      { id: "vcc", label: "VCC 5 V", kind: "power", col: 2, row: 1, at: "VCC", note: "The coil's supply." },
      { id: "diode", label: "Flyback diode", kind: "passive", col: 2, row: 2, at: "diode", note: "Absorbs the coil's switch-off spike." },
      { id: "gnd", label: "GND", kind: "ground", col: 1, row: 2, at: "GND", note: "Ground." },
    ],
    links: [
      { from: "in", to: "opto", kind: "signal", label: "LOW = on" },
      { from: "opto", to: "tr", kind: "signal" },
      { from: "tr", to: "coil", kind: "power" },
      { from: "vcc", to: "coil", kind: "power", label: "70 mA" },
      { from: "coil", to: "contacts", kind: "mechanical", label: "pulls in" },
      { from: "contacts", to: "load", kind: "power", label: "up to 10 A" },
      { from: "diode", to: "coil", kind: "power", label: "spike" },
      { from: "tr", to: "gnd", kind: "ground" },
    ],
    steps: [
      "IN goes low. That lights the LED inside the optocoupler, and its light sensor turns on. Your board never touches the coil circuit.",
      "The transistor lets about 70 mA flow through the coil from VCC. The magnetic field pulls the armature over with a click.",
      "The armature moves the common contact from NC to NO, so whatever sits between COM and NO gets its power: a lamp, a pump, a 12 V strip.",
      "Switch off and the coil's collapsing field makes a spike. The flyback diode absorbs it. Mains wiring belongs in a box and is a job for someone qualified.",
    ],
  },
  facts: [
    { label: "Coil", value: "5 V, about 70 mA" },
    { label: "Contacts", value: "10 A at 250 V AC or 30 V DC" },
    { label: "Control", value: "Active-low IN" },
    { label: "Isolation", value: "Optocoupler" },
    { label: "Switching", value: "about 10 ms on, 5 ms off" },
    { label: "Size", value: "50 × 26 × 18.5 mm" },
  ],
  spec: {
    form: {
      mass: 18,
      mount: "terminals",
      pitch: 2.54,
      holes: [
        { x: 2.5, y: 2.5, d: 3.1 },
        { x: 47.5, y: 2.5, d: 3.1 },
        { x: 2.5, y: 23.5, d: 3.1 },
        { x: 47.5, y: 23.5, d: 3.1 },
      ],
      note: "Bolts down on M3 screws. The load wires go under the screw terminal, and the signal header takes jumper wires.",
    },
    power: {
      supply: { min: 4.5, max: 5.5, typ: 5 },
      logic: 5,
      tolerant5V: true,
      draw: { idle: 10, active: 85, peak: 100 },
      bridge: { channels: 1, maxMa: 10000 },
      interface: "One input, low turns it on",
      note: "Contacts: 10 A at 250 V AC or 10 A at 30 V DC, one channel. The coil pulls in at 3.75 V and is rated 5 V.",
    },
    sourcing: { mpn: "SRD-05VDC-SL-C", maker: "Songle", lifecycle: "active", usd: [1.5, 4], note: "The relay is a Songle SRD-05VDC-SL-C, with a PC817 optocoupler and an S8050 transistor on the board. Clone boards are almost identical. A 30 A high-power relay and solid-state modules look alike but are different parts." },
    limits: [
      "No PWM. A relay is on or off. Its contact bounces for 1 to 5 ms and it takes about 10 ms to close, so it can't dim a lamp or set a motor's speed.",
      "Slow and noisy: about 10 ms to close and 5 ms to open, and it clicks every time. Don't switch it faster than a few times a second.",
      "The coil takes about 70 mA, and the module about 85 to 90 mA with the relay on. That must come from the 5 V pin, never from a signal pin.",
      "This board is active-low. On a 3.3 V board the high level may stay above the optocoupler's threshold, so the relay never fully lets go. Use an active-high module or a level shifter.",
      "It wears out: about 10 million operations with no load, about 100 000 at full load. The contacts arc and pit.",
      "The 30 V DC rating is a hard limit. 10 A at 30 V DC falls to a few amps at 110 V DC.",
    ],
    upgrade: [
      { name: "Logic-level MOSFET module (IRLZ44N, about 47 A)", why: "For DC loads under 30 V. It switches in microseconds, makes no click and uses no coil current, and it can be PWMed." },
      { name: "Solid-state relay module (Omron G3MB-202P)", why: "No moving parts and no click, and it switches AC loads in under 1 ms. It leaks 1 to 2 mA when off and drops about 1.5 V." },
    ],
    refs: [
      "https://docs.cirkitdesigner.com/component/e4d8b0d7-6bf3-4384-b863-2dfae3bcccaf/relay-srd-05vdc-sl-c",
      "https://littlebirdelectronics.com.au/products/5v-1-channel-h-l-level-trigger-optocoupler-relay-module-for-arduino",
    ],
  },
  animate: { lit: ["led", "led-pwr"] },
  experiment: { title: "Timed switch", idea: "Turn the relay on for five seconds and off for five, with a 12 V lamp or fan on COM and NO. Then let a sensor decide." },
  tags: ["relay", "switch", "mains", "load", "optocoupler", "high power", "songle", "driver"],
});
