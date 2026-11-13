import { useRef } from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { analyze } from "@kiungo/core/lab/circuit";
import { frameAt } from "@kiungo/core/lab/simulate";
import { getPinout } from "@kiungo/core/lab/pinout";
import { LabContext, type LabContextValue } from "./lab-context";
import { useActiveSession, useLab } from "./store";
import { WIRE_COLORS, WireProperties } from "./Inspector";
import { PropertiesPopover } from "./PropertiesPopover";

/*
 * React Flow draws no wires in jsdom (nothing has a size), so a wire can't be
 * clicked there. The wire's popover is tested here with the real store and
 * the real circuit analysis instead.
 */

function Harness({ wireId, onClose, select }: { wireId: string; onClose: () => void; select: LabContextValue["select"] }) {
  const session = useActiveSession()!;
  const analysis = analyze(session.nodes, session.wires, session.inputs);
  const frame = frameAt(session.nodes, session.wires, analysis, 0, false, session.inputs);
  const canvas = useRef<HTMLDivElement>(null);
  const value = { session, analysis, frame, view: session.view, running: false, power: "unplugged", selectedNodes: [], selectedWire: wireId, flash: [], select, focusNode: vi.fn(), addPart: vi.fn(), autowireNode: vi.fn(), openContextMenu: vi.fn() } as unknown as LabContextValue;
  return (
    <LabContext.Provider value={value}>
      <div ref={canvas}>
        <PropertiesPopover anchor={() => ({ left: 100, right: 100, top: 100, bottom: 130 })} bounds={canvas} sheet={false} label="Wire properties" onClose={onClose}>
          <WireProperties id={wireId} onClose={onClose} />
        </PropertiesPopover>
      </div>
    </LabContext.Provider>
  );
}

function wired() {
  const lab = useLab.getState();
  lab.createSession({ name: "Wire test" });
  const uno = lab.addNode("arduino-uno")!;
  const led = lab.addNode("led")!;
  const d13 = getPinout("arduino-uno").pins.find((p) => /^D?13\b/.test(p.label))!;
  const anode = getPinout("led").pins[0];
  const wire = useLab.getState().addWire({ node: uno.id, pin: d13.id }, { node: led.id, pin: anode.id })!;
  return { uno, led, wire };
}

beforeEach(() => {
  window.localStorage.clear();
  useLab.setState({ hydrated: false, sessions: [], activeId: null, past: [], future: [], saveError: false });
  useLab.getState().hydrate();
});

describe("a wire's popover (B3)", () => {
  it("names both ends, the net and what the wire carries now", () => {
    const { wire } = wired();
    render(<Harness wireId={wire.id} onClose={vi.fn()} select={vi.fn()} />);
    const popover = screen.getByTestId("properties-popover");
    expect(popover).toHaveAccessibleName("Wire properties");
    const panel = within(popover).getByTestId("wire-inspector");
    expect(panel).toHaveTextContent("Arduino Uno");
    expect(panel).toHaveTextContent("LED");
    expect(panel).toHaveTextContent(/Net/);
    expect(panel).toHaveTextContent(/Carries now/);
  });

  it("picks a color (undoable) and goes back to Auto", () => {
    const { wire } = wired();
    render(<Harness wireId={wire.id} onClose={vi.fn()} select={vi.fn()} />);
    const colors = screen.getByRole("radiogroup", { name: "Wire color" });
    expect(within(colors).getByRole("radio", { name: "Auto" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(within(colors).getByRole("radio", { name: "Red" }));
    const red = WIRE_COLORS.find((c) => c.id === "red")!.value;
    expect(useLab.getState().sessions[0].wires[0].color).toBe(red);
    expect(within(colors).getByRole("radio", { name: "Red" })).toHaveAttribute("aria-checked", "true");
    act(() => useLab.getState().undo());
    expect(useLab.getState().sessions[0].wires[0].color).toBeUndefined();
    fireEvent.click(within(colors).getByRole("radio", { name: "Blue" }));
    fireEvent.click(within(colors).getByRole("radio", { name: "Auto" }));
    expect(useLab.getState().sessions[0].wires[0]).not.toHaveProperty("color");
  });

  it("deletes the wire, and a click on an end selects that part", () => {
    const select = vi.fn();
    const { wire, led } = wired();
    render(<Harness wireId={wire.id} onClose={vi.fn()} select={select} />);
    fireEvent.click(within(screen.getByTestId("wire-inspector")).getByText("LED"));
    expect(select).toHaveBeenCalledWith([led.id], null);
    fireEvent.click(screen.getByRole("button", { name: "Delete wire" }));
    expect(useLab.getState().sessions[0].wires).toHaveLength(0);
  });

  it("closes on Esc and on its X, but not while a field inside handles Esc itself", () => {
    const onClose = vi.fn();
    const { wire } = wired();
    render(<Harness wireId={wire.id} onClose={onClose} select={vi.fn()} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Close properties" }));
    expect(onClose).toHaveBeenCalledTimes(2);
    const handled = new KeyboardEvent("keydown", { key: "Escape", cancelable: true });
    handled.preventDefault();
    window.dispatchEvent(handled);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("sits beside its anchor, to the right, inside the canvas", async () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, right: 1200, bottom: 800, width: 1200, height: 800, x: 0, y: 0, toJSON: () => ({}) } as DOMRect);
    const { wire } = wired();
    render(<Harness wireId={wire.id} onClose={vi.fn()} select={vi.fn()} />);
    const popover = screen.getByTestId("properties-popover");
    await waitFor(() => expect(popover).toHaveAttribute("data-side", "right"));
    expect(popover.style.left).toBe("112px");
    expect(popover.style.top).toBe("100px");
    vi.restoreAllMocks();
  });
});
