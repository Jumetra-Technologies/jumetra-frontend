import { MATERIAL, board, comparatorSet, definePart, gnd, ledLying, name, pin, pinHeader, silk, vcc } from "../../sdk";
import { MODULE_BLUE, comparatorSpecks, headerLabels } from "./_ir";

// The IR LED (clear) and the photodiode (dark) lie on long legs and point out of the front edge.
const header = pinHeader(4.56, 29.6, 3, { style: "up" });

export default definePart({
  id: "ir-obstacle",
  name: "FC-51 infrared obstacle sensor",
  aka: ["IR obstacle avoidance sensor", "FC-51", "HW-201", "IR proximity module"],
  group: "sensors",
  rank: 3,
  summary: "An infrared LED sends light forward and a photodiode watches for it bouncing back. When something is close enough, OUT goes low and a green LED lights. It says near or not near, not how far.",
  size: { w: 14.2, h: 31.3, d: 12.3 },
  solids: [
    board(14.2, 31.3, MODULE_BLUE, { radius: 0.5, holes: [{ x: 3.2, y: 17, d: 3 }] }),
    ledLying(4.5, 1.5, "top", "#c6d9e3", { clear: true, id: "ir-emitter", length: 11.5 }),
    ledLying(9.7, 1.5, "top", "#1b1c1f", { id: "ir-receiver", length: 11.5 }),
    comparatorSet({ chip: [8, 21.2], trimmer: [9, 11], power: [3, 26], signal: [11.3, 26] }, { chipDir: "x", trimmerDir: "y" }),
    comparatorSpecks([
      [1, 21.5, "r", "y"],
      [12.4, 21.5, "r", "y"],
      [12.4, 18.2, "c", "y"],
      [5.2, 17.6, "r", "x"],
    ]),
    header,
    ...headerLabels([4.56, 7.1, 9.64], 27.7, ["OUT", "GND", "VCC"]),
    silk(2.2, 12, "FC-51", 1, MATERIAL.silk, { rotate: -90, anchor: "middle" }),
  ],
  features: [
    { id: "emitter", label: "IR emitter LED", kind: "sensor", x: 2, y: -11, w: 5, h: 12.5, note: "The clear one. It sends out infrared light, all the time, in a cone about 35° wide." },
    { id: "receiver", label: "IR receiver", kind: "sensor", x: 7.2, y: -11, w: 5, h: 12.5, note: "The dark one. It is a photodiode that only wants infrared. It sees the light that bounces back off an obstacle." },
    { id: "trim", label: "Range trimmer", kind: "other", x: 6.6, y: 6.25, w: 4.8, h: 9.5, note: "Turn the screw clockwise for a longer range, anticlockwise for a shorter one. It is a multi-turn pot, so keep turning." },
    { id: "lm393", label: "LM393 comparator", kind: "chip", x: 5.2, y: 18.3, w: 5.6, h: 6, note: "Turns the photodiode's weak voltage into a clean high or low on OUT." },
    { id: "leds", label: "Power and obstacle LEDs", kind: "led", x: 2.2, y: 25.3, w: 10.2, h: 1.4, note: "Red: power. Green: lit while OUT is low, which means something is in front." },
    { id: "hole", label: "Mounting hole", kind: "mechanical", x: 1.7, y: 15.5, w: 3, h: 3, note: "One 3 mm screw holds it to a chassis." },
    { id: "pins", label: "OUT, GND, VCC", kind: "pins", x: 3.3, y: 28.3, w: 7.6, h: 2.6, note: "Printed OUT, GND, VCC from the left with the LEDs at the top. Check the print on your board: some are the other way round." },
  ],
  pins: [
    pin("OUT", "digital", "out-digital", "Goes low when something is near. High when nothing is. It swings to the supply voltage.", { label: "OUT" }),
    gnd("GND"),
    vcc("VCC", "3.3 V to 5 V supply. It takes about 43 mA at 5 V, all the time."),
  ],
  pinAt: name(header, "OUT", "GND", "VCC"),
  circuit: {
    blocks: [
      { id: "vcc", label: "VCC", sub: "3.3 V to 5 V", kind: "power", col: 0, row: 0, at: "VCC", note: "Feeds the IR LED, the comparator and both indicator LEDs." },
      { id: "led", label: "IR LED", sub: "940 nm", kind: "sensor", col: 1, row: 0, at: "emitter", note: "Steady infrared light, always on. It is not pulsed, so sunlight and bulbs can fool the sensor." },
      { id: "obj", label: "Obstacle", sub: "2–30 cm", kind: "world", col: 2, row: 0, note: "Pale and shiny things throw the light back well. Black things barely do." },
      { id: "photo", label: "Photodiode", kind: "sensor", col: 3, row: 0, at: "receiver", note: "Gives a little more current for every bit more infrared it sees." },
      { id: "trim", label: "Trimmer", sub: "sets the range", kind: "passive", col: 3, row: 1, at: "trim", note: "Sets how much light counts as near. More turns clockwise means it triggers from further away." },
      { id: "cmp", label: "Comparator", sub: "LM393", kind: "ic", col: 2, row: 2, at: "lm393", note: "Says low when the photodiode's level is past the trimmer's, high when it is not. The output is open collector with a 10 k pull-up." },
      { id: "out", label: "OUT", sub: "low = obstacle", kind: "pin", col: 0, row: 2, at: "OUT", note: "Low means something is in front of it." },
      { id: "led-out", label: "Green LED", kind: "sensor", col: 1, row: 2, at: "leds", note: "Lit while OUT is low." },
    ],
    links: [
      { from: "vcc", to: "led", kind: "power", label: "about 20 mA" },
      { from: "led", to: "obj", kind: "light", label: "infrared" },
      { from: "obj", to: "photo", kind: "light", label: "bounce" },
      { from: "photo", to: "cmp", kind: "analog" },
      { from: "trim", to: "cmp", kind: "analog", label: "threshold" },
      { from: "cmp", to: "out", kind: "signal", label: "low when near" },
      { from: "cmp", to: "led-out", kind: "signal" },
    ],
    steps: [
      "The infrared LED is always lit. It throws invisible light forward in a cone about 35° wide.",
      "If something is in the cone, some of the light bounces back and lands on the photodiode.",
      "The comparator checks the photodiode's level against the trimmer's setting.",
      "Past the setting, OUT drops to 0 V and the green LED lights. Under it, OUT sits at the supply voltage.",
    ],
  },
  facts: [
    { label: "Range", value: "2–30 cm, set by trimmer" },
    { label: "Output", value: "OUT, low when near" },
    { label: "Beam", value: "about 35°" },
    { label: "Supply", value: "3.3–5 V" },
    { label: "Draw", value: "23 mA at 3.3 V, 43 mA at 5 V" },
    { label: "Board", value: "31 × 14 mm" },
  ],
  spec: {
    form: {
      mount: "jumpers",
      pitch: 2.54,
      holes: [{ x: 3.2, y: 17, d: 3 }],
      note: "One 3 mm screw holds it to the front of a robot with the two LEDs pointing ahead. The LEDs stand about 13 mm past the front edge of the board.",
    },
    power: {
      supply: { min: 3.3, max: 5, typ: 5 },
      logic: 5,
      tolerant5V: true,
      draw: { idle: 43, active: 43 },
      interface: "OUT low when an obstacle is near",
      note: "One seller measured 23 mA at 3.3 V and 43 mA at 5 V. Other sellers print 10 to 15 mA. The IR LED never turns off, so the draw stays the same.",
    },
    sourcing: { mpn: "FC-51 (LM393)", maker: "Generic", lifecycle: "generic", usd: [0.5, 2], note: "Also sold as HW-201. The KY-032 is a different, modulated board with four pins." },
    limits: [
      "It gives yes or no, not a distance. The switching point is somewhere between 2 and 30 cm, set by the trimmer.",
      "Dark surfaces cut the range to a few centimeters or do not trigger it at all. White ones reach 30 cm.",
      "The light is not pulsed, so sunlight, bulbs and a second FC-51 beside it can trigger it by mistake.",
      "It draws 23 to 43 mA all the time, a lot for a small battery.",
    ],
    upgrade: [
      { part: "sharp-ir", name: "Sharp GP2Y0A21YK0F", why: "Gives a smooth voltage for 10 cm to 80 cm instead of a yes or no, and its light is pulsed so room light does not fool it." },
      { part: "vl53l0x", name: "VL53L0X time-of-flight sensor", why: "Reads the distance in millimeters from 3 cm to about 2 m over I2C, and the color of the target matters far less. It takes 19 mA and runs on 3.3 V." },
    ],
    refs: ["https://leap-tardate-com.netlify.app/electronics101/ir/fc-51-sensor-module", "https://jamtronic.com/wp-content/uploads/2022/09/FC51.pdf"],
  },
  sim: {
    kind: "sensor",
    reads: [{ key: "distanceCm", label: "Distance to obstacle", unit: "cm", min: 1, max: 40, step: 1, start: 25, sweep: [35, 4, 6], digits: 0 }],
    trips: [{ pin: "OUT", key: "distanceCm", when: "below", at: 15, activeLow: true }],
  },
  experiment: { title: "Bumper that sees", idea: "Wire OUT to a digital pin. When it reads low, stop the motors and back up. Turn the trimmer until your hand triggers it at 10 cm." },
  tags: ["fc-51", "ir", "infrared", "obstacle", "proximity", "avoidance", "hw-201", "sensor"],
});
