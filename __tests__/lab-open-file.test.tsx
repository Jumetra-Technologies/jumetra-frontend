import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { EngineeringLab } from "@/components/lab/EngineeringLab";
import { useLab } from "@/lib/lab/store";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/laboratory/workspace",
  useSearchParams: () => new URLSearchParams(),
}));

// The backend is not running in tests: the Lab works offline.
vi.mock("@/lib/lab/runtime", () => ({ backendReachable: async () => false, reconcile: async () => ({ workspaceId: "", nodeIds: {}, wireIds: {} }) }));

const rover = readFileSync(join(__dirname, "fixtures", "sentinel-rover.kiungo.json"), "utf8");

beforeAll(() => {
  // jsdom lacks the layout APIs React Flow and the canvas use.
  class RO {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.assign(globalThis, { ResizeObserver: RO });
  Object.assign(window, { matchMedia: (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false }) });
  if (!("DOMMatrixReadOnly" in window)) Object.assign(window, { DOMMatrixReadOnly: class { m22 = 1; constructor() {} } });
  window.HTMLElement.prototype.scrollIntoView = () => {};
});

beforeEach(() => useLab.setState({ sessions: [], activeId: null, past: [], future: [], hydrated: false }));

function fileOf(text: string, name: string) {
  const file = new File([text], name, { type: "application/json" });
  // jsdom's File has no text() in some versions.
  if (!("text" in file)) Object.assign(file, { text: async () => text });
  return file;
}

describe("Engineering Lab: open a .kiungo.json file", () => {
  it("opens the AI-built rover from the file picker and shows its parts", async () => {
    render(<EngineeringLab />);
    const input = (await screen.findByTestId("lab-open-file")) as HTMLInputElement;

    await act(async () => {
      fireEvent.change(input, { target: { files: [fileOf(rover, "sentinel-rover.kiungo.json")] } });
    });

    await waitFor(() => expect(useLab.getState().sessions.some((s) => s.name === "Sentinel Rover")).toBe(true));
    const active = useLab.getState().sessions.find((s) => s.id === useLab.getState().activeId)!;
    expect(active.name).toBe("Sentinel Rover");
    expect(active.nodes).toHaveLength(11);
    expect(active.wires).toHaveLength(38);
    expect(await screen.findByTestId("lab-toast")).toHaveTextContent("Opened “Sentinel Rover”: 11 parts, 38 wires");
    // The parts are on the canvas under their own names.
    for (const label of ["Brain", "Left drive", "Front sonar", "Status OLED", "Bluetooth link"]) {
      expect((await screen.findAllByText(label)).length).toBeGreaterThan(0);
    }
  });

  it("says why when the file isn't a lab session", async () => {
    render(<EngineeringLab />);
    const input = (await screen.findByTestId("lab-open-file")) as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { files: [fileOf('{"hello":"world"}', "notes.json")] } });
    });
    expect(await screen.findByTestId("lab-toast")).toHaveTextContent("This file has no lab session in it.");
  });
});
