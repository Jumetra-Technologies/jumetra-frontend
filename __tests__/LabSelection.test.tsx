import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LabError from "@/app/laboratory/workspace/error";
import { nextSelection, type Selection } from "@kiungo/core/lab/selection";

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
    const canvas = readFileSync(join(process.cwd(), "components/lab/LabCanvas.tsx"), "utf8");
    expect(canvas).not.toMatch(/onSelectionChange=/);
    expect(canvas).toMatch(/onEdgesChange=\{onEdgesChange\}/);
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
