import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { LabWorkspace } from "@kiungo/lab/LabWorkspace";
import type { ProgramDriver } from "@kiungo/lab/lab-context";
import { useLab } from "@kiungo/lab/store";
import type { ProgramReadings } from "@kiungo/core/lab/program";
import { buildStarter } from "@kiungo/core/project";
import { freshLab } from "./helpers/lab";

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
  // Reduced motion: Run starts without the USB lead's animation.
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({ matches: true, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() }));
});

beforeEach(() => {
  freshLab();
  const { session } = buildStarter({ name: "Blink", board: "arduino-uno", starter: "blink" });
  useLab.setState({ hydrated: true, sessions: [session], activeId: session.id });
});
afterEach(() => vi.useRealTimers());

/** A driver that stands in for the emulator: the test pushes readings and serial text. */
function fakeDriver(result: { ok: true; programBytes: number } | { ok: false; message: string } = { ok: true, programBytes: 924 }) {
  const handlers: { readings?: (r: ProgramReadings) => void; serial?: (t: string) => void } = {};
  const driver: ProgramDriver & { started: string[]; stopped: number; inputs: unknown[] } = {
    started: [],
    stopped: 0,
    inputs: [],
    boardFor: (nodes) => nodes.find((n) => n.partId === "arduino-uno")?.id ?? null,
    start: async (boardId, inputs, _circuit, on) => {
      driver.started.push(boardId);
      driver.inputs.push(inputs);
      handlers.readings = on.readings;
      handlers.serial = on.serial;
      on.stage("building");
      return result;
    },
    stop: () => {
      driver.stopped++;
    },
    setInputs: (inputs) => driver.inputs.push(inputs),
  };
  return { driver, handlers };
}

const titleMenu = () => [];

describe("Run with the user's program (RUN-02, RUN-03)", () => {
  it("runs the program on the Uno, and the LED shows what the program does to pin 13", async () => {
    const { driver, handlers } = fakeDriver();
    render(<LabWorkspace program={driver} titleMenu={titleMenu} />);
    const run = await screen.findByTestId("run-toggle");
    expect(run.getAttribute("title")).toBe("Run your code (⌘↵)");
    await act(async () => {
      fireEvent.click(run);
    });
    const board = useLab.getState().sessions[0].nodes[0];
    expect(driver.started).toEqual([board.id]);
    await waitFor(() => expect(screen.getByTestId("run-toggle").textContent).toContain("Stop"));
    act(() => handlers.readings?.({ boardId: board.id, t: 0.6, speedPercent: 100, crashed: null, pins: [{ pin: 13, level: "high", duty: 1, hz: 0, pulseUs: null }] }));
    await waitFor(() => expect(document.body.textContent).toContain("ON"));
    act(() => handlers.readings?.({ boardId: board.id, t: 1.1, speedPercent: 100, crashed: null, pins: [{ pin: 13, level: "low", duty: 0, hz: 0, pulseUs: null }] }));
    await waitFor(() => expect(document.body.textContent).toContain("OFF"));
    fireEvent.click(screen.getByTestId("run-toggle"));
    expect(driver.stopped).toBe(1);
  });

  it("a build that fails stops the run and says why", async () => {
    const { driver } = fakeDriver({ ok: false, message: "Your code didn't build: 1 problem in Code problems." });
    render(<LabWorkspace program={driver} titleMenu={titleMenu} />);
    await act(async () => {
      fireEvent.click(await screen.findByTestId("run-toggle"));
    });
    await waitFor(() => expect(screen.getAllByText("Your code didn't build: 1 problem in Code problems.").length).toBeGreaterThan(0));
    expect(screen.getByTestId("run-toggle").textContent).toContain("Run");
  });

  it("with no board that runs the program, Run says why and runs the built-in behavior", async () => {
    const { driver } = fakeDriver();
    const none: ProgramDriver = { ...driver, boardFor: () => null, whyNot: () => "Add an Arduino Uno to the circuit to run your code on it." };
    render(<LabWorkspace program={none} titleMenu={titleMenu} />);
    expect((await screen.findByTestId("run-toggle")).getAttribute("title")).toBe("Add an Arduino Uno to the circuit to run your code on it.");
  });
});
