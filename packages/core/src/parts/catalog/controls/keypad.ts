import { MATERIAL, definePart, pin, roundedRect, silk, type Solid } from "../../sdk";

const W = 69;
const H = 77;
const BASE = 0.6;
const KEY = 13;
const PITCH_X = 16;
const PITCH_Y = 17;
const KEYS_X = 4;
const KEYS_Y = 6;
const LEGENDS = [
  ["1", "2", "3", "A"],
  ["4", "5", "6", "B"],
  ["7", "8", "9", "C"],
  ["*", "0", "#", "D"],
];

// The flat tail leaves the bottom edge, bends a little, and ends in the 8-way female housing.
const TAIL_X = 10;
const TAIL_W = 20.32;
const TAIL_Y = 76;
const TAIL_LEN = 30;
const SHIFT = 6;
const HOUSE_Y = TAIL_Y + TAIL_LEN - 1.5;
const HOUSE_LEN = 10;
const HOUSE_X = TAIL_X + SHIFT;
const MOUTH_Y = HOUSE_Y + HOUSE_LEN;
const SPOTS = Array.from({ length: 8 }, (_, i) => ({ x: Math.round((HOUSE_X + 1.27 + i * 2.54) * 100) / 100, y: MOUTH_Y }));

const tail = `M ${TAIL_X} ${TAIL_Y} C ${TAIL_X} ${TAIL_Y + 15}, ${TAIL_X + SHIFT} ${TAIL_Y + 15}, ${TAIL_X + SHIFT} ${TAIL_Y + TAIL_LEN} L ${TAIL_X + SHIFT + TAIL_W} ${TAIL_Y + TAIL_LEN} C ${TAIL_X + SHIFT + TAIL_W} ${TAIL_Y + 15}, ${TAIL_X + TAIL_W} ${TAIL_Y + 15}, ${TAIL_X + TAIL_W} ${TAIL_Y} Z`;

const keys: Solid[] = LEGENDS.flatMap((row, r) =>
  row.map((text, c): Solid => ({
    kind: "box",
    
    x: KEYS_X + c * PITCH_X,
    y: KEYS_Y + r * PITCH_Y,
    w: KEY,
    h: KEY,
    d: 0.3,
    z: BASE,
    top: "#4a4d52",
    side: "#2d2f33",
    radius: 1.6,
    finish: "plastic",
  })),
);

/** The white legend printed on each key. */
const legends: Solid[] = LEGENDS.flatMap((row, r) =>
  row.map((text, c): Solid => silk(KEYS_X + c * PITCH_X + KEY / 2, KEYS_Y + r * PITCH_Y + KEY / 2 + 2.2, text, 6.5, "#f1f2f4", { anchor: "middle", z: BASE + 0.32, weight: 600 })),
);

export default definePart({
  id: "keypad",
  name: "4 × 4 membrane keypad",
  aka: ["matrix keypad", "16-key keypad", "numeric keypad", "membrane keypad", "4x4 keypad"],
  group: "controls",
  rank: 6,
  summary: "Sixteen keys, 1 to 9, 0, A to D, * and #, on a sticky sheet less than 1 mm thick. It has only eight wires: one for each row and one for each column. Pressing a key joins its row to its column, and your board finds which by scanning.",
  size: { w: W, h: H, d: 2.54 },
  solids: [
    // The black polyester sheet with a printed border, and sixteen slightly raised keys.
    { kind: "box", id: "membrane", x: 0, y: 0, w: W, h: H, d: BASE, z: 0, top: "#26282c", side: "#15161a", radius: 2, finish: "plastic" },
    { kind: "path", d: roundedRect(1.2, 1.2, W - 2.4, H - 2.4, 1.6), color: "#5b5f66", width: 0.3, z: BASE + 0.01 },
    ...keys,
    ...legends,
    // The flat tail: amber polyester with eight silver traces on it.
    { kind: "extrude", id: "tail", path: tail, d: 0.3, z: 0, top: "#d9b779", side: "#a8864a", finish: "plastic" },
    ...Array.from({ length: 8 }, (_, i): Solid => {
      const x = TAIL_X + 1.27 + i * 2.54;
      // Each trace follows the same S-bend as the tail: a smooth step of SHIFT across its length.
      const points = Array.from({ length: 9 }, (_, k): [number, number, number] => {
        const t = k / 8;
        const s = t * t * (3 - 2 * t);
        return [Math.round((x + SHIFT * s) * 100) / 100, Math.round((TAIL_Y + 1 + (TAIL_LEN - 2) * t) * 100) / 100, 0.42];
      });
      return { kind: "wire", points, r: 0.22, color: "#c9ccd1", finish: "tin" };
    }),
    // The 8-way female housing, lying flat with its mouth facing away from the keypad.
    { kind: "box", id: "housing", x: HOUSE_X, y: HOUSE_Y, w: 8 * 2.54, h: HOUSE_LEN, d: 2.54, z: 0, top: MATERIAL.header, side: MATERIAL.headerSide, radius: 0.3, finish: "plastic" },
    ...SPOTS.flatMap((s): Solid[] => [
      { kind: "box", x: s.x - 0.8, y: s.y - 0.1, w: 1.6, h: 0.3, d: 1.6, z: 0.47, top: "#000000", finish: "plastic", radius: 0.1 },
      { kind: "box", x: s.x - 0.35, y: s.y + 0.1, w: 0.7, h: 0.08, d: 0.7, z: 0.9, top: MATERIAL.gold, finish: "gold" },
    ]),
    silk(SPOTS[0].x, HOUSE_Y + 3, "1", 1.4, MATERIAL.silk, { anchor: "middle", z: 2.55 }),
  ],
  features: [
    { id: "keys", label: "Sixteen keys", kind: "button", x: KEYS_X, y: KEYS_Y, w: 3 * PITCH_X + KEY, h: 3 * PITCH_Y + KEY, note: "Four rows of four, printed 1 2 3 A, 4 5 6 B, 7 8 9 C and * 0 # D. Each key is a raised dome you press with a fingertip; it has no click." },
    { id: "membrane", label: "Membrane", kind: "other", x: 0, y: 0, w: W, h: H, note: "Two thin plastic layers with a gap between, under 1 mm in all. The back has a peel-off sticky layer to fix it on a box." },
    { id: "tail", label: "Flat tail", kind: "other", x: TAIL_X, y: TAIL_Y, w: TAIL_W + SHIFT, h: TAIL_LEN, note: "Eight silver traces on a flat amber strip. The real one is about 84 mm long and is drawn shorter here. Bend it, but do not crease it." },
    { id: "housing", label: "8-way housing", kind: "connector", x: HOUSE_X, y: HOUSE_Y, w: 8 * 2.54, h: HOUSE_LEN, note: "A female 1 × 8 housing, 2.54 mm pitch, to take male header pins or jumper wires. Pin 1 is on the left when the mouth faces you." },
    { id: "rows", label: "R1 to R4, rows", kind: "pins", x: HOUSE_X, y: MOUTH_Y - 2, w: 4 * 2.54, h: 3, note: "The first four pins are the rows. R1 is the top row: 1 2 3 A. Some makers number it the other way, so test with a multimeter." },
    { id: "cols", label: "C1 to C4, columns", kind: "pins", x: HOUSE_X + 4 * 2.54, y: MOUTH_Y - 2, w: 4 * 2.54, h: 3, note: "The last four pins are the columns. C1 is the left column: 1 4 7 *." },
  ],
  pins: [
    pin("R1", "digital", "io", "Row 1: keys 1, 2, 3, A. Wire to a board pin the scan drives.", { label: "R1", required: true }),
    pin("R2", "digital", "io", "Row 2: keys 4, 5, 6, B.", { label: "R2", required: true }),
    pin("R3", "digital", "io", "Row 3: keys 7, 8, 9, C.", { label: "R3", required: true }),
    pin("R4", "digital", "io", "Row 4: keys *, 0, #, D.", { label: "R4", required: true }),
    pin("C1", "digital", "io", "Column 1: keys 1, 4, 7, *. Wire to a board pin with its pull-up on.", { label: "C1", required: true }),
    pin("C2", "digital", "io", "Column 2: keys 2, 5, 8, 0.", { label: "C2", required: true }),
    pin("C3", "digital", "io", "Column 3: keys 3, 6, 9, #.", { label: "C3", required: true }),
    pin("C4", "digital", "io", "Column 4: keys A, B, C, D.", { label: "C4", required: true }),
  ],
  pinAt: { R1: SPOTS[0], R2: SPOTS[1], R3: SPOTS[2], R4: SPOTS[3], C1: SPOTS[4], C2: SPOTS[5], C3: SPOTS[6], C4: SPOTS[7] },
  circuit: {
    blocks: [
      { id: "mcu", label: "Your board", sub: "scans the grid", kind: "mcu", col: 0, row: 0, note: "The Keypad library does this for you: it drives each row low in turn and reads the four columns." },
      { id: "rows", label: "R1 to R4", sub: "driven low, one at a time", kind: "pin", col: 1, row: 0, at: "R1", note: "One row goes low while the other three are left floating." },
      { id: "keys", label: "16 switches", sub: "one per row and column", kind: "passive", col: 2, row: 0, at: "keys", note: "Each key is a switch between its row wire and its column wire, about 60 to 90 Ω when closed." },
      { id: "cols", label: "C1 to C4", sub: "pulled high by the board", kind: "pin", col: 3, row: 0, at: "C1", note: "Set as inputs with pull-ups. A column reads low only if a closed key joins it to the low row." },
      { id: "finger", label: "Finger", sub: "presses a key", kind: "world", col: 2, row: 1, note: "Press and the dome touches the lower layer." },
    ],
    links: [
      { from: "mcu", to: "rows", kind: "signal", label: "row low" },
      { from: "rows", to: "keys", kind: "signal" },
      { from: "finger", to: "keys", kind: "physical", label: "press" },
      { from: "keys", to: "cols", kind: "signal", label: "joins row to column" },
      { from: "cols", to: "mcu", kind: "signal", label: "which column is low" },
    ],
    steps: [
      "The four columns are inputs with pull-ups, so they read high. The four rows are left floating.",
      "The board pulls row 1 low and reads the columns. If one reads low, a key on row 1 is down, and the column says which.",
      "It repeats for rows 2, 3 and 4, many times a second. Row and column together name the key.",
      "There are no diodes in the grid, so pressing three keys at once can make a fourth look pressed. The Keypad library returns one key at a time.",
    ],
  },
  facts: [
    { label: "Keys", value: "16, 4 × 4" },
    { label: "Wires", value: "8: 4 rows, 4 columns" },
    { label: "Contact", value: "60 to 90 Ω" },
    { label: "Rating", value: "24 V DC, 30 mA" },
    { label: "Life", value: "1 million presses" },
    { label: "Size", value: "69 × 77 × 1 mm" },
  ],
  spec: {
    form: {
      mass: 12,
      mount: "jumpers",
      pitch: 2.54,
      note: "Sticks to a box with its own adhesive. The tail ends in a female 1 × 8 housing for header pins or jumper wires. The real tail is about 84 mm long; it is drawn at 30 mm. Key size and pitch are estimates.",
    },
    power: {
      interface: "8 wires, 4 rows and 4 columns, read by scanning",
      note: "Sixteen switches and no power pin. Each is rated 24 V DC at 30 mA and closes at 60 to 90 Ω, so use the board's pull-ups, not a low-ohm load. Bounce is 5 ms or less; insulation is 100 MΩ at 100 V; it works from 0 to 50 °C.",
    },
    sourcing: { mpn: "4×4 membrane matrix keypad", maker: "Generic", lifecycle: "generic", usd: [0.5, 2] },
    limits: [
      "The grid has no diodes: three keys held together can show a fourth (ghosting).",
      "Each closed key adds 60 to 90 Ω, about 0.3 to 0.45 V at 5 mA, so only high-impedance inputs read it cleanly.",
      "Rated 24 V and 30 mA, and only for 0 to 50 °C.",
      "The tail is about 84 mm long and the pins are not marked. Some makers number the rows 1 to 4 and some the columns, so check with a multimeter.",
      "It uses eight board pins. An I2C expander brings that down to two.",
    ],
    upgrade: [{ name: "4 × 4 button pad with a PCF8574 or MCP23017 I2C expander", why: "Two wires instead of eight, hardware scanning and an interrupt pin, so your board does no polling." }],
    refs: ["https://protosupplies.com/product/membrane-keypad-4x4-matrix/", "https://cdn.shopify.com/s/files/1/0015/7571/4865/files/datasheet_keypad-4x4.pdf"],
  },
  sim: {
    kind: "sensor",
    reads: [{ key: "key", label: "Key held (0 = none)", min: 0, max: 16, step: 1, start: 0, sweep: [0, 16, 16], digits: 0 }],
  },
  experiment: { title: "Door code", idea: "Use the Keypad library to collect four key presses. If they match a secret code, turn a green LED on for three seconds; if not, a red one." },
  docs: "/docs/hardware-knowledge/keypad",
  tags: ["keypad", "membrane", "matrix", "4x4", "16 keys", "numeric", "input", "control", "scan"],
});
