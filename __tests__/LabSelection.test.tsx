import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LabError from "@/app/laboratory/workspace/error";
import { nextSelection, placePopover, propertiesOnClick, propertiesShown, type Selection } from "@kiungo/core/lab/selection";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => "/laboratory/workspace" }));

const sel = (nodes: string[], wire: string | null = null): Selection => ({ nodes, wire });
const pick = (id: string, selected = true) => ({ type: "select", id, selected });

describe("Lab selection", () => {
  it("ignores changes that aren't about selection, so prop updates can't feed back", () => {
    expect(nextSelection(sel(["uno"]), [{ type: "dimensions", id: "uno" }, { type: "position", id: "uno" }])).toBeNull();
    expect(nextSelection(sel([], "w1"), [], [{ type: "add" }])).toBeNull();
  });

  it("returns null when a change matches what's already selected", () => {
    expect(nextSelection(sel(["uno"]), [pick("uno")])).toBeNull();
    expect(nextSelection(sel([], "w1"), [], [pick("w1")])).toBeNull();
  });

  it("selects a part on click and adds more with Shift", () => {
    expect(nextSelection(sel([]), [pick("uno")])).toEqual(sel(["uno"]));
    expect(nextSelection(sel(["uno"]), [pick("dht")])).toEqual(sel(["uno", "dht"]));
  });

  it("swaps to a wire, clearing parts, when a wire is clicked", () => {
    expect(nextSelection(sel(["uno"]), [pick("uno", false)], [pick("w1")])).toEqual(sel([], "w1"));
    expect(nextSelection(sel(["uno"]), [], [pick("w1")])).toEqual(sel([], "w1"));
  });

  it("clears the wire when a part is picked, and everything on the pane", () => {
    expect(nextSelection(sel([], "w1"), [pick("uno")], [pick("w1", false)])).toEqual(sel(["uno"]));
    expect(nextSelection(sel(["uno", "dht"]), [pick("uno", false), pick("dht", false)])).toEqual(sel([]));
  });

  it("doesn't listen to React Flow's onSelectionChange (the source of the wiring crash)", () => {
    const canvas = readFileSync(join(process.cwd(), "packages/lab/src/LabCanvas.tsx"), "utf8");
    expect(canvas).not.toMatch(/onSelectionChange=/);
    expect(canvas).toMatch(/onEdgesChange=\{onEdgesChange\}/);
  });
});

describe("when the properties popover opens (B3)", () => {
  it("opens on a plain click on a part or a wire", () => {
    expect(propertiesOnClick({ kind: "node", id: "uno" })).toEqual({ kind: "node", id: "uno" });
    expect(propertiesOnClick({ kind: "wire", id: "w1" })).toEqual({ kind: "wire", id: "w1" });
  });

  it("not on the click that ends a drag, nor on Shift, Cmd or Ctrl (multi-select)", () => {
    expect(propertiesOnClick({ kind: "node", id: "uno", dragged: true })).toBeNull();
    expect(propertiesOnClick({ kind: "node", id: "uno", shiftKey: true })).toBeNull();
    expect(propertiesOnClick({ kind: "node", id: "uno", metaKey: true })).toBeNull();
    expect(propertiesOnClick({ kind: "node", id: "uno", ctrlKey: true })).toBeNull();
  });

  it("stays only while its part (alone) or its wire is what's selected", () => {
    const part = { kind: "node", id: "uno" } as const;
    expect(propertiesShown(part, sel(["uno"]))).toBe(true);
    expect(propertiesShown(part, sel(["uno", "dht"]))).toBe(false);
    expect(propertiesShown(part, sel(["dht"]))).toBe(false);
    expect(propertiesShown(part, sel([]))).toBe(false);
    expect(propertiesShown({ kind: "wire", id: "w1" }, sel([], "w1"))).toBe(true);
    expect(propertiesShown({ kind: "wire", id: "w1" }, sel([], null))).toBe(false);
    expect(propertiesShown(null, sel(["uno"]))).toBe(false);
  });
});

describe("where the properties popover goes", () => {
  const bounds = { left: 0, top: 0, right: 1200, bottom: 800 };
  const size = { width: 320, height: 400 };

  it("to the right of the part, level with its top", () => {
    expect(placePopover({ left: 100, top: 200, right: 300, bottom: 320 }, size, bounds)).toEqual({ left: 312, top: 200, side: "right" });
  });

  it("flips left near the right edge", () => {
    expect(placePopover({ left: 900, top: 200, right: 1100, bottom: 320 }, size, bounds)).toEqual({ left: 568, top: 200, side: "left" });
  });

  it("stays inside the canvas at the bottom and when neither side fits", () => {
    const low = placePopover({ left: 100, top: 700, right: 300, bottom: 780 }, size, bounds);
    expect(low.top).toBe(800 - 400 - 8);
    const wide = placePopover({ left: 10, top: 10, right: 1190, bottom: 100 }, size, bounds);
    expect(wide.left).toBeGreaterThanOrEqual(8);
    expect(wide.left + 320).toBeLessThanOrEqual(1192);
  });
});

describe("Lab error page", () => {
  it("offers to reopen the lab instead of a blank browser error", () => {
    const retry = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<LabError error={Object.assign(new Error("boom"), { digest: "abc123" })} retry={retry} />);
    expect(screen.getByRole("heading", { name: "The lab hit a snag" })).toBeInTheDocument();
    screen.getByRole("button", { name: "Reopen the lab" }).click();
    expect(retry).toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Go to Projects" })).toHaveAttribute("href", "/workspace");
    expect(screen.getByText("Reference abc123")).toBeInTheDocument();
  });
});
