import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { HybridPanel, MODES } from "@/components/hybrid/hybrid-panel";
import { api } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({
  api: {
    createHybridExperiment: vi.fn(),
    startHybridExperiment: vi.fn(),
    advanceHybridExperiment: vi.fn(),
    stopHybridExperiment: vi.fn(),
  },
}));

const hit = (component_id: string, name: string) => ({ component: { component_id, name, category: "sensor" }, score: 1, compatible_controllers: ["esp32"] }) as never;
const controllers = [{ controller_id: "esp32", name: "ESP32", family: "Espressif" } as never];
const hits = [hit("dht22", "DHT22"), hit("led", "LED"), hit("relay", "Relay"), hit("pir", "PIR sensor")];

beforeEach(() => vi.clearAllMocks());

describe("HybridPanel", () => {
  it("explains the four device modes and lays the work out in steps", () => {
    render(<HybridPanel controllers={controllers} componentHits={hits} />);
    expect(screen.getByRole("heading", { name: "Create a hybrid experiment" })).toBeInTheDocument();
    for (const m of MODES) expect(screen.getAllByText(m.label).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Name it and pick the board" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Choose parts and how each one joins" })).toBeInTheDocument();
    expect(screen.getByText("Hardware Availability")).toBeInTheDocument();
    expect(screen.getByText("Hybrid Circuit")).toBeInTheDocument();
    expect(screen.getByText("3 chosen:")).toBeInTheDocument();
  });

  it("filters parts, and creates, starts, steps and stops an experiment, showing availability by name", async () => {
    vi.mocked(api.createHybridExperiment).mockResolvedValue({
      experiment_id: "hx1",
      name: "Hybrid Greenhouse",
      controller_id: "esp32",
      status: "created",
      component_ids: ["dht22", "led", "relay"],
      hardware_availability: { virtual: [{ component_id: "dht22", available: true }], physical: [], simulated: [], hybrid: [], missing: [{ component_id: "led", mode: "physical" }] },
      missing_components: ["led"],
    } as never);
    vi.mocked(api.startHybridExperiment).mockResolvedValue({ status: "running", state: {} });
    vi.mocked(api.stopHybridExperiment).mockResolvedValue({ status: "stopped", state: {} });
    render(<HybridPanel controllers={controllers} componentHits={hits} />);
    fireEvent.change(screen.getByPlaceholderText("Filter parts"), { target: { value: "pir" } });
    expect(within(screen.getByRole("list", { name: "Parts" })).getAllByRole("listitem")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /Create Hybrid Experiment/ }));
    expect(await screen.findByText("Ready to start")).toBeInTheDocument();
    expect(api.createHybridExperiment).toHaveBeenCalledWith(expect.objectContaining({ component_ids: ["dht22", "led", "relay"], device_modes: { dht22: "virtual", led: "physical", relay: "simulated" } }));
    expect(screen.getByText("DHT22")).toBeInTheDocument();
    expect(screen.getByText(/^LED\. Connect them/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Start/ }));
    expect(await screen.findByText("Running")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Stop/ }));
    await waitFor(() => expect(screen.getByText("Stopped")).toBeInTheDocument());
  });

  it("shows a plain message, without technical details, when something fails", async () => {
    vi.mocked(api.createHybridExperiment).mockRejectedValue(new Error("API /hybrid/create failed: 502 Bad Gateway"));
    render(<HybridPanel controllers={controllers} componentHits={hits} />);
    fireEvent.click(screen.getByRole("button", { name: /Create Hybrid Experiment/ }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("The experiment couldn't be created. Check your connection and try again.");
    expect(alert.textContent).not.toMatch(/API|502|Gateway/);
  });

  it("says when the hardware service is unavailable and points to the Engineering Lab", () => {
    render(<HybridPanel controllers={[]} componentHits={[]} />);
    expect(screen.getByTestId("hybrid-offline")).toHaveTextContent("The hardware service isn't available right now");
    expect(screen.getByRole("link", { name: /Open the Engineering Lab/ })).toHaveAttribute("href", "/laboratory/workspace");
    expect(screen.getByRole("button", { name: /Create Hybrid Experiment/ })).toBeDisabled();
  });
});

describe("Hybrid API client", () => {
  it("exposes hybrid methods", async () => {
    const { api } = await import("@/lib/api-client");
    expect(typeof api.createHybridExperiment).toBe("function");
    expect(typeof api.startHybridExperiment).toBe("function");
    expect(typeof api.advanceHybridExperiment).toBe("function");
    expect(typeof api.stopHybridExperiment).toBe("function");
  });
});
