/**
 * The checks every part definition has to pass before it ships.
 *
 * They catch what a person reviewing a picture can't see: a pin that has no
 * position, a Trace block that points at nothing, a stated height that isn't
 * the height that was built, a current draw with no supply range. The same
 * checks run in the test suite and in `npm run parts:check`.
 */
import { modelBounds } from "./bounds";
import type { PartEntry } from "./define";
import type { PartModel } from "./types";

export interface Problem {
  /** error: must be fixed. warn: worth a look, allowed to ship. */
  level: "error" | "warn";
  text: string;
}

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const twice = new Set<string>();
  for (const v of values) (seen.has(v) ? twice : seen).add(v);
  return [...twice];
}

/** Every problem with one part. `catalog` is the ids of all parts, for cross-references. */
export function checkPart(entry: PartEntry, catalog?: ReadonlySet<string>): Problem[] {
  const { model, pinout } = entry;
  const problems: Problem[] = [];
  const error = (text: string) => problems.push({ level: "error", text });
  const warn = (text: string) => problems.push({ level: "warn", text });

  // Identity and words.
  if (!ID.test(model.id)) error(`id "${model.id}" must be lower-case words joined by hyphens`);
  if (!model.name.trim()) error("name is empty");
  if (model.summary.length < 40) warn("summary is very short: say what it is and what a builder uses it for");
  if (model.summary.length > 260) warn(`summary is ${model.summary.length} characters: keep it under 260`);
  if (model.tags.length < 3) warn("fewer than 3 tags: search will miss it");
  if (model.facts.length < 3 || model.facts.length > 8) warn(`${model.facts.length} facts: aim for 4 to 6`);
  if (!model.experiment.title || !model.experiment.idea) error("experiment needs a title and an idea");

  // Body.
  const { w, h, d } = model.size;
  if (!(w > 0 && h > 0 && d > 0)) error("size must be positive in all three directions");
  if (!model.solids.length) error("no solids: the part has no body");
  const bounds = modelBounds(model);
  const built = bounds.z2;
  if (Math.abs(built - d) > Math.max(0.6, d * 0.08)) warn(`size.d is ${d} mm but the solids reach ${built.toFixed(1)} mm above the base`);
  const reach = Math.max(w, h);
  if (bounds.x1 < -reach || bounds.y1 < -reach || bounds.x2 > w + reach || bounds.y2 > h + reach) error("a solid sits far outside the footprint: check its coordinates");
  const solidIds = model.solids.flatMap((s) => ("id" in s && s.id ? [s.id] : []));
  for (const key of ["lit", "spin", "sweep"] as const) {
    for (const id of model.animate?.[key] ?? []) if (!solidIds.includes(id)) error(`animate.${key} names "${id}", which no solid has as its id`);
  }
  for (const solid of model.solids) {
    if ((solid.kind === "box" || solid.kind === "cyl" || solid.kind === "extrude") && /gradient/.test(solid.top) && !solid.fill) warn("a solid's `top` is a CSS gradient with no `fill`: give it a plain color, the 3D renderer lights it itself");
  }

  // Features.
  for (const id of duplicates(model.features.map((f) => f.id))) error(`two features share the id "${id}"`);
  const front = model.plan === "front";
  for (const f of model.features) {
    if (!f.note.trim()) error(`feature "${f.id}" has no note`);
    const maxY = front ? d + 12 : h + reach * 0.5;
    if (f.x + f.w < -reach * 0.5 || f.x > w + reach * 0.5 || f.y + f.h < -reach * 0.5 || f.y > maxY) error(`feature "${f.id}" is outside the part`);
  }

  // Pins.
  if (!pinout.pins.length) error("no pins");
  for (const id of duplicates(pinout.pins.map((p) => p.id))) error(`two pins share the id "${id}"`);
  const spots = new Map((model.pinSpots ?? []).map((s) => [s.id, s]));
  const placed = pinout.pins.filter((p) => spots.has(p.id)).length;
  // A breadboard's hundreds of holes come from its own table, not from pin positions.
  // Terminals given by hand (`spots`) stand in for pins the lab names differently.
  const byHand = [...spots.keys()].some((id) => !pinout.pins.some((p) => p.id === id));
  if ((!pinout.strips || pinout.pins.length < 100) && !byHand) {
    if (placed === 0) error("no pin has a position: give `pinAt`");
    else if (placed < pinout.pins.length) warn(`${pinout.pins.length - placed} of ${pinout.pins.length} pins have no position (${pinout.pins.filter((p) => !spots.has(p.id)).map((p) => p.id).slice(0, 6).join(", ")})`);
  }
  // Pins may sit past the footprint (an angled header, the end of a flying lead), but not far.
  const slack = Math.min(40, Math.max(14, reach * 0.6));
  for (const spot of spots.values()) {
    const maxY = front ? d + slack : h + slack;
    if (spot.x < -slack || spot.x > w + slack || spot.y < -slack || spot.y > maxY) error(`pin "${spot.id}" is placed ${slack.toFixed(0)} mm or more outside the part`);
  }
  if (!pinout.controller && !pinout.passive) {
    for (const p of pinout.pins) if (!p.role && !p.supplies && !p.fns) error(`pin "${p.id}" doesn't say what it expects in the lab`);
  }

  // Trace.
  const { blocks, links, steps } = model.circuit;
  for (const id of duplicates(blocks.map((b) => b.id))) error(`two circuit blocks share the id "${id}"`);
  for (const cell of duplicates(blocks.map((b) => `${b.col},${b.row}`))) error(`two circuit blocks sit in the same cell (${cell})`);
  const blockIds = new Set(blocks.map((b) => b.id));
  for (const link of links) {
    if (!blockIds.has(link.from)) error(`a circuit link starts at "${link.from}", which is not a block`);
    if (!blockIds.has(link.to)) error(`a circuit link ends at "${link.to}", which is not a block`);
  }
  const featureIds = new Set(model.features.map((f) => f.id));
  let anchored = 0;
  for (const b of blocks) {
    if (b.at === undefined) continue;
    anchored++;
    if (typeof b.at === "string" && !featureIds.has(b.at) && !spots.has(b.at)) error(`circuit block "${b.id}" points at "${b.at}", which is neither a feature nor a placed pin`);
  }
  if (anchored < 2) warn("fewer than two circuit blocks say where they are on the part (`at`): the Trace view can't draw the flow over it");
  if (steps.length < 2) warn("fewer than two steps explain how it works");
  if (blocks.filter((b) => b.hot).length && !model.spec?.thermal) warn("a circuit block is marked hot but the spec has no thermal data");

  // Engineering data.
  const spec = model.spec;
  if (!spec) error("no spec: every part carries its form factor, power and sourcing data");
  else {
    const p = spec.power;
    if (p.supply && p.supply.min > p.supply.max) error("spec.power.supply: min is above max");
    if (p.draw) {
      if (p.draw.idle > p.draw.active) error("spec.power.draw: idle is above active");
      if (p.draw.peak !== undefined && p.draw.peak < p.draw.active) error("spec.power.draw: peak is below active");
    }
    if (!pinout.passive && !p.supply && !p.source && !p.motor && pinout.pins.some((pin) => pin.role === "vcc")) error("spec.power.supply is missing for a part with a supply pin");
    if (!pinout.passive && !p.draw && !p.source && !p.motor && !pinout.controller && pinout.pins.some((pin) => pin.role === "vcc")) warn("spec.power.draw is missing: the lab can't budget its current");
    if (pinout.controller && !p.rails?.length) warn("spec.power.rails is missing: the lab can't tell what the board's supply pins can give");
    if (spec.thermal && !(spec.thermal.thetaCW > 0 && spec.thermal.maxC > 25)) error("spec.thermal: thetaCW and maxC must be real numbers");
    if (!spec.sourcing.mpn.trim()) error("spec.sourcing.mpn is empty");
    for (const u of spec.upgrade ?? []) {
      if (u.part && catalog && !catalog.has(u.part)) error(`spec.upgrade names the part "${u.part}", which is not in the library`);
      if (u.part === model.id) error("spec.upgrade names the part itself");
    }
    for (const hole of spec.form.holes ?? []) if (hole.x < 0 || hole.x > w || hole.y < 0 || hole.y > h) error("spec.form.holes: a mounting hole is outside the footprint");
  }

  // Simulation wiring.
  const pinIds = new Set(pinout.pins.map((p) => p.id));
  const need = (id: string, where: string) => {
    if (!pinIds.has(id)) error(`sim ${where} names the pin "${id}", which the part doesn't have`);
  };
  const sim = model.sim;
  if (sim?.kind === "sensor") {
    for (const id of duplicates(sim.reads.map((q) => q.key))) error(`sim reads "${id}" twice`);
    const keys = new Set(sim.reads.map((q) => q.key));
    for (const q of sim.reads) if (!(q.min <= q.start && q.start <= q.max)) error(`sim quantity "${q.key}" starts outside its range`);
    for (const a of sim.analog ?? []) {
      need(a.pin, "analog");
      if (!keys.has(a.key)) error(`sim analog follows "${a.key}", which it doesn't read`);
    }
    for (const t of sim.trips ?? []) {
      need(t.pin, "trips");
      if (!keys.has(t.key)) error(`sim trips on "${t.key}", which it doesn't read`);
    }
    if (sim.badge && !keys.has(sim.badge)) error(`sim badge shows "${sim.badge}", which it doesn't read`);
  } else if (sim?.kind === "source") {
    need(sim.plus, "source");
    need(sim.minus, "source");
    if (!spec?.power.source) error("sim says it is a source but spec.power.source is missing");
  } else if (sim?.kind === "converter") {
    [...sim.input, ...sim.output, ...(sim.also ?? []).map((o) => o.pin)].forEach((id) => need(id, "converter"));
    if (!spec?.power.converter) error("sim says it is a converter but spec.power.converter is missing");
  } else if (sim?.kind === "driver") {
    need(sim.supply, "driver");
    need(sim.ground, "driver");
    for (const ch of sim.channels) [...ch.outputs, ...ch.inputs, ...(ch.enable ? [ch.enable] : [])].forEach((id) => need(id, "driver"));
    if (!spec?.power.bridge) error("sim says it is a driver but spec.power.bridge is missing");
  } else if (sim?.kind === "motor") {
    sim.terminals.forEach((id) => need(id, "motor"));
    sim.second?.forEach((id) => need(id, "motor"));
    if (!spec?.power.motor) error("sim says it is a motor but spec.power.motor is missing");
  } else if (sim?.kind === "expander") {
    sim.outputs.forEach((id) => need(id, "expander"));
  } else if (sim?.kind === "shifter") {
    sim.pairs.flat().forEach((id) => need(id, "shifter"));
  }

  return problems;
}

/** Problems across the whole catalog: ids used twice, ranks used twice inside a group. */
export function checkCatalog(models: readonly PartModel[]): Problem[] {
  const problems: Problem[] = [];
  for (const id of duplicates(models.map((m) => m.id))) problems.push({ level: "error", text: `two parts share the id "${id}"` });
  const byGroup = new Map<string, number[]>();
  for (const m of models) byGroup.set(m.group, [...(byGroup.get(m.group) ?? []), m.rank]);
  for (const [group, ranks] of byGroup) for (const rank of duplicates(ranks.map(String))) problems.push({ level: "error", text: `two parts in "${group}" share rank ${rank}` });
  return problems;
}
