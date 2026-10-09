import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { version: string };
const lock = JSON.parse(readFileSync(join(root, "package-lock.json"), "utf8")) as { version: string; packages: Record<string, { version?: string }> };
const changelog = readFileSync(join(root, "CHANGELOG.md"), "utf8");

describe("Versioning", () => {
  it("uses a semantic version", () => {
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/);
  });

  it("keeps package-lock.json in step", () => {
    expect(lock.version).toBe(pkg.version);
    expect(lock.packages[""].version).toBe(pkg.version);
  });

  it("has a changelog entry for the current version, newest first", () => {
    const versions = [...changelog.matchAll(/^## \[(\d+\.\d+\.\d+[^\]]*)\]/gm)].map((m) => m[1]);
    expect(versions[0]).toBe(pkg.version);
    expect(changelog).toMatch(new RegExp(`^\\[${pkg.version.replace(/\./g, "\\.")}\\]: `, "m"));
  });
});
