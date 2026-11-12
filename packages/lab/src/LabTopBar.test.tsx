import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LabTopBar } from "./LabTopBar";

const views = [
  { id: "reality" as const, label: "3D", icon: <svg />, description: "Parts as they look" },
  { id: "top" as const, label: "2D", icon: <svg /> },
  { id: "flow" as const, label: "Trace", icon: <svg /> },
];

function bar(over: Partial<Parameters<typeof LabTopBar>[0]> = {}) {
  const props = {
    onAdd: vi.fn(),
    title: <span>My lab</span>,
    run: { running: false, busy: false, label: "Run", title: "Run (⌘↵)", onClick: vi.fn() },
    t: 1.25,
    more: [
      { id: "step", label: "Step 100 ms", onSelect: vi.fn() },
      { id: "reset", label: "Reset to 0 s", onSelect: vi.fn() },
      { id: "undo", label: "Undo", onSelect: vi.fn() },
    ],
    view: "top" as const,
    views,
    onView: vi.fn(),
    ...over,
  };
  render(<LabTopBar {...props} />);
  return props;
}

describe("the lab's top bar (B1, B8.1–2)", () => {
  it("shows only + Add, the name, Run, the time, ⋮, the views, then the host's controls and save status", () => {
    bar({ trailing: <button type="button">Code</button>, saveStatus: <span>Saved</span> });
    const header = screen.getByTestId("lab-top-bar");
    const buttons = within(header).getAllByRole("button").map((b) => b.getAttribute("aria-label") ?? b.textContent);
    expect(buttons).toEqual(["Add", "Run", "More lab actions", "Code"]);
    expect(within(header).getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByTestId("sim-time")).toHaveTextContent("1.3 s");
    expect(header).toHaveTextContent("Saved");
    // No side-panel toggles, step, reset, speed, sound, undo or redo in the bar itself.
    for (const name of [/components panel/i, /inspector/i, /step/i, /reset/i, /speed/i, /sound|buzzer/i, /undo/i, /redo/i]) expect(within(header).queryByRole("button", { name })).not.toBeInTheDocument();
  });

  it("+ Add is the teal action with its shortcut; Run is a different style", () => {
    const props = bar();
    const add = screen.getByRole("button", { name: "Add" });
    expect(add).toHaveClass("k-lab-add");
    expect(add).toHaveAttribute("aria-keyshortcuts", "/");
    expect(screen.getByTestId("run-toggle")).toHaveClass("k-lab-run");
    fireEvent.click(add);
    expect(props.onAdd).toHaveBeenCalled();
  });

  it("keeps step, reset and undo in ⋮", () => {
    const reset = vi.fn();
    bar({ more: [{ id: "step", label: "Step 100 ms", onSelect: vi.fn() }, { id: "reset", label: "Reset to 0 s", onSelect: reset }] });
    fireEvent.click(screen.getByRole("button", { name: "More lab actions" }));
    fireEvent.click(within(screen.getByRole("menu")).getByRole("menuitem", { name: "Reset to 0 s" }));
    expect(reset).toHaveBeenCalled();
  });

  it("Run says what it's doing, and Emergency stop stays in the bar while a real board runs", () => {
    bar({ run: { running: true, busy: false, label: "Stop", title: "Stop", onClick: vi.fn() }, emergencyStop: vi.fn() });
    expect(screen.getByTestId("run-toggle")).toHaveTextContent("Stop");
    expect(screen.getByTestId("run-toggle")).toHaveAttribute("data-running", "true");
    expect(screen.getByTestId("emergency-stop")).toBeInTheDocument();
  });

  it("on a narrow screen the name shrinks, never + Add or Run (B1 mobile)", () => {
    bar();
    const header = screen.getByTestId("lab-top-bar");
    const name = within(header).getByText("My lab").parentElement!;
    expect(name).toHaveClass("min-w-0", "flex-1");
    expect(screen.getByTestId("run-toggle").parentElement).toHaveClass("shrink-0");
  });

  it("names every icon-only control for screen readers (B8.9)", () => {
    bar();
    const header = screen.getByTestId("lab-top-bar");
    for (const el of [...within(header).getAllByRole("button"), ...within(header).getAllByRole("radio")]) {
      const name = el.getAttribute("aria-label") ?? el.textContent?.trim();
      expect(name, el.outerHTML.slice(0, 80)).toBeTruthy();
    }
    expect(within(header).getByRole("radio", { name: /^3D/ })).toHaveAttribute("title", "3D: Parts as they look");
  });
});
