import { definePart, ground, lead, pin, rail, silk, type Solid } from "../../sdk";

// A 2S1P hobby pack in blue shrink wrap, 75 x 35 x 14.7 mm. Leads leave the right end.
const W = 75;
const H = 35;
const D = 14.7;
const XT_X = 97;

// XT60: 15.6 wide, 8 high, 16 long. Pins 7.2 apart. The battery side is the shrouded plug.
const Y_POS = 13.9;
const Y_NEG = 21.1;
const redLead: Array<[number, number, number]> = [
  [74, 15.9, 7.4],
  [80, Y_POS + 0.4, 6],
  [88, Y_POS, 4.4],
  [XT_X + 0.5, Y_POS, 4],
];
const blackLead: Array<[number, number, number]> = [
  [74, 19.1, 7.4],
  [80, Y_NEG - 0.4, 6],
  [88, Y_NEG, 4.4],
  [XT_X + 0.5, Y_NEG, 4],
];

// Balance lead: three thin wires to a white JST-XH plug (3 pins at 2.5 mm).
const BAL_Y = 29;
const XH_X = 98;
const balWires: Array<Array<[number, number, number]>> = [
  [[74, 26.5, 5], [80, 26.5, 3], [90, BAL_Y - 2.5, 2], [XH_X - 0.5, BAL_Y - 2.5, 3.5]],
  [[74, 28.5, 5], [80, 28.5, 3], [90, BAL_Y, 2], [XH_X - 0.5, BAL_Y, 3.5]],
  [[74, 30.5, 5], [80, 30.5, 3], [90, BAL_Y + 2.5, 2], [XH_X - 0.5, BAL_Y + 2.5, 3.5]],
];

const solids: Array<Solid | Solid[]> = [
  // The pack: two pouch cells in series, in one blue shrink wrap.
  { kind: "box", id: "pack", x: 0, y: 0, w: W - 1, h: H, d: D, top: "#1f4fb0", side: "#17398a", radius: 3.2, finish: "plastic" },
  // The wrap's flat end where the leads leave.
  { kind: "box", x: W - 4, y: 1.5, w: 4, h: H - 3, d: D - 4, z: 2, top: "#17398a", radius: 1, finish: "plastic" },
  // The label.
  { kind: "box", x: 6, y: 4.5, w: 52, h: 26, d: 0.15, z: D, top: "#eceef2", radius: 1.2, finish: "paper" },
  silk(32, 14.2, "LiPo 2S1P", 5.6, "#16398a", { anchor: "middle", z: D + 0.17, weight: 800 }),
  silk(32, 19.2, "7.4 V  1000 mAh  20C", 3, "#222428", { anchor: "middle", z: D + 0.17 }),
  silk(32, 23.2, "Max charge 1C  4.2 V per cell", 2.2, "#222428", { anchor: "middle", z: D + 0.17 }),
  silk(32, 27.4, "Balance charge only", 2.2, "#c0201c", { anchor: "middle", z: D + 0.17, weight: 700 }),
  // Heavy leads to the XT60.
  lead(redLead, "#d12a2a", { r: 1.6 }),
  lead(blackLead, "#17181b", { r: 1.6 }),
  // XT60 housing: yellow nylon, two gold barrels at the mating face.
  { kind: "box", id: "xt60", x: XT_X, y: 17.5 - 7.8, w: 16, h: 15.6, d: 8, top: "#f0c400", side: "#b89400", radius: 1.2, finish: "plastic" },
  { kind: "box", x: XT_X + 15.9, y: 17.5 - 5.2, w: 0.3, h: 10.4, d: 5.2, z: 1.4, top: "#d8aa00", radius: 0.6, finish: "plastic" },
  { kind: "cyl", cx: XT_X + 16, cy: Y_POS, r: 2.1, d: 0.5, z: 4 - 2.1, axis: "x", top: "#1b1c1f", finish: "metal" },
  { kind: "cyl", cx: XT_X + 16, cy: Y_NEG, r: 2.1, d: 0.5, z: 4 - 2.1, axis: "x", top: "#1b1c1f", finish: "metal" },
  { kind: "cyl", cx: XT_X + 16.2, cy: Y_POS, r: 1.7, d: 0.2, z: 4 - 1.7, axis: "x", top: "#d9b05c", finish: "gold" },
  { kind: "cyl", cx: XT_X + 16.2, cy: Y_NEG, r: 1.7, d: 0.2, z: 4 - 1.7, axis: "x", top: "#d9b05c", finish: "gold" },
  silk(XT_X + 6, 12.2, "+", 2.4, "#6a5400", { anchor: "middle", z: 8.01 }),
  silk(XT_X + 6, 24.2, "−", 2.4, "#6a5400", { anchor: "middle", z: 8.01 }),
  // Balance wires and the XH plug.
  balWires.flatMap((pts, i) => lead(pts, ["#17181b", "#e9ecef", "#d12a2a"][i], { r: 0.55 })),
  { kind: "box", id: "xh", x: XH_X, y: BAL_Y - 4.95, w: 5.75, h: 9.9, d: 7, top: "#f2f0ea", side: "#cfcbbf", radius: 0.4, finish: "plastic" },
  { kind: "box", x: XH_X + 5.3, y: BAL_Y - 4.1, w: 0.5, h: 8.2, d: 3.6, z: 1.6, top: "#2b2a27", radius: 0.3, finish: "plastic" },
  { kind: "pins", x: XH_X + 5.6, y: BAL_Y - 2.5, count: 3, pitch: 2.5, dir: "y", len: 0.1, z: 3, size: 0.8, color: "#d9b05c", finish: "gold" },
];

export default definePart({
  id: "lipo-2s",
  name: "2S LiPo battery pack (7.4 V, XT60)",
  aka: ["2S LiPo", "7.4 V LiPo", "RC LiPo pack", "2S1P 1000mAh 20C"],
  group: "power",
  rank: 4,
  summary: "A blue hobby battery pack for RC cars and drones: 7.4 V, 20 A or more, and light. It has no protection circuit, so a short makes fire and it needs a balance charger.",
  size: { w: W, h: H, d: 14.9 },
  solids,
  features: [
    { id: "pack", label: "Two pouch cells", kind: "power", x: 0, y: 0, w: W - 1, h: H, note: "Two lithium-polymer pouch cells, one on top of the other, in series, inside one blue shrink wrap. 4.2 V each when full, 3.7 V nominal." },
    { id: "xt60", label: "XT60 plug", kind: "connector", x: XT_X, y: 9.7, w: 16, h: 15.6, note: "The yellow plug takes the discharge current: up to 60 A. It only goes in one way. + and − are marked on it." },
    { id: "balance", label: "Balance plug (JST-XH)", kind: "connector", x: XH_X, y: 24, w: 5.75, h: 9.9, note: "The white plug has three pins: cell 1 −, the middle between the cells, and cell 2 +. A balance charger uses it to charge both cells evenly, and a cell checker reads each cell from it." },
    { id: "label", label: "Label", kind: "other", x: 6, y: 4.5, w: 52, h: 26, note: "Capacity, 'S' count (2S = two cells in series) and 'C' rating. 1000 mAh at 20C is 20 A." },
  ],
  pins: [
    rail("POS", "+", 7.4, "left", { note: "XT60 + (red). 8.4 V full, 7.4 V nominal, never below 6.0 V. Stop at 6.6 V." }),
    ground("NEG", "left", "−", { note: "XT60 − (black)." }),
    pin("BAL", "power", "opt", "Balance tap: the middle between the two cells, about 3.7 V. For a balance charger or a cell checker. Don't use it as a supply.", { label: "Balance", required: false }),
  ],
  pinAt: {
    POS: { x: XT_X + 16, y: Y_POS },
    NEG: { x: XT_X + 16, y: Y_NEG },
    BAL: { x: XH_X + 5.6, y: BAL_Y },
  },
  circuit: {
    blocks: [
      { id: "cells", label: "Two LiPo cells", sub: "2 × 3.7 V", kind: "power", col: 0, row: 0, at: "pack", note: "Two pouch cells in series. Each is 4.2 V full and must never go under 3.0 V. About 15 to 25 milliohm each." },
      { id: "xt60", label: "XT60 plug", sub: "discharge", kind: "connector", col: 1, row: 0, at: "xt60", note: "Carries the full current from the thick leads." },
      { id: "pos", label: "+ (red)", sub: "7.4 V", kind: "power", col: 2, row: 0, at: "POS", note: "8.4 V full to 6.0 V empty. About 0.04 ohm inside the pack, so 10 A takes 0.4 V off." },
      { id: "neg", label: "− (black)", sub: "ground", kind: "ground", col: 2, row: 1, at: "NEG", note: "Return lead." },
      { id: "bal", label: "Balance tap", sub: "cell midpoint", kind: "pin", col: 1, row: 1, at: "BAL", note: "The wire between the two cells. Only for a charger or a checker." },
      { id: "load", label: "Your robot", sub: "ESC, driver, converter", kind: "world", col: 3, row: 0, note: "8.4 V is above what 6 V motors and servos like, so step it down." },
    ],
    links: [
      { from: "cells", to: "xt60", kind: "power", label: "up to 20 A" },
      { from: "xt60", to: "pos", kind: "power" },
      { from: "cells", to: "neg", kind: "ground" },
      { from: "cells", to: "bal", kind: "signal", label: "3.7 V mid" },
      { from: "pos", to: "load", kind: "power" },
      { from: "neg", to: "load", kind: "ground" },
    ],
    steps: [
      "Two cells at 3.7 V each, joined in series, give 7.4 V: 8.4 V full and 6.0 V at the lowest.",
      "The thick leads and XT60 plug carry the load current. 1000 mAh at 20C can give 20 A.",
      "The balance plug taps the point between the cells. A balance charger reads it to fill both cells to exactly 4.2 V.",
      "No chip watches the pack. Stop at 6.6 V (3.3 V a cell). Below 6.0 V the cells are damaged for good.",
    ],
  },
  facts: [
    { label: "Voltage", value: "7.4 V (8.4 V full)" },
    { label: "Capacity", value: "1000 mAh" },
    { label: "Rating", value: "20C = 20 A continuous" },
    { label: "Resistance", value: "about 0.04 ohm" },
    { label: "Plugs", value: "XT60 + JST-XH balance" },
    { label: "Size", value: "75 × 35 × 14.7 mm, 71 g" },
  ],
  spec: {
    form: { mass: 71, mount: "leads", note: "Mass with wires and plug (Rhino 1000 mAh 2S 20C). Pack only is lighter. Strap it down with a hook-and-loop strap." },
    power: {
      source: { volts: 7.4, maxMa: 20000, capacityMah: 1000, ohms: 0.04, chemistry: "lipo" },
      interface: "XT60 discharge plug, JST-XH 3-pin balance plug",
      note: "Full 8.4 V, empty 6.0 V; stop at 6.6 V. 20C × 1000 mAh = 20 A continuous. The 0.04 ohm figure is typical for a small 2S pack, not printed on it.",
    },
    sourcing: { mpn: "2S1P 1000mAh 20C", maker: "generic (Turnigy, Rhino, Zippy, Gens Ace)", lifecycle: "generic", usd: [8, 15] },
    limits: [
      "No protection circuit. One deep discharge under 3.0 V a cell ruins it, and a short gives well over 20 A: enough to burn the wires and start a fire.",
      "Needs a balance charger (constant current then constant voltage to 4.2 V a cell). A plain 8.4 V supply will not keep the cells level.",
      "8.4 V full is above the 6 V of TT gear motors and hobby servos: drop it with a buck converter, or limit the PWM.",
      "A swollen pack is damaged: stop using it. Charge in a LiPo bag and never leave it alone. Keep it under 60 °C.",
    ],
    upgrade: [
      { part: "battery-18650", name: "Two 18650 cells in a holder with a protection board", why: "Same 7.4 V from steel-cased cells with a cut-off, so a classroom mistake does not start a fire. About 2000 to 3000 mAh, though only 5 to 10 A." },
    ],
    refs: ["https://hobbyking.com/en_us/rhino-1000mah-2s-20c-lipo-battery-pack-w-xt60.html"],
  },
  sim: { kind: "source", plus: "POS", minus: "NEG" },
  experiment: { title: "Read the cells", idea: "Plug a cell checker into the balance plug and compare the two cells while you run a motor, then again at rest." },
  tags: ["battery", "lipo", "2s", "7.4v", "xt60", "balance", "rc", "power"],
});
