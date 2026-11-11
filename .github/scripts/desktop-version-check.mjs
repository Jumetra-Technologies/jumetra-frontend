#!/usr/bin/env node
// A pull request that changes what goes into the desktop app must raise its version
// (apps/desktop/package.json), because merging to main publishes that version to every
// installed copy (release-desktop.yml). Without a new version, the change would sit on
// main and nobody's "Check for updates" would ever find it.
//
//   node .github/scripts/desktop-version-check.mjs <base-ref>
//
// What counts as "in the desktop app": apps/desktop and the packages it bundles
// (packages/api, core, ui, lab), apart from tests and docs.
import { execFileSync } from "node:child_process";

const base = process.argv[2];
if (!base) {
  console.error("Usage: desktop-version-check.mjs <base-ref>");
  process.exit(2);
}

const git = (...args) => execFileSync("git", args, { encoding: "utf8" });
const SHIPPED = /^(apps\/desktop|packages\/(api|core|ui|lab))\//;
const NOT_SHIPPED = /(^|\/)(test|tests|__tests__)\/|\.test\.[cm]?[jt]sx?$|\.md$/;

const changed = git("diff", "--name-only", `${base}...HEAD`)
  .split("\n")
  .filter((f) => SHIPPED.test(f) && !NOT_SHIPPED.test(f));
// The version line itself isn't a change to the app.
const appChanges = changed.filter((f) => f !== "apps/desktop/package.json" || git("diff", `${base}...HEAD`, "--", f).split("\n").some((l) => /^[+-]\s/.test(l) && !/"version"/.test(l)));

const versionAt = (ref) => JSON.parse(git("show", `${ref}:apps/desktop/package.json`)).version;
const before = versionAt(base);
const after = versionAt("HEAD");

const parse = (v) => v.split(/[.+-]/).slice(0, 3).map(Number);
const newer = (a, b) => {
  const [x, y] = [parse(a), parse(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
};

if (!appChanges.length) {
  console.log(`No change to the desktop app (desktop ${after}): no new version needed.`);
  process.exit(0);
}
if (newer(after, before)) {
  console.log(`Desktop ${before} → ${after}: merging publishes ${after} to every installed copy.`);
  process.exit(0);
}
const shown = appChanges.slice(0, 10).map((f) => `  ${f}`).join("\n");
console.log(`::error title=Desktop version not raised::This pull request changes the desktop app but apps/desktop/package.json is still ${after} (${before} on the base). Raise it (for example ${before.replace(/\d+$/, (n) => String(Number(n) + 1))}) so merging ships the change to everyone's updater.`);
console.error(`Changed in the desktop app:\n${shown}${appChanges.length > 10 ? `\n  …and ${appChanges.length - 10} more` : ""}`);
process.exit(1);
