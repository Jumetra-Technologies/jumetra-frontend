import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, fireEvent, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import { HybridPanel, MODES } from "@/components/hybrid/hybrid-panel";
import { closeAccountDialog, useAccountDialog } from "@/lib/account-dialogs";
import { ApiError, api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";

vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api-client")>()),
  api: {
    createHybridExperiment: vi.fn(),
    startHybridExperiment: vi.fn(),
    advanceHybridExperiment: vi.fn(),
    stopHybridExperiment: vi.fn(),
    getControllers: vi.fn(),
    searchComponents: vi.fn(),
  },
}));

const hit = (component_id: string, name: string) => ({ component: { component_id, name, category: "sensor" }, score: 1, compatible_controllers: ["esp32"] }) as never;
const controllers = [{ controller_id: "esp32", name: "ESP32", family: "Espressif" } as never];
const hits = [hit("dht22", "DHT22"), hit("led", "LED"), hit("relay", "Relay"), hit("pir", "PIR sensor")];

beforeEach(() => {
  vi.clearAllMocks();
  // Signed in unless a test says otherwise: creating and running an experiment is for an account.
  useAuthStore.setState({ isAuthenticated: true, isLoading: false, user: { id: "u1", email: "ada@school.ac.ke", display_name: "Ada" } as never, accessToken: "t" });
});

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
    expect(api.createHybridExperiment).toHaveBeenCalledWith(expect.objectContaining({ component_ids: ["dht22", "led", "relay"], device_modes: { dht22: "virtual", led: "physical", relay: "virtual" } }));
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

  it("signed out, the whole page works for planning and says up front that running an experiment needs an account", async () => {
    useAuthStore.setState({ isAuthenticated: false, isLoading: false, user: null, accessToken: null });
    vi.mocked(api.createHybridExperiment).mockRejectedValue(new ApiError("/hybrid/experiments", 401));
    render(<HybridPanel controllers={controllers} componentHits={hits} />);
    // Boards, parts and modes can all be chosen without an account.
    fireEvent.click(screen.getByRole("checkbox", { name: "PIR sensor" }));
    expect(screen.getByText("4 chosen:")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create Hybrid Experiment/ })).toBeEnabled();
    expect(screen.getByTestId("hybrid-sign-in")).toHaveTextContent("which needs an account");

    // Creating one anyway says why it didn't happen, with the way to sign in beside it.
    fireEvent.click(screen.getByRole("button", { name: /Create Hybrid Experiment/ }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Sign in to create and run one.");
    expect(alert.textContent).not.toMatch(/API|401|server/i);
    fireEvent.click(within(alert).getByRole("button", { name: "Sign in" }));
    const { result } = renderHook(() => useAccountDialog());
    expect(result.current).toEqual({ kind: "auth", mode: "login" });
    act(() => closeAccountDialog());
  });

  it("signed in, there is no note about accounts", () => {
    render(<HybridPanel controllers={controllers} componentHits={hits} />);
    expect(screen.queryByTestId("hybrid-sign-in")).not.toBeInTheDocument();
  });

  it("says when the hardware service is unavailable and points to the Engineering Lab", () => {
    render(<HybridPanel controllers={[]} componentHits={[]} />);
    expect(screen.getByTestId("hybrid-offline")).toHaveTextContent("The hardware service isn't available right now");
    expect(screen.getByRole("link", { name: /Open the Engineering Lab/ })).toHaveAttribute("href", "/laboratory/workspace");
    expect(screen.getByRole("button", { name: /Create Hybrid Experiment/ })).toBeDisabled();
  });
});

describe("When the hardware service can't be reached", () => {
  it("still lists the boards and parts to plan with, and says experiments wait", () => {
    render(<HybridPanel controllers={controllers} componentHits={hits} serviceOnline={false} />);
    expect(screen.getByTestId("hybrid-waiting")).toHaveTextContent("Experiments can't run right now");
    expect(screen.queryByTestId("hybrid-offline")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "LED" }));
    expect(screen.getByRole("button", { name: /Create Hybrid Experiment/ })).toBeDisabled();
    expect(screen.getByText(/Creating an experiment needs the hardware service/)).toBeInTheDocument();
    expect(api.createHybridExperiment).not.toHaveBeenCalled();
  });

  it("the page falls back to the built-in catalog, and uses the service's when it answers", async () => {
    const { default: HybridPage } = await import("@/app/hybrid/page");
    const { builtInComponents, builtInControllers } = await import("@/lib/hybrid/catalog");
    const panelProps = (tree: unknown): Record<string, unknown> => {
      const kids = (tree as { props: { children: unknown[] } }).props.children;
      return (kids.find((k) => (k as { type?: unknown })?.type === HybridPanel) as { props: Record<string, unknown> }).props;
    };

    vi.mocked(api.getControllers).mockRejectedValue(new Error("API /controllers failed: 404 Not Found"));
    vi.mocked(api.searchComponents).mockRejectedValue(new Error("API /components/search failed: 404 Not Found"));
    const down = panelProps(await HybridPage());
    expect(down).toMatchObject({ controllers: builtInControllers, componentHits: builtInComponents, serviceOnline: false });

    vi.mocked(api.getControllers).mockResolvedValue(controllers as never);
    vi.mocked(api.searchComponents).mockResolvedValue(hits as never);
    const up = panelProps(await HybridPage());
    expect(up).toMatchObject({ controllers, componentHits: hits, serviceOnline: true });
  });

  it("the built-in catalog has the boards and parts the service offers", async () => {
    const { builtInComponents, builtInControllers } = await import("@/lib/hybrid/catalog");
    const boards = new Set(builtInControllers.map((c) => c.controller_id));
    expect(boards).toEqual(new Set(["arduino-mega", "arduino-uno", "esp32", "esp8266", "raspberry-pi-pico", "stm32"]));
    expect(builtInComponents.length).toBeGreaterThanOrEqual(30);
    for (const hit of builtInComponents) {
      expect(hit.component.component_id && hit.component.name).toBeTruthy();
      expect(Array.isArray(hit.compatible_controllers)).toBe(true);
    }
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
