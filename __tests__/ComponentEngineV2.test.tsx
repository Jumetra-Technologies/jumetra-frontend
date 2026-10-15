import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ComponentBrowser } from "@/components/library/ComponentBrowser";
import { ComponentInspector } from "@/components/library/ComponentInspector";
import { HardwareComponentRenderer } from "@/components/library/HardwareComponentRenderer";

const dht22 = {
  id: "dht22",
  name: "DHT22 Temperature Humidity Sensor",
  category: "sensor",
  manufacturer: "Aosong",
  description: "Temp humidity",
  preview: "/api/components/v2/dht22/renderer.svg",
  pins: [
    { id: "vcc", name: "VCC", type: "POWER", voltage: 3.3, position: { x: 40, y: 0 } },
    { id: "data", name: "DATA", type: "GPIO", voltage: 3.3, position: { x: 140, y: 50 } },
    { id: "gnd", name: "GND", type: "GROUND", voltage: 0, position: { x: 40, y: 100 } },
  ],
  interfaces: ["GPIO"],
  visual: { width: 140, height: 100, renderer: "renderer.svg" },
  simulation: { behavior: "temperature_sensor", supported: true },
  hardware: { physical_supported: true },
};

vi.mock("@/lib/api-client", () => ({
  api: {
    searchComponentsV2: vi.fn(async () => ({ results: [dht22], total: 1 })),
    debugComponentsV2: vi.fn(async () => ({
      total_packages: 17,
      categories: ["sensor"],
      renderers: ["dht22"],
      packages_dir: "/tmp",
      sample: ["dht22"],
    })),
    getComponentV2: vi.fn(async () => ({ ...dht22, datasheet: "# DHT22\n" })),
    getComponentV2RendererUrl: (id: string) => `http://127.0.0.1:8000/components/v2/${id}/renderer.svg`,
  },
}));

afterEach(() => cleanup());

describe("ComponentBrowser v2", () => {
  it("searches and shows results", async () => {
    render(<ComponentBrowser />);
    expect(screen.getByTestId("v2-search-input")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("v2-card-dht22")).toBeInTheDocument());
  });

  it("calls search on input", async () => {
    const { api } = await import("@/lib/api-client");
    render(<ComponentBrowser />);
    fireEvent.change(screen.getByTestId("v2-search-input"), { target: { value: "dht" } });
    await waitFor(() => expect(api.searchComponentsV2).toHaveBeenCalled());
  });

  it("add button fires callback", async () => {
    const onAdd = vi.fn();
    render(<ComponentBrowser onAddToWorkspace={onAdd} />);
    await waitFor(() => screen.getByTestId("v2-add-dht22"));
    fireEvent.click(screen.getByTestId("v2-add-dht22"));
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ id: "dht22" }));
  });
});

describe("HardwareComponentRenderer", () => {
  it("renders preview image and pin handles", () => {
    render(<HardwareComponentRenderer component={dht22} />);
    expect(screen.getByTestId("hw-renderer-dht22")).toBeInTheDocument();
    expect(screen.getByTestId("pin-handle-data")).toBeInTheDocument();
  });
});

describe("ComponentInspector", () => {
  it("loads datasheet panel", async () => {
    render(<ComponentInspector componentId="dht22" />);
    await waitFor(() => expect(screen.getByTestId("component-inspector")).toBeInTheDocument());
    expect(screen.getByText(/Aosong/i)).toBeInTheDocument();
    expect(screen.getByText(/DATA/)).toBeInTheDocument();
  });
});
