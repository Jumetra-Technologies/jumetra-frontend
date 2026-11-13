import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createRef, useEffect } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenedProject } from "@kiungo/api";
import { newSession } from "@kiungo/core/lab/session";
import { useLab } from "@kiungo/lab/store";
import { CODE_PREF, CODE_WIDTH, readCodePref, writeCodePref } from "../src/renderer/src/project/code-pref";
import { ConfirmTrash } from "../src/renderer/src/editor/ConfirmTrash";

// The editor is Monaco: a stand-in that counts its mounts, and keeps "history" while it lives.
const editor = vi.hoisted(() => ({ mounts: 0, unmounts: 0 }));
vi.mock("../src/renderer/src/editor/EditorPane", () => ({
  EditorPane: function EditorPane({ onRun }: { onRun: () => void }) {
    useEffect(() => {
      editor.mounts++;
      return () => {
        editor.unmounts++;
      };
    }, []);
    return (
      <div data-testid="editor-stub">
        <button type="button" onClick={onRun} data-testid="editor-run">
          Run
        </button>
      </div>
    );
  },
}));
vi.mock("../src/renderer/src/world/WorldPane", () => ({ WorldPane: () => <div />, createWorldFeed: () => ({ push: vi.fn(), subscribe: () => () => undefined }) }));
vi.mock("../src/renderer/src/project/SyncChip", () => ({ SyncChip: () => null }));

import { ProjectScreen, type ProjectScreenHandle } from "../src/renderer/src/project/ProjectScreen";

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
  vi.stubGlobal("DOMMatrixReadOnly", class {
    m22 = 1;
  });
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({ matches: true, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
});

beforeEach(() => {
  window.localStorage.clear();
  editor.mounts = 0;
  editor.unmounts = 0;
  // Saving and the rest answer "done"; there is no world.json in this project.
  (window as unknown as { kiungo: unknown }).kiungo = { invoke: vi.fn(async (channel: string) => (channel === "world:read" ? null : { ok: true })), on: vi.fn(() => () => undefined) };
  useLab.setState({ hydrated: false, sessions: [], activeId: null, past: [], future: [], saveError: false });
});

afterEach(() => {
  vi.clearAllMocks();
});

function project(): OpenedProject {
  const now = new Date().toISOString();
  return {
    path: "/projects/blink",
    meta: { format: "kiungo-project", version: 1, id: "p1", name: "Blink", board: "arduino-uno", starter: null, createdAt: now, updatedAt: now } as OpenedProject["meta"],
    session: newSession({ name: "Blink" }),
    history: null,
    warnings: [],
  };
}

async function open() {
  const ref = createRef<ProjectScreenHandle>();
  render(<ProjectScreen ref={ref} project={project()} onHome={vi.fn()} />);
  await screen.findByTestId("lab-top-bar");
  return ref;
}

const paneWidth = () => screen.getByTestId("code-pane").style.width;

describe("the code pane's width (C1)", () => {
  it("is an equal half by default", async () => {
    expect(readCodePref({ getItem: () => null })).toEqual({ open: true, width: 0.5 });
    await open();
    expect(paneWidth()).toBe("50%");
  });

  it("moves a stored old default (0.42) to the new one, once", () => {
    const stored = new Map<string, string>([[CODE_PREF, JSON.stringify({ open: true, width: 0.42 })]]);
    const storage = { getItem: (k: string) => stored.get(k) ?? null, setItem: (k: string, v: string) => void stored.set(k, v) };
    const pref = readCodePref(storage);
    expect(pref.width).toBe(0.5);
    writeCodePref(pref, storage);
    expect(JSON.parse(stored.get(CODE_PREF)!)).toEqual({ open: true, width: 0.5, v: 2 });
    // Saved at 0.42 on purpose after the change: that's a choice and stays.
    writeCodePref({ open: true, width: 0.42 }, storage);
    expect(readCodePref(storage).width).toBe(0.42);
  });

  it("keeps a width the person chose, and whether the code was hidden", () => {
    const storage = (value: unknown) => ({ getItem: () => JSON.stringify(value) });
    expect(readCodePref(storage({ open: false, width: 0.6 }))).toEqual({ open: false, width: 0.6 });
    expect(readCodePref(storage({ open: true, width: 0.33 }))).toEqual({ open: true, width: 0.33 });
    // Out of range or broken: back inside 0.25–0.70, never thrown.
    expect(readCodePref(storage({ open: true, width: 0.95 })).width).toBe(CODE_WIDTH.max);
    expect(readCodePref(storage({ open: true, width: 0.05 })).width).toBe(CODE_WIDTH.min);
    expect(readCodePref({ getItem: () => "{nope" })).toEqual({ open: true, width: 0.5 });
  });

  it("migrates in the app too: an old 0.42 opens at 50 %", async () => {
    window.localStorage.setItem(CODE_PREF, JSON.stringify({ open: true, width: 0.42 }));
    await open();
    expect(paneWidth()).toBe("50%");
    expect(JSON.parse(window.localStorage.getItem(CODE_PREF)!)).toMatchObject({ width: 0.5, v: 2 });
  });

  it("still resizes from the keyboard, between 25 % and 70 %", async () => {
    await open();
    const divider = screen.getByRole("separator", { name: "Resize the code" });
    expect(divider).toHaveAttribute("aria-valuenow", "50");
    fireEvent.keyDown(divider, { key: "ArrowLeft" });
    expect(divider).toHaveAttribute("aria-valuenow", "53");
    for (let i = 0; i < 20; i++) fireEvent.keyDown(divider, { key: "ArrowLeft" });
    expect(divider).toHaveAttribute("aria-valuenow", "70");
    for (let i = 0; i < 30; i++) fireEvent.keyDown(divider, { key: "ArrowRight" });
    expect(divider).toHaveAttribute("aria-valuenow", "25");
  });
});

describe("showing and hiding the code (C1)", () => {
  it("the Code button, ⌘E and ⋮ all toggle it", async () => {
    await open();
    const button = screen.getByTestId("toggle-code");
    expect(button).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(button);
    expect(screen.getByTestId("code-pane")).toHaveClass("hidden");
    fireEvent.keyDown(window, { key: "e", ctrlKey: true });
    expect(screen.getByTestId("code-pane")).not.toHaveClass("hidden");
    fireEvent.click(screen.getByRole("button", { name: "More lab actions" }));
    fireEvent.click(within(screen.getByRole("menu")).getByRole("menuitem", { name: /^Hide the code/ }));
    expect(screen.getByTestId("code-pane")).toHaveClass("hidden");
    expect(screen.getByTestId("toggle-code")).toHaveAttribute("aria-pressed", "false");
    expect(JSON.parse(window.localStorage.getItem(CODE_PREF)!)).toMatchObject({ open: false });
  });

  it("keeps the editor mounted while hidden, so its files and undo history stay", async () => {
    await open();
    expect(editor.mounts).toBe(1);
    fireEvent.click(screen.getByTestId("toggle-code"));
    expect(screen.getByTestId("editor-stub")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("toggle-code"));
    expect(editor.mounts).toBe(1);
    expect(editor.unmounts).toBe(0);
  });

  it("Run in the editor (and its Ctrl/⌘+Enter) starts the same run as Run in the top bar", async () => {
    await open();
    const run = screen.getByTestId("run-toggle");
    expect(run).toHaveTextContent(/^Run$/);
    fireEvent.click(screen.getByTestId("editor-run"));
    // The lab is now starting the code: the top bar's Run says so.
    await vi.waitFor(() => expect(run).not.toHaveTextContent(/^Run$/));
  });
});

describe("moving a sketch file to the trash", () => {
  it("asks in the app's dialog, not a native confirm that would block the Esc emergency stop", () => {
    const confirm = vi.spyOn(window, "confirm");
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const { rerender } = render(<ConfirmTrash name={null} onConfirm={onConfirm} onCancel={onCancel} />);
    expect(screen.getByTestId("confirm-trash")).not.toHaveAttribute("open");
    rerender(<ConfirmTrash name="motor.h" onConfirm={onConfirm} onCancel={onCancel} />);
    const dialog = screen.getByTestId("confirm-trash");
    expect(dialog).toHaveAttribute("open");
    expect(dialog).toHaveAccessibleName("Move motor.h to the trash?");
    // Keeping it is the safe default.
    expect(within(dialog).getByRole("button", { name: "Keep it" })).toHaveFocus();
    fireEvent.click(within(dialog).getByRole("button", { name: "Move to trash" }));
    expect(onConfirm).toHaveBeenCalledWith("motor.h");
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    expect(onCancel).toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  });

  it("the editor has no window.confirm left (DESK-005/009)", () => {
    const source = readFileSync(join(__dirname, "../src/renderer/src/editor/EditorPane.tsx"), "utf8");
    expect(source).not.toMatch(/window\.confirm|\bconfirm\(/);
    expect(source).toMatch(/<ConfirmTrash /);
  });
});

