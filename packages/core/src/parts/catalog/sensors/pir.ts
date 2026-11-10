import { MATERIAL, PCB_TOP, board, definePart, gnd, jumperCap, name, pin, pinHeader, polygonPath, silk, smd, trimPot, vcc, type Solid } from "../../sdk";

const CX = 16;
const CY = 10.5;
const BASE = 20; // the square white plastic base the lens snaps into
const BASE_H = 1.6;
const DOME_R = 10; // the lens is 23 mm across at its widest, and the base overhangs it
const TIERS = 11;
const SIDES = 16;

const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** The Fresnel lens: stacked 16-sided rings that step in toward the top, with a printed line along each facet edge. */
function fresnelDome(): Solid[] {
  const z0 = PCB_TOP + BASE_H;
  const total = 13.3 - z0;
  const step = total / TIERS;
  const out: Solid[] = [];
  const ring = (r: number): Array<[number, number]> =>
    Array.from({ length: SIDES }, (_, i) => {
      const a = ((i + 0.5) / SIDES) * Math.PI * 2;
      return [r3(CX + r * Math.cos(a)), r3(CY + r * Math.sin(a))];
    });
  for (let k = 0; k < TIERS; k++) {
    const h = k * step;
    const r = Math.sqrt(Math.max(0.01, DOME_R * DOME_R - (h + step * 0.1) ** 2));
    out.push({
      kind: "extrude",
      id: k === 0 ? "lens" : undefined,
      path: polygonPath(ring(r)),
      d: step + 0.02,
      z: r3(z0 + h),
      top: k % 2 === 0 ? "#f3f2ec" : "#e9e8e1",
      side: "#d9d8d0",
      finish: "plastic",
      bevel: 0.15,
    });
    // A line at each facet corner, from this ring in to the next one's edge.
    const next = k + 1 < TIERS ? Math.sqrt(Math.max(0.01, DOME_R * DOME_R - ((k + 1) * step + step * 0.1) ** 2)) : 0;
    const a = ring(r);
    const b = ring(next);
    const d = a.map(([x, y], i) => `M ${x} ${y} L ${b[i][0]} ${b[i][1]}`).join(" ");
    out.push({ kind: "path", d, color: "#bdbcb3", width: 0.14, z: r3(z0 + h + step + 0.03) });
  }
  return out;
}

const header = pinHeader(13.46, 22.6, 3, { style: "up" });
const jumper = pinHeader(29.3, 15.2, 3, { dir: "y", style: "up" });

export default definePart({
  id: "pir",
  name: "PIR motion sensor (HC-SR501)",
  aka: ["HC-SR501", "passive infrared", "motion detector", "PIR sensor"],
  group: "sensors",
  rank: 5,
  summary: "The white dome from burglar alarms. It sees body heat move across its view and raises one pin for a few seconds. No moving parts, almost no current.",
  size: { w: 32, h: 24, d: 13.4 },
  solids: [
    board(32, 24, "#1f7a3a", {
      radius: 0.4,
      holes: [
        { x: 2, y: 12, d: 2.2 },
        { x: 30, y: 12, d: 2.2 },
      ],
    }),
    // The square white base, with the dome snapped into it.
    { kind: "box", id: "base", x: CX - BASE / 2, y: CY - BASE / 2, w: BASE, h: BASE, d: BASE_H, z: PCB_TOP, top: "#f1f0ea", side: "#cfcec6", radius: 1.2, finish: "plastic" },
    ...fresnelDome(),
    ...trimPot(0.5, 0.5, 5, "#d9772b", "pot-sens"),
    ...trimPot(26.5, 0.5, 5, "#d9772b", "pot-time"),
    header,
    jumper,
    jumperCap(29.3, 15.2 + 1.27, "y", "#1c1d20"),
    // The small SMD parts that sit by the left edge: a diode-drop capacitor pair and a pull-up.
    ...smd(1.9, 17.2, "c", "y"),
    ...smd(1.9, 19.4, "r", "y"),
    ...smd(4.0, 19.4, "c", "y"),
    silk(2.6, 7.2, "Sx", 0.9, MATERIAL.silk),
    silk(26.6, 7.2, "Tx", 0.9, MATERIAL.silk),
    silk(26.3, 15.8, "H", 0.9, MATERIAL.silk, { anchor: "end" }),
    silk(26.3, 20.9, "L", 0.9, MATERIAL.silk, { anchor: "end" }),
    silk(1.0, 23.2, "HC-SR501", 0.9, MATERIAL.silk),
    silk(13.46, 21.85, "GND", 0.8, MATERIAL.silk, { anchor: "middle" }),
    silk(16, 21.85, "OUT", 0.8, MATERIAL.silk, { anchor: "middle" }),
    silk(18.54, 21.85, "VCC", 0.8, MATERIAL.silk, { anchor: "middle" }),
  ],
  features: [
    { id: "lens", label: "Fresnel lens dome", kind: "sensor", x: 5.5, y: 0.5, w: 21, h: 20, note: "Dozens of small lenses focus body heat from a field about 110° wide onto the sensing element underneath. Nothing inside moves." },
    { id: "pot-sens", label: "Sensitivity trimmer (Sx)", kind: "mechanical", x: 0.5, y: 0.5, w: 5, h: 5, note: "Turn clockwise for longer reach, from about 3 m up to 7 m." },
    { id: "pot-time", label: "Time-delay trimmer (Tx)", kind: "mechanical", x: 26.5, y: 0.5, w: 5, h: 5, note: "How long OUT stays high after motion: from about 3 s to a few minutes. Clockwise is longer." },
    { id: "jumper", label: "Trigger-mode jumper (H/L)", kind: "other", x: 27.9, y: 13.9, w: 2.8, h: 7.6, note: "H: motion during the delay restarts it, so OUT stays high while someone moves. L: it fires once and ignores motion until the delay ends." },
    { id: "pins", label: "GND, OUT, VCC", kind: "pins", x: 12.2, y: 21.4, w: 7.7, h: 3, note: "Read the print on your board: this order is common but some boards swap GND and VCC. VCC takes 5 to 20 V; OUT is a 3.3 V signal." },
    { id: "holes", label: "Mounting holes", kind: "mechanical", x: 0.9, y: 10.9, w: 29.2, h: 2.2, note: "Two 2.2 mm holes, 28 mm apart, for M2 screws." },
  ],
  pins: [
    vcc("VCC", "5 V to 20 V supply. A regulator on the board makes 3.3 V from it. It does not run well from a 3.3 V pin."),
    pin("OUT", "digital", "out-digital", "3.3 V while motion is seen, 0 V otherwise. It stays high for the delay time you set.", { label: "OUT" }),
    gnd("GND"),
  ],
  pinAt: { ...name(header, "GND", "OUT", "VCC") },
  circuit: {
    blocks: [
      { id: "body", label: "Warm body moving", sub: "infrared", kind: "world", col: 0, row: 1, note: "People and animals glow in infrared. A still scene cancels out; movement is what registers." },
      { id: "lens", label: "Fresnel lens", sub: "focuses the heat", kind: "sensor", col: 1, row: 1, at: "lens", note: "Splits the view into zones; crossing a zone edge makes the signal." },
      { id: "pyro", label: "Sensing element", sub: "two slices, opposed", kind: "sensor", col: 2, row: 1, at: { x: CX, y: CY }, note: "A small metal can under the dome. Two crystal slices wired against each other: steady heat cancels, a change makes microvolts." },
      { id: "vcc", label: "VCC 5–20 V", kind: "power", col: 1, row: 0, at: "VCC", note: "Almost any supply from 5 V up works; the board drops it to 3.3 V." },
      { id: "reg", label: "3.3 V regulator", sub: "HT7133", kind: "regulator", col: 2, row: 0, at: { x: 22, y: 5 }, note: "On the back of the board. It powers the chip, and it is why OUT is 3.3 V logic." },
      { id: "biss", label: "BISS0001", sub: "amp + timer", kind: "ic", col: 3, row: 0, at: { x: CX, y: 5.5 }, note: "On the back. It amplifies the tiny signal, compares it with the sensitivity setting and runs the hold timer." },
      { id: "pots", label: "Trimmers", sub: "range, hold time", kind: "passive", col: 2, row: 2, at: "pot-sens", note: "The two orange potentiometers set the range and the hold time." },
      { id: "out", label: "OUT", sub: "3.3 V logic", kind: "pin", col: 3, row: 1, at: "OUT", note: "High for the hold time whenever motion is detected." },
    ],
    links: [
      { from: "body", to: "lens", kind: "light", label: "infrared" },
      { from: "lens", to: "pyro", kind: "light" },
      { from: "pyro", to: "biss", kind: "analog", label: "µV changes" },
      { from: "vcc", to: "reg", kind: "power" },
      { from: "reg", to: "biss", kind: "power", label: "3.3 V" },
      { from: "pots", to: "biss", kind: "analog" },
      { from: "biss", to: "out", kind: "signal", label: "HIGH on motion" },
    ],
    steps: [
      "Warm bodies radiate infrared. The lens splits the view into many zones and focuses each onto the sensing element.",
      "The element has two halves wired against each other. A steady scene cancels out; a warm body crossing zones makes a small changing voltage.",
      "The BISS0001 amplifies that, compares it with the sensitivity setting and starts its timer.",
      "OUT goes to 3.3 V for the delay time. The jumper picks whether continued motion keeps extending it (H) or it fires once (L). Allow a minute to settle after power-up.",
    ],
  },
  facts: [
    { label: "Range", value: "3–7 m" },
    { label: "Field of view", value: "110°" },
    { label: "Supply", value: "5–20 V, about 65 µA" },
    { label: "Output", value: "3.3 V logic" },
    { label: "Hold time", value: "3 s – 5 min" },
    { label: "Warm-up", value: "30–60 s" },
  ],
  lab: { logic: 3.3, supply: [4.5, 20], tolerates5V: true },
  spec: {
    form: {
      mount: "jumpers",
      pitch: 2.54,
      holes: [
        { x: 2, y: 12, d: 2.2 },
        { x: 30, y: 12, d: 2.2 },
      ],
      note: "Three header pins on the bottom edge take jumper wires. Two M2 holes, 28 mm apart, hold it in an enclosure behind a window for the dome.",
    },
    power: {
      supply: { min: 4.5, max: 20, typ: 5 },
      logic: 3.3,
      tolerant5V: false,
      draw: { idle: 0.065, active: 0.8, peak: 10 },
      interface: "One digital output, 3.3 V high while motion is present",
    },
    sourcing: { mpn: "HC-SR501", maker: "Generic clone makers (BISS0001 and an LHI778 sensing element)", lifecycle: "generic", usd: [1, 3] },
    limits: [
      "Needs 4.5 V to 20 V at VCC. It does not run from a 3.3 V pin, because the regulator and a diode on the board need headroom.",
      "Warm-up is 30 to 60 s after power-on, and OUT may switch on and off up to three times while it settles.",
      "It sees heat that moves, not heat. A person sitting still is invisible to it.",
      "Range shrinks in a hot room, where people are no warmer than the walls.",
      "The delay and range trimmers drift, and the delay has a lower limit of about 3 s however you turn it.",
    ],
    upgrade: [
      { name: "AM312 mini PIR", why: "A board only 10 × 8 mm that runs from 2.7 V to 12 V, draws about 0.1 mA, and has a 3.3 V logic output. Range is 3 to 5 m at 100°. It has no trimmers: the delay is fixed at about 2 s." },
    ],
    refs: [
      "https://www.radiolocman.com/op/pdf.html?di=166937",
      "https://handsontec.com/dataspecs/sensor/PIR%20SR501%20Motion%20Sensor.pdf",
      "https://www.elektroda.com/news/news3466161.html",
      "https://envistiamall.com/blogs/learn/hc-sr501-pir-motion-detector-sensor-module-user-guide",
    ],
  },
  experiment: { title: "Motion night-light", idea: "Light an LED while OUT is high, then try both jumper settings and the two trimmers and note how long the light stays on." },
  docs: "/docs/hardware-knowledge/pir-sensor",
  tags: ["pir", "hc-sr501", "motion", "infrared", "presence", "alarm", "sensor"],
});
