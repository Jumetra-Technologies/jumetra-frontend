import { MATERIAL, PCB_TOP, board, circlePath, definePart, gnd, jst, jumperCap, lead, name, pin, pinHeader, roundedRect, silk, smd, smdLed, vcc, type Solid } from "../../sdk";

// The driver board on the left, 35 × 32 mm, header on its left edge and the motor socket on its right edge.
const BW = 35;
const BH = 32;
const BY = 5.5;
const CYM = BY + BH / 2; // both the board's and the motor's center line
const BLUE = "#1b4fa8";

// The motor: a 28 mm steel can on the right, ears 35 mm apart, the wire cover facing the board.
const CAN_R = 14;
const CAN_H = 18.2;
const PLATE = 0.8;
const TOP = CAN_H + PLATE; // 19.0
const CX = 82.5;
const SHAFT_X = CX + 8; // off center, away from the cover
const COVER_X = 63;

const header = pinHeader(2.3, BY + 4.6, 6, { dir: "y" });
const jumper = pinHeader(2.3, BY + 23.6, 2, { dir: "y" });
const socket = jst(BW - 2.8, CYM, 5, "right", { pitch: 2.54, color: "#f2f0e8" });
const HEADER_IDS = ["IN1", "IN2", "IN3", "IN4", "GND", "VCC"];
const HEADER_LABELS = ["IN1", "IN2", "IN3", "IN4", "−", "+"];

/** The ULN2003A in a DIP-16, standing along y: 8 legs down each long side. */
function chipUpright(cx: number, cy: number, id: string): Solid[] {
  const solids: Solid[] = [
    { kind: "box", id, x: cx - 3.2, y: cy - 9.6, w: 6.4, h: 19.2, d: 3.8, z: PCB_TOP + 0.6, top: "#1b1c1f", side: "#101113", finish: "epoxy", radius: 0.3 },
    { kind: "disc", cx: cx - 1.8, cy: cy - 8.2, r: 0.6, color: "#33353a", z: PCB_TOP + 4.41 },
    { kind: "text", x: cx + 0.4, y: cy, text: "ULN2003A", size: 1.5, color: "#b8bcc2", anchor: "middle", rotate: 90, weight: 600, z: PCB_TOP + 4.41 },
  ];
  for (let i = 0; i < 8; i++) {
    const y = cy + (i - 3.5) * 2.54;
    for (const side of [-1, 1]) solids.push({ kind: "box", x: side < 0 ? cx - 4.5 : cx + 3.2, y: y - 0.25, w: 1.3, h: 0.5, d: 0.4, z: PCB_TOP + 0.4, top: MATERIAL.tin, finish: "tin" });
  }
  return solids;
}

// The motor's five wires, blue, pink, yellow, orange and red, from the plug to the cover.
const WIRES = ["#2f6fd6", "#ef7fb3", "#f5d90a", "#f08a24", "#d12d2d"];
const wires: Solid[] = WIRES.flatMap((color, i) => {
  const y0 = CYM + (i - 2) * 2.54;
  const y1 = CYM + (i - 2) * 1.4;
  const k = (t: number) => y0 + (y1 - y0) * t;
  return lead(
    [
      [39.4, y0, 4.6],
      [42.2, y0, 3.6],
      [45, k(0.15), 0.5],
      [52, k(0.5), 0.5],
      [58, k(0.85), 0.5],
      [61, y1, 3.4],
      [COVER_X + 0.5, y1, 5.5],
    ],
    color,
    { r: 0.45 },
  );
});

// Ears bar and top plate: both 0.8 mm of steel on top of the can.
const EAR_HOLES = [CYM - 17.5, CYM + 17.5];

export default definePart({
  id: "stepper-motor",
  name: "Stepper motor, 28BYJ-48 + ULN2003",
  aka: ["28BYJ-48", "stepper with driver", "ULN2003 stepper", "5 V stepper"],
  group: "motors",
  rank: 5,
  summary: "A motor that moves in exact steps, about 2038 of them per turn, with no feedback needed. Clocks, camera sliders, anything that must come back to the same spot.",
  size: { w: 97, h: 43, d: 29 },
  solids: [
    // The driver board: blue, with the ULN2003A, four LEDs, the header and the motor socket.
    board(BW, BH, BLUE, { outline: roundedRect(0, BY, BW, BH, 1), holes: [{ x: 3, y: BY + 29.5, d: 3 }, { x: 32, y: BY + 2.5, d: 3 }] }),
    header,
    jumper,
    jumperCap(2.3, BY + 24.87, "y", "#17181b"),
    socket,
    chipUpright(17, CYM, "uln"),
    ...[0, 1, 2, 3].flatMap((i): Solid[] => {
      const y = CYM + (i - 1.5) * 3.4;
      return [
        smdLed(9.4, y - 0.4, "#ff3b3b", `led-${i}`),
        ...smd(6.8, y - 0.4, "r", "x"),
        silk(11.2, y + 0.4, "ABCD"[i], 1.1, MATERIAL.silk),
      ];
    }),
    smd(24.4, BY + 6, "c", "y"),
    smd(24.4, BY + 10, "r", "y"),
    smd(24.4, BY + 22, "r", "y"),
    smd(24.4, BY + 26, "c", "y"),
    ...HEADER_LABELS.map((text, i) => silk(4.1, BY + 4.6 + i * 2.54 + 0.35, text, 1, MATERIAL.silk)),
    silk(4.5, BY + 25.2, "ON/OFF", 0.9, MATERIAL.silk),
    { kind: "text", x: 28, y: CYM, text: "ULN2003 DRIVER", size: 1.1, color: MATERIAL.silk, anchor: "middle", rotate: -90, weight: 700, z: PCB_TOP },
    // The mated plug: white, 5 pins, keyed, with the five wires leaving it.
    { kind: "box", id: "plug", x: BW - 0.55, y: CYM - 6, w: 5.2, h: 12, d: 5, z: PCB_TOP + 0.5, top: "#f4f2ea", side: "#cfccc2", finish: "plastic", radius: 0.4 },
    { kind: "box", x: BW - 0.55 + 4.6, y: CYM - 4.5, w: 0.6, h: 9, d: 3, z: PCB_TOP + 1.5, top: "#d8d5ca", finish: "plastic" },
    wires,
    // The motor: blue wire cover, round steel can, steel top plate with its ears and the off-center shaft.
    { kind: "box", id: "cover", x: COVER_X, y: CYM - 8, w: 6, h: 16, d: 9, z: 2, top: "#2a62c8", side: "#1f4c96", finish: "plastic", radius: 0.8 },
    { kind: "cyl", id: "can", cx: CX, cy: CYM, r: CAN_R, d: CAN_H, top: "#b8bcc2", side: "#9ea3aa", finish: "metal", segments: 48 },
    { kind: "cyl", cx: CX, cy: CYM, r: CAN_R, d: PLATE, z: CAN_H, top: "#c4c8ce", side: "#a3a8af", finish: "metal", segments: 48 },
    {
      kind: "extrude",
      id: "ears",
      path: [roundedRect(CX - 3.5, CYM - 21, 7, 42, 3.5), ...EAR_HOLES.map((y) => circlePath(CX, y, 2.1))].join(" "),
      d: PLATE,
      z: CAN_H,
      top: "#c4c8ce",
      side: "#a3a8af",
      finish: "metal",
    },
    { kind: "text", x: CX - 8.5, y: CYM, text: "28BYJ-48", size: 2, color: "#3d4046", anchor: "middle", rotate: -90, weight: 700, z: TOP + 0.01 },
    { kind: "text", x: CX - 12, y: CYM, text: "5V DC", size: 1.5, color: "#3d4046", anchor: "middle", rotate: -90, z: TOP + 0.01 },
    { kind: "cyl", cx: SHAFT_X, cy: CYM, r: 4.5, d: 1.6, z: TOP, top: "#b4b9c0", side: "#8f949b", finish: "metal", segments: 28 },
    { kind: "box", id: "shaft", x: SHAFT_X - 1.5, y: CYM - 2.5, w: 3, h: 5, d: 8.4, z: TOP + 1.6, top: "#e6c84a", side: "#b89a2a", finish: "brass", radius: 1.2 },
  ],
  features: [
    { id: "shaft", label: "Shaft", kind: "mechanical", x: SHAFT_X - 2.5, y: CYM - 2.5, w: 5, h: 5, note: "5 mm across with two flats 3 mm apart, 10 mm long. It sits 8 mm off the center of the can. About 2038 full steps turn it once." },
    { id: "can", label: "Motor can", kind: "other", x: CX - CAN_R, y: CYM - CAN_R, w: 2 * CAN_R, h: 2 * CAN_R, note: "A round steel can, 28 mm across and 19 mm deep. A unipolar stepper: four coils around a toothed rotor, plus a 1:64 gear train under the lid." },
    { id: "ears", label: "Mounting ears", kind: "mechanical", x: CX - 3.5, y: CYM - 21, w: 7, h: 42, note: "Two steel ears with slots, 35 mm apart, for M4 screws." },
    { id: "cover", label: "Wire cover", kind: "other", x: COVER_X, y: CYM - 8, w: 6, h: 16, note: "A blue plastic cover over the place where the five coil wires leave the can." },
    { id: "cable", label: "5-wire lead", kind: "connector", x: 39.4, y: CYM - 6, w: COVER_X - 39.4, h: 12, note: "Blue, pink, yellow and orange are the coil ends, red is the common. The real lead is about 25 cm long and plugs straight into the driver board. Cut short here." },
    { id: "socket", label: "Motor socket", kind: "connector", x: BW - 5.3, y: CYM - 7, w: 10, h: 14, note: "A white 5-pin socket. The plug is keyed and fits one way. It is how the motor gets its coils and its common +5 V." },
    { id: "uln", label: "ULN2003A", kind: "chip", x: 12.6, y: CYM - 9.6, w: 9.6, h: 19.2, note: "Seven Darlington transistor pairs; four are used to sink the coil currents your board's pins cannot. 500 mA a channel." },
    { id: "leds", label: "A B C D LEDs", kind: "led", x: 6.8, y: CYM - 6.1, w: 4.2, h: 12.2, note: "One per coil; they chase round as the motor steps." },
    { id: "header", label: "IN1–IN4, −, +", kind: "pins", x: 1.03, y: BY + 3.33, w: 2.54, h: 15.24, note: "IN1 to IN4 from four digital pins; − and + take 5 V for the motor." },
    { id: "jumper", label: "ON/OFF jumper", kind: "other", x: 1.03, y: BY + 22.3, w: 2.54, h: 5.08, note: "Take the cap off to cut the motor's power. The logic pins are not affected." },
  ],
  pins: [
    pin("IN1", "digital", "drive", "Drives coil A, the blue wire. Four digital pins in sequence step the motor.", { label: "IN1" }),
    pin("IN2", "digital", "drive", "Drives coil B, the pink wire.", { label: "IN2" }),
    pin("IN3", "digital", "drive", "Drives coil C, the yellow wire.", { label: "IN3" }),
    pin("IN4", "digital", "drive", "Drives coil D, the orange wire.", { label: "IN4" }),
    vcc("VCC", "Motor supply, 5 V, about 240 mA at most. The board takes 5 V to 12 V but this motor is rated 5 V. A separate supply is best: a USB-powered board is marginal.", { label: "+" }),
    gnd("GND", "Ground. Must be joined to your board's ground.", { label: "−" }),
  ],
  pinAt: { ...name(header, ...HEADER_IDS) },
  circuit: {
    blocks: [
      { id: "pins", label: "IN1–IN4", sub: "step sequence", kind: "pin", col: 0, row: 0, at: "header", note: "Your board energises the coils in order; the Stepper or AccelStepper libraries do it." },
      { id: "uln", label: "ULN2003A", sub: "Darlington sinks", kind: "driver", col: 1, row: 0, at: "uln", note: "Each input turns on a transistor pair that pulls one coil to ground." },
      { id: "coils", label: "Four coils", sub: "red = common, 50 Ω each", kind: "actuator", col: 2, row: 0, at: "can", note: "Electromagnets around the rotor; the red wire feeds them all from +5 V. Each takes about 100 mA." },
      { id: "rotor", label: "Rotor", sub: "32 steps / rev", kind: "actuator", col: 3, row: 0, at: "can", note: "A toothed permanent magnet that snaps to whichever coil is on." },
      { id: "gears", label: "Gear train", sub: "63.68 : 1 (1:64 on the label)", kind: "actuator", col: 3, row: 1, at: "can", note: "Slows the rotor and multiplies torque. The real ratio, measured, is 63.68395 to 1, not exactly 64." },
      { id: "shaft", label: "Shaft", sub: "2037.9 steps / rev", kind: "actuator", col: 3, row: 2, at: "shaft", note: "About 15 rpm at most; faster and it skips steps." },
      { id: "vcc", label: "+5 V", sub: "about 240 mA", kind: "power", col: 2, row: 1, at: "VCC", note: "The motor supply, through the red wire." },
      { id: "leds", label: "A–D LEDs", kind: "actuator", col: 1, row: 1, at: "leds", note: "Show which coil is energised." },
      { id: "gnd", label: "GND", kind: "ground", col: 0, row: 1, at: "GND", note: "Ground." },
    ],
    links: [
      { from: "pins", to: "uln", kind: "signal", label: "4 lines" },
      { from: "uln", to: "coils", kind: "power", label: "sinks current" },
      { from: "vcc", to: "coils", kind: "power" },
      { from: "coils", to: "rotor", kind: "mechanical", label: "magnetic pull" },
      { from: "rotor", to: "gears", kind: "mechanical" },
      { from: "gears", to: "shaft", kind: "mechanical" },
      { from: "uln", to: "leds", kind: "signal" },
      { from: "uln", to: "gnd", kind: "ground" },
    ],
    steps: [
      "Your board energises the four coils in sequence (full or half-step). The ULN2003 sinks the current each coil needs; the LEDs show which is on.",
      "Each coil pulls the toothed rotor one step round: 32 steps for a full turn of the rotor.",
      "A gear train of 63.68 to 1 slows it, so the shaft needs 2037.9 full steps (4075.8 half-steps) per turn: slow, strong-ish and exact, no feedback needed.",
      "Top speed is about 15 rpm; faster and it skips. Power the coils from 5 V with enough current, not from the board's 3.3 V pin.",
    ],
  },
  facts: [
    { label: "Steps", value: "2037.9 per turn (4075.8 half-steps)" },
    { label: "Gear ratio", value: "63.68 : 1 (called 1:64)" },
    { label: "Supply", value: "5 V, 100 mA a coil, 240 mA at most" },
    { label: "Torque", value: "0.3 kg·cm (about 3 N·cm) pull-in" },
    { label: "Max speed", value: "about 15 rpm" },
    { label: "Driver", value: "ULN2003A board, 500 mA a channel" },
  ],
  spec: {
    form: {
      mass: 35,
      mount: "jumpers",
      pitch: 2.54,
      holes: [
        { x: CX, y: EAR_HOLES[0], d: 4.2 },
        { x: CX, y: EAR_HOLES[1], d: 4.2 },
        { x: 3, y: BY + 29.5, d: 3 },
        { x: 32, y: BY + 2.5, d: 3 },
      ],
      note: "One part in the lab: the motor, a lead 25 cm long (cut short here) and the driver board. The motor is a 28 mm steel can, 19 mm deep, with ears 35 mm apart. The blue board is 35 × 32 mm on most, though one seller lists 40 × 20 mm; the lead plugs into a keyed 5-pin socket and the control header is 2.54 mm. Board holes and the exact layout vary between makers.",
    },
    power: {
      supply: { min: 5, max: 5, typ: 5 },
      logic: 5,
      tolerant5V: true,
      draw: { idle: 0, active: 200, peak: 240 },
      motor: { ratedV: 5, runMa: 200, stallMa: 240, rpm: 15, torque: "0.3 kg·cm pull-in" },
      interface: "4 inputs IN1–IN4, coils driven directly. Half-step sequence 1000, 1100, 0100, 0110, 0010, 0011, 0001, 1001.",
      note: "Coils are 50 Ω (one source says 60 Ω), 100 mA each at 5 V; two on is 160 mA to 240 mA. Idle with the coils off is 0 mA, but holding a position keeps one or two coils on, 80 mA to 200 mA. Each ULN2003 input takes about 1 mA. The driver drops about 0.9 V per channel, so a coil sees about 4 V. The board accepts 5 V to 12 V, but this 5 V motor must not get more than 5 V; 12 V versions look the same, so check the label.",
    },
    sourcing: { mpn: "28BYJ-48-5V + ULN2003A board", maker: "Generic motor (Kiatronics type); the ULN2003A is made by TI, ON and ST", lifecycle: "generic", usd: [2, 5], note: "The ULN2003A has been in production for decades. 12 V versions of the motor look identical." },
    limits: [
      "Steps per turn are 2037.9 full steps (4075.8 half-steps), not 2048 (4096): the real gear ratio is 63.68395 to 1, not 64. Moves of many turns drift by about 0.5% unless you correct for it.",
      "Torque is only 0.3 kg·cm (3 N·cm) pull-in, and the top speed is about 10 rpm to 15 rpm. Over about 100 steps a second it skips steps.",
      "It draws 80 mA to 240 mA all the time it holds a position, because the coils stay on. Nothing releases them for you, and the motor warms up (about 1 W with two coils on).",
      "The Darlington drop is about 0.9 V a channel, so the coils see about 4 V, not 5 V.",
      "About 1° of backlash in the gears. Unipolar drive can't microstep and is noisy.",
    ],
    upgrade: [
      { part: "nema17", name: "NEMA 17 stepper with an A4988 driver", why: "About 43 N·cm against 3 N·cm, which is some 14 times the torque. 200 steps a turn that the A4988 divides by up to 16 (3,200), and a current limit you set with a trimmer. It wants 12 V to 24 V and an A4988 or DRV8825 driver board, and costs more." },
      { part: "micro-gear-motor", name: "N20 gear motor with encoder", why: "Faster and closed loop for the same price. Use a stepper only when you need to position without a sensor." },
    ],
    refs: [
      "https://www.makerguides.com/28byj-48-stepper-motor-arduino-tutorial/",
      "https://botland.store/stepper-motors/12807-stepper-motor-28byj-48-5v-01a-003nm-with-uln2003-controller-5904422306410.html",
      "https://www.utmel.com/components/28byj-48-5v-stepper-motor-28byj-48-datasheet-pinout-wiring?id=1294",
      "https://www.makerguides.com/wp-content/uploads/2019/04/ULN2003-Stepper-Motor-Driver-PCB.pdf",
    ],
  },
  lab: { supply: [4.5, 5.5] },
  animate: { spin: ["shaft"], lit: ["led-0", "led-1", "led-2", "led-3"], axis: { at: [SHAFT_X, CYM, TOP], dir: "z" } },
  experiment: { title: "One exact turn", idea: "Step exactly one revolution clockwise, pause, then back; mark the shaft with tape and check it returns to the mark." },
  tags: ["stepper", "28byj-48", "uln2003", "motor", "steps", "precise", "unipolar"],
});
