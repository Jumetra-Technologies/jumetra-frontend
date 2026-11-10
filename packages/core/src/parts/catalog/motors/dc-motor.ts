import { circlePath, definePart, gnd, pin, vcc, type Solid } from "../../sdk";

const GB_W = 37; // the gearbox is 37 mm long, 22.5 mm across and 18.5 mm tall
const W = 22.5;
const CY = W / 2;
const GB_D = 18.5;
const ZC = GB_D / 2; // the axle and the motor can sit at mid-height
const AX = 10; // the axle's distance from the gearbox end
const CAN_R = 10; // the can is a 20 mm round with a flat top and bottom, 15 mm tall
const CAN_H = 7.5;
const CAN_X0 = 36.6;
const CAN_X1 = 66;
const CAP_X1 = 68.4;
const END = 70;
const TAB_Y = [CY - 4.5, CY + 4.5];
const YELLOW = "#f2c21b";
const YELLOW_SIDE = "#c49a0f";

/** A lying round can with flats top and bottom, made of slabs whose width follows the circle. */
function canSlabs(x0: number, x1: number, r: number, half: number, color: string, side: string, finish: "aluminum" | "clear" | "plastic", id?: string): Solid[] {
  const n = 26;
  return Array.from({ length: n }, (_, i): Solid => {
    const z0 = -half + (i * 2 * half) / n;
    const z1 = z0 + (2 * half) / n;
    const mid = (z0 + z1) / 2;
    const width = 2 * Math.sqrt(Math.max(r * r - mid * mid, 0.5));
    return { kind: "box", id: i === 13 ? id : undefined, x: x0, y: CY - width / 2, w: x1 - x0, h: width, d: z1 - z0, z: ZC + z0, top: color, side, finish, radius: 0.02 };
  });
}

export default definePart({
  id: "dc-motor",
  name: "DC gear motor (TT)",
  aka: ["TT motor", "yellow gear motor", "robot wheel motor", "TT gearmotor", "hobby gear motor"],
  group: "motors",
  rank: 2,
  summary: "The yellow motor under every classroom robot. Spins one way or the other depending on which way the current flows; a gearbox turns speed into push.",
  size: { w: 70, h: 22.5, d: 18.5 },
  solids: [
    // Yellow gearbox with the double-D axle through it, sticking out about 7.7 mm each side.
    { kind: "box", id: "gearbox", x: 0, y: 0, w: GB_W, h: W, d: GB_D, top: YELLOW, side: YELLOW_SIDE, finish: "plastic", radius: 1.5 },
    { kind: "cyl", cx: AX, cy: -0.5, r: 4, d: 1, z: ZC - 4, axis: "y", top: YELLOW, side: YELLOW_SIDE, finish: "plastic" },
    { kind: "cyl", cx: AX, cy: W + 0.5, r: 4, d: 1, z: ZC - 4, axis: "y", top: YELLOW, side: YELLOW_SIDE, finish: "plastic" },
    { kind: "cyl", id: "shaft", cx: AX, cy: CY, r: 2.7, d: 37.9, z: ZC - 2.7, axis: "y", top: "#ebe8df", side: "#c9c6bd", finish: "plastic" },
    { kind: "box", id: "flat-a", x: AX - 1.95, y: -7.7, w: 3.9, h: 7.7, d: 0.1, z: ZC + 1.85, top: "#f6f4ee", finish: "plastic" },
    { kind: "box", id: "flat-b", x: AX - 1.95, y: W, w: 3.9, h: 7.7, d: 0.1, z: ZC + 1.85, top: "#f6f4ee", finish: "plastic" },
    // Three mounting holes (two at the axle end, one at the far end) and the ratio molded on top.
    ...[
      [7.2, 3.5],
      [7.2, 19],
      [30, CY],
    ].map(([cx, cy]): Solid => ({ kind: "disc", cx, cy, r: 1.5, color: "#3d3205", z: GB_D, ring: { color: "#a67f08", width: 0.4 } })),
    { kind: "text", x: 21, y: 7, text: "1:48", size: 2.4, color: "#8a6c0a", anchor: "middle", weight: 700, z: GB_D },
    // Silver motor can, held to the gearbox by a clear plastic strap, with a dark end cap and two solder tabs.
    canSlabs(CAN_X0, CAN_X1, CAN_R, CAN_H, "#c3c6cb", "#9ea2a8", "aluminum", "can"),
    canSlabs(CAN_X0 + 0.6, CAN_X0 + 4.6, CAN_R + 0.7, CAN_H + 0.6, "#ddd9b8", "#b8b497", "clear"),
    { kind: "text", x: 54, y: CY, text: "FA-130", size: 2.2, color: "#4a4d52", anchor: "middle", weight: 700, z: ZC + CAN_H + 0.01 },
    canSlabs(CAN_X1, CAP_X1, CAN_R - 0.6, CAN_H - 0.4, "#2a2a2d", "#17171a", "plastic"),
    ...TAB_Y.map((y): Solid => ({ kind: "box", x: CAP_X1, y: y - 0.25, w: END - CAP_X1, h: 0.5, d: 4.2, z: ZC - 2.1, top: "#c98a4a", finish: "tin" })),
    ...TAB_Y.map((y): Solid => ({ kind: "disc", cx: CAP_X1 + 1.1, cy: y, r: 0.4, color: "#2a2a2d", z: ZC + 2.1 })),
  ],
  features: [
    { id: "shaft", label: "Double-D axle", kind: "mechanical", x: AX - 2.7, y: -7.7, w: 5.4, h: 37.9, note: "A 5.4 mm axle with two flats, so a wheel can't slip. The same axle comes out of both sides of the gearbox." },
    { id: "gearbox", label: "Gearbox (1:48)", kind: "mechanical", x: 0, y: 0, w: GB_W, h: W, note: "Plastic spur gears; the ratio trades speed for torque. 1:90 and 1:120 variants look the same." },
    { id: "can", label: "Motor can", kind: "other", x: CAN_X0, y: CY - CAN_R, w: CAN_X1 - CAN_X0, h: 2 * CAN_R, note: "A brushed DC motor of the FA-130 size, spinning at thousands of rpm before the gears slow it down. A clear plastic strap holds it to the gearbox." },
    { id: "terminals", label: "Solder tabs", kind: "pins", x: CAP_X1 - 1, y: TAB_Y[0] - 1, w: END - CAP_X1 + 1.6, h: TAB_Y[1] - TAB_Y[0] + 2, note: "Two flat tabs on the end cap. Solder a wire to each, or a pair of header pins. There is no polarity: swap them to reverse the direction." },
  ],
  pins: [
    vcc("VM", "Motor supply, 3 V to 6 V, taken through the driver. On the bench, the motor's two tabs go to a motor driver's outputs and the driver takes this supply.", { label: "VM" }),
    gnd("GND", "Ground, shared with the driver, the batteries and your board.", { label: "GND" }),
    pin("IN1", "digital", "drive", "Direction, on the driver. High on IN1 with low on IN2 turns one way; the other way round turns it back.", { label: "IN1", required: false }),
    pin("IN2", "digital", "drive", "Direction, on the driver. See IN1.", { label: "IN2", required: false }),
    pin("EN", "pwm", "pwm", "Speed, on the driver: a PWM signal that sets the share of time the motor is switched on.", { label: "EN / PWM", required: false }),
  ],
  // The real part has two solder tabs, not the five lab pins. The tabs are placed by hand.
  spots: [
    { id: "M1", label: "Tab 1", role: "power", x: END, y: TAB_Y[0], note: "Motor tab. On the bench it goes to one output of a motor driver. Swap tabs 1 and 2 to reverse the direction." },
    { id: "M2", label: "Tab 2", role: "power", x: END, y: TAB_Y[1], note: "Motor tab. On the bench it goes to the other output of the driver." },
  ],
  circuit: {
    blocks: [
      { id: "pwm", label: "PWM + IN1/IN2", sub: "from your board", kind: "pin", col: 0, row: 0, note: "Three pins: speed and direction." },
      { id: "hb", label: "H-bridge", sub: "L298N / TB6612", kind: "driver", col: 1, row: 0, note: "Four switches that route the supply through the motor either way. Your board's pins can't supply this current." },
      { id: "m1", label: "Tab 1", kind: "pin", col: 2, row: 0, at: "M1", note: "One terminal." },
      { id: "rotor", label: "Rotor + brushes", sub: "thousands of rpm", kind: "actuator", col: 3, row: 0, at: "can", note: "Coils on the rotor, magnets on the can; the commutator keeps flipping the current so it keeps turning." },
      { id: "m2", label: "Tab 2", kind: "pin", col: 2, row: 1, at: "M2", note: "The other terminal." },
      { id: "gears", label: "Gear train", sub: "1:48", kind: "actuator", col: 3, row: 1, at: "gearbox", note: "Plastic gears." },
      { id: "shaft", label: "Axle", sub: "250 rpm at 6 V", kind: "actuator", col: 3, row: 2, at: "shaft", note: "Slow and strong enough to push a small robot: 120 rpm at 3 V, 185 at 4.5 V, 250 at 6 V with nothing on it." },
      { id: "supply", label: "Motor supply", sub: "3–6 V, 150 mA free, 1.5 A stalled", kind: "power", col: 0, row: 1, note: "Batteries, not the board's 5 V pin." },
      { id: "gnd", label: "GND", kind: "ground", col: 0, row: 2, note: "Shared between the driver, the batteries and your board." },
    ],
    links: [
      { from: "pwm", to: "hb", kind: "signal" },
      { from: "supply", to: "hb", kind: "power" },
      { from: "hb", to: "m1", kind: "power" },
      { from: "m1", to: "rotor", kind: "power" },
      { from: "rotor", to: "m2", kind: "power" },
      { from: "m2", to: "hb", kind: "power", label: "return" },
      { from: "rotor", to: "gears", kind: "mechanical" },
      { from: "gears", to: "shaft", kind: "mechanical" },
      { from: "hb", to: "gnd", kind: "ground" },
    ],
    steps: [
      "Your board can't power a motor directly (20 mA to 40 mA per pin); an H-bridge driver switches the motor supply instead. IN1 and IN2 pick the direction, PWM the speed.",
      "Current flows through the brushes and commutator into the rotor coils; their magnetic field pushes against the magnets and the rotor spins.",
      "A 1:48 plastic gear train slows the motor and multiplies the torque; the double-D axle turns the wheel.",
      "Motors kick noise back into the supply: a 0.1 µF ceramic capacitor across the tabs and a separate battery for the motors keep the board happy.",
    ],
  },
  facts: [
    { label: "Supply", value: "3–6 V" },
    { label: "No-load speed", value: "120 / 185 / 250 rpm at 3 / 4.5 / 6 V" },
    { label: "Current", value: "150 mA free, 1.1–1.5 A stalled" },
    { label: "Ratio", value: "1:48 (1:90, 1:120 variants)" },
    { label: "Axle", value: "Double-D, 5.4 mm, out of both sides" },
    { label: "Size", value: "70 × 22.5 × 18.5 mm, 31 g" },
  ],
  spec: {
    form: {
      mass: 30.6,
      mount: "solder",
      holes: [
        { x: 7.2, y: 3.5, d: 3 },
        { x: 7.2, y: 19, d: 3 },
        { x: 30, y: CY, d: 3 },
      ],
      note: "In the lab this part stands for a motor with its driver, so it has five lab pins. The real motor has only two solder tabs, and on the bench they go to a motor driver's outputs. Kits ship it with two 200 mm leads (red and black, 28 AWG) on the tabs. A teardown finds three mounting points; the positions of the holes here are estimates.",
    },
    power: {
      supply: { min: 3, max: 6, typ: 4.5 },
      logic: 5,
      tolerant5V: true,
      draw: { idle: 150, active: 250, peak: 1500 },
      motor: { ratedV: 6, runMa: 150, stallMa: 1500, rpm: 250, torque: "0.4 kg·cm at 3 V, 0.8 kg·cm at 6 V" },
      interface: "Voltage sets speed and polarity sets direction. PWM 1 kHz to 20 kHz through a driver.",
      note: "Free-spinning draw is 150 mA, ±10%. Under a working load expect 250 mA to 600 mA. Stall is 1.1 A at 3 V, 1.2 A at 4.5 V and 1.5 A at 6 V. Rated 3 V to 6 V; it may not turn a wheel below about 3 V.",
    },
    sourcing: { mpn: "TT gear motor, 1:48", maker: "Generic (Adafruit sells it as product 3777)", lifecycle: "generic", usd: [1.5, 3], note: "Speed and quality differ between batches by about 10%. Metal-gear and encoder-disc versions use the same housing." },
    limits: [
      "Stall current is 1.1 A to 1.5 A, far above a GPIO pin (20 mA to 40 mA) and above the L293D's 600 mA per channel. Use a TB6612FNG or DRV8833.",
      "Stalled at 6 V it turns 9 W into heat and overheats in seconds; the rotor and gears are what fail. The maker gives no thermal limit.",
      "The brushes make electrical noise. A 0.1 µF ceramic across the tabs helps stop a microcontroller resetting.",
      "No feedback: speed depends on voltage and load, so two motors never match (10% or more apart).",
      "Plastic gears and a lot of backlash; stall torque is only 0.4 kg·cm to 0.8 kg·cm.",
    ],
    upgrade: [
      { part: "micro-gear-motor", name: "N20 micro gear motor with encoder", why: "All-metal gears and a 28-count encoder on the back, so the robot can drive straight and measure distance. It weighs 10 g against 31 g and fits a smaller chassis, for about the same price. It has less torque, so it suits light robots." },
      { name: "Pololu 37D metal gearmotor with encoder", why: "For a heavier robot: stall torque in tens of kg·cm. It costs about ten times as much." },
    ],
    refs: ["https://www.adafruit.com/product/3777", "https://docs.sunfounder.com/projects/3in1-kit-r4/en/latest/components/component_tt_motor.html", "https://newscrewdriver.com/2021/01/24/tt-gear-motor-teardown/"],
  },
  animate: { spin: ["shaft", "flat-a", "flat-b"], axis: { at: [AX, CY, ZC], dir: "y" } },
  experiment: { title: "Wheel speed ramp", idea: "Through an H-bridge, ramp PWM from 0 to 255 and back, then reverse; add a second motor for a two-wheel robot." },
  tags: ["dc", "motor", "tt", "gear", "wheel", "h-bridge", "robot", "yellow motor"],
});
