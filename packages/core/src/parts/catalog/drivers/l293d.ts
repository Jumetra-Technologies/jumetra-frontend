import { MATERIAL, definePart, gnd, pin, silk, vcc, type Solid } from "../../sdk";

// The chip: a 19.3 × 6.35 mm body whose two rows of legs are 7.62 mm apart, so the legs leave its sides, run out 0.6 mm and turn down.
const TOPLEG = 1.1;
const BOTLEG = 8.72;
const MID = (TOPLEG + BOTLEG) / 2;
const BODY = { x: 0.5, y: MID - 3.175, w: 19.3, h: 6.35 };
const BODY_Z = 1.0;
const BODY_D = 3.6;
const BODY_TOP = BODY_Z + BODY_D;
const at = (i: number) => 1.27 + i * 2.54;

/** One leg: a straight tinned pin that goes into the breadboard, and the flat shoulder joining it to the body. */
function legs(cy: number, side: -1 | 1): Solid[] {
  const edge = MID + side * 3.175;
  const reach = Math.abs(cy - edge) + 0.25;
  return Array.from({ length: 8 }, (_, i): Solid[] => [
    { kind: "box", x: +(at(i) - 0.25).toFixed(3), y: +(side === 1 ? edge : cy - 0.25).toFixed(3), w: 0.5, h: reach, d: 0.3, z: 2.2, top: MATERIAL.tin, finish: "tin", radius: 0.05 },
    { kind: "pins", x: at(i) - 1.27, y: cy - 1.27, count: 1, pitch: 2.54, dir: "x", len: 5.6, z: -3.4, size: 0.5, color: MATERIAL.tin, finish: "tin" },
  ]).flat();
}

// Counting from the notch: pin 1 is bottom left, pins 1 to 8 run right along the bottom, pin 9 is top right and pins 9 to 16 run back left.
const bottom = ["EN12", "1A", "1Y", "GND", "GND2", "2Y", "2A", "VCC2"];
const top = ["VCC1", "4A", "4Y", "GND4", "GND3", "3Y", "3A", "EN34"];

export default definePart({
  id: "l293d",
  name: "L293D motor driver chip",
  aka: ["L293D", "L293", "quad half-H driver", "SN754410", "16-pin motor driver"],
  group: "drivers",
  rank: 3,
  summary: "A 16-pin chip that sits on a breadboard and runs two small motors, one way or the other, at up to 0.6 A each. Its diodes are built in. It loses about 2.6 V to heat, so keep motors small.",
  size: { w: 20.32, h: 9.8, d: 4.6 },
  solids: [
    { kind: "box", id: "body", ...BODY, d: BODY_D, z: BODY_Z, top: "#1b1c1f", finish: "epoxy", radius: 0.35 },
    legs(TOPLEG, -1),
    legs(BOTLEG, 1),
    // The notch in the left end marks pin 1, which is bottom left, and a dot sits beside it.
    { kind: "path", d: `M ${BODY.x} ${MID - 1.05} A 1.05 1.05 0 0 1 ${BODY.x} ${MID + 1.05} Z`, fill: "#08090a", color: "#3a3d42", width: 0.15, z: BODY_TOP + 0.01 },
    { kind: "disc", cx: BODY.x + 2.0, cy: BODY.y + BODY.h - 1.2, r: 0.45, color: "#0a0a0b", ring: { color: "#454850", width: 0.15 }, z: BODY_TOP + 0.01 },
    silk(BODY.x + 10.2, MID - 0.4, "L293D", 1.7, "#b4b8be", { anchor: "middle", z: BODY_TOP + 0.01 }),
    silk(BODY.x + 10.2, MID + 1.5, "TI  0842", 0.85, "#7b8087", { anchor: "middle", z: BODY_TOP + 0.01 }),
  ],
  features: [
    { id: "body", label: "L293D chip", kind: "chip", x: 0.5, y: 1.74, w: 19.3, h: 6.35, note: "Four half-bridges built from bipolar transistors, with a diode across each. Two of them make one H-bridge, so there are two motor channels." },
    { id: "notch", label: "Notch and pin 1", kind: "other", x: 0.5, y: 1.74, w: 3.4, h: 6.35, note: "The notch marks the end where pin 1 is: bottom left here. Plug the chip in with the notch toward the lower pin numbers, as the drawing shows." },
    { id: "logic-supply", label: "VCC1 (logic)", kind: "power", x: 0, y: 0, w: 2.54, h: 2.3, note: "Pin 16. The chip's own 5 V, 4.5 V to 7 V. Feed it from your board's 5 V pin." },
    { id: "motor-supply", label: "VCC2 (motors)", kind: "power", x: 17.78, y: 7.7, w: 2.54, h: 2.1, note: "Pin 8. The motor battery, 4.5 V to 36 V. It must be at least as high as VCC1." },
    { id: "ground", label: "Ground pins (4, 5, 12, 13)", kind: "pins", x: 7.62, y: 0, w: 5.08, h: 9.8, note: "Four ground pins in the middle. Inside the chip they carry heat away as well. On a breadboard they get little help doing it." },
    { id: "enables", label: "Enables (1,2EN and 3,4EN)", kind: "pins", x: 0, y: 7.7, w: 2.54, h: 2.1, note: "Pin 1 turns motor A's outputs on, pin 9 motor B's. Tie one high for full speed, or put PWM on it to set the speed." },
    { id: "outputs", label: "Motor outputs (1Y–4Y)", kind: "connector", x: 5.08, y: 0, w: 15.24, h: 9.8, note: "Motor A goes between 1Y (pin 3) and 2Y (pin 6), motor B between 3Y (pin 11) and 4Y (pin 14)." },
  ],
  pins: [
    vcc("VCC1", "Logic supply, pin 16: 4.5 V to 7 V. Use your board's 5 V."),
    vcc("VCC2", "Motor supply, pin 8: 4.5 V to 36 V, and at least as high as VCC1.", { accepts: [4.5, 36] }),
    gnd("GND", "Ground, pin 4. It must also join your board's GND."),
    gnd("GND2", "Ground, pin 5, joined to the other ground pins inside the chip.", { required: false }),
    gnd("GND3", "Ground, pin 12.", { required: false }),
    gnd("GND4", "Ground, pin 13.", { required: false }),
    pin("EN12", "pwm", "pwm", "Pin 1. Turns the 1Y and 2Y outputs on while high; low switches them off. Tie to 5 V for full speed or put PWM on it.", { label: "1,2EN", required: false }),
    pin("1A", "digital", "drive", "Pin 2. Input for 1Y. 1A high and 2A low: motor A turns one way.", { required: false }),
    pin("2A", "digital", "drive", "Pin 7. Input for 2Y. 2A high and 1A low: the other way. Both the same: fast stop.", { required: false }),
    pin("EN34", "pwm", "pwm", "Pin 9. The same for 3Y and 4Y.", { label: "3,4EN", required: false }),
    pin("3A", "digital", "drive", "Pin 10. Input for 3Y, motor B.", { required: false }),
    pin("4A", "digital", "drive", "Pin 15. Input for 4Y, motor B.", { required: false }),
    pin("1Y", "other", "load", "Pin 3. Motor A, first wire."),
    pin("2Y", "other", "load", "Pin 6. Motor A, second wire."),
    pin("3Y", "other", "load", "Pin 11. Motor B, first wire."),
    pin("4Y", "other", "load", "Pin 14. Motor B, second wire."),
  ],
  pinAt: {
    ...Object.fromEntries(bottom.map((id, i) => [id, { x: at(i), y: BOTLEG }])),
    ...Object.fromEntries(top.map((id, i) => [id, { x: at(i), y: TOPLEG }])),
  },
  lab: { strips: [["GND", "GND2", "GND3", "GND4"]] },
  circuit: {
    blocks: [
      { id: "battery", label: "Battery", sub: "4.5–36 V", kind: "world", col: 0, row: 0, note: "The motor supply. 6 V to 9 V suits small gear motors. The chip keeps about 2.6 V of it." },
      { id: "vcc2", label: "VCC2", sub: "pin 8, motors", kind: "power", col: 1, row: 0, at: "VCC2", note: "Everything the motors draw comes in here." },
      { id: "vcc1", label: "VCC1", sub: "pin 16, logic", kind: "power", col: 1, row: 1, at: "VCC1", note: "The chip's own supply, 5 V. It draws 8 mA to 35 mA." },
      { id: "logic", label: "Inputs", sub: "1A–4A, enables", kind: "pin", col: 0, row: 1, at: "enables", note: "Six pins from your board. They read high above 2.3 V, so 3.3 V signals work as long as VCC1 is 5 V." },
      { id: "bridge", label: "Two H-bridges", sub: "L293D", kind: "driver", col: 2, row: 1, at: "body", hot: true, note: "Bipolar transistors. Each path loses about 2.6 V at 0.6 A, so the chip turns about 1.6 W per motor into heat." },
      { id: "diodes", label: "Clamp diodes", sub: "built in", kind: "passive", col: 2, row: 2, at: "body", note: "Eight diodes inside the chip catch the spike a motor makes when switched off, so you need no outside ones." },
      { id: "out", label: "Motor outputs", sub: "1Y–4Y", kind: "connector", col: 3, row: 1, at: "outputs", note: "Battery volts minus about 2.6 V at 0.6 A." },
      { id: "gnd", label: "GND", sub: "4 pins", kind: "ground", col: 1, row: 2, at: "ground", note: "Shared by the battery and your board. These pins also carry the chip's heat away." },
    ],
    links: [
      { from: "battery", to: "vcc2", kind: "power", label: "up to 0.6 A each" },
      { from: "vcc2", to: "bridge", kind: "power" },
      { from: "vcc1", to: "bridge", kind: "power", label: "8–35 mA" },
      { from: "logic", to: "bridge", kind: "signal", label: "direction, enable" },
      { from: "bridge", to: "out", kind: "power", label: "−2.6 V at 0.6 A" },
      { from: "diodes", to: "bridge", kind: "power", label: "spikes" },
      { from: "bridge", to: "gnd", kind: "ground" },
    ],
    steps: [
      "Put the chip across the breadboard's middle gap with the notch to the left. Feed 5 V to VCC1 and the motor battery to VCC2.",
      "Your board sets 1,2EN high, 1A high and 2A low: inside the chip one transistor joins 1Y to the battery and another joins 2Y to ground, so motor A turns. Swap 1A and 2A and it reverses.",
      "PWM on 1,2EN switches the outputs on and off; the longer it is on, the faster the motor.",
      "Each path through the chip loses about 2.6 V at 0.6 A. That is 1.6 W of heat per motor, and a breadboard does little to carry it off.",
    ],
  },
  facts: [
    { label: "Motors", value: "2 DC or 1 stepper" },
    { label: "Current", value: "0.6 A per motor, 1.2 A peak" },
    { label: "Motor supply", value: "4.5–36 V" },
    { label: "Voltage lost", value: "2.6 V at 0.6 A" },
    { label: "Logic", value: "5 V, 3.3 V inputs work" },
    { label: "Size", value: "DIP-16, 20 × 8 mm" },
  ],
  spec: {
    form: {
      mass: 1.1,
      mount: "breadboard",
      pitch: 2.54,
      note: "A 16-pin DIP: two rows 7.62 mm apart that straddle a breadboard's middle gap. Pin 1 is next to the notch; the pins count along one side and back along the other.",
    },
    power: {
      supply: { min: 4.5, max: 7, typ: 5 },
      logic: 5,
      tolerant5V: true,
      draw: { idle: 10, active: 35 },
      bridge: { channels: 2, maxMa: 600, peakMa: 1200, dropV: 1.2, ohms: 4.3 },
      interface: "Two direction pins and one enable per motor",
      note: "VCC1 (pin 16) feeds the logic; VCC2 (pin 8) feeds the motors and must be at least as high. The motor gets VCC2 minus about 2.6 V at 0.6 A. A 1.2 A peak is for 100 µs only.",
    },
    thermal: { thetaCW: 80, maxC: 150, note: "80 °C per watt on a breadboard, where the ground pins touch no copper; Texas Instruments measures 36 °C per watt with the ground pins on a copper plane. One motor at 0.6 A loses 1.6 W, which is far too hot on a breadboard." },
    sourcing: { mpn: "L293D", maker: "Texas Instruments", lifecycle: "active", usd: [1.5, 3.5], note: "ST also makes it, in a PowerDIP-16 that looks the same. SN754410 is a pin-for-pin copy rated 1 A, without the built-in diodes." },
    limits: [
      "Loses about 2.6 V at 0.6 A (up to 3.6 V): a 6 V supply leaves a motor about 3.4 V.",
      "0.6 A per motor, 1.2 A for 100 µs. A hobby gear motor that stalls at 1 A to 2 A will overload it.",
      "Turns about 1.6 W per motor into heat, and a breadboard (80 °C per watt) gives it nowhere to go.",
      "Draws 8 mA to 35 mA from VCC1 doing nothing.",
      "VCC1 must be 4.5 V to 7 V: on a 3.3 V board you still feed it 5 V. 3.3 V signals do work on the inputs.",
      "Poor under 6 V, and no current limit and no fault pin.",
    ],
    upgrade: [
      { part: "tb6612fng", name: "TB6612FNG", why: "MOSFET switches lose about 0.5 V at 1 A instead of 2.6 V at 0.6 A, and it passes 1.2 A per motor, twice as much. It comes on a small breadboard-friendly board." },
      { part: "drv8833", name: "DRV8833", why: "Loses 0.36 Ω, about 0.36 V at 1 A, runs from 2.7 V and has sleep and fault pins, so it suits a small battery robot." },
    ],
    refs: ["https://www.ti.com/lit/gpn/l293", "https://www.ece.nus.edu.sg/ee3032/html/Common/L293D_datasheet_16pinDIP.pdf"],
  },
  sim: {
    kind: "driver",
    supply: "VCC2",
    ground: "GND",
    channels: [
      { outputs: ["1Y", "2Y"], inputs: ["1A", "2A"], enable: "EN12" },
      { outputs: ["3Y", "4Y"], inputs: ["3A", "4A"], enable: "EN34" },
    ],
  },
  experiment: { title: "Two motors on a breadboard", idea: "Put the chip across the gap, tie both enables to 5 V and drive one small motor each way. Touch the chip after a minute and see why people add a heatsink or switch to a TB6612." },
  tags: ["l293d", "l293", "motor driver", "h-bridge", "dip", "breadboard", "dc motor", "driver"],
});
