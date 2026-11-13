import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { useLab } from "@kiungo/lab/store";
import { EngineeringLab } from "@/components/lab/EngineeringLab";
import { CODE_LAYOUT_KEY, clampRatio, readCodeLayout, writeCodeLayout } from "@/lib/lab/code-layout";
import { useAuthStore } from "@/lib/auth-store";
import { resetProjectsWorkspace } from "@/lib/projects/workspace";
import { freshLab } from "./helpers/lab";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
// The editor is Monaco in the browser; a textarea stands in for it here.
vi.mock("@/components/firmware/CodeEditor", () => ({
  CodeEditor: ({ value, onChange, path }: { value: string; onChange?: (v: string) => void; path?: string }) => <textarea aria-label={`Editor ${path}`} value={value} onChange={(e) => onChange?.(e.target.value)} />,
}));
const compile = vi.fn();
vi.mock("@/lib/lab/compile", async (original) => ({ ...(await original<typeof import("@/lib/lab/compile")>()), compileSketch: (...args: unknown[]) => compile(...args), wakeCompiler: vi.fn(async () => true) }));

let wide = true;
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
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({ matches: query.includes("min-width") ? wide : true, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() }));
});

beforeEach(() => {
  wide = true;
  window.localStorage.clear();
  freshLab();
  resetProjectsWorkspace();
  useAuthStore.setState({ isAuthenticated: false, isLoading: false, user: null, accessToken: null });
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  compile.mockReset();
});
afterEach(() => vi.useRealTimers());

async function openLabWithUno() {
  render(<EngineeringLab />);
  await waitFor(() => expect(useLab.getState().activeId).not.toBeNull());
  act(() => {
    useLab.getState().addNode("arduino-uno", { x: 80, y: 80 });
  });
  return await screen.findByTestId("code-pane");
}

describe("code beside the circuit (WP-D3)", () => {
  it("opens beside the circuit at an even split; a session without code keeps the built-in behavior until a sketch is started", async () => {
    const pane = await openLabWithUno();
    expect(screen.getByTestId("lab-split").getAttribute("data-code")).toBe("open");
    expect(screen.getByTestId("code-divider").getAttribute("aria-valuenow")).toBe("50");
    expect(pane.textContent).toContain("built-in behavior");
    expect(screen.getByTestId("run-toggle").getAttribute("title")).toMatch(/Open Code/);

    fireEvent.click(within(pane).getByTestId("code-start"));
    expect(await screen.findByLabelText("Editor sketch.ino")).toBeTruthy();
    await waitFor(() => expect(useLab.getState().sessions[0].code?.files[0].path).toBe("sketch.ino"));
    await waitFor(() => expect(screen.getByTestId("run-toggle").getAttribute("title")).toBe("Run your code (⌘↵)"));
  });

  it("edits save to the session, and Ctrl/Cmd+Enter builds them through the compile service and shows the problems", async () => {
    const pane = await openLabWithUno();
    fireEvent.click(within(pane).getByTestId("code-start"));
    const editor = await screen.findByLabelText("Editor sketch.ino");
    fireEvent.change(editor, { target: { value: "void setup(){}\nvoid loop(){digitalWrit(13,HIGH);}\n" } });
    compile.mockResolvedValue({ ok: false, diagnostics: [{ file: "sketch.ino", path: "/b/sketch/sketch.ino", line: 2, column: 13, severity: "error", message: "'digitalWrit' was not declared in this scope", notes: [] }], durationMs: 480, log: "sketch.ino:2:13: error: 'digitalWrit' was not declared in this scope" });
    await act(async () => {
      fireEvent.keyDown(editor, { key: "Enter", ctrlKey: true });
    });
    await waitFor(() => expect(compile).toHaveBeenCalled());
    expect(compile.mock.calls[0][1]).toEqual([{ path: "sketch.ino", content: "void setup(){}\nvoid loop(){digitalWrit(13,HIGH);}\n" }]);
    // Saved to the session too (it syncs with the account).
    await waitFor(() => expect(useLab.getState().sessions[0].code?.files[0].content).toContain("digitalWrit"));
    fireEvent.click(await screen.findByTestId("code-footer-problems"));
    expect((await screen.findByTestId("code-problems")).textContent).toContain("sketch.ino:2:13 'digitalWrit' was not declared");
    expect(screen.getAllByText("Your code didn't build: 1 problem in the Code pane.").length).toBeGreaterThan(0);
  });

  it("when the compiler can't be reached, Run still runs (the built-in behavior) and the pane says why", async () => {
    const { CompileUnavailable } = await import("@/lib/lab/compile");
    const pane = await openLabWithUno();
    fireEvent.click(within(pane).getByTestId("code-start"));
    await screen.findByLabelText("Editor sketch.ino");
    compile.mockRejectedValue(new CompileUnavailable("unavailable", "Kiungo's compiler can't be reached (check your connection), so Run shows the built-in behavior."));
    await act(async () => {
      fireEvent.click(screen.getByTestId("run-toggle"));
    });
    await waitFor(() => expect(screen.getByTestId("run-toggle").textContent).toContain("Stop"));
    expect((await screen.findByTestId("code-build-note")).textContent).toContain("can't be reached");
  });

  it("files: add a header, refuse a bad name, delete with a second click", async () => {
    const pane = await openLabWithUno();
    fireEvent.click(within(pane).getByTestId("code-start"));
    await screen.findByLabelText("Editor sketch.ino");
    fireEvent.click(screen.getByTestId("code-add"));
    fireEvent.change(screen.getByLabelText("New file name"), { target: { value: "my motor.h" } });
    expect(screen.getByRole("alert").textContent).toMatch(/letters, digits/);
    fireEvent.change(screen.getByLabelText("New file name"), { target: { value: "motor.h" } });
    fireEvent.submit(screen.getByLabelText("New file name").closest("form")!);
    expect(await screen.findByLabelText("Editor motor.h")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Delete motor.h"));
    expect(screen.getByTestId("code-tab-motor.h")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Click again to delete motor.h"));
    await waitFor(() => expect(screen.queryByTestId("code-tab-motor.h")).toBeNull());
  });

  it("resizes from the keyboard within 25–70 %, remembers it for the session, and closing the code gives the circuit the full width", async () => {
    await openLabWithUno();
    const divider = screen.getByTestId("code-divider");
    fireEvent.keyDown(divider, { key: "ArrowLeft" });
    expect(divider.getAttribute("aria-valuenow")).toBe("53");
    fireEvent.keyDown(divider, { key: "Home" });
    expect(divider.getAttribute("aria-valuenow")).toBe("70");
    fireEvent.keyDown(divider, { key: "End" });
    expect(divider.getAttribute("aria-valuenow")).toBe("25");
    const id = useLab.getState().activeId!;
    expect(readCodeLayout(id)).toEqual({ open: true, ratio: 0.25 });

    fireEvent.click(screen.getByTestId("code-toggle"));
    expect(screen.getByTestId("lab-split").getAttribute("data-code")).toBe("closed");
    expect(screen.queryByTestId("code-pane")).toBeNull();
    expect(readCodeLayout(id).open).toBe(false);
  });

  it("on a phone the code is a tab, not a split", async () => {
    wide = false;
    render(<EngineeringLab />);
    await waitFor(() => expect(screen.getByTestId("lab-split").getAttribute("data-code")).toBe("tab"));
    expect(screen.queryByTestId("code-divider")).toBeNull();
    fireEvent.click(screen.getByTestId("lab-tab-code"));
    expect(screen.getByTestId("lab-tab-code").getAttribute("aria-selected")).toBe("true");
  });
});

describe("the code layout's memory", () => {
  it("clamps, defaults and survives bad storage", () => {
    expect(readCodeLayout("none")).toEqual({ open: true, ratio: 0.5 });
    expect(clampRatio(0.9)).toBe(0.7);
    expect(clampRatio(0.1)).toBe(0.25);
    expect(clampRatio(Number.NaN)).toBe(0.5);
    writeCodeLayout("a", { open: false, ratio: 0.9 });
    expect(readCodeLayout("a")).toEqual({ open: false, ratio: 0.7 });
    window.localStorage.setItem(CODE_LAYOUT_KEY, "{not json");
    expect(readCodeLayout("a")).toEqual({ open: true, ratio: 0.5 });
  });
});
