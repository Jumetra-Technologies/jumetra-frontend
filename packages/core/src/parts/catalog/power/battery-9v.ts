import { MATERIAL, definePart, ground, lead, name, rail, silk, type Solid } from "../../sdk";
import { leadEnd } from "./_cells";

// A 9 V block lying on its big face, terminals on the right end (+x), with a snap clip standing just off them.
const BODY_L = 46.4;
const H = 26.5;
const D = 17.5;
const ZC = D / 2;
// Round + stud and big hex - socket sit 12.7 mm apart on the end face.
const Y_NEG = 7;
const Y_POS = 19.7;
// The clip, pulled a little way off the terminals so both snaps show.
const CLIP_X = 54.5;
const CLIP_L = 11;

const redLead: Array<[number, number, number]> = [
  [CLIP_X + CLIP_L - 0.5, Y_POS, ZC],
  [CLIP_X + CLIP_L + 5, Y_POS + 1, 6.5],
  [CLIP_X + CLIP_L + 9, Y_POS + 8, 1.2],
  [CLIP_X + CLIP_L + 4, Y_POS + 18, 0.9],
  [CLIP_X + CLIP_L - 6, Y_POS + 23, 0.9],
  [CLIP_X + CLIP_L - 12, Y_POS + 24, 0.9],
];
const blackLead: Array<[number, number, number]> = [
  [CLIP_X + CLIP_L - 0.5, Y_NEG, ZC],
  [CLIP_X + CLIP_L + 5, Y_NEG - 1, 6.5],
  [CLIP_X + CLIP_L + 9, Y_NEG - 8, 1.2],
  [CLIP_X + CLIP_L + 4, Y_NEG - 18, 0.9],
  [CLIP_X + CLIP_L - 6, Y_NEG - 23, 0.9],
  [CLIP_X + CLIP_L - 12, Y_NEG - 24, 0.9],
];

const solids: Array<Solid | Solid[]> = [
  // The steel jacket in its black wrap.
  { kind: "box", id: "can", x: 0, y: 0, w: BODY_L, h: H, d: D, top: "#16171a", side: "#0c0c0e", radius: 1.6, finish: "plastic" },
  // The crimped end with the plastic insulator that carries the terminals.
  { kind: "box", x: BODY_L - 2.4, y: 0.3, w: 2.4, h: H - 0.6, d: D - 0.6, z: 0.3, top: "#2b2c31", radius: 0.8, finish: "plastic" },
  { kind: "box", x: BODY_L - 0.01, y: 1.2, w: 0.5, h: H - 2.4, d: D - 2.4, z: 1.2, top: "#2b2c31", radius: 0.6, finish: "plastic" },
  // Hex - socket and round + stud.
  { kind: "cyl", id: "neg-socket", cx: BODY_L + 1.3, cy: Y_NEG, r: 4.6, d: 2.6, z: ZC - 4.6, axis: "x", segments: 6, top: "#b9bdc3", finish: "metal" },
  { kind: "cyl", cx: BODY_L + 2.65, cy: Y_NEG, r: 2.8, d: 0.3, z: ZC - 2.8, axis: "x", top: "#2a2b2f", finish: "metal" },
  { kind: "cyl", id: "pos-stud", cx: BODY_L + 1.1, cy: Y_POS, r: 3.5, d: 2.2, z: ZC - 3.5, axis: "x", top: "#c9ccd1", finish: "metal" },
  { kind: "cyl", cx: BODY_L + 2.3, cy: Y_POS, r: 2.6, d: 0.2, z: ZC - 2.6, axis: "x", top: "#e2e4e8", finish: "metal" },
  // The label: a copper band across the end and the big 9 V.
  { kind: "path", d: "M 31 0.2 H 41 V 26.3 H 31 Z", color: "#c4862a", fill: "#c4862a", z: D + 0.01 },
  { kind: "path", d: "M 41 0.2 H 42.2 V 26.3 H 41 Z", color: "#e9c867", fill: "#e9c867", z: D + 0.01 },
  silk(14.5, 17.5, "9V", 9, "#e9c867", { anchor: "middle", z: D + 0.02, weight: 800 }),
  silk(14.5, 22.4, "ALKALINE", 2.2, "#d7d8dc", { anchor: "middle", z: D + 0.02 }),
  silk(14.5, 4.6, "6LR61", 2.2, "#d7d8dc", { anchor: "middle", z: D + 0.02 }),
  silk(36, 21, "+", 3, "#16171a", { anchor: "middle", z: D + 0.02 }),
  silk(36, 11, "−", 3, "#16171a", { anchor: "middle", z: D + 0.02 }),
  // The snap clip: a black plastic body with the male hex snap and the female cup facing the battery.
  { kind: "box", id: "clip", x: CLIP_X, y: 0.6, w: CLIP_L, h: H - 1.2, d: 15, z: ZC - 7.5, top: "#202125", side: "#0b0b0d", radius: 1.8, finish: "plastic" },
  { kind: "cyl", cx: CLIP_X - 1.3, cy: Y_NEG, r: 4.1, d: 2.8, z: ZC - 4.1, axis: "x", segments: 6, top: "#c9ccd1", finish: "metal" },
  { kind: "cyl", cx: CLIP_X - 0.05, cy: Y_POS, r: 4.4, d: 0.5, z: ZC - 4.4, axis: "x", top: "#b9bdc3", finish: "metal" },
  { kind: "cyl", cx: CLIP_X - 0.2, cy: Y_POS, r: 3.3, d: 0.4, z: ZC - 3.3, axis: "x", top: "#0e0e10", finish: "metal" },
  lead(redLead, "#d12a2a", { r: 0.95, strip: 6 }),
  lead(blackLead, "#17181b", { r: 0.95, strip: 6 }),
];

export default definePart({
  id: "battery-9v",
  name: "9 V battery with snap clip",
  aka: ["9V block", "PP3", "6LR61", "9 volt battery", "9V snap connector"],
  group: "power",
  rank: 2,
  summary: "The little rectangular 9 V block, with a snap clip and two flying leads. Fine for a blinking LED or a sensor on a bench. Too small for motors: it gives up after a few minutes at 500 mA.",
  size: { w: 48.5, h: H, d: D },
  solids,
  features: [
    { id: "body", label: "9 V block", kind: "power", x: 0, y: 0, w: BODY_L, h: H, note: "Six small 1.5 V cells in a steel jacket. Alkaline, about 550 mAh when lightly loaded, and it cannot be recharged." },
    { id: "terminals", label: "Snap terminals", kind: "connector", x: BODY_L, y: 2.4, w: 2.4, h: 22, note: "The round stud is + and the big hex socket is −. They only snap together one way round." },
    { id: "clip", label: "Snap clip", kind: "connector", x: CLIP_X - 3, y: 0.6, w: CLIP_L + 3, h: H - 1.2, note: "Press it onto the terminals. Its round cup takes the + stud and its hex plug goes into the − socket." },
    { id: "red-lead", label: "Red lead (+)", kind: "pin", x: 56, y: 24, w: 20, h: 24, note: "The + lead. Bare end, about 9 V fresh." },
    { id: "black-lead", label: "Black lead (−)", kind: "pin", x: 56, y: -22, w: 20, h: 24, note: "The - lead. Ground." },
  ],
  pins: [
    rail("POS", "+", 9, "left", { note: "Red lead from the snap clip. 9.0 V nominal, 9.4 V when new, and it slides down toward 5.4 V as it empties." }),
    ground("NEG", "left", "−", { note: "Black lead. Ground." }),
  ],
  pinAt: { POS: leadEnd(redLead, 6), NEG: leadEnd(blackLead, 6) },
  circuit: {
    blocks: [
      { id: "cells", label: "Six cells", sub: "6 × 1.5 V", kind: "power", col: 0, row: 0, at: "body", note: "Six thin 1.5 V cells in a stack inside the jacket. They have 1.5 to 2 ohm inside, so the voltage falls fast under load." },
      { id: "terminals", label: "Snap terminals", sub: "+ stud, − socket", kind: "connector", col: 1, row: 0, at: "terminals", note: "The two snaps on the end of the block." },
      { id: "clip", label: "Snap clip", sub: "red and black leads", kind: "connector", col: 2, row: 0, at: "clip", note: "The clip joins the terminals to two flying leads." },
      { id: "pos", label: "+ (red)", sub: "9 V", kind: "power", col: 3, row: 0, at: "POS", note: "Falls about 1.5 to 2 V at 1 A." },
      { id: "neg", label: "− (black)", sub: "ground", kind: "ground", col: 3, row: 1, at: "NEG", note: "The return lead." },
    ],
    links: [
      { from: "cells", to: "terminals", kind: "power", label: "9 V" },
      { from: "terminals", to: "clip", kind: "power" },
      { from: "clip", to: "pos", kind: "power", label: "up to 100 mA" },
      { from: "clip", to: "neg", kind: "ground" },
    ],
    steps: [
      "Six small cells in a stack add up to about 9 V between the two snaps.",
      "The clip snaps on and takes the + and − to the red and black leads.",
      "The block has 1.5 to 2 ohm inside, so a 500 mA load takes about 1 V off, and it lasts well under an hour.",
      "Below about 7 V an Arduino's barrel jack can't make 5 V any more, so half the energy is already unusable.",
    ],
  },
  facts: [
    { label: "Voltage", value: "9 V (9.4 V new)" },
    { label: "Capacity", value: "about 400 mAh at 100 mA" },
    { label: "Good for", value: "100 to 200 mA" },
    { label: "Resistance", value: "1.5 to 2 ohm" },
    { label: "Mass", value: "45 g" },
    { label: "Size", value: "48.5 × 26.5 × 17.5 mm" },
  ],
  spec: {
    form: { mass: 45, mount: "leads", note: "The block is 48.5 × 26.5 × 17.5 mm. The clip and leads are extra: the clip snaps on, the leads end bare." },
    power: {
      source: { volts: 9, maxMa: 500, capacityMah: 400, ohms: 1.7, chemistry: "alkaline" },
      interface: "Two snap terminals, usually with a snap clip on two flying leads",
      note: "Capacity is about 550 mAh at a light load, about 400 mAh at 100 mA and about 250 mAh at 500 mA. The datasheets only draw curves; the 1.7 ohm figure is a typical value, not a printed one.",
    },
    sourcing: { mpn: "6LR61 (PP3)", maker: "Energizer, Duracell, Varta, generic", lifecycle: "active", usd: [1.5, 5], note: "A clip with leads is about $1. A clip ending in a 5.5 × 2.1 mm barrel plug (center +) fits the Arduino Uno's jack." },
    limits: [
      "It has 1.5 to 2 ohm inside: at 500 mA the voltage falls 0.75 to 1 V, and a stalled motor (1 to 2 A) pulls it under 5 V in seconds.",
      "Small: 550 mAh at best and 170 to 330 mAh at 500 mA. A 300 mA load drains it in about an hour.",
      "An Arduino's regulator needs about 7 V in, and the block gets down to 7 V after about half its capacity.",
      "Not rechargeable, with no fuse and no protection. Clips can break at the wire after many reconnects.",
    ],
    upgrade: [
      { part: "battery-4aa", name: "4 × AA holder", why: "About 1600 mAh at 400 mA and a lot less resistance inside, so it carries a motor. With NiMH cells it drops only about 0.15 V at 1 A." },
      { part: "battery-18650", name: "Two 18650 cells in a holder", why: "7.4 V from 2500 mAh at about 50 milliohm: no sag at 1 to 2 A, and you recharge it." },
    ],
    refs: ["https://manualmachine.com/energizer/522/16696563-technical-information", "https://www.powerstream.com/9V-Alkaline-tests.htm"],
  },
  sim: { kind: "source", plus: "POS", minus: "NEG" },
  experiment: { title: "Watch it sag", idea: "Power an LED with a resistor, then a small motor, from the same 9 V block and read its voltage each time." },
  tags: ["battery", "9v", "pp3", "6lr61", "alkaline", "snap clip", "power"],
});
