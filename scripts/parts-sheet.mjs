#!/usr/bin/env node
/**
 * Draws parts to PNG with the app's own renderer, so a model can be checked
 * by eye without running the app.
 *
 *   node scripts/parts-sheet.mjs hc-sr04 l298n          one picture per part in out/parts/
 *   node scripts/parts-sheet.mjs --sheet sensors.png hc-sr04 pir dht11
 *                                                       one contact sheet with a 3D view of each
 *   node scripts/parts-sheet.mjs --all                  every part in the library
 *
 * Each picture has two 3D views, the 2D view with every placed pin and
 * feature marked, and a low view with the part powered. A part is loaded from
 * its own file under packages/core/src/parts/catalog/, so one broken part
 * never stops another from drawing.
 *
 * Needs Playwright with Chromium (npx playwright install chromium).
 */
import { createRequire } from "node:module";
import { mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const catalog = join(root, "packages/core/src/parts/catalog");

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const args = process.argv.slice(2);
let out = join(root, "out/parts");
let sheet = null;
let all = false;
let columns = 5;
const ids = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--out") out = resolve(args[++i]);
  else if (args[i] === "--sheet") sheet = resolve(args[++i]);
  else if (args[i] === "--columns") columns = Number(args[++i]);
  else if (args[i] === "--all") all = true;
  else ids.push(args[i]);
}

const files = new Map(
  walk(catalog)
    .filter((path) => path.endsWith(".ts") && !path.endsWith("index.ts") && !/[\\/]_/.test(path))
    .map((path) => [path.replace(/\\/g, "/").split("/").pop().replace(/\.ts$/, ""), path]),
);
if (!all && !ids.length) {
  console.error("Say which parts to draw (ids), or --all. Parts with their own file:\n  " + [...files.keys()].sort().join(" "));
  process.exit(1);
}

// Parts with a file load from it; anything else is looked up in the library.
const wanted = all ? null : ids;
const imports = [];
const picks = [];
(wanted ?? []).forEach((id, i) => {
  const file = files.get(id);
  if (file) {
    imports.push(`import p${i} from ${JSON.stringify(file)};`);
    picks.push(`p${i}.model`);
  } else picks.push(`find(${JSON.stringify(id)})`);
});
const entry = `
import { PARTS } from "@kiungo/core/parts";
import { drawPart, drawSheet } from ${JSON.stringify(join(root, "scripts/parts/page.ts"))};
${imports.join("\n")}
function find(id) {
  const part = PARTS.find((p) => p.id === id);
  if (!part) throw new Error("No part with the id " + id);
  return part;
}
window.__models = ${wanted ? `[${picks.join(", ")}]` : "PARTS"};
window.__drawPart = drawPart;
window.__drawSheet = drawSheet;
`;

const esbuild = require("esbuild");
const cache = join(root, "node_modules/.cache/parts-sheet");
mkdirSync(cache, { recursive: true });
const entryFile = join(cache, `entry-${process.pid}.ts`);
const bundle = join(cache, `bundle-${process.pid}.js`);
writeFileSync(entryFile, entry);
try {
  await esbuild.build({ entryPoints: [entryFile], bundle: true, format: "iife", platform: "browser", outfile: bundle, logLevel: "error", absWorkingDir: root, define: { "process.env.NODE_ENV": '"development"' } });
} catch {
  process.exit(1);
}

let playwright;
try {
  playwright = require("playwright");
} catch {
  console.error("This script needs Playwright: npm install --no-save playwright && npx playwright install chromium");
  process.exit(1);
}
const browser = await playwright.chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl"] });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  page.on("pageerror", (error) => console.error(`page error: ${error.message}`));
  await page.setContent("<!doctype html><html><body></body></html>");
  await page.addScriptTag({ path: bundle });
  const save = (path, dataUrl) => {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, Buffer.from(dataUrl.split(",")[1], "base64"));
    console.log(path);
  };
  const count = await page.evaluate(() => window.__models.length);
  if (sheet) {
    save(sheet, await page.evaluate((n) => window.__drawSheet(window.__models, n), columns));
  } else {
    for (let i = 0; i < count; i++) {
      const { id, url } = await page.evaluate(async (index) => ({ id: window.__models[index].id, url: await window.__drawPart(window.__models[index]) }), i);
      save(join(out, `${id}.png`), url);
    }
  }
} finally {
  await browser.close();
}
