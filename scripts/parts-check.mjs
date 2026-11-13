#!/usr/bin/env node
/**
 * Checks part definitions against the rules in packages/core/src/parts/check.ts.
 *
 *   node scripts/parts-check.mjs hc-sr04 l298n     these parts
 *   node scripts/parts-check.mjs                   every part with a file under catalog/
 *
 * Each part is loaded from its own file, so one broken part never hides
 * another's result. Exits 1 if any part has an error.
 */
import { createRequire } from "node:module";
import { mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const catalog = join(root, "packages/core/src/parts/catalog");

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}
const files = new Map(
  walk(catalog)
    // counts.ts is written by `npm run parts:index` (how many parts there are), not a part.
    .filter((path) => path.endsWith(".ts") && !path.endsWith("index.ts") && !path.endsWith("counts.ts") && !/[\\/]_/.test(path))
    .map((path) => [path.replace(/\\/g, "/").split("/").pop().replace(/\.ts$/, ""), path]),
);

const asked = process.argv.slice(2);
const ids = asked.length ? asked : [...files.keys()].sort();
const esbuild = require("esbuild");
const cache = join(root, "node_modules/.cache/parts-check");
mkdirSync(cache, { recursive: true });

let failed = false;
for (const id of ids) {
  const file = files.get(id);
  if (!file) {
    console.error(`✗ ${id}: no file named ${id}.ts under packages/core/src/parts/catalog/`);
    failed = true;
    continue;
  }
  const entry = join(cache, `entry-${process.pid}-${id}.ts`);
  const out = join(cache, `check-${process.pid}-${id}.mjs`);
  writeFileSync(
    entry,
    `import part from ${JSON.stringify(file)};
import { checkPart } from ${JSON.stringify(join(root, "packages/core/src/parts/check.ts"))};
export const model = part.model;
export const pinout = part.pinout;
export const problems = checkPart(part);
`,
  );
  try {
    await esbuild.build({ entryPoints: [entry], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "error", absWorkingDir: root });
    const { model, pinout, problems } = await import(pathToFileURL(out).href);
    const errors = problems.filter((p) => p.level === "error");
    const warnings = problems.filter((p) => p.level === "warn");
    if (model.id !== id) errors.push({ level: "error", text: `the file is named ${id}.ts but the part's id is "${model.id}"` });
    const anchored = model.circuit.blocks.filter((b) => b.at !== undefined).length;
    console.log(`${errors.length ? "✗" : "✓"} ${id}: ${model.solids.length} solids, ${model.pinSpots.length}/${pinout.pins.length} pins placed, ${model.features.length} features, ${anchored}/${model.circuit.blocks.length} blocks placed${model.sim ? `, sim: ${model.sim.kind}` : ""}`);
    for (const p of errors) console.log(`    error: ${p.text}`);
    for (const p of warnings) console.log(`    warn:  ${p.text}`);
    if (errors.length) failed = true;
  } catch (error) {
    console.error(`✗ ${id}: ${error.message?.split("\n")[0] ?? error}`);
    failed = true;
  } finally {
    rmSync(entry, { force: true });
    rmSync(out, { force: true });
  }
}
// Types: the bundler above doesn't check them, so do it here for the parts asked for.
const typed = ids.map((id) => files.get(id)).filter(Boolean);
if (typed.length) {
  const { spawnSync } = await import("node:child_process");
  const tsc = join(root, "node_modules/typescript/bin/tsc");
  const run = spawnSync(process.execPath, [tsc, "--noEmit", "--strict", "--skipLibCheck", "--target", "es2022", "--module", "esnext", "--moduleResolution", "bundler", "--lib", "es2022,dom", ...typed], { cwd: root, encoding: "utf8" });
  const lines = (run.stdout + run.stderr).split("\n").filter((line) => line.includes("error TS"));
  if (lines.length) {
    console.log("\nType errors:");
    for (const line of lines.slice(0, 40)) console.log(`    ${line}`);
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
