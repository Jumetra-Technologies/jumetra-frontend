import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SimulationToolbar } from "@/components/workspace/Toolbar/SimulationToolbar";
import { PropertyInspector } from "@/components/workspace/Inspector/PropertyInspector";
import { DeviceManagerPanel } from "@/components/workspace/Simulation/DeviceManagerPanel";
import { SerialMonitor } from "@/components/workspace/Monitors/SerialMonitor";
import { LogicAnalyzer } from "@/components/workspace/Monitors/LogicAnalyzer";
import { WireEditor } from "@/components/workspace/Wire/WireEditor";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useSelectionStore } from "@/stores/selection-store";

vi.mock("@/lib/api-client", () => ({
  api: {
    runEngineeringWorkspace: vi.fn(),
    pauseEngineeringWorkspace: vi.fn(),
    stepEngineeringWorkspace: vi.fn(),
    resetEngineeringWorkspace: vi.fn(),
    undoWorkspace: vi.fn(),
    redoWorkspace: vi.fn(),
    updateWorkspaceNode: vi.fn(),
    getEngineeringWorkspaceState: vi.fn(),
    deleteWorkspaceWires: vi.fn(),
    sendWorkspaceSerial: vi.fn(),
    createEngineeringWorkspace: vi.fn(),
    getWorkspaceCatalog: vi.fn(),
  },
}));

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  useWorkspaceStore.setState({ nodes: [], wires: [], workspaceId: null, name: "Untitled" });
  useSelectionStore.setState({ selectedIds: [], clipboard: [] });
});

describe("SimulationToolbar", () => {
  it("renders run pause step controls", () => {
    render(<SimulationToolbar workspaceId="WS1" />);
    expect(screen.getByRole("button", { name: "Run" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Step" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Wire Tool" })).toBeInTheDocument();
  });
});

describe("PropertyInspector", () => {
  it("prompts when nothing selected", () => {
    render(<PropertyInspector workspaceId="WS1" />);
    expect(screen.getByText(/Select a component/i)).toBeInTheDocument();
  });

  it("shows properties for selected node", () => {
    useWorkspaceStore.setState({
      nodes: [
        {
          id: "N1",
          component_id: "dht11",
          label: "DHT11",
          category: "sensors",
          position: { x: 0, y: 0 },
          device_mode: "virtual",
          pin_map: {},
          properties: { sampling_interval_ms: 1000 },
          live_state: { temperature_c: 22 },
          available: true,
        },
      ],
      wires: [],
    });
    useSelectionStore.setState({ selectedIds: ["N1"] });
    render(<PropertyInspector workspaceId="WS1" />);
    expect(screen.getAllByText("DHT11").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("tab", { name: /Simulation/i }));
    expect(screen.getByText("Live State")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /Properties/i }));
    expect(screen.getByText("Simulation Parameters")).toBeInTheDocument();
  });
});

describe("DeviceManagerPanel", () => {
  it("renders device modes", () => {
    useWorkspaceStore.setState({
      nodes: [
        {
          id: "N1",
          component_id: "esp32",
          label: "ESP32",
          category: "microcontrollers",
          position: { x: 0, y: 0 },
          device_mode: "virtual",
          pin_map: {},
          properties: {},
          live_state: {},
          available: true,
        },
      ],
    });
    render(<DeviceManagerPanel workspaceId="WS1" />);
    expect(screen.getByText("ESP32")).toBeInTheDocument();
    expect(screen.getByLabelText("physical")).toBeInTheDocument();
    expect(screen.getByLabelText("virtual")).toBeInTheDocument();
  });
});

describe("SerialMonitor", () => {
  it("renders serial UI", () => {
    render(<SerialMonitor workspaceId="WS1" />);
    expect(screen.getByText("Serial Monitor")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Transmit…")).toBeInTheDocument();
  });
});

describe("LogicAnalyzer", () => {
  it("shows empty state", () => {
    render(<LogicAnalyzer />);
    expect(screen.getByText(/Logic Analyzer/i)).toBeInTheDocument();
  });
});

describe("WireEditor", () => {
  it("shows empty wires message", () => {
    render(<WireEditor workspaceId="WS1" />);
    expect(screen.getByText(/Connect pins/i)).toBeInTheDocument();
  });
});

describe("Workspace stores", () => {
  it("exposes zustand workspace store", () => {
    useWorkspaceStore.setState({ workspaceId: "WSX", name: "Test" });
    expect(useWorkspaceStore.getState().workspaceId).toBe("WSX");
  });
});

describe("Engineering workspace API client", () => {
  it("exposes workspace methods", async () => {
    const { api } = await import("@/lib/api-client");
    expect(typeof api.createEngineeringWorkspace).toBe("function");
    expect(typeof api.stepEngineeringWorkspace).toBe("function");
    expect(typeof api.getWorkspaceCatalog).toBe("function");
  });
});
