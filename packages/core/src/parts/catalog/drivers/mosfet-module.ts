import { MATERIAL, board, definePart, gnd, name, pin, pinHeader, silk, smd, smdLed, terminalBlock, to220, vcc } from "../../sdk";

const RED = "#b01c1c";
const S = MATERIAL.silk;

// Signal header down the left edge, pins up. The IRF520 stands in the middle, its steel tab toward the supply terminals.
const header = pinHeader(2.6, 7.2, 3, { dir: "y", style: "up" });
const supply = terminalBlock(25.4, 1.6, 2, { mouth: "right", pitch: 5.08 });
const load = terminalBlock(25.4, 12.3, 2, { mouth: "right", pitch: 5.08 });
const mosfet = to220(15.5, 12, { face: "left", id: "mosfet" });

export default definePart({
  id: "mosfet-module",
  name: "IRF520 MOSFET driver module",
  aka: ["IRF520 module", "MOS module", "MOSFET switch module", "PWM driver module"],
  group: "drivers",
  rank: 6,
  summary: "A switch for DC loads that a board pin can turn on and off, or dim with PWM: a pump, a fan, an LED strip. The IRF520 on it needs about 10 V on its gate, so from a 5 V pin it switches only half way and gets hot, and from a 3.3 V pin it hardly switches at all.",
  size: { w: 33, h: 24, d: 20.7 },
  solids: [
    board(33, 24, RED, {
      radius: 0.5,
      holes: [
        { x: 3, y: 3, d: 3 },
        { x: 3, y: 21, d: 3 },
      ],
    }),
    header,
    supply,
    load,
    mosfet,
    // Gate resistor, pull-down, the LED and its resistor.
    smd(10.6, 10.4, "r", "y"),
    smd(10.6, 13.2, "r", "y"),
    smd(10.6, 16.0, "r", "y"),
    smdLed(9.0, 4.4, "#3ddc68", "led"),
    smd(11.0, 4.4, "r", "x"),
    silk(4.8, 7.6, "SIG", 0.95, S),
    silk(4.8, 10.14, "VCC", 0.95, S),
    silk(4.8, 12.68, "GND", 0.95, S),
    silk(24.8, 4.6, "VIN", 1.0, S, { anchor: "end" }),
    silk(24.8, 9.7, "GND", 1.0, S, { anchor: "end" }),
    silk(24.8, 15.3, "V+", 1.0, S, { anchor: "end" }),
    silk(24.8, 20.4, "V-", 1.0, S, { anchor: "end" }),
    silk(12.5, 22.4, "IRF520 MOS", 1.3, S, { anchor: "middle", weight: 700 }),
  ],
  features: [
    { id: "mosfet", label: "IRF520 MOSFET", kind: "power", x: 13.4, y: 7, w: 4.7, h: 10, note: "The switch. A small voltage on its gate lets current flow from drain to source. The steel tab is the drain and sits at the load's voltage, so don't touch it or let it hit a metal case." },
    { id: "header", label: "Signal header (SIG, VCC, GND)", kind: "pins", x: 1.33, y: 5.93, w: 2.54, h: 7.62, note: "SIG is the control pin from your board. GND must join your board's GND. VCC is not connected to anything on this module." },
    { id: "supply", label: "Supply terminal (VIN, GND)", kind: "power", x: 25.4, y: 1.6, w: 7.6, h: 10.16, note: "The load's power goes in here, 0 V to 24 V. Its minus must be joined to your board's GND." },
    { id: "load", label: "Load terminal (V+, V−)", kind: "connector", x: 25.4, y: 12.3, w: 7.6, h: 10.16, note: "The load goes between V+ and V−. V+ is the same wire as VIN. V− is switched to ground by the MOSFET." },
    { id: "led", label: "Signal LED", kind: "led", x: 9.0, y: 4.4, w: 1.6, h: 0.8, note: "Lit while SIG is high." },
    { id: "gate", label: "Gate resistor and pull-down", kind: "other", x: 9.8, y: 9.6, w: 1.6, h: 7.2, note: "A small resistor in front of the gate and a pull-down resistor, so the load stays off while SIG floats." },
  ],
  pins: [
    pin("SIG", "digital", "drive", "Gate drive, active high. A pin that is on or off switches the load; a PWM pin dims or slows it. It needs 10 V for full effect; 5 V gives only partial switching and 3.3 V barely any.", { required: true }),
    pin("VCC", "power", "opt", "Not connected to anything on this module. Leave it open. It is printed on the header only because the pins match other boards.", { required: false }),
    gnd("GND", "Signal ground. It must be joined to your board's GND and to the supply ground."),
    vcc("VIN", "Load supply, 0 V to 24 V. This is the power the load runs on, not the logic supply.", { accepts: [0, 24] }),
    gnd("GND2", "Supply ground, the same copper as GND.", { required: false }),
    pin("V_POS", "other", "load", "Load plus. The same wire as VIN.", { label: "V+" }),
    pin("V_NEG", "other", "load", "Load minus. The MOSFET connects it to ground when SIG is high.", { label: "V−" }),
  ],
  pinAt: {
    ...name(header, "SIG", "VCC", "GND"),
    ...name(supply, "VIN", "GND2"),
    ...name(load, "V_POS", "V_NEG"),
  },
  lab: { strips: [["GND", "GND2"]] },
  circuit: {
    blocks: [
      { id: "sig", label: "SIG", sub: "from your board", kind: "pin", col: 0, row: 0, at: "SIG", note: "Almost no current: it only charges the gate for a moment each time it changes." },
      { id: "gate", label: "Gate resistor", sub: "and pull-down", kind: "passive", col: 1, row: 0, at: "gate", note: "Slows the edges a little. The pull-down keeps the load off if the pin is left open." },
      { id: "fet", label: "IRF520", sub: "N-channel MOSFET", kind: "driver", col: 2, row: 0, at: "mosfet", hot: true, note: "Needs about 10 V on its gate to be fully on. At 5 V it still has about 0.9 Ω, so it loses power as heat." },
      { id: "vin", label: "VIN", sub: "load supply", kind: "power", col: 1, row: 1, at: "VIN", note: "Passes straight to V+." },
      { id: "load", label: "V+, V−", sub: "your load", kind: "connector", col: 3, row: 1, at: "load", note: "V+ is the supply. V− is pulled to ground when the MOSFET is on." },
      { id: "led", label: "Signal LED", kind: "passive", col: 1, row: 2, at: "led", note: "Shows that SIG is high." },
      { id: "gnd", label: "GND", kind: "ground", col: 2, row: 2, at: "GND", note: "Shared by your board, the supply and the MOSFET's source." },
    ],
    links: [
      { from: "sig", to: "gate", kind: "signal", label: "0 V or 5 V" },
      { from: "gate", to: "fet", kind: "signal" },
      { from: "vin", to: "load", kind: "power", label: "0–24 V" },
      { from: "load", to: "fet", kind: "power", label: "load current" },
      { from: "fet", to: "gnd", kind: "ground" },
      { from: "sig", to: "led", kind: "signal" },
    ],
    steps: [
      "The load's supply comes in on VIN and goes straight out on V+. Nothing happens yet, because the other side of the load, V−, goes nowhere.",
      "Your board puts SIG high. The gate charges, and the MOSFET turns on and joins V− to ground. Current flows through the load.",
      "A MOSFET that is only partly on acts like a resistor. At a 5 V gate the IRF520 is about 0.9 Ω, so 1 A loses 0.9 V and turns 0.9 W into heat.",
      "With PWM on SIG the load is on for part of each cycle: a fan runs slower and an LED strip dims. Put a diode across a motor or a relay so the spike when it switches off can't hurt the MOSFET.",
    ],
  },
  facts: [
    { label: "Load supply", value: "0–24 V DC" },
    { label: "Channels", value: "1, low side" },
    { label: "Gate needs", value: "about 10 V" },
    { label: "At a 5 V gate", value: "about 0.9 Ω, 1 to 2 A" },
    { label: "At a 3.3 V gate", value: "nearly off" },
    { label: "Size", value: "33 × 24 × 21 mm" },
  ],
  spec: {
    form: {
      mass: 7,
      mount: "terminals",
      pitch: 2.54,
      holes: [
        { x: 3, y: 3, d: 3 },
        { x: 3, y: 21, d: 3 },
      ],
      note: "Screw terminals for the load and its supply, and a three-pin header for jumper wires. Bolts down on M3 screws.",
    },
    power: {
      supply: { min: 0, max: 24, typ: 12 },
      logic: 5,
      tolerant5V: true,
      draw: { idle: 0, active: 5 },
      bridge: { channels: 1, maxMa: 2000, peakMa: 5000, ohms: 0.9 },
      interface: "One gate input, PWM works up to about 20 kHz",
      note: "The supply range is the load's: there is no separate logic supply. The 0.9 Ω is for a 5 V gate (an estimate: the sheet gives 0.27 Ω max only at 10 V). The module is sold as 24 V and 5 A with a heatsink.",
    },
    thermal: { thetaCW: 62, maxC: 175, note: "A bare TO-220 rises 62 °C per watt in still air, and its junction may reach 175 °C. A 5 V gate and 2 A is about 3.6 W: too hot without a heatsink. One maker measured a 56 °C tab at 3 A with a 5 V gate, which is cooler than the datasheet predicts, so treat it as optimistic." },
    sourcing: { mpn: "IRF520", maker: "Vishay", lifecycle: "generic", usd: [1, 3], note: "An unbranded module. Some carry the IRF520N from Infineon. Re-marked clones are common and can be worse than the datasheet." },
    limits: [
      "The IRF520 is not a logic-level MOSFET. The sheet gives a gate threshold of 2 V to 4 V and the 0.27 Ω on-resistance only at a 10 V gate.",
      "With a 5 V gate it is estimated at 0.8 to 1 Ω: about 0.9 V and 0.9 W lost at 1 A, and a 6 V load sees 5.1 V. Practical current is 1 to 2 A without a heatsink.",
      "With a 3.3 V gate it is hardly past its threshold, about 5 to 10 Ω or worse (an estimate). Keep the load under 0.1 to 0.3 A, or expect it to run hot and half off. Some sellers claim 1 A.",
      "At a 5 V gate and 2 A it loses about 3.6 W, which is about 220 °C of rise on a bare TO-220 (62 °C per watt).",
      "Low-side switch only: it switches the load's ground, so the load's minus is not the system ground.",
      "No flyback diode. A motor, a relay or a solenoid needs one across the load.",
      "The VCC pin on the header is not connected to anything.",
    ],
    upgrade: [
      { name: "IRLZ44N logic-level MOSFET (TO-220)", why: "About 25 mΩ at a 5 V gate and a threshold of 1 to 2 V, so the same load wastes roughly 35 times less power. It works from 3.3 V too, and it is rated 47 A." },
      { name: "D4184 MOSFET trigger switch module", why: "A logic-level MOSFET board sold for 3.3 V to 20 V triggers and up to 15 A, which fits 3.3 V controllers where this module fails." },
    ],
    refs: [
      "https://www.vishay.com/docs/91017/irf520.pdf",
      "https://protosupplies.com/product/irf520-n-ch-mosfet-module/",
      "https://shillehtek.com/blogs/shillehtek-product-manuals/irf520-mosfet-driver-module-arduino-raspberry-pi-esp32-manual",
    ],
  },
  sim: { kind: "driver", supply: "VIN", ground: "GND", channels: [{ outputs: ["V_POS", "V_NEG"], inputs: ["SIG"] }] },
  animate: { lit: ["led"] },
  experiment: { title: "Dim a lamp, then watch it fail", idea: "Put a 12 V LED strip on V+ and V−. Dim it with PWM from a 5 V pin, then from a 3.3 V pin, and feel the MOSFET's tab after a minute each time." },
  tags: ["mosfet", "irf520", "pwm", "switch", "dc load", "low side", "driver"],
});
