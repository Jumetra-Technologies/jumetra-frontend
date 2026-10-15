import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { push, api } = vi.hoisted(() => ({
  push: vi.fn(),
  api: {
    listFirmwareProjects: vi.fn(),
    listFirmwareTemplates: vi.fn(),
    createFirmwareProject: vi.fn(),
    getFirmwareProject: vi.fn(),
    saveFirmwareFile: vi.fn(),
    queueFirmwareBuild: vi.fn(),
    getBackgroundJob: vi.fn(),
    uploadFirmware: vi.fn(),
    getFirmwareSerial: vi.fn(),
    postFirmwareSerial: vi.fn(),
    listFirmwareToolchains: vi.fn(),
  },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));

const project = {
  project_id: "fw_1",
  name: "My first sketch",
  board_type: "arduino-uno",
  project_type: "arduino-sketch",
  files: [{ path: "src/main.ino", content: "void setup() {}\nvoid loop() {}\n" }],
  tree: { src: ["src/main.ino"] },
};

vi.mock("@/lib/api-client", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/api-client")>()), api, getFirmwareWsUrl: () => "ws://test/firmware" }));
vi.mock("@/components/firmware/CodeEditor", () => ({
  CodeEditor: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => <textarea aria-label="Code" value={value} onChange={(e) => onChange(e.target.value)} />,
}));

import { FirmwareStudio } from "@/components/firmware/FirmwareStudio";
import { boardName, labBuildFor, STARTERS } from "@/lib/firmware/boards";
import { BUILT_IN_TEMPLATES } from "@/lib/firmware/studio-data";
import { useLab } from "@/lib/lab/store";
import { freshLab } from "./helpers/lab";

class FakeSocket {
  onmessage: ((ev: { data: string }) => void) | null = null;
  close() {}
}

beforeEach(() => {
  vi.stubGlobal("WebSocket", FakeSocket);
  window.sessionStorage.clear();
  window.localStorage.clear();
  freshLab();
  api.listFirmwareProjects.mockResolvedValue({ projects: [], count: 0 });
  api.listFirmwareTemplates.mockResolvedValue({ templates: BUILT_IN_TEMPLATES, count: BUILT_IN_TEMPLATES.length });
  api.createFirmwareProject.mockResolvedValue(project);
  api.getFirmwareProject.mockResolvedValue(project);
  api.getFirmwareSerial.mockResolvedValue({ lines: [], gpio: [] });
  api.listFirmwareToolchains.mockResolvedValue({ toolchains: [], missing: [], count: 0 });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

async function startProject() {
  render(<FirmwareStudio />);
  fireEvent.click(screen.getByTestId("new-project"));
  await screen.findByLabelText("Code");
}

describe("Firmware page: plain language", () => {
  it("explains what firmware is, names boards as people know them, and says what each starter does", async () => {
    render(<FirmwareStudio />);
    expect(screen.getByTestId("firmware-intro")).toHaveTextContent("Firmware is the program a board runs.");
    const boards = within(screen.getByRole("combobox", { name: "Board" })).getAllByRole("option").map((o) => o.textContent);
    expect(boards[0]).toBe("Arduino Uno");
    expect(boards).toContain("ESP32 DevKit");
    expect(boards).not.toContain("esp32");
    expect(screen.getByTestId("starter-does")).toHaveTextContent("Flashes an LED on and off once a second.");
    expect(within(screen.getByRole("tablist", { name: "Output" })).getAllByRole("tab").map((t) => t.textContent)).toEqual(["Compiler messages", "Serial monitor", "Memory", "Compilers"]);
    await waitFor(() => expect(api.listFirmwareProjects).toHaveBeenCalled());
  });

  it("doesn't show internal project ids", async () => {
    await startProject();
    expect(screen.queryByText("fw_1")).toBeNull();
    expect(screen.getByText(/Arduino Uno · Arduino sketch \(C\+\+\)/)).toBeInTheDocument();
  });
});

describe("Firmware page: phones and tablets", () => {
  it("shows one pane at a time below desktop width, and jumps to the code when a project opens", async () => {
    render(<FirmwareStudio />);
    const panes = screen.getByTestId("firmware-panes");
    expect(within(panes).getByRole("tab", { name: "Project" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("complementary", { name: "Run it" }).className).toMatch(/\bhidden\b/);
    fireEvent.click(screen.getByTestId("new-project"));
    await screen.findByLabelText("Code");
    expect(within(panes).getByRole("tab", { name: "Code" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(within(panes).getByRole("tab", { name: "Run it" }));
    expect(screen.getByRole("complementary", { name: "Run it" }).className).not.toMatch(/(^|\s)hidden(\s|$)/);
    // On a desktop all three show: the hiding classes stop at lg.
    expect(screen.getByRole("complementary", { name: "Run it" }).className).toMatch(/lg:flex/);
  });
});

describe("Firmware page: honest results", () => {
  it("shows a simulated build from the job result, with estimated memory", async () => {
    await startProject();
    api.queueFirmwareBuild.mockResolvedValue({ job_id: "j1", job_type: "build", status: "queued" });
    api.getBackgroundJob.mockResolvedValue({ job_id: "j1", job_type: "build", status: "succeeded", result: { success: true, dry_run: true, logs: ["[HHIP] simulated compile"], memory: { flash_used: 1024, flash_total: 32768, flash_percent: 3, ram_used: 200, ram_total: 2048, ram_percent: 9.8 } } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Compile/ }));
    });
    expect(await screen.findByTestId("simulated-build-note")).toHaveTextContent("Your code wasn't compiled.");
    expect(screen.getByTestId("build-status")).toHaveTextContent("Simulated");
    expect(screen.getByTestId("build-output")).not.toHaveTextContent("[HHIP]");
    const compileStep = within(screen.getByTestId("firmware-steps")).getByText("Compile").closest("li")!;
    expect(compileStep).toHaveAttribute("data-simulated", "true");
    fireEvent.click(screen.getByRole("tab", { name: "Memory" }));
    expect(screen.getByTestId("memory-panel")).toHaveTextContent("Estimates: the build was simulated");
    expect(screen.getByTestId("memory-panel")).toHaveTextContent("1.0 KB of 32 KB");
  });

  it("shows a real build as Compiled", async () => {
    await startProject();
    api.queueFirmwareBuild.mockResolvedValue({ job_id: "j1", job_type: "build", status: "queued" });
    api.getBackgroundJob.mockResolvedValue({ job_id: "j1", job_type: "build", status: "succeeded", result: { success: true, dry_run: false, logs: ["Sketch uses 924 bytes"] } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Compile/ }));
    });
    expect(await screen.findByTestId("build-status")).toHaveTextContent("Compiled");
    expect(screen.queryByTestId("simulated-build-note")).toBeNull();
  });

  it("never says a dry-run upload flashed the board", async () => {
    await startProject();
    api.uploadFirmware.mockResolvedValue({ success: true, dry_run: true, verified: true, reset: true });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^Upload$/ }));
    });
    const panel = screen.getByTestId("upload-progress");
    expect(panel).toHaveAttribute("data-outcome", "simulated");
    expect(panel).toHaveTextContent("Simulated: no board was flashed.");
    expect(panel).not.toHaveTextContent(/Verified · board reset/);
    // A blank port goes to the server as "auto", not a made-up COM3.
    expect(api.uploadFirmware).toHaveBeenCalledWith({ project_id: "fw_1", port: undefined });
  });

  it("says a real upload flashed the board", async () => {
    await startProject();
    api.uploadFirmware.mockResolvedValue({ success: true, dry_run: false });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^Upload$/ }));
    });
    expect(screen.getByTestId("upload-progress")).toHaveAttribute("data-outcome", "flashed");
  });
});

describe("Firmware page: running it", () => {
  it("opens the starter in the Engineering Lab on the same board, wired up", async () => {
    await startProject();
    expect(screen.getByTestId("try-in-lab")).toHaveTextContent("Opens an Arduino Uno wired to LED");
    fireEvent.click(screen.getByRole("button", { name: /Try it in the lab/ }));
    const session = useLab.getState().sessions[0];
    expect(session.name).toBe("My first sketch (from Firmware)");
    expect(session.nodes.map((n) => n.partId)).toEqual(["arduino-uno", "led"]);
    expect(session.wires.length).toBeGreaterThan(0);
    expect(push).toHaveBeenCalledWith(`/laboratory/workspace?session=${session.id}`);
  });

  it("maps every starter to a lab build, putting Wi-Fi starters on an ESP32", () => {
    for (const id of Object.keys(STARTERS)) expect(labBuildFor("arduino-uno", id).board, id).toBeTruthy();
    expect(labBuildFor("arduino-uno", "wifi").board).toBe("esp32");
    expect(labBuildFor("esp8266", "mqtt").board).toBe("esp8266");
    expect(labBuildFor("nrf52", "blink").board).toBe("arduino-uno");
    expect(boardName("nrf52")).toBe("Nordic nRF52840");
  });

  it("reads a board on this computer over Web Serial", async () => {
    const chunks = [new TextEncoder().encode("Temp: 24.5 C\r\nHum"), new TextEncoder().encode(": 61 %\n")];
    let i = 0;
    const port = {
      open: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      getInfo: () => ({ usbVendorId: 0x2341 }),
      readable: {
        getReader: () => ({
          read: () => (i < chunks.length ? Promise.resolve({ value: chunks[i++], done: false }) : new Promise(() => undefined)),
          releaseLock: () => undefined,
          cancel: () => Promise.resolve(),
        }),
      },
      writable: null,
    };
    vi.stubGlobal("navigator", { ...navigator, serial: { requestPort: vi.fn().mockResolvedValue(port) } });
    render(<FirmwareStudio />);
    fireEvent.click(screen.getByRole("tab", { name: "Serial monitor" }));
    expect(screen.getByRole("radio", { name: "My board (USB)" })).toHaveAttribute("aria-checked", "true");
    await act(async () => {
      fireEvent.click(screen.getByTestId("usb-connect"));
    });
    expect(port.open).toHaveBeenCalledWith({ baudRate: 9600 });
    expect(await screen.findByTestId("usb-note")).toHaveTextContent("Connected to Arduino at 9600 baud");
    await waitFor(() => expect(screen.getByTestId("serial-lines")).toHaveTextContent("Temp: 24.5 C"));
    expect(screen.getByTestId("serial-lines")).toHaveTextContent("Hum: 61 %");
  });

  it("says plainly when the browser can't read USB boards", () => {
    render(<FirmwareStudio />);
    fireEvent.click(screen.getByRole("tab", { name: "Serial monitor" }));
    fireEvent.click(screen.getByRole("radio", { name: "My board (USB)" }));
    expect(screen.getByTestId("usb-unsupported")).toHaveTextContent("Chrome");
  });
});
