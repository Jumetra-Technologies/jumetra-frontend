import { definePart, ground, jst, lead, rail, silk, sot23, chip, type Solid } from "../../sdk";
import { leadEnd } from "./_cells";

// A 503450 pouch cell (5 x 34 x 50 mm) with its protection board and a short lead to a JST-PH plug.
const H = 34;
const D = 5;
const PCM_X = 46.5;

const plug = jst(77.5, 17, 2, "right", { z: 0 });
const redLead: Array<[number, number, number]> = [
  [PCM_X + 4, 14.3, 2.2],
  [55, 12, 1.4],
  [64, 11, 0.9],
  [71, 14, 1.8],
  [75.4, 16, 3],
];
const blackLead: Array<[number, number, number]> = [
  [PCM_X + 4, 19.7, 2.2],
  [55, 22, 1.4],
  [64, 23, 0.9],
  [71, 20, 1.8],
  [75.4, 18, 3],
];

const solids: Array<Solid | Solid[]> = [
  // The pouch: foil with a printed label, and a thin sealed edge.
  { kind: "box", id: "pouch", x: 0, y: 0, w: 43, h: H, d: D, top: "#c9ccd1", side: "#a7acb3", radius: 1.4, finish: "aluminum" },
  { kind: "box", x: 43, y: 0, w: 3.5, h: H, d: 0.7, z: 2.15, top: "#b9bdc3", finish: "aluminum" },
  { kind: "box", x: 4, y: 4, w: 33, h: 26, d: 0.1, z: D, top: "#ebe8dc", radius: 0.8, finish: "paper" },
  silk(20.5, 13.5, "LiPo 3.7 V", 4.4, "#223b6e", { anchor: "middle", z: D + 0.12, weight: 800 }),
  silk(20.5, 18.7, "1000 mAh", 3.4, "#222428", { anchor: "middle", z: D + 0.12 }),
  silk(20.5, 23.2, "503450  3.7 V  3.7 Wh", 2.2, "#222428", { anchor: "middle", z: D + 0.12 }),
  silk(20.5, 27.2, "Charge at 4.2 V only", 2.0, "#c0201c", { anchor: "middle", z: D + 0.12 }),
  // Nickel tabs from the cell into the protection board.
  { kind: "box", x: 46.4, y: 7, w: 3, h: 4, d: 0.25, z: 2.2, top: "#b9bdc3", finish: "metal" },
  { kind: "box", x: 46.4, y: 23, w: 3, h: 4, d: 0.25, z: 2.2, top: "#b9bdc3", finish: "metal" },
  // The protection board (a small green PCB) with its two chips.
  { kind: "box", id: "pcm", x: PCM_X + 1, y: 2, w: 4, h: 30, d: 1.6, z: 1.7, top: "#1f6b57", side: "#0f3a2e", radius: 0.3, finish: "soldermask" },
  { kind: "box", x: PCM_X + 1.2, y: 3.5, w: 2.2, h: 3.0, d: 0.9, z: 3.3, top: "#1b1c1f", finish: "epoxy", label: { text: "8205", size: 1.0, color: "#9aa0a6" } },
  { kind: "box", x: PCM_X + 1.4, y: 12.8, w: 1.6, h: 2.9, d: 0.9, z: 3.3, top: "#1b1c1f", finish: "epoxy" },
  { kind: "box", x: PCM_X + 3.8, y: 8.5, w: 0.8, h: 1.6, d: 0.5, z: 3.3, top: "#c9ccd1", finish: "ceramic" },
  { kind: "box", x: PCM_X + 3.8, y: 22, w: 0.8, h: 1.6, d: 0.5, z: 3.3, top: "#8a6a3a", finish: "ceramic" },
  { kind: "disc", cx: PCM_X + 4.6, cy: 14.3, r: 0.9, color: "#d9b05c", z: 3.31 },
  { kind: "disc", cx: PCM_X + 4.6, cy: 19.7, r: 0.9, color: "#d9b05c", z: 3.31 },
  lead(redLead, "#d12a2a", { r: 0.75 }),
  lead(blackLead, "#17181b", { r: 0.75 }),
  plug.solids,
];

export default definePart({
  id: "lipo-battery",
  name: "1S LiPo pouch cell with protection board and JST-PH lead",
  aka: ["3.7 V LiPo", "503450", "1S LiPo", "lithium polymer cell", "single cell LiPo"],
  group: "power",
  rank: 5,
  summary: "A flat 3.7 V lithium pouch cell as thin as 5 mm, with a small protection board and a JST-PH lead. It runs small boards and sensors for hours. Use a 4.2 V lithium charger only.",
  size: { w: 50, h: H, d: 6 },
  solids,
  features: [
    { id: "pouch", label: "Pouch cell", kind: "power", x: 0, y: 0, w: 46.5, h: H, note: "One lithium-polymer cell in a foil pouch, 5 mm thick, 34 mm wide and about 50 mm long. 4.2 V full, 3.7 V nominal. It swells if abused, so never press on it or pierce it." },
    { id: "pcm", label: "Protection board", kind: "chip", x: PCM_X + 1, y: 2, w: 4, h: 30, note: "A tiny board with a protection chip and two MOSFETs. It opens the circuit below about 3.0 V, above 4.25 V and on a short or a big overload (2 to 3 A). It has no temperature sensor." },
    { id: "plug", label: "JST-PH plug", kind: "connector", x: 74.5, y: 14, w: 6, h: 6, note: "A 2-pin, 2.0 mm plug. Check the polarity against your board before you plug in: cheap packs sometimes have red and black swapped." },
    { id: "red-lead", label: "Red lead (+)", kind: "pin", x: 50, y: 10, w: 27, h: 6, note: "The + lead from the protection board." },
    { id: "black-lead", label: "Black lead (−)", kind: "pin", x: 50, y: 18, w: 27, h: 6, note: "The − lead from the protection board. It is the build's ground." },
  ],
  pins: [
    rail("POS", "+", 3.7, "left", { note: "Red lead on the JST-PH plug. 4.2 V full, 3.7 V nominal. The board cuts off at about 3.0 V." }),
    ground("NEG", "left", "−", { note: "Black lead on the JST-PH plug. Ground." }),
  ],
  pinAt: { POS: { x: 77.5, y: 16 }, NEG: { x: 77.5, y: 18 } },
  circuit: {
    blocks: [
      { id: "cell", label: "LiPo cell", sub: "3.7 V, 1000 mAh", kind: "power", col: 0, row: 0, at: "pouch", note: "One cell: 4.2 V full, about 3.7 V on average, 3.4 V close to empty." },
      { id: "pcm", label: "Protection board", sub: "cut-off", kind: "ic", col: 1, row: 0, at: "pcm", note: "Two MOSFETs in the minus line, run by a protection chip. They open on a low cell, a high cell or a short. They add about 50 to 60 milliohm." },
      { id: "plug", label: "JST-PH plug", sub: "2 pin", kind: "connector", col: 2, row: 0, at: "plug", note: "Plugs into a charger board or a 3.7 V converter." },
      { id: "pos", label: "+ (red)", sub: "3.7 V", kind: "power", col: 3, row: 0, at: "POS", note: "About 0.1 to 0.2 V lower at 1 A." },
      { id: "neg", label: "− (black)", sub: "ground", kind: "ground", col: 3, row: 1, at: "NEG", note: "Return, through the protection MOSFETs." },
    ],
    links: [
      { from: "cell", to: "pcm", kind: "power", label: "3.0 to 4.2 V" },
      { from: "pcm", to: "plug", kind: "power" },
      { from: "plug", to: "pos", kind: "power", label: "1C = 1 A" },
      { from: "plug", to: "neg", kind: "ground" },
    ],
    steps: [
      "The cell makes about 3.7 V, which is 4.2 V when full and 3.4 V when it is nearly flat.",
      "The protection board watches it. If the cell drops under 3.0 V or the current goes over 2 to 3 A, it opens the circuit.",
      "The red and black leads take it to the JST-PH plug and your board. 5 V loads need a boost converter.",
      "To charge, use a 4.2 V lithium charger at no more than 1 A (500 mA is kinder).",
    ],
  },
  facts: [
    { label: "Voltage", value: "3.7 V (4.2 V full)" },
    { label: "Capacity", value: "1000 mAh (3.7 Wh)" },
    { label: "Discharge", value: "1C = 1 A, 2C = 2 A brief" },
    { label: "Cut-off", value: "protection opens at 3.0 V" },
    { label: "Plug", value: "JST-PH 2 pin, 2.0 mm" },
    { label: "Size", value: "50 × 34 × 5 mm, 20 g" },
  ],
  spec: {
    form: { mass: 20, mount: "leads", note: "A 503450 cell is 5.0 mm thick, 34 mm wide, 50 mm long. The lead is about 100 mm long on the real part." },
    power: {
      source: { volts: 3.7, maxMa: 2000, capacityMah: 1000, ohms: 0.15, chemistry: "lipo" },
      interface: "Two flying leads to a JST-PH 2.0 mm plug",
      note: "Charge to 4.2 V at no more than 1C (1000 mA) between 0 and 50 °C. Discharge 1C continuous, 2C briefly. The 0.15 ohm figure, with the protection MOSFETs, is an estimate.",
    },
    sourcing: { mpn: "503450 1000 mAh", maker: "generic pouch-cell makers", lifecycle: "active", usd: [3, 8], note: "Cheap packs often hold 600 to 800 mAh, not the 1000 mAh on the label." },
    limits: [
      "1C to 2C only: 1 to 2 A. Two small motors starting at once can trip the protection at 2 to 3 A and reset the robot.",
      "3.0 to 4.2 V is too low for 5 V loads: you need a boost converter, which takes 1.5 to 2 times the output current.",
      "Pouch cells swell or burn if punctured, charged above 4.2 V or run under about 2.5 V.",
      "No temperature sensor: charge only between 0 and 50 °C and never unattended.",
      "The JST-PH lead polarity differs between makers. Look at the wires, not the colors alone.",
    ],
    upgrade: [
      { part: "battery-18650", name: "18650 cell in a holder", why: "2500 mAh and up to 20 A from a steel cell, against 1000 mAh at 2 A. Use a protected cell, as the pouch has a board and a bare 18650 does not." },
      { name: "Branded 1S LiPo with JST-PH from a known maker", why: "Correct polarity, a tested protection board and printed dimensions." },
    ],
    refs: ["https://scccltd.com/products/503450-lipo-battery-3-7v-1000mah", "https://learn.adafruit.com/li-ion-and-lipoly-batteries"],
  },
  sim: { kind: "source", plus: "POS", minus: "NEG" },
  experiment: { title: "Run a board off one cell", idea: "Plug the cell into a 3.7 V to 5 V boost converter and power a small board from it. Note how long it lasts." },
  tags: ["battery", "lipo", "1s", "3.7v", "pouch", "jst-ph", "503450", "power"],
});
