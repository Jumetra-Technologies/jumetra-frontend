import { MATERIAL, board, crystal, definePart, gnd, grille, name, pin, pinHeader, silk, vcc, type Solid } from "../../sdk";

const TOP = 1.6;
const CAN = 12;

/** A 16 mm ultrasonic transducer: an aluminum can with a recessed front and a mesh over the piezo. */
function transducer(cx: number, cy: number, id: string): Solid[] {
  const face = TOP + CAN;
  return [
    { kind: "cyl", id, cx, cy, r: 8, d: CAN, z: TOP, top: "#b9bdc3", finish: "aluminum" },
    { kind: "disc", cx, cy, r: 6.6, color: "#1b1c1f", z: face + 0.01 },
    grille(cx, cy, 6.5, face + 0.02, { step: 0.75, color: "#8a8f96", width: 0.2 }),
    { kind: "disc", cx, cy, r: 1.5, color: "#5d6269", z: face + 0.03 },
  ];
}

const header = pinHeader(18.69, 18.4, 4, { style: "angled", out: "bottom", under: true });

export default definePart({
  id: "hc-sr04",
  name: "HC-SR04 ultrasonic distance",
  aka: ["ultrasonic sensor", "sonar module", "HC SR04"],
  group: "sensors",
  rank: 2,
  summary: "Two 'eyes' that ping with sound you can't hear and time the echo. Measures 2 cm to 4 m, and makes a robot stop before the wall.",
  size: { w: 45, h: 20, d: 13.6 },
  solids: [
    board(45, 20, "#1a5fb4", {
      radius: 0.6,
      holes: [
        { x: 1.7, y: 1.7, d: 1.8 },
        { x: 43.3, y: 1.7, d: 1.8 },
        { x: 1.7, y: 18.3, d: 1.8 },
        { x: 43.3, y: 18.3, d: 1.8 },
      ],
    }),
    transducer(9.5, 9.3, "tx"),
    transducer(35.5, 9.3, "rx"),
    // The 27 MHz crystal sits between the two cans, on the front.
    crystal(18.1, 1.2, "27.000", 8.8, 3.6),
    header,
    silk(22.5, 9.4, "HC-SR04", 1.7, MATERIAL.silk, { anchor: "middle", weight: 700 }),
    silk(9.5, 19.4, "T", 1.2, MATERIAL.silk, { anchor: "middle" }),
    silk(35.5, 19.4, "R", 1.2, MATERIAL.silk, { anchor: "middle" }),
    silk(18.95, 16.6, "Vcc", 0.85, MATERIAL.silk, { rotate: -90 }),
    silk(21.49, 16.6, "Trig", 0.85, MATERIAL.silk, { rotate: -90 }),
    silk(24.03, 16.6, "Echo", 0.85, MATERIAL.silk, { rotate: -90 }),
    silk(26.57, 16.6, "Gnd", 0.85, MATERIAL.silk, { rotate: -90 }),
  ],
  features: [
    { id: "tx", label: "Transmitter (T)", kind: "sensor", x: 1.5, y: 1.3, w: 16, h: 16, note: "Fires eight pulses at 40 kHz, a sound far above hearing, into a cone about 15° wide." },
    { id: "rx", label: "Receiver (R)", kind: "sensor", x: 27.5, y: 1.3, w: 16, h: 16, note: "Listens for the echo coming back from the nearest hard surface." },
    { id: "xtal", label: "Crystal", kind: "chip", x: 18.1, y: 1.2, w: 8.8, h: 3.6, note: "The 27 MHz clock that times the burst and the wait for the echo." },
    { id: "pins", label: "VCC, Trig, Echo, GND", kind: "pins", x: 17.4, y: 17.2, w: 10.2, h: 11.2, note: "Trig in, Echo out. Echo swings to 5 V; on a 3.3 V board put a divider on it." },
  ],
  pins: [
    vcc("VCC", "5 V supply, about 15 mA while measuring. The 3.3 V pin is not enough."),
    pin("TRIG", "digital", "drive", "Hold high for 10 µs to start a measurement.", { label: "Trig" }),
    pin("ECHO", "digital", "out-digital", "Goes high for as long as the sound took to come back. It swings to 5 V.", { label: "Echo" }),
    gnd("GND"),
  ],
  pinAt: name(header, "VCC", "TRIG", "ECHO", "GND"),
  circuit: {
    blocks: [
      { id: "trig", label: "Trig", sub: "10 µs pulse in", kind: "pin", col: 0, row: 0, at: "TRIG", note: "Your board starts each measurement here." },
      { id: "mcu", label: "Controller", sub: "times the burst", kind: "ic", col: 1, row: 0, at: { x: 22.5, y: 11.2 }, note: "A small microcontroller on the back of the board that fires the burst and counts until the echo." },
      { id: "drv", label: "Driver", sub: "MAX232, ±10 V", kind: "driver", col: 2, row: 0, at: { x: 22.5, y: 14.2 }, note: "Borrowed from serial ports: it makes the ±10 V swing the transmitter needs from a 5 V supply." },
      { id: "tx", label: "Transmitter", sub: "40 kHz, 8 pulses", kind: "sensor", col: 3, row: 0, at: "tx", note: "A piezo disc that rings at 40 kHz." },
      { id: "obj", label: "Object", sub: "2–400 cm away", kind: "world", col: 3, row: 1, note: "Hard, flat things reflect well; cloth and sharp angles swallow the ping." },
      { id: "rx", label: "Receiver", kind: "sensor", col: 3, row: 2, at: "rx", note: "A matching piezo that turns the faint echo into microvolts." },
      { id: "amp", label: "Amplifier", sub: "LM324", kind: "ic", col: 2, row: 2, at: { x: 22.5, y: 6.6 }, note: "Boosts and filters the echo so the controller can see it." },
      { id: "echo", label: "Echo", sub: "pulse width out", kind: "pin", col: 0, row: 2, at: "ECHO", note: "High from the moment the ping leaves until the echo returns." },
      { id: "vcc", label: "VCC 5 V", kind: "power", col: 0, row: 1, at: "VCC", note: "15 mA while measuring; the 3.3 V pin is not enough." },
    ],
    links: [
      { from: "trig", to: "mcu", kind: "signal" },
      { from: "mcu", to: "drv", kind: "signal", label: "8 pulses" },
      { from: "drv", to: "tx", kind: "power", label: "±10 V" },
      { from: "tx", to: "obj", kind: "sound", label: "ping" },
      { from: "obj", to: "rx", kind: "sound", label: "echo" },
      { from: "rx", to: "amp", kind: "analog" },
      { from: "amp", to: "mcu", kind: "signal", label: "heard it" },
      { from: "mcu", to: "echo", kind: "signal", label: "high while waiting" },
      { from: "vcc", to: "mcu", kind: "power", label: "15 mA" },
    ],
    steps: [
      "Your board holds Trig high for 10 µs; the controller fires eight 40 kHz pulses through the driver into the transmitter.",
      "Echo goes high the moment the burst leaves. The sound crosses the room, bounces off the nearest object and comes back.",
      "The receiver hears the echo; the amplifier cleans it up and the controller pulls Echo low.",
      "Distance = Echo high time × 0.0343 cm/µs ÷ 2. No echo within 38 ms means nothing in range.",
    ],
  },
  facts: [
    { label: "Range", value: "2–400 cm" },
    { label: "Resolution", value: "3 mm" },
    { label: "Beam", value: "15°" },
    { label: "Supply", value: "5 V, 15 mA" },
    { label: "Interface", value: "Trig / Echo pulses" },
    { label: "Size", value: "45 × 20 × 15 mm" },
  ],
  spec: {
    form: {
      mass: 8.5,
      mount: "jumpers",
      pitch: 2.54,
      holes: [
        { x: 1.7, y: 1.7, d: 1.8 },
        { x: 43.3, y: 1.7, d: 1.8 },
        { x: 1.7, y: 18.3, d: 1.8 },
        { x: 43.3, y: 18.3, d: 1.8 },
      ],
      note: "Stands upright in a breadboard on its right-angle header, or bolts to a bracket through the corner holes.",
    },
    power: {
      supply: { min: 4.5, max: 5.5, typ: 5 },
      logic: 5,
      tolerant5V: true,
      draw: { idle: 2, active: 15 },
      interface: "Trig pulse in, Echo pulse out: 58 µs per cm",
    },
    sourcing: { mpn: "HC-SR04", maker: "Generic (ElecFreaks design)", lifecycle: "generic", usd: [1, 3] },
    limits: [
      "Echo is a 5 V signal: wired straight to an ESP32 or Pico pin it can damage the pin.",
      "Soft or angled targets (cloth, foam, anything past about 15° off-axis) return no echo.",
      "A read with no echo holds the pin for 38 ms, so ten sensors can't be read ten times a second.",
      "The speed of sound changes with temperature: a 10 °C error is about 1.7 % of the distance.",
    ],
    upgrade: [
      { part: "vl53l0x", name: "VL53L0X time-of-flight sensor", why: "Measures with laser light instead of sound, so soft and angled targets still read; it runs on 3.3 V, answers over I2C in 30 ms and is a tenth of the size. Its range is shorter: about 2 m." },
      { name: "HC-SR04P or RCWL-1601", why: "The same sensor redesigned to run from 3 V to 5.5 V, so Echo comes out at the board's own logic level and no divider is needed; it draws about 2 mA instead of 15." },
    ],
    refs: ["https://cdn.sparkfun.com/datasheets/Sensors/Proximity/HCSR04.pdf"],
  },
  experiment: { title: "Parking sensor", idea: "Print the distance ten times a second, then make a buzzer beep faster the closer your hand gets." },
  docs: "/docs/hardware-knowledge/hc-sr04",
  tags: ["hc-sr04", "ultrasonic", "distance", "sonar", "range", "obstacle", "sensor"],
});
