import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SimulationPanel } from "@/components/laboratory/simulation-panel";

vi.mock("@/lib/api-client", () => ({
  api: {
    getSimulation: vi.fn().mockResolvedValue({
      laboratory_id: "LABTEST01",
      state: "created",
      behaviors: [],
    }),
    startLaboratory: vi.fn(),
    pauseSimulation: vi.fn(),
    stopSimulation: vi.fn(),
    advanceSimulation: vi.fn(),
    sendActuatorCommand: vi.fn(),
  },
}));

describe("SimulationPanel", () => {
  it("renders simulation controls", () => {
    render(
      <SimulationPanel
        laboratoryId="LABTEST01"
        initialLab={{
          laboratory_id: "LABTEST01",
          name: "Test Lab",
          controller_id: "esp32",
          component_ids: ["dht11", "led"],
        }}
      />,
    );
    expect(screen.getByText("Simulation Controls")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Advance +100ms" })).toBeInTheDocument();
    expect(screen.getByText("Live Component State")).toBeInTheDocument();
    expect(screen.getByText("Sensor Charts")).toBeInTheDocument();
    expect(screen.getByText("Animated Circuit")).toBeInTheDocument();
  });
});

describe("Simulation API client", () => {
  it("exposes simulation methods", async () => {
    const { api } = await import("@/lib/api-client");
    expect(typeof api.getSimulation).toBe("function");
    expect(typeof api.advanceSimulation).toBe("function");
    expect(typeof api.sendActuatorCommand).toBe("function");
  });
});

describe("Animated circuit canvas", () => {
  it("exports AnimatedCircuitCanvas", async () => {
    const mod = await import("@/components/laboratory/animated-circuit-canvas");
    expect(mod.AnimatedCircuitCanvas).toBeDefined();
  });
});
