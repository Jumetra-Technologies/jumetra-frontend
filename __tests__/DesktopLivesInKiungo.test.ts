// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The desktop app moved to Jumetra-Technologies/kiungo in Nov 2026 (desktop
 * 0.14.0), with its checks and its releases. Desktop code added here would
 * never be built, tested or released, so it fails here instead.
 */
const root = process.cwd();

describe("the desktop app lives in Jumetra-Technologies/kiungo", () => {
  it("has no app, IPC contract or release pipeline here", () => {
    for (const path of ["apps/desktop", "packages/api", ".github/workflows/release-desktop.yml", ".github/scripts/desktop-update-feed.mjs", ".github/scripts/desktop-release-manifest.mjs"]) {
      expect(existsSync(join(root, path)), `${path} belongs in Jumetra-Technologies/kiungo`).toBe(false);
    }
  });

  it("this repository's workspaces are the shared packages only", () => {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { workspaces: string[]; dependencies: Record<string, string>; devDependencies: Record<string, string> };
    expect(pkg.workspaces).toEqual(["packages/*"]);
    for (const name of ["electron", "electron-builder", "electron-vite", "electron-updater"]) {
      expect({ ...pkg.dependencies, ...pkg.devDependencies }[name], `${name} is the desktop app's`).toBeUndefined();
    }
  });
});
