import { MATERIAL, PCB_TOP, board, comparatorSet, definePart, gnd, name, pin, pinHeader, silk, vcc, type Solid } from "../../sdk";
import { MODULE_BLUE, comparatorSpecks, headerLabels } from "./_ir";

const TOP = PCB_TOP;
const H = 7;

/**
 * The slot sensor (H2010 / ITR9608): a black U standing on the board, its two
 * arms reaching out past the front edge with a 5 mm gap between them. An IR LED
 * looks out of one arm and a phototransistor out of the other; a slotted disc
 * turns through the gap.
 */
function slotSensor(): Solid[] {
  const u = "M 2 6 L 2 -6 L 4.5 -6 L 4.5 2 L 9.5 2 L 9.5 -6 L 12 -6 L 12 6 Z";
  return [
    { kind: "extrude", id: "slot-sensor", path: u, d: H, z: TOP, top: "#1b1c1f", side: "#0d0e10", bevel: 0.3, finish: "plastic" },
    // The two eyes on the inside faces of the arms.
    { kind: "box", x: 4.5, y: -3.2, w: 0.18, h: 1.6, d: 1.6, z: TOP + 3.2, top: "#5e636b", radius: 0.1, finish: "glass" },
    { kind: "box", x: 9.32, y: -3.2, w: 0.18, h: 1.6, d: 1.6, z: TOP + 3.2, top: "#2b2d33", radius: 0.1, finish: "glass" },
    { kind: "path", d: "M 3.25 -4.6 L 3.25 -1.4 M 10.75 -4.6 L 10.75 -1.4", color: "#2f3238", width: 0.25, z: TOP + H + 0.01 },
  ];
}

const header = pinHeader(2.2, 30, 4, { style: "up" });

export default definePart({
  id: "wheel-encoder",
  name: "Slotted speed sensor module (FC-03)",
  aka: ["optical speed sensor", "wheel encoder", "LM393 speed sensor", "opto-interrupter module", "FC-03", "H2010 encoder"],
  group: "sensors",
  rank: 9,
  summary: "A little U-shaped gate with a light on one side and a light sensor on the other. A slotted disc on a motor shaft spins through the gate, so DO pulses once for every slot. Count the pulses to learn how fast the wheel turns.",
  size: { w: 14, h: 32, d: 12.3 },
  solids: [
    board(14, 32, MODULE_BLUE, { radius: 0.5, holes: [{ x: 3.2, y: 16, d: 3 }] }),
    slotSensor(),
    comparatorSet({ chip: [7, 21.3], trimmer: [10.5, 12.2], power: [3, 26], signal: [11, 26] }, { chipDir: "x", trimmerDir: "y" }),
    comparatorSpecks([
      [11.2, 19, "r", "x"],
      [11.2, 20.6, "r", "x"],
      [11.2, 22.2, "r", "x"],
      [4.8, 25.1, "r", "x"],
      [7.4, 25.1, "r", "x"],
    ]),
    header,
    ...headerLabels([2.2, 4.74, 7.28, 9.82], 28.3, ["VCC", "GND", "DO", "AO"]),
    silk(6.4, 8.4, "FC-03", 0.9, MATERIAL.silk, { anchor: "middle" }),
  ],
  features: [
    { id: "gate", label: "Slot sensor", kind: "sensor", x: 2, y: -6, w: 10, h: 12, note: "The black U. The gap is 5 mm wide. An infrared LED shines across it; a phototransistor on the other arm watches the light. The disc's slots pass through this gap." },
    { id: "trim", label: "Sensitivity trimmer", kind: "other", x: 8.1, y: 7.45, w: 4.8, h: 9.5, note: "Sets how much light counts as 'open'. Most discs work with it left where it came. Not every board has one." },
    { id: "lm393", label: "LM393 comparator", kind: "chip", x: 4.2, y: 18.3, w: 5.6, h: 6, note: "Turns the phototransistor's slow ramp into a sharp high or low, so each slot is a clean pulse." },
    { id: "leds", label: "Power and signal LEDs", kind: "led", x: 2, y: 24.8, w: 10, h: 1.4, note: "Red: power. Green: follows DO, so you can see slots go by when you turn the wheel by hand." },
    { id: "hole", label: "Mounting hole", kind: "mechanical", x: 1.7, y: 14.5, w: 3, h: 3, note: "One 3 mm screw holds it to the chassis beside the wheel." },
    { id: "pins", label: "VCC, GND, DO, AO", kind: "pins", x: 0.9, y: 28.7, w: 10.2, h: 2.6, note: "Use DO. AO is printed on the board but is not wired to anything on most of them." },
  ],
  pins: [
    vcc("VCC", "3.3 V to 5 V supply."),
    gnd("GND"),
    pin("DO", "digital", "out-digital", "The pulse output. High while a tooth blocks the gate, low while a slot lets light through. Wire it to an interrupt pin.", { label: "DO" }),
    pin("AO", "analog", "opt", "Printed on the board, but not connected on most of them. Leave it unwired.", { label: "AO", required: false }),
  ],
  pinAt: name(header, "VCC", "GND", "DO", "AO"),
  circuit: {
    blocks: [
      { id: "vcc", label: "VCC", sub: "3.3 V to 5 V", kind: "power", col: 0, row: 0, at: "VCC", note: "Feeds the IR LED, the comparator and the two LEDs." },
      { id: "led", label: "IR LED", kind: "sensor", col: 1, row: 0, at: "gate", note: "In one arm of the U. Always on, shining across the gap." },
      { id: "disc", label: "Slotted disc", sub: "20 slots", kind: "world", col: 2, row: 0, note: "On the motor shaft. Each tooth cuts the light; each slot lets it through." },
      { id: "photo", label: "Phototransistor", kind: "sensor", col: 3, row: 0, at: "gate", note: "In the other arm. Conducts while it sees light, and stops when a tooth blocks it." },
      { id: "cmp", label: "Comparator", sub: "LM393", kind: "ic", col: 2, row: 2, at: "lm393", note: "Gives a sharp edge each time the light is cut or restored." },
      { id: "trim", label: "Trimmer", sub: "threshold", kind: "passive", col: 3, row: 1, at: "trim", note: "Sets the level the comparator switches at." },
      { id: "do", label: "DO", sub: "20 pulses per turn", kind: "pin", col: 0, row: 2, at: "DO", note: "High while blocked, low while open. Count its edges." },
      { id: "led-out", label: "Green LED", kind: "sensor", col: 1, row: 2, at: "leds", note: "Flickers with DO." },
    ],
    links: [
      { from: "vcc", to: "led", kind: "power", label: "about 15 mA" },
      { from: "led", to: "disc", kind: "light", label: "across the gap" },
      { from: "disc", to: "photo", kind: "light", label: "on, off, on, off" },
      { from: "photo", to: "cmp", kind: "analog" },
      { from: "trim", to: "cmp", kind: "analog", label: "threshold" },
      { from: "cmp", to: "do", kind: "signal", label: "pulses" },
      { from: "cmp", to: "led-out", kind: "signal" },
    ],
    steps: [
      "Infrared light crosses the 5 mm gap all the time. The phototransistor on the far side sees it.",
      "The disc turns through the gap. A slot lets the light across; a tooth blocks it.",
      "The comparator turns each change into a clean edge, so DO goes high when blocked and low when open.",
      "Count the pulses per second, divide by 20 to get turns per second, and multiply by 60 for rpm.",
    ],
  },
  facts: [
    { label: "Gap", value: "5 mm" },
    { label: "Disc", value: "20 slots, 25 mm" },
    { label: "Pulses", value: "20 per turn" },
    { label: "Supply", value: "3.3–5 V" },
    { label: "Output", value: "DO, high when blocked" },
    { label: "Board", value: "32 × 14 mm (38 long with sensor)" },
  ],
  spec: {
    form: {
      mount: "jumpers",
      pitch: 2.54,
      holes: [{ x: 3.2, y: 16, d: 3 }],
      note: "Screw it to the chassis so the slotted disc on the motor shaft spins through the 5 mm gap. The disc is a separate part: black plastic, about 25 mm across, 20 slots, 2.5 to 3 mm thick, with a 5 x 4 mm hole for a TT motor's flat shaft.",
    },
    power: {
      supply: { min: 3.3, max: 5, typ: 5 },
      logic: 5,
      tolerant5V: true,
      draw: { idle: 1.4, active: 15 },
      interface: "Pulse train on DO: 20 per turn of the disc",
      note: "Sellers disagree. One lists 1.4 mA for the sensor alone; a similar board is listed at 15 mA. Plan for 15 mA.",
    },
    sourcing: { mpn: "FC-03 (H2010 / ITR9608 + LM393)", maker: "Generic", lifecycle: "generic", usd: [0.7, 2], note: "Often sold with the disc as a pair of encoders for TT gear motors." },
    limits: [
      "Only 20 pulses per turn of the shaft the disc is on. At 200 rpm that is 67 pulses a second, which is coarse at low speeds.",
      "One channel only, so it cannot tell forward from backward. Your code has to know which way the motor was told to go.",
      "The disc must run true. If it wobbles it can miss a slot or count one twice.",
      "Room light leaking into the gap can trigger it. Shade the gap if you see extra pulses.",
    ],
    upgrade: [
      { name: "Hall-effect quadrature encoder (for example Pololu 12 CPR on a micro metal gearmotor)", why: "Two channels, so you get direction as well as speed, and 12 counts per motor turn (48 counting every edge) before the gearbox. A magnet instead of light, so dust does not matter." },
    ],
    refs: ["https://www.joy-it.net/files/files/Produkte/SEN-Speed/Datasheet-SEN-Speed.pdf", "https://x2robotics.ca/slot-type-ir-optocoupler-speed-sensor-module-lm393-chip"],
  },
  sim: {
    kind: "sensor",
    reads: [{ key: "blocked", label: "Gate", min: 0, max: 1, step: 1, start: 0, sweep: [0, 1, 0.5], states: ["Slot", "Blocked"] }],
    trips: [{ pin: "DO", key: "blocked", when: "above", at: 0.5 }],
  },
  experiment: { title: "Count the turns", idea: "Attach DO to an interrupt pin and count rising edges for one second. Pulses per second divided by 20 is turns per second; times the wheel's circumference is the speed." },
  tags: ["encoder", "speed", "rpm", "wheel", "slotted", "opto", "interrupter", "fc-03", "lm393", "sensor"],
});
