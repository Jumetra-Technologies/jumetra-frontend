import { MATERIAL, board, definePart, gnd, name, pin, pinHeader, silk, vcc, type Solid } from "../../sdk";

const TOP = 1.6;
const CX = 13;
const CY = 14.5;
const BOX = 16;
const BOX_TOP = TOP + 11;
const STEEL = "#c9ccd1";
const BLUE = "#2f5fb0";
const BLUE_SIDE = "#1d3f80";
const BLACK = "#16171a";

const header = pinHeader(7.92, 31.6, 5, { style: "angled", out: "bottom" });

/** A small blue carbon pot on the side of the gimbal, with its three solder tabs folded down to the board. */
function pot(id: string, x: number, y: number, w: number, h: number): Solid[] {
  return [
    { kind: "box", id, x, y, w, h, d: 7, z: TOP, top: BLUE, side: BLUE_SIDE, radius: 0.5, finish: "plastic" },
    { kind: "box", x: x + 0.4, y: y + 0.4, w: w - 0.8, h: h - 0.8, d: 0.2, z: TOP + 7, top: "#3b6fc8", finish: "plastic", radius: 0.3 },
  ];
}

export default definePart({
  id: "joystick",
  name: "KY-023 two-axis joystick",
  aka: ["thumbstick", "analog joystick", "PS2 joystick", "KY023", "joystick module"],
  group: "controls",
  rank: 3,
  summary: "A thumbstick like the one on a game pad. Tilt it left and right and one voltage changes, up and down and a second one does. Push it straight down and it clicks like a button. Use it to steer a robot or a servo arm.",
  size: { w: 26, h: 36, d: 32 },
  solids: [
    // The black board; the stick sits in the middle and the header is along the bottom edge.
    ...board(26, 34, MATERIAL.pcbBlack, { radius: 0.4 }),
    // The metal gimbal box, with the two blue potentiometers riveted to two of its sides.
    { kind: "box", id: "gimbal", x: CX - BOX / 2, y: CY - BOX / 2, w: BOX, h: BOX, d: BOX_TOP - TOP, z: TOP, top: "#b9bdc3", side: "#8f949b", radius: 0.6, finish: "metal" },
    { kind: "disc", cx: CX, cy: CY, r: 5.4, color: "#4a4e55", z: BOX_TOP + 0.01 },
    // Rivets at the corners of the lid.
    ...[-6.8, 6.8].flatMap((dx) => [-6.8, 6.8].map((dy): Solid => ({ kind: "disc", cx: CX + dx, cy: CY + dy, r: 0.6, color: "#8f949b", z: BOX_TOP + 0.01 }))),
    ...pot("potx", 0.9, 10.5, 4.1, 8),
    ...pot("poty", 9, 2, 8, 4.5),
    // Folded steel tabs that hold the box to the board.
    ...[-4, 4].map((dx): Solid => ({ kind: "box", x: CX + dx - 1, y: CY + BOX / 2 - 0.1, w: 2, h: 0.5, d: 1.2, z: TOP - 0.2, top: STEEL, finish: "tin", radius: 0.05 })),
    ...[
      [5.4, 23.9],
      [20.6, 23.9],
      [3.2, 8.2],
      [22.8, 8.2],
    ].map(([x, y]): Solid => ({ kind: "disc", cx: x, cy: y, r: 0.75, color: MATERIAL.tin, z: TOP })),
    // The stick: a black bezel and cone on the box, the post, and the dished cap.
    { kind: "cyl", cx: CX, cy: CY, r: 5.4, d: 1.8, z: BOX_TOP, top: BLACK, side: "#0c0d0f", finish: "plastic" },
    { kind: "dome", id: "stick-base", cx: CX, cy: CY, r: 4.2, d: 3.2, z: BOX_TOP + 1.8, color: BLACK, finish: "rubber" },
    { kind: "cyl", id: "stick", cx: CX, cy: CY, r: 2.8, d: 25 - (BOX_TOP + 1.8), z: BOX_TOP + 1.8, top: "#1d1e22", side: "#0c0d0f", finish: "plastic" },
    { kind: "cyl", id: "cap", cx: CX, cy: CY, r: 7.2, r2: 9.5, d: 7, z: 25, top: BLACK, side: "#0c0d0f", finish: "rubber" },
    { kind: "cyl", id: "cap-dish", cx: CX, cy: CY, r: 7.6, d: 0.12, z: 32, top: "#26272b", finish: "rubber" },
    header,
    silk(CX, 28.4, "KY-023", 1.5, MATERIAL.silk, { anchor: "middle", weight: 700 }),
    silk(7.92, 30.3, "GND", 0.9, MATERIAL.silk, { rotate: -90 }),
    silk(10.46, 30.3, "+5V", 0.9, MATERIAL.silk, { rotate: -90 }),
    silk(13, 30.3, "VRx", 0.9, MATERIAL.silk, { rotate: -90 }),
    silk(15.54, 30.3, "VRy", 0.9, MATERIAL.silk, { rotate: -90 }),
    silk(18.08, 30.3, "SW", 0.9, MATERIAL.silk, { rotate: -90 }),
  ],
  features: [
    { id: "cap", label: "Thumb cap", kind: "mechanical", x: CX - 9.5, y: CY - 9.5, w: 19, h: 19, note: "A dished rubber cap, 19 mm across, sits on a 6 mm post. Spring-loaded: when you let go, the stick snaps back to the middle." },
    { id: "stick", label: "Stick", kind: "mechanical", x: CX - 2.8, y: CY - 2.8, w: 5.6, h: 5.6, note: "Tilts about 30° each way. Pressing straight down closes a tiny switch under the box." },
    { id: "gimbal", label: "Gimbal box", kind: "mechanical", x: CX - BOX / 2, y: CY - BOX / 2, w: BOX, h: BOX, note: "Two steel rockers inside, one for left and right and one for up and down. Each turns the shaft of a pot." },
    { id: "potx", label: "X potentiometer", kind: "sensor", x: 0.9, y: 10.5, w: 4.1, h: 8, note: "A 10 kΩ pot turned by the left-right rocker. Its wiper goes to VRx." },
    { id: "poty", label: "Y potentiometer", kind: "sensor", x: 9, y: 2, w: 8, h: 4.5, note: "A 10 kΩ pot turned by the up-down rocker. Its wiper goes to VRy." },
    { id: "header", label: "GND, +5V, VRx, VRy, SW", kind: "pins", x: 6.6, y: 30.3, w: 12.8, h: 14, note: "A right-angle header. Pin 1 is GND, on the left when you look at the stick from above with the header toward you." },
  ],
  pins: [
    vcc("VCC", "Supply for both pots. 5 V, or 3.3 V if your board's analog pins stop at 3.3 V. The outputs scale with it.", { label: "+5V" }),
    pin("VRX", "analog", "out-analog", "Left-right voltage. About half of VCC at rest, 0 V at one end, VCC at the other.", { label: "VRx" }),
    pin("VRY", "analog", "out-analog", "Up-down voltage. About half of VCC at rest.", { label: "VRy" }),
    pin("SW", "digital", "out-digital", "Pressing the stick pulls it to GND. When it is not pressed the pin floats: the board has no pull-up, so use INPUT_PULLUP.", { label: "SW" }),
    gnd("GND"),
  ],
  pinAt: name(header, "GND", "VCC", "VRX", "VRY", "SW"),
  circuit: {
    blocks: [
      { id: "hand", label: "Thumb", sub: "tilt and press", kind: "world", col: 0, row: 0, note: "Tilt the stick in any direction. Push straight down to click." },
      { id: "stick", label: "Stick", sub: "±30° each way", kind: "actuator", col: 1, row: 0, at: "stick", note: "The gimbal splits any tilt into a left-right part and an up-down part." },
      { id: "potx", label: "X pot", sub: "10 kΩ", kind: "passive", col: 2, row: 0, at: "potx", note: "The wiper moves along its track as the stick tilts left or right." },
      { id: "vrx", label: "VRx", sub: "0 V to VCC", kind: "pin", col: 3, row: 0, at: "VRX", note: "Wire to an analog pin. At rest it reads about 512 of 1023." },
      { id: "vcc", label: "VCC", sub: "5 V", kind: "power", col: 0, row: 1, at: "VCC", note: "Feeds both pots. About 1 mA in all at 5 V." },
      { id: "poty", label: "Y pot", sub: "10 kΩ", kind: "passive", col: 2, row: 1, at: "poty", note: "The same, turned by the up-down rocker." },
      { id: "vry", label: "VRy", sub: "0 V to VCC", kind: "pin", col: 3, row: 1, at: "VRY", note: "Wire to a second analog pin." },
      { id: "gnd", label: "GND", kind: "ground", col: 0, row: 2, at: "GND", note: "Ground for both pots and the switch." },
      { id: "click", label: "Click switch", sub: "under the stick", kind: "passive", col: 2, row: 2, at: { x: CX, y: CY }, note: "A tiny contact that closes when the stick is pushed down." },
      { id: "sw", label: "SW", sub: "low when pressed", kind: "pin", col: 3, row: 2, at: "SW", note: "Floating when idle. Turn on INPUT_PULLUP and it reads HIGH, then LOW on a click." },
    ],
    links: [
      { from: "hand", to: "stick", kind: "physical", label: "tilt" },
      { from: "stick", to: "potx", kind: "mechanical", label: "left-right" },
      { from: "stick", to: "poty", kind: "mechanical", label: "up-down" },
      { from: "stick", to: "click", kind: "mechanical", label: "press" },
      { from: "vcc", to: "poty", kind: "power" },
      { from: "vcc", to: "potx", kind: "power" },
      { from: "potx", to: "vrx", kind: "analog", label: "VCC × tilt" },
      { from: "poty", to: "vry", kind: "analog", label: "VCC × tilt" },
      { from: "gnd", to: "click", kind: "ground" },
      { from: "click", to: "sw", kind: "signal", label: "to GND" },
    ],
    steps: [
      "VCC and ground sit across two 10 kΩ pots, so each one is a voltage divider.",
      "You tilt the stick. The gimbal turns one pot for left-right and the other for up-down, and each wiper picks off a voltage in proportion to the tilt.",
      "At rest both wipers sit in the middle, about half of VCC. Your board's ADC reads about 512, give or take 30; use a dead zone so it doesn't drift.",
      "Push straight down and a small switch joins SW to ground. Read it with INPUT_PULLUP: HIGH is idle, LOW is a click.",
    ],
  },
  facts: [
    { label: "Axes", value: "2, 10 kΩ pots" },
    { label: "Supply", value: "3.3 to 5.5 V" },
    { label: "Travel", value: "about ±30°" },
    { label: "Rest reading", value: "about 512 of 1023" },
    { label: "Button", value: "Click, active low" },
    { label: "Size", value: "26 × 34 × 32 mm" },
  ],
  spec: {
    form: {
      mass: 8,
      mount: "jumpers",
      pitch: 2.54,
      note: "A right-angle header takes jumper wires or a breadboard. The board has no mounting holes; clones vary by 1 to 2 mm. The board size is an estimate: the sheet gives the 40 × 26 × 32 mm envelope with the header sticking out.",
    },
    power: {
      supply: { min: 3.3, max: 5.5, typ: 5 },
      logic: 5,
      tolerant5V: true,
      draw: { idle: 1, active: 1, peak: 1 },
      interface: "Two analog voltages and one active-low switch",
      note: "Two 10 kΩ pots across the supply draw about 1 mA at 5 V. SW draws nothing until it is pressed. Outputs scale with the supply, so a 3.3 V supply gives 0 to 3.3 V, safe for a 3.3 V ADC.",
    },
    sourcing: { mpn: "KY-023", maker: "Keyes / generic", lifecycle: "generic", usd: [1, 3] },
    limits: [
      "The rest voltage is not exactly half of VCC: about ±5 % (±30 counts on a 10-bit ADC) and it drifts. Use a dead zone of 30 to 60 counts.",
      "SW has no pull-up on the board. Without INPUT_PULLUP it floats and reads noise.",
      "The pots wear out at about a million cycles or fewer, and a dirty track makes the reading jitter.",
      "The two axes are not perfectly linear and the travel is only about ±30°.",
      "Some modules print X and Y turned 90° from the others, so test which pin moves.",
    ],
    upgrade: [{ name: "Adafruit mini thumbstick, or an Alps RKJXV hall stick", why: "A hall-effect stick has no track to wear and its rest point is within 1 % of center, so it needs no dead zone." }],
    refs: ["https://cse.unl.edu/~jfalkinburg/cse_courses/2021/236/JOYSTICK_MODULE.pdf"],
  },
  sim: {
    kind: "sensor",
    reads: [
      { key: "x", label: "Stick X", unit: "%", min: 0, max: 100, step: 1, start: 50, sweep: [15, 85, 7], digits: 0 },
      { key: "y", label: "Stick Y", unit: "%", min: 0, max: 100, step: 1, start: 50, sweep: [85, 15, 5], digits: 0 },
      { key: "pressed", label: "Click", min: 0, max: 1, step: 1, start: 0, sweep: [0, 1, 6], states: ["Released", "Pressed"] },
    ],
    analog: [
      { pin: "VRX", key: "x" },
      { pin: "VRY", key: "y" },
    ],
    trips: [{ pin: "SW", key: "pressed", when: "above", at: 0.5, activeLow: true }],
  },
  animate: { sweep: ["stick-base", "stick", "cap", "cap-dish"], axis: { at: [CX, CY, BOX_TOP + 1.8], dir: "x" } },
  experiment: { title: "Steer a servo", idea: "Read VRx with analogRead, scale 0 to 1023 into 0 to 180, and write it to a servo. Click the stick to snap the servo back to center." },
  docs: "/docs/hardware-knowledge/joystick",
  tags: ["joystick", "thumbstick", "analog", "ky-023", "xy", "stick", "input", "control", "game pad"],
});
