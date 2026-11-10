#!/usr/bin/env node
/**
 * Writes packages/core/src/parts/catalog/index.ts from the part files beside it.
 *
 *   node scripts/parts-index.mjs            every part with a file under catalog/
 *   node scripts/parts-index.mjs --check    exit 1 if the index is out of date
 *
 * A part is any `catalog/<group>/<id>.ts` whose name does not start with an
 * underscore (those hold shapes several parts share).
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const catalog = join(root, "packages/core/src/parts/catalog");
const only = process.env.ONLY ? new Set(process.env.ONLY.split(",")) : null;

const parts = readdirSync(catalog)
  .filter((group) => statSync(join(catalog, group)).isDirectory())
  .sort()
  .flatMap((group) =>
    readdirSync(join(catalog, group))
      .filter((name) => name.endsWith(".ts") && !name.startsWith("_"))
      .map((name) => name.replace(/\.ts$/, ""))
      .filter((id) => !only || only.has(id))
      .sort()
      .map((id) => ({ group, id })),
  );

/** "hc-sr04" → "hcSr04"; a name that starts with a digit gets a leading "p". */
const local = (id) => {
  const name = id.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
  return /^[0-9]/.test(name) ? `p${name}` : name;
};

const text = `/**
 * Every part in the library, one file each.
 *
 * Written by \`npm run parts:index\` from the files in this folder: do not edit
 * it by hand. To add a part, write \`catalog/<group>/<id>.ts\` (see
 * docs/parts/AUTHORING.md) and run the script.
 */
import type { PartEntry } from "../define";
${parts.map(({ group, id }) => `import ${local(id)} from "./${group}/${id}";`).join("\n")}

export const CATALOG: PartEntry[] = [
${parts.map(({ id }) => `  ${local(id)},`).join("\n")}
];
`;

const file = join(catalog, "index.ts");
if (process.argv.includes("--check")) {
  if (readFileSync(file, "utf8") !== text) {
    console.error("packages/core/src/parts/catalog/index.ts is out of date: run `npm run parts:index`.");
    process.exit(1);
  }
  console.log(`catalog/index.ts lists all ${parts.length} parts.`);
} else {
  writeFileSync(file, text);
  console.log(`catalog/index.ts: ${parts.length} parts.`);
}
