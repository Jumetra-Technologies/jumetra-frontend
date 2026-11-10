import { MATERIAL, PCB_TOP, board, definePart, gnd, grille, name, pin, pinHeader, silk, smd, smdLed, soic, trimmer, vcc, type Solid } from "../../sdk";
import { MODULE_BLUE } from "./_ir";

const CX = 10.5;
const CY = 10;
const BASE_Z = PCB_TOP + 0.6;
const BASE_D = 2.6;
const CAP_Z = BASE_Z + BASE_D;
const TOP = 17.6;

/** The MQ-2 itself: an orange bakelite base on six legs, a stainless cap and a double layer of steel mesh on top. */
function gasSensor(): Solid[] {
  const capH = TOP - CAP_Z;
  const out: Solid[] = [
    // Six legs through the board, three of them showing round the base.
    ...Array.from({ length: 6 }, (_, i): Solid => {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      return { kind: "cyl", cx: +(CX + 5.6 * Math.cos(a)).toFixed(2), cy: +(CY + 5.6 * Math.sin(a)).toFixed(2), r: 0.35, d: 0.7, z: PCB_TOP, top: MATERIAL.tin, finish: "tin" };
    }),
    { kind: "cyl", cx: CX, cy: CY, r: 9.75, d: BASE_D, z: BASE_Z, top: "#d9822b", side: "#a8601a", finish: "plastic" },
    // The steel cap, with a rolled lip at its foot.
    { kind: "cyl", id: "can", cx: CX, cy: CY, r: 8.6, d: capH, z: CAP_Z, top: "#d4d7dc", side: "#d4d7dc", finish: "metal" },
    { kind: "cyl", cx: CX, cy: CY, r: 9.0, d: 0.7, z: CAP_Z, top: "#b9bdc3", finish: "metal" },
    // The mesh window in the top.
    { kind: "disc", cx: CX, cy: CY, r: 7.0, color: "#2a2d32", z: TOP + 0.01 },
    grille(CX, CY, 6.9, TOP + 0.02, { step: 0.7, color: "#a3a8af", width: 0.18 }),
    { kind: "disc", cx: CX, cy: CY, r: 7.3, color: "#6f747b", ring: { color: "#d7dade", width: 0.45 }, z: TOP + 0.005 },
    { kind: "disc", cx: CX, cy: CY, r: 1.1, color: "#8f949b", z: TOP + 0.03 },
  ];
  return out;
}

const header = pinHeader(30.4, 6.19, 4, { dir: "y", style: "up" });

export default definePart({
  id: "mq2",
  name: "MQ-2 gas & smoke sensor",
  aka: ["MQ2", "smoke sensor", "LPG sensor", "combustible gas sensor"],
  group: "sensors",
  rank: 20,
  summary: "A heated bead under a steel mesh that conducts better when flammable gas or smoke touches it. Gives a rising analog level and a threshold switch.",
  size: { w: 32, h: 20, d: 17.6 },
  solids: [
    ...board(32, 20, MODULE_BLUE, { radius: 0.4 }),
    ...gasSensor(),
    ...soic(24.0, 4.4, 4, "LM393", { dir: "x", id: "lm393" }),
    ...trimmer(23.5, 13.6, "y", -1, "pot"),
    smdLed(27.6, 2.2, "#ff4d4d", "led-pwr"),
    smdLed(27.6, 18.0, "#ff4d4d", "led-d0"),
    ...smd(21.2, 7.4, "r", "x"),
    ...smd(22.0, 19.0, "c", "x"),
    ...smd(24.4, 7.3, "r", "x"),
    header,
    silk(29.0, 6.19 + 0.3, "VCC", 0.8, MATERIAL.silk, { anchor: "end" }),
    silk(29.0, 8.73 + 0.3, "GND", 0.8, MATERIAL.silk, { anchor: "end" }),
    silk(29.0, 11.27 + 0.3, "D0", 0.8, MATERIAL.silk, { anchor: "end" }),
    silk(29.0, 13.81 + 0.3, "A0", 0.8, MATERIAL.silk, { anchor: "end" }),
    silk(26.2, 19.6, "MQ-2", 0.9, MATERIAL.silk, { anchor: "middle", weight: 700 }),
  ],
  features: [
    { id: "can", label: "MQ-2 sensor", kind: "sensor", x: 0.75, y: 0.25, w: 19.5, h: 19.5, note: "A heated tin-oxide bead under a steel mesh. Flammable gas or smoke changes how well it conducts. The heater inside draws about 150 mA all the time, and the cap gets too hot to hold." },
    { id: "pot", label: "Threshold trimmer", kind: "mechanical", x: 21.1, y: 8.9, w: 4.8, h: 9.5, note: "Sets the level at which D0 switches. Clockwise makes it more sensitive." },
    { id: "lm393", label: "LM393 comparator", kind: "chip", x: 21.5, y: 2.4, w: 5, h: 4, note: "Compares the sensor voltage with the trimmer and drives D0." },
    { id: "leds", label: "Power and D0 LEDs", kind: "led", x: 26.8, y: 1.8, w: 1.6, h: 16.6, note: "The top one is power; the bottom one lights when gas is above the threshold." },
    { id: "load", label: "Load resistor", kind: "other", x: 21.2, y: 7.4, w: 1.6, h: 0.8, note: "With the sensor bead it forms a divider; A0 is the midpoint." },
    { id: "pins", label: "VCC, GND, D0, A0", kind: "pins", x: 29.1, y: 4.9, w: 2.6, h: 10.2, note: "A0 for the level, D0 for the alarm. VCC must be 5 V: the heater needs it." },
  ],
  pins: [
    vcc("VCC", "5 V supply, about 150 mA, nearly all of it the heater. A 3.3 V pin cannot feed it."),
    gnd("GND"),
    pin("D0", "digital", "out-digital", "Goes low when gas is above the trimmer setting. It swings to 5 V, so a 3.3 V board needs a divider.", { label: "D0", required: false }),
    pin("A0", "analog", "out-analog", "The gas level: more gas, higher voltage, up to 5 V.", { label: "A0", required: false }),
  ],
  pinAt: { ...name(header, "VCC", "GND", "D0", "A0") },
  circuit: {
    blocks: [
      { id: "gas", label: "Gas or smoke", sub: "LPG, CH₄, CO, H₂", kind: "world", col: 0, row: 0, note: "Molecules that react on the hot bead." },
      { id: "bead", label: "SnO₂ bead", sub: "conducts more in gas", kind: "sensor", col: 1, row: 0, at: "can", note: "Tin dioxide: its resistance drops as gas reacts on its hot surface." },
      { id: "heater", label: "Heater coil", sub: "5 V, about 150 mA", kind: "passive", col: 1, row: 1, at: "can", hot: true, note: "About 30 Ω across 5 V: 0.8 W, all of it turned into heat. It keeps the bead at a few hundred °C; cold, it senses nothing." },
      { id: "vcc", label: "VCC 5 V", kind: "power", col: 0, row: 1, at: "VCC", note: "The heater is why this needs a real 5 V supply." },
      { id: "load", label: "Load resistor", sub: "RL", kind: "passive", col: 2, row: 0, at: "load", note: "With the bead it forms a divider; A0 is the midpoint." },
      { id: "a0", label: "A0", sub: "rises with gas", kind: "pin", col: 3, row: 0, at: "A0", note: "Read it as a trend; calibrate in clean air first." },
      { id: "cmp", label: "LM393", sub: "comparator", kind: "ic", col: 2, row: 1, at: "lm393", note: "Compares A0 with the trimmer." },
      { id: "pot", label: "Threshold pot", kind: "passive", col: 2, row: 2, at: "pot", note: "Your alarm level." },
      { id: "d0", label: "D0", sub: "alarm", kind: "pin", col: 3, row: 1, at: "D0", note: "Low when above threshold." },
    ],
    links: [
      { from: "gas", to: "bead", kind: "physical" },
      { from: "vcc", to: "heater", kind: "power", label: "about 150 mA" },
      { from: "heater", to: "bead", kind: "physical", label: "heat" },
      { from: "bead", to: "load", kind: "analog" },
      { from: "load", to: "a0", kind: "analog" },
      { from: "load", to: "cmp", kind: "analog" },
      { from: "pot", to: "cmp", kind: "analog" },
      { from: "cmp", to: "d0", kind: "signal" },
    ],
    steps: [
      "A coil heats the tin-oxide bead to a few hundred °C; cold, it senses nothing. Give it two to five minutes every time it powers up, and a day or two of burn-in the first time.",
      "Flammable gas or smoke molecules react on the hot surface and the bead conducts better.",
      "The bead and a load resistor divide 5 V; A0 rises with concentration. Calibrate in clean air for a baseline.",
      "The LM393 compares A0 with the trimmer and pulls D0 low above the threshold; the second LED lights.",
    ],
  },
  facts: [
    { label: "Detects", value: "LPG, propane, methane, hydrogen, smoke" },
    { label: "Range", value: "300–10 000 ppm" },
    { label: "Supply", value: "5 V, about 150 mA" },
    { label: "Warm-up", value: "2–5 min (24–48 h burn-in)" },
    { label: "Output", value: "Analog + digital" },
    { label: "Size", value: "32 × 20 mm" },
  ],
  lab: { logic: 5, supply: [4.5, 5.5], tolerates5V: true },
  spec: {
    form: {
      mass: 7,
      mount: "jumpers",
      pitch: 2.54,
      note: "Four header pins for jumper wires. The cap runs hot, so keep it clear of plastic and of other sensors.",
    },
    power: {
      supply: { min: 4.5, max: 5.5, typ: 5 },
      logic: 5,
      tolerant5V: true,
      draw: { idle: 150, active: 160, peak: 180 },
      interface: "A0 analog level (rises with gas), D0 threshold switch (low = gas)",
    },
    thermal: {
      thetaCW: 65,
      maxC: 100,
      typicalW: 0.83,
      at: "heater on, 5 V across about 30 Ω",
      note: "The heater alone turns about 0.8 W into heat, all the time. The datasheet lists a heater of 29 to 33 Ω and a limit of 0.95 W. The cap is built to run hot: an estimate puts its surface at 60 to 100 °C, which is why θ here is an estimate, not a datasheet figure. Rated ambient is −20 to 50 °C.",
    },
    sourcing: { mpn: "MQ-2", maker: "Hanwei / Winsen (module boards are generic)", lifecycle: "active", usd: [1, 4] },
    limits: [
      "The heater draws 150 to 180 mA (0.75 to 0.9 W) all the time, ten to a hundred times more than a modern gas sensor. It is too much for a coin cell or a weak 3.3 V pin.",
      "A new sensor needs a 24 to 48 hour burn-in with power on before its readings settle, and two to five minutes of warm-up after every power-up.",
      "It is not selective: LPG, methane, smoke, alcohol and hydrogen all raise A0, and without calibration it gives no ppm.",
      "Humidity and temperature move the reading, and its heat warms the board and any sensor beside it.",
      "A0 and D0 reach 5 V. Into a 3.3 V board they need a divider.",
    ],
    upgrade: [
      { name: "Sensirion SGP40 (or SGP30)", why: "A tiny MEMS air-quality sensor on I2C from 1.7 V to 3.6 V that averages about 2.6 mA, 60 times less than the MQ-2's heater. It reads VOCs, not smoke or LPG." },
      { name: "Optical smoke detector module", why: "For real smoke detection. A light chamber sees smoke particles directly, while the MQ-2 is a combustible-gas sensor with a weak smoke response." },
    ],
    refs: [
      "https://www.winsen-sensor.com/d/files/manual/mq-2.pdf",
      "https://www.universal-solder.ca/datasheets/26170_MQ-2_Smoke_and_Combustible_Gas_Sensor.pdf",
      "https://envistiamall.com/blogs/learn/mq-2-smoke-gas-sensor-detector-module-user-guide",
      "https://botland.store/gas-sensors/3027-smoke-and-flammable-gas-sensor-mq-2-semiconductor-blue-module-5904422359270.html",
    ],
  },
  experiment: { title: "Smoke alarm", idea: "Log A0 in clean air for a minute, then hold a blown-out match near the mesh and sound a buzzer when A0 climbs 20 % above the baseline." },
  tags: ["mq2", "mq-2", "gas", "smoke", "lpg", "methane", "alarm", "sensor"],
});
