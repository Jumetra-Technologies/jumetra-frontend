// Copies the code editor (Monaco) into public/monaco/vs so the Firmware page
// loads it from Kiungo itself, not from a third-party CDN. Runs before dev and
// build; the copy is generated, so public/monaco is git-ignored.
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "node_modules", "monaco-editor", "min", "vs");
const to = join(root, "public", "monaco", "vs");
const stamp = join(root, "public", "monaco", ".version");
const version = JSON.parse(readFileSync(join(root, "node_modules", "monaco-editor", "package.json"), "utf8")).version;

if (!existsSync(from)) {
  console.error("copy-monaco: monaco-editor isn't installed; run npm install.");
  process.exit(1);
}
if (existsSync(stamp) && readFileSync(stamp, "utf8") === version && existsSync(join(to, "loader.js"))) {
  process.exit(0);
}
rmSync(join(root, "public", "monaco"), { recursive: true, force: true });
cpSync(from, to, { recursive: true });
writeFileSync(stamp, version);
console.log(`copy-monaco: Monaco ${version} → public/monaco/vs`);
