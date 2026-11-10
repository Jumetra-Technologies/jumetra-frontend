import { MATERIAL, definePart, ground, lead, rail, silk, type Solid } from "../../sdk";
import { cellLying, leadEnd, plate, spring, tray } from "./_cells";

// A black 2-slot holder: two 18650 cells side by side, in series. Leads leave the left wall.
// Cell A (top): + on the left. Cell B (bottom): + on the right; a strap on the right joins them.
const W = 76;
const H = 41;
const FLOOR = 1.6;
const ROW_A: [number, number] = [1.2, 20.0];
const ROW_B: [number, number] = [21.0, 39.8];
const YA = (ROW_A[0] + ROW_A[1]) / 2;
const YB = (ROW_B[0] + ROW_B[1]) / 2;
const R = 9.2;
const AXIS = FLOOR + R;

const cell = (cy: number, plus: "left" | "right", id: string) =>
  cellLying({ xa: 5.5, cy, z: FLOOR, length: 65, r: R, plus, wrap: "#2f8f5b", band: "#e4e6e8", bandFrac: 0.36, id });

const redLead: Array<[number, number, number]> = [
  [3.8, YA, 7],
  [-3, YA, 3],
  [-12, YA - 4, 0.9],
  [-24, YA - 8, 0.9],
  [-32, YA - 6, 0.9],
];
const blackLead: Array<[number, number, number]> = [
  [3.8, YB, 7],
  [-3, YB, 3],
  [-12, YB + 4, 0.9],
  [-24, YB + 8, 0.9],
  [-32, YB + 6, 0.9],
];

const solids: Array<Solid | Solid[]> = [
  tray({ w: W, h: H, rows: [ROW_A, ROW_B], x0: 2.4, x1: 73.6, floor: FLOOR, wallD: 14, color: "#1b1c1f", radius: 2 }),
  cell(YA, "left", "cell-a"),
  cell(YB, "right", "cell-b"),
  // Left wall: a plate for cell A's + end, a spring for cell B's - end.
  plate(4.9, YA, FLOOR + 2, 12, 12),
  spring(2.6, YB, AXIS, 6, 2.8),
  // Right wall: a spring for cell A's - end, a plate for cell B's + end.
  spring(70.6, YA, AXIS, 6, 2.8),
  plate(70.5, YB, FLOOR + 2, 12, 12),
  // The strap through the right wall that joins A's - to B's +.
  { kind: "box", x: 72.0, y: YA - 6, w: 1.4, h: YB - YA + 12, d: 1, z: FLOOR + 0.2, top: "#c9ccd1", finish: "metal" },
  { kind: "box", x: 1.2, y: YA - 1.3, w: 3.6, h: 2.6, d: 0.4, z: 6.8, top: "#c9ccd1", finish: "metal" },
  { kind: "box", x: 1.2, y: YB - 1.3, w: 3.6, h: 2.6, d: 0.4, z: 6.8, top: "#c9ccd1", finish: "metal" },
  lead(redLead, "#d12a2a", { r: 0.9, strip: 6 }),
  lead(blackLead, "#17181b", { r: 0.9, strip: 6 }),
  silk(1.2, 5.5, "+", 2.2, "#6b6d73", { anchor: "middle", z: 14.01 }),
  silk(1.2, 36.5, "−", 2.2, "#6b6d73", { anchor: "middle", z: 14.01 }),
  silk(74.8, 36.5, "+", 2.2, "#6b6d73", { anchor: "middle", z: 14.01 }),
  silk(74.8, 5.5, "−", 2.2, "#6b6d73", { anchor: "middle", z: 14.01 }),
];

export default definePart({
  id: "battery-18650",
  name: "2 × 18650 battery holder with cells",
  aka: ["18650 holder", "2S 18650 pack", "7.4 V lithium holder", "2 slot 18650 battery box"],
  group: "power",
  rank: 3,
  summary: "A black two-slot holder with two 18650 lithium cells in series: 7.4 V that carries several amps, recharges, and has no protection. Handle it with respect and add a fuse.",
  size: { w: W, h: H, d: 20.2 },
  solids,
  features: [
    { id: "cells", label: "Two 18650 cells", kind: "power", x: 5.5, y: 1.2, w: 65, h: 38.6, note: "Two lithium-ion cells, each 18.4 mm across and 65 mm long, flat-top and unprotected. Each is 3.6 V nominal and 4.2 V full." },
    { id: "strap", label: "Series strap", kind: "connector", x: 71.6, y: 4, w: 2, h: 33, note: "A metal strap through the right wall joins cell A's − end to cell B's + end. The volts add: 7.4 V." },
    { id: "contacts", label: "Springs and plates", kind: "mechanical", x: 2.4, y: 3, w: 5, h: 35, note: "Thin springs and plates hold each cell. They add 20 to 50 milliohm each and shake loose on a moving robot, so strap the cells down." },
    { id: "red-lead", label: "Red lead (+)", kind: "pin", x: -34, y: 0, w: 38, h: 12, note: "Pack +. 8.4 V full, 7.4 V nominal, 5.0 V empty." },
    { id: "black-lead", label: "Black lead (−)", kind: "pin", x: -34, y: 30, w: 38, h: 12, note: "Pack −. Ground." },
  ],
  pins: [
    rail("POS", "+", 7.4, "left", { note: "Red lead. 8.4 V full, about 7.4 V nominal and never below 5.0 V (2.5 V a cell)." }),
    ground("NEG", "left", "−", { note: "Black lead. Ground." }),
  ],
  pinAt: { POS: leadEnd(redLead, 6), NEG: leadEnd(blackLead, 6) },
  circuit: {
    blocks: [
      { id: "cells", label: "Two 18650 cells", sub: "3.6 V each", kind: "power", col: 0, row: 0, at: "cells", note: "Each cell is 2500 mAh and about 18 to 22 milliohm inside. A bare cell has no protection: if you take it below 2.5 V or short it, it is ruined or burns." },
      { id: "strap", label: "Series strap", sub: "cell to cell", kind: "connector", col: 1, row: 0, at: "strap", note: "Joins the two cells end to end: 3.7 V + 3.7 V." },
      { id: "pos", label: "+ (red)", sub: "7.4 V", kind: "power", col: 2, row: 0, at: "POS", note: "Takes about 0.1 V off at 2 A and 0.25 V at 5 A." },
      { id: "neg", label: "− (black)", sub: "ground", kind: "ground", col: 2, row: 1, at: "NEG", note: "The pack's return lead." },
      { id: "load", label: "Your robot", sub: "driver, converter", kind: "world", col: 3, row: 0, note: "7.4 V is too much for 5 V logic and 6 V motors: put a buck converter or a driver between." },
    ],
    links: [
      { from: "cells", to: "strap", kind: "power", label: "3.6 V each" },
      { from: "strap", to: "pos", kind: "power", label: "7.4 V" },
      { from: "cells", to: "neg", kind: "ground" },
      { from: "pos", to: "load", kind: "power", label: "a few amps" },
      { from: "neg", to: "load", kind: "ground" },
    ],
    steps: [
      "Each lithium cell sits near 3.7 V and swings from 4.2 V full to 2.5 V empty.",
      "The strap puts them in a chain, so the two add: 8.4 V full, 7.4 V on average, 5.0 V empty.",
      "With about 50 milliohm in the pack, a 2 A load takes only 0.1 V off: a strong source, unlike AA cells.",
      "Nothing watches the cells. Stop at 6 V on the pack, and charge each cell with a proper lithium charger.",
    ],
  },
  facts: [
    { label: "Voltage", value: "7.4 V (8.4 V full)" },
    { label: "Capacity", value: "2500 mAh" },
    { label: "Good for", value: "3 to 5 A in this holder" },
    { label: "Resistance", value: "about 50 milliohm" },
    { label: "Cells", value: "18.4 × 65 mm, flat top" },
    { label: "Size", value: "76 × 41 × 20 mm" },
  ],
  spec: {
    form: { mount: "leads", note: "Two cells weigh about 90 g (43.8 g each, Samsung 25R); the holder adds a few grams more. Leads are 22 to 24 AWG, about 125 to 150 mm long." },
    power: {
      source: { volts: 7.4, maxMa: 5000, capacityMah: 2500, ohms: 0.05, chemistry: "li-ion" },
      interface: "Two flying leads, red + and black −",
      note: "The cells (Samsung INR18650-25R) are rated 20 A each, but the holder's springs and thin leads limit it to about 3 to 5 A. 2500 mAh at 500 mA and 2450 mAh at 10 A. Charge at 1.25 A to 4.2 V per cell.",
    },
    sourcing: { mpn: "2-slot 18650 holder", maker: "generic holder; Samsung SDI cells", lifecycle: "generic", usd: [4, 10], note: "Cells are $3 to $6 each. The holder alone is $1 to $2. Cells ship under lithium-battery rules." },
    limits: [
      "Bare cells have no protection. Under 2.5 V or a short can ruin a cell or start a fire, and a short of one cell passes well over its 20 A rating. Fit a fuse of 5 A.",
      "Nothing balances the two cells. If they are not matched, one runs flat first. Use two cells bought together and charge them one at a time.",
      "8.4 V full is above the 6 V a TT motor or a hobby servo wants, and too high for 5 V logic: use a buck converter.",
      "The thin springs add 20 to 50 milliohm each and can shake loose.",
      "No-name '2500 mAh' cells are often 1200 to 2000 mAh. Buy a known brand.",
    ],
    upgrade: [
      { part: "lipo-2s", name: "2S LiPo pack with balance lead", why: "Same 7.4 V with a lower resistance (about 40 milliohm), a plug that can't come loose and 20 A or more, but it needs a balance charger." },
      { name: "Protected 18650 cells or a 2S battery management board", why: "A protection board cuts off at about 2.5 V a cell, on over-current and on a short, so a classroom mistake does not ruin the cells." },
    ],
    refs: ["https://www.18650batterystore.com/products/samsung-25r-18650", "https://www.taydaelectronics.com/2-x-18650-lithium-battery-holder-case-black-with-wire-leads.html"],
  },
  sim: { kind: "source", plus: "POS", minus: "NEG" },
  experiment: { title: "Same motor, two packs", idea: "Run one motor stalled for a second from four AA cells and then from this pack, reading the volts under load each time. Watch how little this pack sags." },
  tags: ["battery", "18650", "lithium", "li-ion", "7.4v", "2s", "holder", "power"],
});
