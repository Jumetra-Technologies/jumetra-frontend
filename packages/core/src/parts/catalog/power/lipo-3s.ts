import { definePart, ground, lead, pin, rail, silk, type Solid } from "../../sdk";

// A 3S1P hobby pack in blue shrink wrap, 105 x 33 x 24 mm. Leads leave the right end.
const W = 105;
const H = 33;
const D = 24;
const XT_X = 128;

// XT60: 15.6 wide, 8 high, 16 long. Pins 7.2 apart. The battery side is the shrouded plug.
const XT_Y = 11.5;
const Y_POS = XT_Y - 3.6;
const Y_NEG = XT_Y + 3.6;
const redLead: Array<[number, number, number]> = [
  [W - 1, 11, 12],
  [W + 6, Y_POS + 0.6, 9.5],
  [W + 15, Y_POS, 5],
  [XT_X + 0.5, Y_POS, 4],
];
const blackLead: Array<[number, number, number]> = [
  [W - 1, 15, 12],
  [W + 6, Y_NEG - 0.3, 9.5],
  [W + 15, Y_NEG, 5],
  [XT_X + 0.5, Y_NEG, 4],
];

// Balance lead: four thin wires to a white JST-XH plug (4 pins at 2.5 mm).
const BAL_Y = 26.4;
const XH_X = 129;
const BAL_COLORS = ["#17181b", "#e9ecef", "#2f6fd0", "#d12a2a"];
const balWires: Array<Array<[number, number, number]>> = [0, 1, 2, 3].map((i) => {
  const y = BAL_Y - 3.75 + i * 2.5;
  return [
    [W - 1, 21 + i * 1.6, 8],
    [W + 6, 21.5 + i * 1.7, 5],
    [W + 16, y, 2.4],
    [XH_X - 0.5, y, 3.5],
  ];
});

const solids: Array<Solid | Solid[]> = [
  // The pack: three pouch cells in series, in one blue shrink wrap.
  { kind: "box", id: "pack", x: 0, y: 0, w: W - 1, h: H, d: D, top: "#1f4fb0", side: "#17398a", radius: 3.6, finish: "plastic" },
  // The wrap's flat end where the leads leave.
  { kind: "box", x: W - 4, y: 1.5, w: 4, h: H - 3, d: D - 6, z: 3, top: "#17398a", radius: 1, finish: "plastic" },
  // The label.
  { kind: "box", x: 8, y: 4, w: 74, h: 25, d: 0.15, z: D, top: "#eceef2", radius: 1.2, finish: "paper" },
  silk(45, 13.4, "LiPo 3S1P", 6.4, "#16398a", { anchor: "middle", z: D + 0.17, weight: 800 }),
  silk(45, 18.6, "11.1 V  2200 mAh  25C", 3.4, "#222428", { anchor: "middle", z: D + 0.17 }),
  silk(45, 22.6, "Max charge 1C  4.2 V per cell", 2.4, "#222428", { anchor: "middle", z: D + 0.17 }),
  silk(45, 26.4, "Balance charge only", 2.4, "#c0201c", { anchor: "middle", z: D + 0.17, weight: 700 }),
  // Heavy leads to the XT60.
  lead(redLead, "#d12a2a", { r: 1.8 }),
  lead(blackLead, "#17181b", { r: 1.8 }),
  // XT60 housing: yellow nylon, two gold barrels at the mating face.
  { kind: "box", id: "xt60", x: XT_X, y: XT_Y - 7.8, w: 16, h: 15.6, d: 8, top: "#f0c400", side: "#b89400", radius: 1.2, finish: "plastic" },
  { kind: "box", x: XT_X + 15.9, y: XT_Y - 5.2, w: 0.3, h: 10.4, d: 5.2, z: 1.4, top: "#d8aa00", radius: 0.6, finish: "plastic" },
  { kind: "cyl", cx: XT_X + 16, cy: Y_POS, r: 2.1, d: 0.5, z: 4 - 2.1, axis: "x", top: "#1b1c1f", finish: "metal" },
  { kind: "cyl", cx: XT_X + 16, cy: Y_NEG, r: 2.1, d: 0.5, z: 4 - 2.1, axis: "x", top: "#1b1c1f", finish: "metal" },
  { kind: "cyl", cx: XT_X + 16.2, cy: Y_POS, r: 1.7, d: 0.2, z: 4 - 1.7, axis: "x", top: "#d9b05c", finish: "gold" },
  { kind: "cyl", cx: XT_X + 16.2, cy: Y_NEG, r: 1.7, d: 0.2, z: 4 - 1.7, axis: "x", top: "#d9b05c", finish: "gold" },
  silk(XT_X + 6, XT_Y - 5.3, "+", 2.4, "#6a5400", { anchor: "middle", z: 8.01 }),
  silk(XT_X + 6, XT_Y + 6.7, "−", 2.4, "#6a5400", { anchor: "middle", z: 8.01 }),
  // Balance wires and the XH plug.
  balWires.flatMap((pts, i) => lead(pts, BAL_COLORS[i], { r: 0.55 })),
  { kind: "box", id: "xh", x: XH_X, y: BAL_Y - 6.2, w: 5.75, h: 12.4, d: 7, top: "#f2f0ea", side: "#cfcbbf", radius: 0.4, finish: "plastic" },
  { kind: "box", x: XH_X + 5.3, y: BAL_Y - 5.35, w: 0.5, h: 10.7, d: 3.6, z: 1.6, top: "#2b2a27", radius: 0.3, finish: "plastic" },
  { kind: "pins", x: XH_X + 5.6, y: BAL_Y - 3.75, count: 4, pitch: 2.5, dir: "y", len: 0.1, z: 3, size: 0.8, color: "#d9b05c", finish: "gold" },
];

export default definePart({
  id: "lipo-3s",
  name: "3S LiPo battery pack (11.1 V, XT60)",
  aka: ["3S LiPo", "11.1 V LiPo", "12 V LiPo", "RC LiPo pack", "3S1P 2200mAh 25C"],
  group: "power",
  rank: 5,
  summary: "The battery pack for stepper drivers and 12 V motors: 11.1 V, 55 A, 2200 mAh. Like the 2S pack it has no protection circuit, so a short makes fire and it needs a balance charger.",
  size: { w: W, h: H, d: 24.2 },
  solids,
  features: [
    { id: "pack", label: "Three pouch cells", kind: "power", x: 0, y: 0, w: W - 1, h: H, note: "Three lithium-polymer pouch cells stacked and joined in series inside one blue shrink wrap. 4.2 V each when full, 3.7 V nominal." },
    { id: "xt60", label: "XT60 plug", kind: "connector", x: XT_X, y: XT_Y - 7.8, w: 16, h: 15.6, note: "The yellow plug takes the discharge current: up to 60 A. It only goes in one way. + and − are marked on it." },
    { id: "balance", label: "Balance plug (JST-XH)", kind: "connector", x: XH_X, y: BAL_Y - 6.2, w: 5.75, h: 12.4, note: "The white plug has four pins: cell 1 −, the two joins between the cells, and cell 3 +. A balance charger uses it to charge all three cells evenly, and a cell checker reads each cell from it." },
    { id: "label", label: "Label", kind: "other", x: 8, y: 4, w: 74, h: 25, note: "Capacity, 'S' count (3S = three cells in series) and 'C' rating. 2200 mAh at 25C is 55 A." },
  ],
  pins: [
    rail("POS", "+", 11.1, "left", { note: "XT60 + (red). 12.6 V full, 11.1 V nominal, never below 9.0 V. Stop at 9.9 V." }),
    ground("NEG", "left", "−", { note: "XT60 − (black)." }),
    pin("BAL", "power", "opt", "Balance taps: the joins between the cells, about 3.7 V and 7.4 V. For a balance charger or a cell checker. Don't use them as a supply.", { label: "Balance", required: false }),
  ],
  pinAt: {
    POS: { x: XT_X + 16, y: Y_POS },
    NEG: { x: XT_X + 16, y: Y_NEG },
    BAL: { x: XH_X + 5.6, y: BAL_Y },
  },
  circuit: {
    blocks: [
      { id: "cells", label: "Three LiPo cells", sub: "3 × 3.7 V", kind: "power", col: 0, row: 0, at: "pack", note: "Three pouch cells in series. Each is 4.2 V full and must never go under 3.0 V. About 10 to 15 milliohm each." },
      { id: "xt60", label: "XT60 plug", sub: "discharge", kind: "connector", col: 1, row: 0, at: "xt60", note: "Carries the full current from the thick leads." },
      { id: "pos", label: "+ (red)", sub: "11.1 V", kind: "power", col: 2, row: 0, at: "POS", note: "12.6 V full to 9.0 V empty. About 0.045 ohm inside the pack, so 10 A takes 0.45 V off." },
      { id: "neg", label: "− (black)", sub: "ground", kind: "ground", col: 2, row: 1, at: "NEG", note: "Return lead." },
      { id: "bal", label: "Balance taps", sub: "cell joins", kind: "pin", col: 1, row: 1, at: "BAL", note: "The wires between the cells. Only for a charger or a checker." },
      { id: "load", label: "Your robot", sub: "driver, converter", kind: "world", col: 3, row: 0, note: "Stepper drivers and 12 V motors take it as it is. 6 V motors, servos and the board need it stepped down." },
    ],
    links: [
      { from: "cells", to: "xt60", kind: "power", label: "up to 55 A" },
      { from: "xt60", to: "pos", kind: "power" },
      { from: "cells", to: "neg", kind: "ground" },
      { from: "cells", to: "bal", kind: "signal", label: "cell taps" },
      { from: "pos", to: "load", kind: "power" },
      { from: "neg", to: "load", kind: "ground" },
    ],
    steps: [
      "Three cells at 3.7 V each, joined in series, give 11.1 V: 12.6 V full and 9.0 V at the lowest.",
      "The thick leads and XT60 plug carry the load current. 2200 mAh at 25C can give 55 A.",
      "The balance plug taps the joins between the cells. A balance charger reads them to fill every cell to exactly 4.2 V.",
      "No chip watches the pack. Stop at 9.9 V (3.3 V a cell). Below 9.0 V the cells are damaged for good.",
    ],
  },
  facts: [
    { label: "Voltage", value: "11.1 V (12.6 V full)" },
    { label: "Capacity", value: "2200 mAh" },
    { label: "Rating", value: "25C = 55 A continuous" },
    { label: "Resistance", value: "about 0.045 ohm" },
    { label: "Plugs", value: "XT60 + JST-XH balance" },
    { label: "Size", value: "105 × 33 × 24 mm, 188 g" },
  ],
  spec: {
    form: { mass: 188, mount: "leads", note: "Mass with wires and plug (Turnigy 2200 mAh 3S 25C). Strap it down with a hook-and-loop strap, low in the robot: it is often the heaviest part." },
    power: {
      source: { volts: 11.1, maxMa: 55000, capacityMah: 2200, ohms: 0.045, chemistry: "lipo" },
      interface: "XT60 discharge plug, JST-XH 4-pin balance plug",
      note: "Full 12.6 V, empty 9.0 V; stop at 9.9 V. 25C × 2200 mAh = 55 A continuous, 35C for 10 seconds. The 0.045 ohm figure is typical for a 3S pack of this size, not printed on it.",
    },
    sourcing: { mpn: "3S1P 2200mAh 25C", maker: "generic (Turnigy, Zippy, Gens Ace, Tattu)", lifecycle: "generic", usd: [11, 25], note: "Seen at USD 11 for the 25C pack; a higher C rating costs more. Another shop lists the same pack as 105 × 34 × 26 mm and 180 g." },
    limits: [
      "No protection circuit. One deep discharge under 3.0 V a cell ruins it, and a short gives well over 55 A: enough to melt the wires and start a fire.",
      "Needs a balance charger (constant current then constant voltage to 4.2 V a cell, 12.6 V in all). A plain 12 V supply will not keep the cells level.",
      "12.6 V full is twice what 6 V motors and hobby servos take, and above the 12 V an Uno's VIN likes: step it down with a buck converter.",
      "188 g, nearly three times the 2S pack. A small robot may not carry it.",
      "A swollen pack is damaged: stop using it. Charge in a LiPo bag and never leave it alone. Keep it under 60 °C.",
    ],
    upgrade: [
      { name: "Three 18650 cells with a protection board (3S BMS)", why: "The same 11.1 V from steel-cased cells with a cut-off for a short, over-charge and deep discharge, so a classroom mistake does not start a fire. About 10 A, and heavier." },
      { part: "lipo-2s", name: "2S LiPo pack", why: "For 6 V motors and servos 7.4 V needs far less stepping down, and the pack weighs 71 g." },
    ],
    refs: ["https://www.makerlab-electronics.com/products/turnigy-2200mah-3s-25c-lipo-pack-true-rated", "https://speedyfpv.com/products/turnigy-2200mah-3s-lipo-battery-pack-11-1v-25c-xt60-connector"],
  },
  sim: { kind: "source", plus: "POS", minus: "NEG" },
  experiment: { title: "Size the pack", idea: "Add up what your motors and board draw, work out how many minutes 2200 mAh lasts, then check your answer against the lab's power budget." },
  tags: ["battery", "lipo", "3s", "11.1v", "12v", "xt60", "balance", "rc", "power"],
});
