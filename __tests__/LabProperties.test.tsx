import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createRef } from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { EngineeringLab } from "@/components/lab/EngineeringLab";
import { LabWorkspace, type LabWorkspaceHandle } from "@kiungo/lab/LabWorkspace";
import { useLab } from "@kiungo/lab/store";
import { freshLab } from "./helpers/lab";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => "/laboratory/workspace" }));

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
  vi.stubGlobal("DOMMatrixReadOnly", class {
    m22 = 1;
  });
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, get: () => 600 });
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, get: () => 900 });
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({ matches: true, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() }));
});

beforeEach(() => {
  freshLab();
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
  vi.stubGlobal("DOMMatrixReadOnly", class {
    m22 = 1;
  });
});

/** The Blink template (an Uno and an LED) plus an LDR, wired by the library's auto-wire. */
async function blinkWithLdr() {
  render(<EngineeringLab />);
  await screen.findByTestId("lab-empty");
  fireEvent.click(within(screen.getByTestId("lab-empty")).getByText("Blink an LED"));
  await screen.findAllByTestId("lab-node");
  fireEvent.click(screen.getByRole("button", { name: "Add" }));
  fireEvent.change(screen.getByTestId("lab-search"), { target: { value: "ldr" } });
  fireEvent.keyDown(screen.getByTestId("lab-search"), { key: "Enter" });
  await waitFor(() => expect(screen.queryByTestId("parts-modal")).not.toHaveAttribute("open"));
}

const card = (partId: string) => screen.getAllByTestId("lab-node").find((n) => n.getAttribute("data-part") === partId)!;
const nodeOf = (partId: string) => useLab.getState().sessions[0].nodes.find((n) => n.partId === partId)!;
/** A plain click on the part, as React Flow sees one: on its name. */
const clickPart = (partId: string, init: MouseEventInit = {}) => fireEvent.click(within(card(partId)).getAllByText(nodeOf(partId).label)[0], init);

describe("a part's properties popover (B3)", () => {
  it("opens on a click on the part, named for it, and Esc closes it", async () => {
    await blinkWithLdr();
    expect(screen.queryByTestId("properties-popover")).not.toBeInTheDocument();
    clickPart("ldr");
    const popover = await screen.findByTestId("properties-popover");
    expect(popover).toHaveAccessibleName(`Properties: ${nodeOf("ldr").label}`);
    expect(popover).toHaveAttribute("aria-modal", "false");
    expect(within(popover).getByRole("textbox", { name: "Part name" })).toHaveValue(nodeOf("ldr").label);
    // The knobs, in SI (B5).
    expect(within(popover).getByTestId("inputs-panel")).toHaveTextContent(/lx/);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("properties-popover")).not.toBeInTheDocument();
    // The part stays selected: Esc only closes the popover.
    expect(card("ldr").closest(".react-flow__node")).toHaveClass("selected");
  });

  it("doesn't open for a Shift-click (adding to a selection), and closes when more parts are picked", async () => {
    await blinkWithLdr();
    clickPart("led", { shiftKey: true });
    expect(screen.queryByTestId("properties-popover")).not.toBeInTheDocument();
    clickPart("ldr");
    expect(await screen.findByTestId("properties-popover")).toBeInTheDocument();
    clickPart("led", { shiftKey: true });
    await waitFor(() => expect(screen.queryByTestId("properties-popover")).not.toBeInTheDocument());
  });

  it("moves to another part when that one is clicked, and closes on a click on the empty canvas", async () => {
    await blinkWithLdr();
    clickPart("ldr");
    expect(await screen.findByTestId("properties-popover")).toHaveAccessibleName(`Properties: ${nodeOf("ldr").label}`);
    clickPart("led");
    await waitFor(() => expect(screen.getByTestId("properties-popover")).toHaveAccessibleName(`Properties: ${nodeOf("led").label}`));
    fireEvent.click(document.querySelector(".react-flow__pane")!);
    await waitFor(() => expect(screen.queryByTestId("properties-popover")).not.toBeInTheDocument());
  });

  it("never pauses the run: the clock keeps going and a knob changes the running circuit", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await blinkWithLdr();
    fireEvent.click(screen.getByTestId("run-toggle"));
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    clickPart("ldr");
    const popover = await screen.findByTestId("properties-popover");
    const before = Number.parseFloat(screen.getByTestId("sim-time").textContent ?? "0");
    const field = within(popover).getByTestId("input-illuminance");
    fireEvent.change(field, { target: { value: "5 lx" } });
    fireEvent.keyDown(field, { key: "Enter" });
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId("run-toggle")).toHaveTextContent("Stop");
    expect(Number.parseFloat(screen.getByTestId("sim-time").textContent ?? "0") - before).toBeGreaterThanOrEqual(0.9);
    expect(useLab.getState().sessions[0].inputs?.[nodeOf("ldr").id]?.illuminance).toBe(5);
    expect(screen.getByTestId("properties-popover")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("run-toggle"));
  });

  it("a board's popover has Runs on, and device mode still changes there; other parts don't have it", async () => {
    await blinkWithLdr();
    clickPart("led");
    expect(within(await screen.findByTestId("properties-popover")).queryByTestId("runs-on")).not.toBeInTheDocument();
    clickPart("arduino-uno");
    const popover = await screen.findByTestId("properties-popover");
    await waitFor(() => expect(popover).toHaveAccessibleName(`Properties: ${nodeOf("arduino-uno").label}`));
    const mode = within(within(popover).getByTestId("runs-on")).getByRole("combobox", { name: "Device mode" });
    expect(mode).toHaveValue("virtual");
    fireEvent.change(mode, { target: { value: "hybrid" } });
    expect(nodeOf("arduino-uno").mode).toBe("hybrid");
  });

  it("keeps rename and delete in the header, and pins and checks behind a closed disclosure", async () => {
    await blinkWithLdr();
    clickPart("led");
    const popover = await screen.findByTestId("properties-popover");
    const name = within(popover).getByRole("textbox", { name: "Part name" });
    fireEvent.change(name, { target: { value: "Status light" } });
    fireEvent.blur(name);
    expect(nodeOf("led").label).toBe("Status light");
    const pins = within(popover).getByTestId("pins-and-checks");
    expect(pins).not.toHaveAttribute("open");
    expect(within(pins).getByTestId("pin-table")).toBeInTheDocument();
    // The three-view thumbnails are gone: the canvas already shows the part.
    expect(within(popover).queryByRole("radiogroup", { name: "Preview" })).not.toBeInTheDocument();
    fireEvent.click(within(popover).getByRole("button", { name: "Delete Status light" }));
    expect(useLab.getState().sessions[0].nodes.some((n) => n.partId === "led")).toBe(false);
    await waitFor(() => expect(screen.queryByTestId("properties-popover")).not.toBeInTheDocument());
  });

  it("right-click → Properties opens it too", async () => {
    await blinkWithLdr();
    fireEvent.contextMenu(card("led"), { clientX: 40, clientY: 40 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Properties" }));
    expect(await screen.findByTestId("properties-popover")).toHaveAccessibleName(`Properties: ${nodeOf("led").label}`);
  });

  it("the circuit overview is ⋮ → Circuit summary, in a dialog", async () => {
    await blinkWithLdr();
    fireEvent.click(screen.getByRole("button", { name: "More lab actions" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Circuit summary" }));
    const dialog = screen.getByTestId("circuit-summary");
    expect(dialog).toHaveAttribute("open");
    expect(within(dialog).getByTestId("overview-inspector")).toHaveTextContent(/Ready/);
  });
});

describe("openProperties on the lab's handle (menus, command palette)", () => {
  function workspace() {
    const ref = createRef<LabWorkspaceHandle>();
    act(() => {
      useLab.getState().hydrate();
      useLab.getState().createSession({ name: "Bench" });
    });
    render(<LabWorkspace ref={ref} titleMenu={() => []} />);
    return ref;
  }

  it("opens a given part's properties", async () => {
    const ref = workspace();
    await screen.findByTestId("lab-empty");
    fireEvent.click(within(screen.getByTestId("lab-empty")).getByText("Blink an LED"));
    await screen.findAllByTestId("lab-node");
    act(() => ref.current!.openProperties(nodeOf("led").id));
    expect(await screen.findByTestId("properties-popover")).toHaveAccessibleName(`Properties: ${nodeOf("led").label}`);
  });

  it("with nothing selected, shows the circuit summary", async () => {
    const ref = workspace();
    await screen.findByTestId("lab-empty");
    act(() => ref.current!.openProperties());
    expect(screen.getByTestId("circuit-summary")).toHaveAttribute("open");
  });

  it("toggleInspector is gone everywhere: the shared lab, the desktop app, the website", () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        if (name === "node_modules" || name === "out" || name === "dist" || name.startsWith(".")) continue;
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(ts|tsx)$/.test(name)) files.push(path);
      }
    };
    for (const dir of ["packages/lab/src", "apps/desktop/src", "components", "app"]) walk(join(process.cwd(), dir));
    const offenders = files.filter((f) => readFileSync(f, "utf8").includes("toggleInspector"));
    expect(offenders).toEqual([]);
    expect(readFileSync(join(process.cwd(), "apps/desktop/src/renderer/src/App.tsx"), "utf8")).toMatch(/l\.openProperties\(\)/);
  });
});
