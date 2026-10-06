import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "@/components/ui/badge";
import { MetricTiles } from "@/components/charts/charts";

describe("Badge", () => {
  it("renders label", () => {
    render(<Badge>adaptive</Badge>);
    expect(screen.getByText("adaptive")).toBeInTheDocument();
  });

  it("applies success variant", () => {
    render(<Badge variant="success">connected</Badge>);
    expect(screen.getByText("connected")).toHaveClass("bg-emerald-100");
  });
});

describe("MetricTiles", () => {
  it("renders metric items", () => {
    render(
      <MetricTiles
        items={[
          { label: "Active Experiments", value: "2", hint: "2 total" },
          { label: "Devices", value: "3" },
        ]}
      />,
    );
    expect(screen.getByText("Active Experiments")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Devices")).toBeInTheDocument();
  });
});

describe("API client", () => {
  it("exposes platform control methods", async () => {
    const { api } = await import("@/lib/api-client");
    expect(typeof api.startExperiment).toBe("function");
    expect(typeof api.getProjects).toBe("function");
    expect(typeof api.getExperimentStatus).toBe("function");
  });
});

describe("WebSocket client", () => {
  it("builds ws url from api base", async () => {
    const { getWsUrl } = await import("@/lib/api-client");
    expect(getWsUrl()).toContain("/ws/events");
  });
});

describe("Live panel exports", () => {
  it("exports LiveOperationsPanel", async () => {
    const mod = await import("@/components/live/live-panel");
    expect(mod.LiveOperationsPanel).toBeDefined();
  });
});
