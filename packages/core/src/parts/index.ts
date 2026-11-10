import { CATALOG } from "./catalog";
import { BOARDS } from "./models/boards";
import { DISPLAYS } from "./models/displays";
import { OUTPUTS } from "./models/outputs";
import { RADIOS } from "./models/radios";
import { SENSORS } from "./models/sensors";
import type { PartGroup, PartModel } from "./types";

export type { PartModel, PartGroup, PartGroupId, PartSpec } from "./types";

export const PART_GROUPS: PartGroup[] = [
  { id: "boards", title: "Boards", blurb: "The microcontroller or computer that runs your code. Everything else connects to one of these." },
  { id: "power", title: "Power", blurb: "What a build runs on once the USB lead comes out: batteries, and the converters and chargers that turn their voltage into the one each part needs." },
  { id: "prototyping", title: "Breadboards and basics", blurb: "What a build sits on and the small parts every circuit needs: breadboards, resistors, capacitors, diodes, transistors and level shifters." },
  { id: "controls", title: "Buttons and controls", blurb: "How a person tells a build what to do: buttons, knobs, joysticks, keypads, switches and remotes." },
  { id: "sensors", title: "Sensors", blurb: "Parts that turn the world into numbers: distance, lines on the floor, motion, heading, color, temperature, light, gas, pressure, current." },
  { id: "motors", title: "Motors and servos", blurb: "Parts that make a build move: gear motors for wheels, servos for arms and steering, steppers for exact positions, pumps." },
  { id: "drivers", title: "Drivers and switches", blurb: "A board pin gives about 20 mA; a motor takes a hundred times that. These parts stand between the two: H-bridges, stepper and servo drivers, MOSFETs and relays." },
  { id: "outputs", title: "Lights and sound", blurb: "Parts that show or say something: LEDs, addressable pixels and buzzers." },
  { id: "displays", title: "Displays", blurb: "Screens and digits for showing readings and messages without a computer attached." },
  { id: "radios", title: "Radios and tags", blurb: "Modules that let a project talk without wires: Bluetooth, Wi-Fi, 2.4 GHz, long range, and RFID tags." },
];

/** Parts not yet moved to `catalog/`, where each part has its own file. */
const LEGACY: PartModel[] = [...BOARDS, ...SENSORS, ...OUTPUTS, ...DISPLAYS, ...RADIOS];
const DEFINED = new Set(CATALOG.map((entry) => entry.model.id));

/** All parts, grouped in display order with the most common first inside each group. */
export const PARTS: PartModel[] = [...CATALOG.map((entry) => entry.model), ...LEGACY.filter((part) => !DEFINED.has(part.id))].sort(
  (a, b) => PART_GROUPS.findIndex((g) => g.id === a.group) - PART_GROUPS.findIndex((g) => g.id === b.group) || a.rank - b.rank,
);

export function getPart(id: string): PartModel | undefined {
  return PARTS.find((part) => part.id === id);
}

export function getPartsByGroup(): Array<{ group: PartGroup; parts: PartModel[] }> {
  return PART_GROUPS.map((group) => ({ group, parts: PARTS.filter((part) => part.group === group.id) })).filter((entry) => entry.parts.length > 0);
}

export function partHref(id: string): string {
  return `/components?part=${encodeURIComponent(id)}`;
}

/** Simple ranked search over names, aliases, summaries and tags. */
export function searchParts(query: string): PartModel[] {
  const q = query.trim().toLowerCase();
  if (!q) return PARTS;
  const terms = q.split(/\s+/).filter(Boolean);
  const score = (part: PartModel) => {
    const name = part.name.toLowerCase();
    const aka = (part.aka ?? []).join(" ").toLowerCase();
    const tags = part.tags.join(" ").toLowerCase();
    const summary = part.summary.toLowerCase();
    let total = 0;
    for (const term of terms) {
      let best = 0;
      if (name.includes(term)) best = name.startsWith(term) ? 10 : 7;
      else if (aka.includes(term)) best = 6;
      else if (tags.includes(term)) best = 5;
      else if (summary.includes(term)) best = 2;
      if (best === 0) return 0;
      total += best;
    }
    return total;
  };
  return PARTS.map((part) => ({ part, score: score(part) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.part);
}

/* ----- Display glass -------------------------------------------------------- */

const SCREEN_LINE = /^screen:(\d+)$/;

/** Whether a model has glass the lab can write to ("screen:N" text solids). */
export function hasScreen(model: PartModel): boolean {
  return model.solids.some((s) => s.kind === "text" && !!s.id && SCREEN_LINE.test(s.id));
}

const screenCache = new WeakMap<PartModel, Map<string, PartModel>>();

/**
 * The model with the given lines written on its glass: line N goes into the
 * "screen:N" solid, missing lines are blank, and "screen-demo" decoration is
 * blanked. Results are cached per model and text so renderers keyed on the
 * model object don't re-measure every frame.
 */
export function withScreenText(model: PartModel, lines: readonly string[]): PartModel {
  if (!hasScreen(model)) return model;
  const key = lines.join("\n");
  let byText = screenCache.get(model);
  if (!byText) {
    byText = new Map();
    screenCache.set(model, byText);
  }
  const cached = byText.get(key);
  if (cached) return cached;
  const next: PartModel = {
    ...model,
    solids: model.solids.map((s) => {
      if (s.kind !== "text" || !s.id) return s;
      const m = SCREEN_LINE.exec(s.id);
      if (m) return { ...s, text: lines[Number(m[1])] ?? "" };
      if (s.id === "screen-demo") return { ...s, text: "" };
      return s;
    }),
  };
  if (byText.size > 200) byText.clear();
  byText.set(key, next);
  return next;
}
