import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getPartsByGroup } from "@kiungo/core/parts";
import { nodeLayout } from "@kiungo/core/lab/layout";
import type { LabNode } from "@kiungo/core/lab/types";
import { PartsModal, catalogCount, nextCascade, placeFromModal, resultStatus } from "./PartsModal";

const CATALOG = getPartsByGroup().flatMap((g) => g.parts);

function modal(over: Partial<Parameters<typeof PartsModal>[0]> = {}) {
  const onClose = vi.fn();
  const onAdd = vi.fn<(partId: string, keepOpen: boolean) => void>();
  const onTemplate = vi.fn<(id: string) => void>();
  render(<PartsModal open onClose={onClose} onAdd={onAdd} nodes={[] as LabNode[]} project={null} autowire onAutowire={vi.fn()} onTemplate={onTemplate} {...over} />);
  return { onClose, onAdd, onTemplate };
}

describe("the parts modal (B2)", () => {
  it("is titled “Add a part” and counts the catalog, not a number written down", () => {
    modal();
    const dialog = screen.getByTestId("parts-modal");
    expect(within(dialog).getByRole("heading", { name: "Add a part" })).toBeInTheDocument();
    expect(catalogCount()).toBe(CATALOG.length);
    expect(screen.getByTestId("parts-count")).toHaveTextContent(`${CATALOG.length} parts`);
  });

  it("lists every part in the catalog, once each, in the catalog's order", () => {
    modal();
    const shown = within(screen.getByTestId("parts-grid")).getAllByTestId("parts-modal-item").map((li) => li.getAttribute("data-part"));
    expect(shown).toEqual(CATALOG.map((p) => p.id));
    expect(screen.getByTestId("parts-status")).toHaveTextContent(`All parts · ${CATALOG.length}`);
  });

  it("filters by the ten groups", () => {
    modal();
    const filters = screen.getByRole("group", { name: "Filter by group" });
    expect(within(filters).getAllByRole("button").map((b) => b.textContent)).toEqual(["All", "Boards", "Power", "Breadboards and basics", "Buttons and controls", "Sensors", "Motors and servos", "Drivers and switches", "Lights and sound", "Displays", "Radios and tags"]);
    fireEvent.click(within(filters).getByRole("button", { name: "Sensors" }));
    const sensors = getPartsByGroup().find((g) => g.group.id === "sensors")!.parts;
    expect(screen.getAllByTestId("parts-modal-item").map((li) => li.getAttribute("data-part"))).toEqual(sensors.map((p) => p.id));
    expect(within(filters).getByRole("button", { name: "Sensors" })).toHaveAttribute("aria-pressed", "true");
  });

  it("a click adds and closes; Shift-click adds and keeps it open for more", () => {
    const props = modal();
    const item = (id: string) => screen.getAllByTestId("parts-modal-item").find((li) => li.getAttribute("data-part") === id)!;
    fireEvent.click(item("led"), { shiftKey: true });
    fireEvent.click(item("resistor"), { shiftKey: true });
    expect(props.onClose).not.toHaveBeenCalled();
    fireEvent.click(item("buzzer"));
    expect(props.onAdd.mock.calls).toEqual([
      ["led", true],
      ["resistor", true],
      ["buzzer", false],
    ]);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it("searches as you type; arrows move through the results and Enter adds", () => {
    const props = modal();
    const search = screen.getByTestId("lab-search");
    expect(search).toHaveAttribute("data-autofocus");
    fireEvent.change(search, { target: { value: "servo" } });
    const results = screen.getAllByTestId("parts-modal-item");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(search, { key: "ArrowDown" });
    const second = screen.getAllByTestId("parts-modal-item")[1];
    expect(second).toHaveAttribute("aria-selected", "true");
    expect(search).toHaveAttribute("aria-activedescendant", second.id);
    fireEvent.keyDown(search, { key: "Enter" });
    expect(props.onAdd).toHaveBeenCalledWith(second.getAttribute("data-part"), false);
  });

  it("says when nothing matches, with what to try instead", () => {
    modal();
    fireEvent.change(screen.getByTestId("lab-search"), { target: { value: "flux capacitor" } });
    expect(screen.getByTestId("parts-status")).toHaveTextContent("No parts match “flux capacitor”");
    expect(screen.getByTestId("parts-empty")).toHaveTextContent(/Try another word/);
    expect(screen.queryByTestId("parts-grid")).not.toBeInTheDocument();
  });

  it("closes on Escape, as a dialog does", () => {
    const props = modal();
    fireEvent(screen.getByTestId("parts-modal"), new Event("cancel", { cancelable: true }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it("offers the starter builds and Link a project as secondary rows", () => {
    const onLinkProject = vi.fn();
    const props = modal({ onLinkProject });
    fireEvent.click(screen.getByTestId("template-blink"));
    expect(props.onTemplate).toHaveBeenCalledWith("blink");
    expect(props.onClose).toHaveBeenCalled();
  });
});

describe("what the list says (states)", () => {
  it("searching, no match, did-you-mean, a count, a group, and an empty group", () => {
    expect(resultStatus({ query: "le", settledQuery: "l", count: 3, didYouMean: false, group: null })).toBe("Searching…");
    expect(resultStatus({ query: "zzz", settledQuery: "zzz", count: 0, didYouMean: true, group: null })).toBe("No parts match “zzz”");
    expect(resultStatus({ query: "sevro", settledQuery: "sevro", count: 2, didYouMean: true, group: null })).toBe("No exact match. Did you mean:");
    expect(resultStatus({ query: "led", settledQuery: "led", count: 1, didYouMean: false, group: null })).toBe("1 result");
    expect(resultStatus({ query: "", settledQuery: "", count: 22, didYouMean: false, group: "sensors" })).toBe("Sensors · 22");
    expect(resultStatus({ query: "", settledQuery: "", count: 0, didYouMean: false, group: "sensors" })).toBe("No parts in this group yet");
  });
});

describe("where a part from the modal lands", () => {
  const center = { x: 1000, y: 600 };
  it("the first is centered on the viewport", () => {
    const { w, h } = nodeLayout("led", "top");
    expect(placeFromModal(null, { partId: "led", center, nodes: [], view: "top" })).toEqual({ x: Math.round(1000 - w / 2), y: Math.round(600 - h / 2) });
  });

  it("each next one, added before closing, 24 px further down and right", () => {
    let cascade = null;
    const spots: Array<{ x: number; y: number }> = [];
    const nodes: LabNode[] = [];
    for (let i = 0; i < 3; i++) {
      const at = placeFromModal(cascade, { partId: "led", center, nodes, view: "top" });
      spots.push(at);
      nodes.push({ id: `n${i}`, partId: "led", label: "LED", x: at.x, y: at.y, mode: "virtual" });
      cascade = nextCascade(cascade, at, `n${i}`);
    }
    expect(spots[1]).toEqual({ x: spots[0].x + 24, y: spots[0].y + 24 });
    expect(spots[2]).toEqual({ x: spots[0].x + 48, y: spots[0].y + 48 });
  });

  it("never covers a part that was already there", () => {
    const { w, h } = nodeLayout("arduino-uno", "top");
    const uno: LabNode = { id: "u", partId: "arduino-uno", label: "Uno", x: Math.round(1000 - w / 2), y: Math.round(600 - h / 2), mode: "virtual" };
    const at = placeFromModal(null, { partId: "led", center, nodes: [uno], view: "top" });
    const led = nodeLayout("led", "top");
    const overlaps = at.x < uno.x + w && at.x + led.w > uno.x && at.y < uno.y + h && at.y + led.h > uno.y;
    expect(overlaps).toBe(false);
    // Still on the same diagonal from the center.
    expect(at.x - Math.round(1000 - led.w / 2)).toBe(at.y - Math.round(600 - led.h / 2));
  });
});
