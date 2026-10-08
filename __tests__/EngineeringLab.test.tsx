import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { EngineeringLab } from "@/components/lab/EngineeringLab";
import { ProjectHub } from "@/components/projects/ProjectHub";
import { LocalProjectDetail } from "@/components/projects/LocalProjectDetail";
import { MenuList } from "@/components/ui/menu";
import { useLab } from "@/lib/lab/store";
import { ROBOTICS_DATA_KEY } from "@/lib/robotics-data";

const push = vi.fn();
const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
}));

beforeAll(() => {
  // What React Flow needs from a browser.
  class RO {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal("ResizeObserver", RO);
  class DOMMatrixReadOnlyStub {
    m22 = 1;
    constructor() {}
  }
  vi.stubGlobal("DOMMatrixReadOnly", DOMMatrixReadOnlyStub);
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, get: () => 600 });
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, get: () => 900 });
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({ matches: true, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() }));
});

beforeEach(() => {
  window.localStorage.clear();
  useLab.setState({ hydrated: false, sessions: [], activeId: null, past: [], future: [], saveError: false });
  // The backend isn't running in tests: the lab works offline.
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  push.mockReset();
});

afterEach(() => {
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

function project() {
  const now = new Date().toISOString();
  window.localStorage.setItem(
    ROBOTICS_DATA_KEY,
    JSON.stringify({ projects: [{ id: "local-project-gh", name: "Smart greenhouse", description: "Watch soil moisture", objectives: "Water when dry", contributors: "", category: "iot", hardware: ["soil sensor"], createdAt: now, updatedAt: now }], experiments: [] }),
  );
}

describe("Engineering Lab", () => {
  it("starts a session, adds a board and an auto-wired LED with one click each, and logs it", async () => {
    render(<EngineeringLab />);
    expect(await screen.findByTestId("lab-empty")).toBeInTheDocument();
    expect(useLab.getState().sessions).toHaveLength(1);

    fireEvent.click(screen.getByTestId("quick-arduino-uno"));
    await waitFor(() => expect(useLab.getState().sessions[0].nodes).toHaveLength(1));

    const search = screen.getByTestId("lab-search");
    fireEvent.change(search, { target: { value: "led" } });
    fireEvent.keyDown(search, { key: "Enter" });
    const session = useLab.getState().sessions[0];
    expect(session.nodes.map((n) => n.partId)).toEqual(["arduino-uno", "led"]);
    expect(session.wires).toHaveLength(2);
    expect(session.log.map((e) => e.text)).toEqual(expect.arrayContaining(["Added Arduino Uno", "Added LED", expect.stringMatching(/^Auto-wired LED to Arduino Uno: Anode \(\+\) → D13 SCK, Cathode \(−\) → GND/)]));
    expect(await screen.findByText(/LED is wired and powered on Arduino Uno D13 SCK/)).toBeInTheDocument();
    expect(screen.getByTestId("runtime-status")).toHaveAttribute("aria-label", "Offline mode");
  });

  it("runs the sketch and records what happened", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<EngineeringLab />);
    await screen.findByTestId("lab-empty");
    fireEvent.click(within(screen.getByTestId("lab-empty")).getByText("Blink an LED"));
    fireEvent.click(screen.getByTestId("run-toggle"));
    await act(async () => {
      vi.advanceTimersByTime(1200);
    });
    expect(screen.getByTestId("sim-time").textContent).not.toBe("0.0 s");
    fireEvent.click(screen.getByTestId("run-toggle"));
    const log = useLab.getState().sessions[0].log.map((e) => e.text);
    expect(log).toEqual(expect.arrayContaining(["Run started with 2 parts", expect.stringMatching(/^LED flashes on \(Arduino Uno D13 SCK\)$/), expect.stringMatching(/^Run stopped after \d+\.\d s/)]));
    expect(useLab.getState().sessions[0].runMs).toBeGreaterThan(0);
    vi.useRealTimers();
  });

  it("switches between the three views and keeps the choice with the session", async () => {
    render(<EngineeringLab />);
    await screen.findByTestId("lab-empty");
    const views = screen.getByRole("radiogroup", { name: "Canvas view" });
    expect(within(views).getAllByRole("radio").map((r) => r.textContent)).toEqual(["3D model", "Top view", "Current flow"]);
    fireEvent.click(within(views).getByRole("radio", { name: /^Current flow/ }));
    expect(useLab.getState().sessions[0].view).toBe("flow");
  });

  it("opens a session for a project, with suggestions from its brief", async () => {
    project();
    render(<EngineeringLab newForProject="local-project-gh" />);
    await screen.findByTestId("lab-empty");
    const session = useLab.getState().sessions[0];
    expect(session).toMatchObject({ name: "Smart greenhouse lab", projectId: "local-project-gh" });
    expect(screen.getByText("Suggested for this project")).toBeInTheDocument();
    const rows = screen.getAllByTestId("lab-add-row").map((r) => r.textContent ?? "");
    expect(rows.some((t) => t.includes("Soil moisture sensor") && t.includes("hardware list"))).toBe(true);
  });

  it("checks the circuit and lists problems with their parts", async () => {
    render(<EngineeringLab />);
    await screen.findByTestId("lab-empty");
    const s = useLab.getState();
    act(() => {
      const uno = s.addNode("arduino-uno", { x: 0, y: 0 })!;
      const led = useLab.getState().addNode("led", { x: 500, y: 0 })!;
      useLab.getState().addWire({ node: uno.id, pin: "D13" }, { node: led.id, pin: "A" });
    });
    fireEvent.click(screen.getByRole("tab", { name: /Problems/ }));
    expect(within(screen.getByTestId("lab-dock")).getByText("No path to ground")).toBeInTheDocument();
  });

  it("takes commands in the terminal", async () => {
    render(<EngineeringLab />);
    await screen.findByTestId("lab-empty");
    fireEvent.click(screen.getByRole("tab", { name: /Terminal/ }));
    const input = screen.getByTestId("terminal-input");
    fireEvent.change(input, { target: { value: "add esp32" } });
    fireEvent.submit(input.closest("form")!);
    fireEvent.change(input, { target: { value: "add dht22" } });
    fireEvent.submit(input.closest("form")!);
    expect(useLab.getState().sessions[0].nodes.map((n) => n.partId)).toEqual(["esp32", "dht22"]);
    expect(within(screen.getByTestId("lab-terminal")).getByText(/Added DHT22 and wired it to the board/)).toBeInTheDocument();
  });
});

describe("Projects and the lab", () => {
  it("lists lab sessions on the Projects page with a way back into the lab", async () => {
    useLab.getState().hydrate();
    const s = useLab.getState().createSession({ name: "Rover bench" });
    useLab.getState().addNode("arduino-uno");
    act(() => {
      useLab.setState({ hydrated: true });
    });
    render(<ProjectHub serverProjects={[]} />);
    const card = await screen.findByTestId("lab-session-card");
    expect(within(card).getByText("Rover bench")).toBeInTheDocument();
    expect(within(card).getByTestId("open-in-lab")).toHaveAttribute("href", `/laboratory/workspace?session=${s.id}`);
  });

  it("shows a project's lab sessions and the progress log the lab wrote", async () => {
    project();
    useLab.getState().hydrate();
    const s = useLab.getState().createSession({ name: "Greenhouse bench", projectId: "local-project-gh" });
    useLab.getState().addNode("esp32");
    useLab.getState().log("run", "Soil sensor reads 41 %");
    render(<LocalProjectDetail projectId="local-project-gh" />);
    const log = await screen.findByTestId("project-log");
    expect(within(log).getByText("Soil sensor reads 41 %")).toBeInTheDocument();
    expect(screen.getByTestId("project-open-lab")).toHaveAttribute("href", `/laboratory/workspace?session=${s.id}`);
    expect(screen.getByTestId("new-project-session")).toHaveAttribute("href", "/laboratory/workspace?project=local-project-gh");
    expect(within(screen.getByTestId("lab-hardware")).getByText("ESP32")).toBeInTheDocument();
  });
});

describe("Menus", () => {
  it("moves with arrow keys, jumps by letter and picks with Enter", () => {
    const onClose = vi.fn();
    const picked = vi.fn();
    render(
      <MenuList
        at={{ x: 0, y: 0 }}
        onClose={onClose}
        items={[
          { id: "a", label: "Alpha", onSelect: () => picked("a") },
          { id: "b", label: "Bravo", onSelect: () => picked("b") },
          { id: "c", label: "Charlie", disabled: true },
        ]}
      />,
    );
    const items = screen.getAllByRole("menuitem");
    items[0].focus();
    fireEvent.keyDown(screen.getByRole("menu"), { key: "ArrowDown" });
    expect(document.activeElement).toBe(items[1]);
    fireEvent.keyDown(screen.getByRole("menu"), { key: "a" });
    expect(document.activeElement).toBe(items[0]);
    fireEvent.keyDown(items[0], { key: "Enter" });
    expect(picked).toHaveBeenCalledWith("a");
    expect(onClose).toHaveBeenCalled();
    expect(items[2]).toHaveAttribute("aria-disabled", "true");
  });
});
