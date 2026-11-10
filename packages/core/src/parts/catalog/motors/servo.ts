import { circlePath, definePart, gnd, lead, pin, roundedRect, vcc, type Solid } from "../../sdk";

const BLUE = "#2b63b6";
const BLUE_SIDE = "#1f4c96";
const L = 4.85; // the case starts here: the mounting tabs stick out 4.85 mm at each end
const CASE_W = 22.5;
const W = 12.2;
const CY = W / 2;
const AX = 10.85; // the output shaft: 6 mm in from the end of the case
const TABS = 15; // underside of the mounting tabs
const TABS_TOP = 17.5;
const CASE_TOP = 22.7;
const BOSS_TOP = 26;
const HORN = 26.2; // underside of the horn, sitting on the spline

// Single-arm horn: a 7 mm hub, a tapering arm 21 mm long in all, and a row of small holes.
const HUB_R = 3.5;
const TIP_R = 2.2;
const TIP_X = AX + 15.5;
function hornPath(): string {
  const len = TIP_X - AX;
  const s = (HUB_R - TIP_R) / len;
  const c = Math.sqrt(1 - s * s);
  const f = (n: number) => n.toFixed(3);
  const bx = AX + HUB_R * s;
  const by = HUB_R * c;
  const tx = TIP_X + TIP_R * s;
  const ty = TIP_R * c;
  const outline = `M ${f(bx)} ${f(CY - by)} L ${f(tx)} ${f(CY - ty)} A ${TIP_R} ${TIP_R} 0 0 1 ${f(tx)} ${f(CY + ty)} L ${f(bx)} ${f(CY + by)} A ${HUB_R} ${HUB_R} 0 1 1 ${f(bx)} ${f(CY - by)} Z`;
  const holes = [6.4, 8.9, 11.4, 13.9].map((dx) => circlePath(AX + dx, CY, 0.5));
  return [outline, ...holes].join(" ");
}

// Three wires in a flat ribbon, brown, red and orange, from the case to the 3-pin housing.
const WIRES = [
  { pin: "GND", color: "#6a3d20" },
  { pin: "VCC", color: "#c62b2b" },
  { pin: "SIG", color: "#f08a24" },
];
const HOUSING_X = 41;
const MOUTH_X = 51;
const HOUSING_Y = CY + 13;
const housingY = (i: number) => HOUSING_Y + (i - 1) * 2.54;
const ribbon: Solid[] = WIRES.flatMap((w, i) => {
  const y0 = CY + (i - 1) * 1.1;
  const y1 = housingY(i);
  const k = (t: number) => y0 + (y1 - y0) * t;
  return lead(
    [
      [L + CASE_W + 0.4, y0, 2.6],
      [L + CASE_W + 3, y0, 2.2],
      [33, k(0.05), 0.9],
      [35.5, k(0.25), 0.5],
      [37.5, k(0.55), 0.5],
      [39.2, k(0.85), 0.5],
      [HOUSING_X - 0.5, y1, 0.8],
      [HOUSING_X + 1.5, y1, 1.4],
    ],
    w.color,
    { r: 0.5 },
  );
});

export default definePart({
  id: "servo",
  name: "Servo, SG90",
  aka: ["micro servo", "9 g servo", "hobby servo", "SG90", "TowerPro SG90"],
  group: "motors",
  rank: 1,
  summary: "A motor that goes where you tell it: send an angle, it turns there and holds. Robot arms, steering, the lid that opens by itself.",
  size: { w: 32.2, h: 12.2, d: 29 },
  solids: [
    // Blue case in three parts: the lower case, the flange with its two mounting tabs, and the upper case.
    { kind: "box", id: "body", x: L, y: 0, w: CASE_W, h: W, d: TABS, top: BLUE, side: BLUE_SIDE, finish: "plastic", radius: 0.8 },
    {
      kind: "extrude",
      id: "ears",
      path: [roundedRect(0, 0, 32.2, W, 0.8), circlePath(2.5, CY, 1), circlePath(29.7, CY, 1)].join(" "),
      d: TABS_TOP - TABS,
      z: TABS,
      top: BLUE,
      side: BLUE_SIDE,
      finish: "plastic",
    },
    { kind: "box", x: L, y: 0, w: CASE_W, h: W, d: CASE_TOP - TABS_TOP, z: TABS_TOP, top: BLUE, side: BLUE_SIDE, finish: "plastic", radius: 0.8 },
    // The round boss over the output gear, the smaller one over the position pot, and the web between them.
    { kind: "box", x: AX + 3, y: CY - 1.9, w: 7, h: 3.8, d: 1.2, z: CASE_TOP, top: BLUE, side: BLUE_SIDE, finish: "plastic", radius: 0.4 },
    { kind: "cyl", id: "pot-boss", cx: AX + 7.2, cy: CY, r: 2.7, d: 2.2, z: CASE_TOP, top: BLUE, side: BLUE_SIDE, finish: "plastic", segments: 24 },
    { kind: "cyl", cx: AX, cy: CY, r: 5.9, d: BOSS_TOP - CASE_TOP, z: CASE_TOP, top: BLUE, side: BLUE_SIDE, finish: "plastic", segments: 32 },
    { kind: "text", x: 22.6, y: 10.5, text: "SG90 9g", size: 1.4, color: "#e8edf5", anchor: "middle", weight: 700, z: CASE_TOP + 0.01 },
    // White spline on the output shaft, the single-arm horn pushed onto it, and the one screw that holds it.
    { kind: "cyl", id: "spline", cx: AX, cy: CY, r: 2.4, d: 2.8, z: BOSS_TOP, top: "#f1f1ee", side: "#d4d6d9", finish: "plastic", segments: 21 },
    { kind: "extrude", id: "horn", path: hornPath(), d: 1.5, z: HORN, top: "#f4f4f1", side: "#d4d6d9", finish: "plastic", bevel: 0.2 },
    { kind: "cyl", id: "horn-hub", cx: AX, cy: CY, r: 2.9, d: 1, z: HORN + 1.5, top: "#f4f4f1", side: "#d4d6d9", finish: "plastic", segments: 24 },
    { kind: "cyl", id: "screw", cx: AX, cy: CY, r: 1.1, d: 0.3, z: 28.7, top: "#8a8e94", finish: "metal" },
    // The cable leaves the end of the case low down, through a small rubber collar.
    { kind: "box", x: L + CASE_W, y: CY - 2.4, w: 0.9, h: 4.8, d: 3.2, z: 1.1, top: "#17181b", finish: "rubber", radius: 0.4 },
    ribbon,
    // 3-pin housing, lying on the bench with its mouth facing away from the servo.
    { kind: "box", id: "housing", x: HOUSING_X, y: HOUSING_Y - 3.9, w: MOUTH_X - HOUSING_X, h: 7.8, d: 2.8, top: "#1c1c1f", side: "#121214", finish: "plastic", radius: 0.4 },
    { kind: "box", x: HOUSING_X + 1.5, y: HOUSING_Y - 3.9, w: 0.8, h: 7.8, d: 3.3, top: "#1c1c1f", finish: "plastic" },
    ...WIRES.map((_, i) => ({ kind: "box", x: MOUTH_X - 0.4, y: housingY(i) - 0.55, w: 0.45, h: 1.1, d: 1.1, z: 0.85, top: "#05060a", finish: "plastic" }) as Solid),
  ],
  features: [
    { id: "horn", label: "Horn", kind: "mechanical", x: AX - HUB_R, y: CY - HUB_R, w: 2 * HUB_R + 15.5 - 1.3, h: 2 * HUB_R, note: "The white arm that turns. Push it onto the spline and hold it with the one screw. Your wheel, leg or lever bolts to its small holes. It swings through about 180°. Fit it after sending 90°, so center is center." },
    { id: "spline", label: "Output spline", kind: "mechanical", x: AX - 2.4, y: CY - 2.4, w: 4.8, h: 4.8, note: "A 21-tooth plastic shaft on the last gear. The position pot turns with it." },
    { id: "ears", label: "Mounting tabs", kind: "mechanical", x: 0, y: 0, w: 32.2, h: W, note: "One tab at each end of the case, 2 mm holes, 27.2 mm apart. Use tiny screws or a zip tie." },
    { id: "body", label: "Case", kind: "other", x: L, y: 0, w: CASE_W, h: W, note: "A small motor, a four-stage plastic gear train, a potentiometer and the control board, all in a blue case 22.5 × 12.2 mm." },
    { id: "pot", label: "Position pot", kind: "sensor", x: AX + 4.5, y: CY - 2.7, w: 5.4, h: 5.4, note: "The small boss under which a potentiometer turns with the output gear. It tells the chip where the horn is." },
    { id: "lead", label: "3-wire lead", kind: "connector", x: L + CASE_W, y: CY - 2.4, w: 30, h: 15, note: "Brown for ground, red for power, orange for the signal. It is about 25 cm long on the real part and is cut short here." },
    { id: "housing", label: "3-pin housing", kind: "connector", x: HOUSING_X, y: HOUSING_Y - 3.9, w: MOUTH_X - HOUSING_X, h: 7.8, note: "A female plug at 2.54 mm spacing. It pushes straight onto three header pins, brown on ground." },
  ],
  pins: [
    gnd("GND", "Ground, brown wire. Shared with the board and the servo's supply.", { label: "GND (brown)" }),
    vcc("VCC", "Servo power, red wire: 4.8 V to 6 V. A separate 5 V supply is best if there is more than one servo.", { label: "VCC (red)" }),
    pin("SIG", "pwm", "pwm", "Orange wire. A 50 Hz pulse sets the angle: 1 ms is one end, 1.5 ms the middle, 2 ms the other end. 3.3 V signals work.", { label: "Signal (orange)" }),
  ],
  pinAt: {
    GND: { x: MOUTH_X, y: housingY(0) },
    VCC: { x: MOUTH_X, y: housingY(1) },
    SIG: { x: MOUTH_X, y: housingY(2) },
  },
  circuit: {
    blocks: [
      { id: "sig", label: "Signal", sub: "1–2 ms pulse, 50 Hz", kind: "pin", col: 0, row: 0, at: "SIG", note: "servo.write(angle) makes this pulse for you." },
      { id: "ctl", label: "Control IC", sub: "pulse vs. pot", kind: "ic", col: 1, row: 0, at: { x: 22, y: CY }, note: "Compares where you asked for with where the pot says it is." },
      { id: "hb", label: "H-bridge", kind: "driver", col: 2, row: 0, at: { x: 22, y: CY - 3 }, note: "Drives the motor either way, hard while the error is big." },
      { id: "motor", label: "DC motor", sub: "small coreless", kind: "actuator", col: 3, row: 0, at: { x: 24, y: CY + 2.5 }, note: "A small coreless motor. It takes 100 mA to 250 mA while it turns." },
      { id: "gears", label: "Gear train", sub: "4 stages", kind: "actuator", col: 3, row: 1, at: "body", note: "Slows the motor down and multiplies its torque." },
      { id: "shaft", label: "Output shaft", sub: "0–180°", kind: "actuator", col: 3, row: 2, at: "spline", note: "What the horn is pushed onto." },
      { id: "pot", label: "Position pot", sub: "turns with shaft", kind: "passive", col: 2, row: 2, at: "pot", note: "The feedback: a potentiometer on the output gear." },
      { id: "vcc", label: "VCC 4.8–6 V", kind: "power", col: 0, row: 1, at: "VCC", note: "About 175 mA while it turns and 360 mA to 650 mA when it strains." },
      { id: "gnd", label: "GND", kind: "ground", col: 0, row: 2, at: "GND", note: "Ground." },
    ],
    links: [
      { from: "sig", to: "ctl", kind: "signal" },
      { from: "ctl", to: "hb", kind: "signal", label: "direction" },
      { from: "hb", to: "motor", kind: "power" },
      { from: "motor", to: "gears", kind: "mechanical" },
      { from: "gears", to: "shaft", kind: "mechanical" },
      { from: "shaft", to: "pot", kind: "mechanical" },
      { from: "pot", to: "ctl", kind: "analog", label: "feedback" },
      { from: "vcc", to: "ctl", kind: "power" },
      { from: "ctl", to: "gnd", kind: "ground" },
    ],
    steps: [
      "Every 20 ms your board sends a pulse 1 ms to 2 ms long. The control IC turns the pulse length into a target position.",
      "A potentiometer on the output shaft reports where the horn is now. The IC drives the motor through the H-bridge until the two agree.",
      "A four-stage gear train slows the motor and multiplies its torque. The last gear carries the spline and the pot.",
      "Hold the horn and the motor fights back, drawing 360 mA to 650 mA. Power servos from a separate 5 V supply with a shared GND.",
    ],
  },
  facts: [
    { label: "Travel", value: "180° (±90°)" },
    { label: "Torque", value: "1.2–1.8 kg·cm at 4.8 V" },
    { label: "Speed", value: "0.10–0.12 s per 60° at 4.8 V" },
    { label: "Supply", value: "4.8–6 V" },
    { label: "Stall current", value: "360 mA measured, up to 650 mA" },
    { label: "Size", value: "22.5 × 12.2 × 22.7 mm case, 32 mm across the tabs" },
  ],
  spec: {
    form: {
      mass: 9,
      mount: "leads",
      pitch: 2.54,
      holes: [
        { x: 2.5, y: CY, d: 2 },
        { x: 29.7, y: CY, d: 2 },
      ],
      note: "The case is 22.5 mm long and 12.2 mm wide, and 22.7 mm tall to its top face. About 29 mm with the horn on. Two 2 mm holes in the tabs, 32 mm tip to tip. A 25 cm lead (cut short here) ends in a 3-pin female housing for a header, brown on ground. Hole positions are from the usual drawing; check yours.",
    },
    power: {
      supply: { min: 4.8, max: 6, typ: 5 },
      logic: 5,
      tolerant5V: true,
      draw: { idle: 10, active: 175, peak: 650 },
      motor: { ratedV: 4.8, runMa: 175, stallMa: 650, torque: "1.2 to 1.8 kg·cm at 4.8 V" },
      interface: "PWM 50 Hz: 1.0 ms about 0°, 1.5 ms about 90°, 2.0 ms about 180° (0.5 to 2.4 ms on the maker's sheet)",
      note: "Idle 10 mA, moving 100 mA to 250 mA. Stall measured at 360 mA at 5 V; other sellers print 650 mA to 700 mA, so budget 650 mA. Dead band 10 µs. A 3.3 V signal works; the pulse needs about 2.5 V.",
    },
    sourcing: { mpn: "SG90", maker: "Tower Pro (and many clones)", lifecycle: "active", usd: [2, 5], note: "Clones (Emax ES08, Miuzei, \"SG90S\" with a metal output gear) look the same and take the same signals. Specs differ by 20% between sellers. A 360° version has the same case, but its signal sets speed, not angle." },
    limits: [
      "Plastic gears strip if the arm is forced. Stall torque is only 1.2 to 1.8 kg·cm.",
      "Held against a stop or stalled, it draws 360 mA to 700 mA and the motor warms up. The maker states no thermal limit, only 0 °C to 55 °C working.",
      "Several servos moving at once can pull 1 A or more and reset a board powered from USB (500 mA) or from its 5 V pin.",
      "The pulse range differs between clones: the ends may be 0.5 or 1.0 ms and 2.0 or 2.4 ms. Going past the stops makes it buzz and draw stall current.",
      "It moves only about 180°. Position error is 1° to 2°.",
    ],
    upgrade: [
      { part: "servo-mg996r", name: "MG996R metal-gear servo", why: "For loads the SG90 strips its gears on: 9.4 kg·cm at 4.8 V and metal gears. It is bigger and stalls at 2.5 A at 6 V, so it needs its own supply." },
      { name: "MG90S micro servo", why: "The same case and the same signals, with metal gears: 2.0 to 2.2 kg·cm at 4.8 V and it survives an accidental knock. It costs a little more and is a touch noisier." },
    ],
    refs: ["https://bit.nkust.edu.tw/~csshieh/teach/111A/mc/datasheet/SG90.pdf", "https://protosupplies.com/product/servo-motor-micro-sg90/"],
  },
  animate: { sweep: ["horn", "horn-hub", "spline", "screw"], axis: { at: [AX, CY, BOSS_TOP], dir: "z" } },
  experiment: { title: "Sweep and point", idea: "Sweep 0–180° and back, then map a potentiometer (or a distance reading) to the angle." },
  docs: "/docs/hardware-knowledge/servo-motor",
  tags: ["servo", "sg90", "pwm", "angle", "motor", "arm", "micro servo", "hobby servo"],
});
