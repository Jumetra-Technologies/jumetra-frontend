import { MATERIAL, definePart, ground, lead, name, pin, rail, silk, type Solid } from "../../sdk";
import { cellLying, leadEnd, plate, spring, tray } from "./_cells";

// A black 2 x 2 holder: two rows, two AA cells end to end in each row, chained in a U.
// Lead tabs are on the left wall. Row A (top): + on the left. Row B (bottom): + on the right.
const W = 106;
const H = 32;
const FLOOR = 0.6;
const ROW_A: [number, number] = [0.95, 15.6];
const ROW_B: [number, number] = [16.4, 31.05];
const YA = (ROW_A[0] + ROW_A[1]) / 2;
const YB = (ROW_B[0] + ROW_B[1]) / 2;
const R = 7.25;
const LEN = 50.5;
const AXIS = FLOOR + R;

const cell = (xa: number, cy: number, plus: "left" | "right", id?: string) =>
  cellLying({ xa, cy, z: FLOOR, length: LEN, r: R, plus, wrap: "#1c1d20", band: "#b8892f", stripe: "#e9c867", nipple: { r: 2.6, len: 1 }, id });

const redLead: Array<[number, number, number]> = [
  [3.2, YA, 3],
  [-3, YA, 2],
  [-12, YA - 4, 0.9],
  [-24, YA - 9, 0.9],
  [-32, YA - 7, 0.9],
];
const blackLead: Array<[number, number, number]> = [
  [3.2, YB, 3],
  [-3, YB, 2],
  [-12, YB + 4, 0.9],
  [-24, YB + 9, 0.9],
  [-32, YB + 7, 0.9],
];

const solids: Array<Solid | Solid[]> = [
  tray({ w: W, h: H, rows: [ROW_A, ROW_B], x0: 2.2, x1: 103.8, floor: FLOOR, wallD: 11, color: "#1b1c1f" }),
  // Row A: + on the left. Row B: + on the right.
  cell(2.7, YA, "left", "cell-a1"),
  cell(53.3, YA, "left", "cell-a2"),
  cell(2.7, YB, "right", "cell-b1"),
  cell(53.3, YB, "right", "cell-b2"),
  // Contacts: plates meet the + buttons, springs press the - ends.
  plate(2.2, YA, FLOOR + 3, 9, 9),
  spring(50.6, YA, AXIS, 4.2, 2.2),
  plate(52.8, YA, FLOOR + 3, 9, 9),
  spring(101.3, YA, AXIS, 4.2, 2.5),
  spring(2.4, YB, AXIS, 4.2, 2.5),
  plate(53.0, YB, FLOOR + 3, 9, 9),
  spring(50.8, YB, AXIS, 4.2, 2.0),
  plate(103.0, YB, FLOOR + 3, 9, 9),
  // The strap that joins row A's end to row B's end through the right wall.
  { kind: "box", x: 103.4, y: YA - 4.5, w: 1.2, h: YB - YA + 9, d: 0.8, z: FLOOR + 0.2, top: "#c9ccd1", finish: "metal" },
  // Solder tabs on the left wall.
  { kind: "box", x: 1.0, y: YA - 1.2, w: 3.2, h: 2.4, d: 0.4, z: 2.8, top: "#c9ccd1", finish: "metal" },
  { kind: "box", x: 1.0, y: YB - 1.2, w: 3.2, h: 2.4, d: 0.4, z: 2.8, top: "#c9ccd1", finish: "metal" },
  lead(redLead, "#d12a2a", { r: 0.85, strip: 6 }),
  lead(blackLead, "#17181b", { r: 0.85, strip: 6 }),
  // Moulded + and - marks on the rim.
  silk(1.15, 4.1, "+", 2, "#6b6d73", { anchor: "middle", z: 11.01 }),
  silk(104.85, 28.0, "+", 2, "#6b6d73", { anchor: "middle", z: 11.01 }),
  silk(1.15, 27.8, "−", 2, "#6b6d73", { anchor: "middle", z: 11.01 }),
];

export default definePart({
  id: "battery-4aa",
  name: "4 × AA battery holder with cells",
  aka: ["4xAA battery pack", "6 V battery holder", "AA battery box", "4AA holder"],
  group: "power",
  rank: 1,
  summary: "The black box with four AA cells and two flying leads that powers most robot cars. Four 1.5 V cells in a row add up to 6 V. It can feed a motor driver, but not much more than 1 A.",
  size: { w: W, h: H, d: 15.2 },
  solids,
  features: [
    { id: "cells", label: "Four AA cells", kind: "power", x: 2.2, y: 0.95, w: 101.6, h: 30.1, note: "Four alkaline AA cells, each 14.5 mm across and 50.5 mm long. They lie in two rows with the + button (the bump) at one end." },
    { id: "link", label: "Series link", kind: "connector", x: 102.6, y: 3, w: 3.4, h: 26, note: "A metal strap through the end wall joins the two rows, so the cells follow one after another and their volts add up." },
    { id: "springs", label: "Springs and plates", kind: "mechanical", x: 2.2, y: 3, w: 6, h: 26, note: "Plates touch the + button of each cell and coil springs push on the flat - end. Push the cells in against the springs." },
    { id: "red-lead", label: "Red lead (+)", kind: "pin", x: -34, y: 0, w: 38, h: 9, note: "The + lead. About 6 V with fresh alkaline cells. Its bare end goes to a driver's power input." },
    { id: "black-lead", label: "Black lead (−)", kind: "pin", x: -34, y: 23, w: 38, h: 9, note: "The - lead. Ground for the whole robot." },
  ],
  pins: [
    rail("POS", "+", 6, "left", { note: "Red lead. 6.0 V nominal with four fresh alkaline cells, 6.2 to 6.4 V new, 4.8 V with NiMH cells." }),
    ground("NEG", "left", "−", { note: "Black lead. Ground. Join it to the driver's and the board's GND." }),
  ],
  pinAt: { POS: leadEnd(redLead, 6), NEG: leadEnd(blackLead, 6) },
  circuit: {
    blocks: [
      { id: "cells", label: "4 AA cells", sub: "4 × 1.5 V", kind: "power", col: 0, row: 0, at: "cells", note: "Each cell gives 1.5 V and has about 0.15 to 0.3 ohm inside. Alkaline cells run down fast when you pull more than 1 A." },
      { id: "link", label: "Series strap", sub: "cell to cell", kind: "connector", col: 1, row: 0, at: "link", note: "Plus of one cell touches minus of the next. The volts add: 4 × 1.5 = 6 V." },
      { id: "pos", label: "+ (red)", sub: "6 V", kind: "power", col: 2, row: 0, at: "POS", note: "The pack's + end. It drops about 0.65 to 1.3 V at 1 A because of the cells' own resistance." },
      { id: "neg", label: "− (black)", sub: "ground", kind: "ground", col: 2, row: 1, at: "NEG", note: "The pack's - end." },
      { id: "load", label: "Your robot", sub: "driver and motors", kind: "world", col: 3, row: 0, note: "Everything hangs on these two leads. Nothing here stops a short or a reversed cell." },
    ],
    links: [
      { from: "cells", to: "link", kind: "power", label: "1.5 V steps" },
      { from: "link", to: "pos", kind: "power", label: "6 V" },
      { from: "cells", to: "neg", kind: "ground" },
      { from: "pos", to: "load", kind: "power", label: "up to about 1 A" },
      { from: "neg", to: "load", kind: "ground" },
    ],
    steps: [
      "Each AA cell makes 1.5 V between its + button and its flat - end.",
      "The holder puts the cells in a chain: the end of one touches the start of the next, so the volts add up to 6 V.",
      "The red and black leads carry that 6 V to your driver. The pack's own resistance, 0.65 to 1.3 ohm, takes about 1 V off at 1 A.",
      "As the cells run down the voltage slides toward 3.2 V. Most motor drivers stop working well before that.",
    ],
  },
  facts: [
    { label: "Voltage", value: "6 V alkaline, 4.8 V NiMH" },
    { label: "Capacity", value: "about 1600 mAh at 400 mA" },
    { label: "Good for", value: "up to about 1 A" },
    { label: "Resistance", value: "0.65 to 1.3 ohm (alkaline)" },
    { label: "Leads", value: "red +, black −, bare ends" },
    { label: "Size", value: "106 × 32 × 15 mm" },
  ],
  spec: {
    form: { mass: 100, mount: "leads", note: "Mass with four alkaline cells (23 g each). The holder is open: cells are held by springs, so hold the pack down with tape or a strap on a moving robot. Often has a slide switch and a lid." },
    power: {
      source: { volts: 6, maxMa: 1000, capacityMah: 1600, ohms: 0.75, chemistry: "alkaline" },
      interface: "Two flying leads, red + and black −",
      note: "6.0 V nominal with alkaline cells (4.8 V with NiMH). Capacity is 2000 mAh at 25 to 100 mA, 1591 mAh at 400 mA and about 1000 mAh at 1 A.",
    },
    sourcing: { mpn: "4 × AA holder, 2 × 2, 150 mm leads", maker: "generic", lifecycle: "generic", usd: [0.5, 3], note: "Sold empty. Cells are extra: an alkaline AA is about 23 g." },
    limits: [
      "Alkaline AA cells have 0.15 to 0.3 ohm inside each, so the pack drops 0.65 to 1.3 V at 1 A. Two motors starting together can pull it down to 3 or 4 V and reset a board that shares it.",
      "Capacity falls with load: about 2000 mAh at 100 mA, 1591 mAh at 400 mA, only about 1000 mAh at 1 A.",
      "Swap in NiMH cells and the pack is 4.8 V, not 6 V: a 6 V motor runs about 20% slower.",
      "Nothing protects it: no fuse and no switch. A short on the 24 AWG leads heats the wire and the cells. Fit a fuse of 2 A.",
      "One flat or backwards cell cuts the whole pack by 1.2 to 1.5 V. Use four cells of the same make and age.",
    ],
    upgrade: [
      { name: "4 × eneloop AA NiMH in the same holder", why: "Each cell has about 25 milliohm inside, so the pack drops only about 0.15 V at 1 A instead of 0.65 to 1.3 V, and you recharge it more than 2000 times. The pack is 4.8 V." },
      { part: "battery-18650", name: "Two 18650 cells in a holder", why: "7.4 V at about 50 milliohm for 2500 mAh, so a motor driver stays strong at 2 A. You need a buck converter for 5 V logic." },
    ],
    refs: ["https://pololu.com/product/1770", "https://www.robotshop.com/products/4-aa-battery-holder-2x2-arrangement", "https://goughlui.com"],
  },
  sim: { kind: "source", plus: "POS", minus: "NEG" },
  experiment: { title: "Measure the sag", idea: "Read the pack with a meter while nothing is on it, then run one motor and read it again. The gap is the pack's own resistance at work." },
  tags: ["battery", "aa", "4aa", "6v", "alkaline", "holder", "robot car", "power"],
});
