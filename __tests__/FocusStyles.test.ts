import { execSync } from "node:child_process";
import { describe, expect, it } from "vitest";

/**
 * The global focus ring lives in the base layer (app/globals.css), so a
 * component's `outline-none` really removes it. Anything that does must show
 * focus some other way, or keyboard users can't see where they are.
 */
const OWN_FOCUS = /focus-visible:|focus:|focus-within:|group-focus/;

// Elements that remove the outline and show focus another way, by design.
const ALLOWED: Array<[RegExp, string]> = [
  [/^components\/ui\/modal\.tsx:/, "the dialog panel itself; focus moves to its first control"],
  [/^components\/ui\/menu\.tsx:\d+:\s+"fixed z-\[70\]/, "the menu container; each item has focus:bg"],
  [/^components\/library\/views\/PartFlowView\.tsx:/, "Trace blocks highlight (primary stroke) on focus"],
  [/^components\/library\/views\/PartPlanView\.tsx:/, "2D features highlight as active on focus"],
  [/^components\/architecture\/SystemBoard\.tsx:/, "layers draw their own focus ring (group-focus-visible rect)"],
];

describe("keyboard focus stays visible", () => {
  it("everything that removes the outline draws its own focus style", () => {
    const lines = execSync(String.raw`grep -rnE "outline-none|outline-hidden" components app --include=*.tsx || true`, { encoding: "utf8" })
      .split("\n")
      .filter(Boolean)
      .filter((line) => !OWN_FOCUS.test(line))
      .filter((line) => !ALLOWED.some(([re]) => re.test(line)));
    expect(lines).toEqual([]);
  });

  it("keeps the default focus ring in the base layer, so components can replace it", () => {
    const css = execSync("cat app/globals.css", { encoding: "utf8" });
    expect(css).toMatch(/@layer base \{\s*:focus-visible \{/);
  });
});
