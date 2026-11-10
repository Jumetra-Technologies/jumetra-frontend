import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PARTS, PART_GROUPS } from "@kiungo/core/parts";
import { CATALOG } from "@kiungo/core/parts/catalog/index";
import { PART_COUNTS } from "@kiungo/core/parts/catalog/counts";
import { checkCatalog, checkPart } from "@kiungo/core/parts/check";
import { modelBounds } from "@kiungo/core/parts/bounds";
import { typicalHeat } from "@kiungo/core/parts/power";

/**
 * Every part in the library is one definition under `catalog/`. These tests
 * hold each of them to the rules in `parts/check.ts`, so a part that draws
 * wrongly, leaves a pin unplaced or names a part that is not there fails here
 * and not in front of a student.
 */

const dir = join(__dirname, "..", "packages", "core", "src", "parts", "catalog");
const files = readdirSync(dir)
  .filter((group) => statSync(join(dir, group)).isDirectory())
  .flatMap((group) =>
    readdirSync(join(dir, group))
      .filter((name) => name.endsWith(".ts") && !name.startsWith("_"))
      .map((name) => ({ group, id: name.replace(/\.ts$/, "") })),
  );

describe("the parts catalog", () => {
  it("the generated counts match the catalog, so pages can state them without loading every part", () => {
    expect(PART_COUNTS.total).toBe(PARTS.length);
    for (const group of PART_GROUPS) expect(PART_COUNTS[group.id as keyof typeof PART_COUNTS], group.id).toBe(PARTS.filter((part) => part.group === group.id).length);
  });

  it("lists every part file, and every part is in the folder of its group", () => {
    const listed = new Set(CATALOG.map((entry) => entry.model.id));
    expect(files.map((f) => f.id).filter((id) => !listed.has(id))).toEqual([]);
    for (const file of files) expect(CATALOG.find((entry) => entry.model.id === file.id)?.model.group, file.id).toBe(file.group);
    expect(CATALOG).toHaveLength(files.length);
  });

  it("has no part left outside it", () => {
    const defined = new Set(CATALOG.map((entry) => entry.model.id));
    expect(PARTS.filter((part) => !defined.has(part.id)).map((part) => part.id)).toEqual([]);
  });

  it("passes the part rules, one part at a time", () => {
    for (const entry of CATALOG) {
      const errors = checkPart(entry)
        .filter((p) => p.level === "error")
        .map((p) => p.text);
      expect(errors, entry.model.id).toEqual([]);
    }
  });

  it("has unique ids, unique ranks in each group, and upgrades that point at real parts", () => {
    expect(checkCatalog(PARTS).map((p) => p.text)).toEqual([]);
    for (const part of PARTS) expect(PART_GROUPS.some((g) => g.id === part.group), part.id).toBe(true);
  });

  it("gives every part its engineering data: form, power, sourcing, limits and where the numbers come from", () => {
    for (const { model } of CATALOG) {
      const spec = model.spec;
      expect(spec, model.id).toBeDefined();
      expect(spec!.form.mount, model.id).toBeTruthy();
      expect(spec!.sourcing.mpn, model.id).toBeTruthy();
      expect(spec!.limits?.length ?? 0, `${model.id} limits`).toBeGreaterThan(0);
      expect(spec!.refs?.length ?? 0, `${model.id} refs`).toBeGreaterThan(0);
    }
  });

  it("places every pin, and no part is taller than it says it is", () => {
    for (const { model, pinout } of CATALOG) {
      // A breadboard names a handful of its hundreds of holes; everything else places each pin.
      if (!pinout.passive || !pinout.strips) expect((model.pinSpots ?? []).length, model.id).toBeGreaterThan(0);
      // The views are framed from the stated height. (A board drawn on the lab canvas may state more: its old height, kept so saved layouts don't shift.)
      expect(modelBounds(model).z2, `${model.id} height`).toBeLessThanOrEqual(model.size.d + 0.01);
    }
  });

  it("marks one block as the hot one wherever there is heat data, and can work out the heat", () => {
    for (const { model } of CATALOG) {
      if (!model.spec?.thermal) continue;
      expect(model.circuit.blocks.some((b) => b.hot), `${model.id} hot block`).toBe(true);
      const heat = typicalHeat(model.spec);
      if (heat) expect(heat.tempC, model.id).toBeGreaterThan(20);
    }
  });
});
