import { MATERIAL, circlePath, definePart, gnd, lead, pin, roundedRect, vcc, type Solid } from "../../sdk";

const BLACK = "#1d1d20";
const AX = 16.75; // the output shaft, 10.35 mm in from the case end
const AY = 9.85; // and centered across the case
const EARS = 26.4; // underside of the mounting flange
const CASE_TOP = 36.5;
const HORN = 38.8; // underside of the horn, on top of the output boss

// Horn: a 24 mm round disc with two rings of small holes and a hub.
const hornPath = [
  circlePath(AX, AY, 12),
  ...Array.from({ length: 8 }, (_, i) => circlePath(AX + 8.6 * Math.cos((i * Math.PI) / 4), AY + 8.6 * Math.sin((i * Math.PI) / 4), 0.9)),
  ...Array.from({ length: 8 }, (_, i) => circlePath(AX + 5.6 * Math.cos(((i + 0.5) * Math.PI) / 4), AY + 5.6 * Math.sin(((i + 0.5) * Math.PI) / 4), 0.7)),
].join(" ");

// Three wires in a flat ribbon: brown, red and orange, from the case to the 3-pin housing.
const WIRES = [
  { pin: "GND", color: "#6a3d20" },
  { pin: "VCC", color: "#c62b2b" },
  { pin: "SIG", color: "#e8892b" },
];
const HOUSING_X = 73.5;
const MOUTH_X = 83.5;
const housingY = (i: number) => AY + (i - 1) * 2.54;
const ribbon: Solid[] = WIRES.flatMap((w, i) => {
  const y0 = AY + (i - 1) * 1.3;
  const y1 = housingY(i);
  const k = (t: number) => y0 + (y1 - y0) * t;
  return lead(
    [
      [48.5, y0, 9],
      [51.5, y0, 8.4],
      [54.5, k(0.1), 4.2],
      [58, k(0.3), 0.9],
      [65, k(0.7), 0.55],
      [HOUSING_X, y1, 1.4],
    ],
    w.color,
    { r: 0.55 },
  );
});

export default definePart({
  id: "servo-mg996r",
  name: "MG996R metal-gear servo",
  aka: ["MG996R", "TowerPro MG996R", "MG995", "high-torque servo", "robot arm servo"],
  group: "motors",
  rank: 4,
  summary: "The big hobby servo with metal gears. It turns to the angle a 50 Hz pulse asks for and holds it, with about 11 kg·cm of pull. It can take over 2 A when pushed, so it needs its own supply.",
  size: { w: 53.5, h: 19.7, d: 42.9 },
  solids: [
    // Black case in three parts: the lower case, the mounting flange and the upper case.
    { kind: "box", id: "case", x: 6.4, y: 0, w: 40.7, h: 19.7, d: EARS, top: BLACK, side: "#141416", finish: "plastic", radius: 1.2 },
    {
      kind: "extrude",
      id: "ears",
      path: [
        roundedRect(0, 0, 53.5, 19.7, 1.2),
        circlePath(2.8, 4.85, 2.1),
        circlePath(2.8, 14.85, 2.1),
        circlePath(50.7, 4.85, 2.1),
        circlePath(50.7, 14.85, 2.1),
      ].join(" "),
      d: 2.6,
      z: EARS,
      top: BLACK,
      side: "#141416",
      finish: "plastic",
    },
    { kind: "box", x: 6.6, y: 0.3, w: 40.3, h: 19.1, d: CASE_TOP - EARS - 2.6, z: EARS + 2.6, top: "#212125", side: "#17171a", finish: "plastic", radius: 1 },
    // Four case screws, the bump over the output gear and the smaller one over the potentiometer.
    ...[
      [9.2, 2.7],
      [9.2, 17],
      [44.6, 2.7],
      [44.6, 17],
    ].map(([cx, cy]) => ({ kind: "cyl", cx, cy, r: 1.2, d: 0.5, z: CASE_TOP, top: "#7d8187", finish: "metal" }) as Solid),
    { kind: "cyl", cx: 28.9, cy: AY, r: 4.3, d: 1.4, z: CASE_TOP, top: "#232327", side: "#17171a", finish: "plastic" },
    { kind: "cyl", cx: AX, cy: AY, r: 6.9, d: HORN - CASE_TOP, z: CASE_TOP, top: "#27272b", side: "#17171a", finish: "plastic" },
    { kind: "text", x: 38.8, y: 8.7, text: "TowerPro", size: 1.7, color: "#9a9ea4", anchor: "middle", z: CASE_TOP + 0.01 },
    { kind: "text", x: 38.8, y: 11.5, text: "MG996R", size: 2.1, color: "#c9ccd1", anchor: "middle", weight: 700, z: CASE_TOP + 0.01 },
    // Round horn on the metal output spline, held by one screw.
    { kind: "extrude", id: "horn", path: hornPath, d: 2.4, z: HORN, top: "#f1f0ec", side: "#d8d6d0", finish: "plastic", bevel: 0.3 },
    { kind: "cyl", id: "horn-hub", cx: AX, cy: AY, r: 3.9, d: 1.4, z: HORN + 2.4, top: "#f1f0ec", side: "#d8d6d0", finish: "plastic" },
    { kind: "cyl", id: "spline", cx: AX, cy: AY, r: 2.7, d: 1.7, z: HORN + 2.4, top: "#d5ad4a", finish: "gold", segments: 24 },
    { kind: "cyl", id: "screw", cx: AX, cy: AY, r: 1.1, d: 0.3, z: 42.6, top: "#3a3d42", finish: "metal" },
    // The cable leaves the right end through a rubber grommet.
    { kind: "box", x: 47.1, y: AY - 3.3, w: 1.6, h: 6.6, d: 4.5, z: 6.8, top: "#101113", finish: "rubber", radius: 0.7 },
    ribbon,
    // 3-pin housing, with its mouth facing away from the servo.
    { kind: "box", id: "housing", x: HOUSING_X, y: AY - 3.9, w: MOUTH_X - HOUSING_X, h: 7.8, d: 2.8, top: "#1c1c1f", side: "#121214", finish: "plastic", radius: 0.4 },
    ...WIRES.map((_, i) => ({ kind: "box", x: MOUTH_X - 0.4, y: housingY(i) - 0.55, w: 0.45, h: 1.1, d: 1.1, z: 0.85, top: "#05060a", finish: "plastic" }) as Solid),
    { kind: "box", x: HOUSING_X + 1.5, y: AY - 3.9, w: 0.8, h: 7.8, d: 3.4, top: "#1c1c1f", finish: "plastic" },
  ],
  features: [
    { id: "horn", label: "Servo horn", kind: "mechanical", x: AX - 12, y: AY - 12, w: 24, h: 24, note: "The white arm or disc that turns. Screw your arm, wheel or leg to its holes. It swings through about 180°." },
    { id: "spline", label: "Metal output spline", kind: "mechanical", x: AX - 2.7, y: AY - 2.7, w: 5.4, h: 5.4, note: "A 25-tooth metal shaft. The horn pushes onto it and one screw holds it. Put the horn on at mid-travel so the arm sits where you want it." },
    { id: "gears", label: "Gear train", kind: "mechanical", x: 9.9, y: 2.9, w: 22.9, h: 13.9, note: "Metal gears under the top cover. They slow the motor down and multiply its force. They are noisy and have about 0.5° of slack." },
    { id: "case", label: "Case: motor and control board", kind: "other", x: 6.4, y: 0, w: 40.7, h: 19.7, note: "A brushed motor, a small control chip with an H-bridge, and a potentiometer on the output shaft that tells the chip the angle." },
    { id: "ears", label: "Mounting ears", kind: "mechanical", x: 0, y: 0, w: 53.5, h: 19.7, note: "Four holes, 10 mm apart across, for M4 screws. The case is held by the flange partway up its side." },
    { id: "lead", label: "3-wire cable", kind: "connector", x: 47.1, y: 6.5, w: 27, h: 7, note: "About 30 cm of wire: brown for ground, red for power, orange for the signal. Cut short here." },
    { id: "housing", label: "3-pin housing", kind: "connector", x: HOUSING_X, y: AY - 3.9, w: 10, h: 7.8, note: "A female plug with 2.54 mm spacing. It slides onto a header with the brown wire on ground. It only fits one way round if you look for the flat side." },
  ],
  pins: [
    vcc("VCC", "Servo power, red wire: 4.8 V to 7.2 V. About 900 mA while it turns and up to 2.5 A when it is stuck. Use a supply of 3 A or more, not the board's 5 V pin.", { label: "V+" }),
    gnd("GND", "Brown wire. Join it to the supply's ground and to your board's ground.", { label: "GND" }),
    pin("SIG", "pwm", "pwm", "Orange wire. Send a 50 Hz pulse every 20 ms: 1.0 ms is one end, 1.5 ms is the middle, 2.0 ms is the other end. 3.3 V signals usually work.", { label: "Signal" }),
  ],
  pinAt: {
    GND: { x: MOUTH_X, y: housingY(0) },
    VCC: { x: MOUTH_X, y: housingY(1) },
    SIG: { x: MOUTH_X, y: housingY(2) },
  },
  circuit: {
    blocks: [
      { id: "sig", label: "Signal", sub: "50 Hz pulse", kind: "pin", col: 0, row: 0, at: "SIG", note: "The pulse is 1 to 2 ms wide, every 20 ms. Its width is the angle you want." },
      { id: "ctrl", label: "Control chip", sub: "with H-bridge", kind: "ic", col: 1, row: 0, at: { x: 41, y: AY }, note: "Measures the pulse, reads the potentiometer, and drives the motor the right way until the two match." },
      { id: "motor", label: "Brushed motor", sub: "900 mA running", kind: "actuator", col: 2, row: 0, at: "case", note: "Takes about 500 mA at 4.8 V and 900 mA at 6 V when it is turning, and about 2.5 A when it is stuck." },
      { id: "gears", label: "Metal gears", kind: "passive", col: 3, row: 0, at: "gears", note: "Slow the motor down and give 11 kg·cm at 6 V." },
      { id: "horn", label: "Horn", sub: "about 180°", kind: "actuator", col: 4, row: 0, at: "horn", note: "Your arm or wheel goes here. It holds its angle while the pulses keep coming." },
      { id: "vcc", label: "V+", sub: "4.8–7.2 V", kind: "power", col: 0, row: 1, at: "VCC", note: "All the motor's current comes in here, not through the signal wire." },
      { id: "gnd", label: "GND", kind: "ground", col: 0, row: 2, at: "GND", note: "Shared with your board, or the pulse means nothing." },
      { id: "pot", label: "Potentiometer", sub: "angle feedback", kind: "sensor", col: 3, row: 1, at: "spline", note: "A variable resistor turned by the output shaft. It tells the chip where the horn is, to within about 1 to 2°." },
    ],
    links: [
      { from: "sig", to: "ctrl", kind: "signal", label: "1–2 ms" },
      { from: "vcc", to: "ctrl", kind: "power", label: "up to 2.5 A" },
      { from: "gnd", to: "ctrl", kind: "ground" },
      { from: "ctrl", to: "motor", kind: "power", label: "forward or back" },
      { from: "motor", to: "gears", kind: "mechanical" },
      { from: "gears", to: "horn", kind: "mechanical", label: "0.14 s per 60°" },
      { from: "gears", to: "pot", kind: "mechanical" },
      { from: "pot", to: "ctrl", kind: "analog", label: "angle" },
    ],
    steps: [
      "Your board sends a pulse every 20 ms. A 1.5 ms pulse means the middle of the travel.",
      "The control chip reads the pot on the output shaft to find where the horn is now.",
      "If the horn is off by more than a hair, the chip runs the motor toward the target. The H-bridge reverses it if needed.",
      "When the pot matches the pulse the chip stops and then pushes back against anything that moves the horn, using current from V+ to hold the angle.",
    ],
  },
  facts: [
    { label: "Torque", value: "11 kg·cm at 6 V" },
    { label: "Speed", value: "0.14 s per 60° at 6 V" },
    { label: "Supply", value: "4.8–7.2 V" },
    { label: "Current", value: "900 mA turning, 2.5 A stalled" },
    { label: "Signal", value: "50 Hz, 1–2 ms pulse" },
    { label: "Size", value: "53.5 × 19.7 × 43 mm, 55 g" },
  ],
  spec: {
    form: {
      mass: 55,
      mount: "leads",
      pitch: 2.54,
      holes: [
        { x: 2.8, y: 4.85, d: 4.2 },
        { x: 2.8, y: 14.85, d: 4.2 },
        { x: 50.7, y: 4.85, d: 4.2 },
        { x: 50.7, y: 14.85, d: 4.2 },
      ],
      note: "Bolts through four holes in its ears. The 3-pin female housing plugs onto a header: brown on ground. Ears and hole positions are from the usual drawing; check yours.",
    },
    power: {
      supply: { min: 4.8, max: 7.2, typ: 6 },
      logic: 5,
      tolerant5V: true,
      draw: { idle: 10, active: 900, peak: 2500 },
      motor: { ratedV: 6, runMa: 900, stallMa: 2500, torque: "11 kg·cm at 6 V (9.4 at 4.8 V)" },
      interface: "PWM 50 Hz, 1.0 to 2.0 ms for about 180° (0.5 to 2.5 ms on many)",
      note: "Dead band 5 µs. At 4.8 V it takes 500 mA running and turns 60° in 0.17 s. Starting a move draws close to stall current.",
    },
    sourcing: { mpn: "MG996R", maker: "Tower Pro (and many clones)", lifecycle: "generic", usd: [4, 9], note: "Clones differ in gear metal and motor; some claim 13 kg·cm. Pulse range and travel (120° to 180°) differ too." },
    limits: [
      "Stalls at 2.5 A at 6 V. A USB port gives 0.5 A and an Uno's barrel-jack regulator about 1 A, so one servo pulling hard resets the board. Give it its own 5 V to 6 V supply of 3 A or more.",
      "Three moving together draw 1.5 A to 2.7 A.",
      "No overload protection: stalled for more than a few seconds it overheats and can strip a gear or burn its board.",
      "Position error of 1° to 2° and jitter at the ends; 0.5° to 1° of gear slack.",
      "The pulse range changes from clone to clone. Driving past the ends makes it stall.",
    ],
    upgrade: [
      { name: "DS3218 20 kg digital servo", why: "Ball bearings, 20 kg·cm at 6.8 V and a waterproof case, so it wears slowly. It costs more." },
      { name: "MG90S", why: "If the load is under 2 kg·cm: the same signals at about a fifth of the stall current." },
    ],
    refs: [
      "https://courses.ece.cornell.edu/ece5990/ECE5725_Spring2020_Projects/May_15_Demo/Smart Lock/W_pp445_yl656/datasheet/MG996R_Tower-Pro.pdf",
      "https://components101.com/node/467",
    ],
  },
  sim: { kind: "output" },
  animate: { sweep: ["horn", "horn-hub", "spline", "screw"], axis: { at: [AX, AY, 40], dir: "z" } },
  experiment: { title: "Sweep and watch the supply", idea: "Run it from a separate 5 V supply with the grounds joined and sweep 0° to 180°. Then hold the horn with your fingers: the current jumps to its stall value and the case warms up fast, so let go quickly." },
  tags: ["mg996r", "servo", "metal gear", "tower pro", "hobby servo", "robot arm", "pwm", "motor"],
});
