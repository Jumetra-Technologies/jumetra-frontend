import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { ArchitectureExplorer } from "@/components/architecture/ArchitectureExplorer";
import { SystemBoard } from "@/components/architecture/SystemBoard";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { BOARD_LAYOUTS, relationshipTrace, type BoardLayoutId } from "@/lib/architecture/geometry";
import {
  DATA_FLOWS,
  LAYERS,
  RELATIONSHIPS,
  VIEWS,
  findRelationship,
  layerPresence,
  relationshipPresence,
  relationshipsFor,
} from "@/lib/architecture/model";
import { getArticle } from "@/lib/learning";

const STATIC_ROUTES = new Set(NAV_ITEMS.map((item) => item.href));

function routeExists(href: string): boolean {
  if (STATIC_ROUTES.has(href)) return true;
  const parts = href.split("/").filter(Boolean);
  return parts[0] === "docs" && parts.length === 3 && Boolean(getArticle(parts[1], parts[2]));
}

describe("architecture model", () => {
  it("has the five layers from the spec, each with unique ids", () => {
    expect(LAYERS.map((layer) => layer.name)).toEqual([
      "Web Platform",
      "Desktop Application",
      "Communication Layer",
      "Virtual Hardware",
      "Physical Hardware",
    ]);
    expect(new Set(LAYERS.map((layer) => layer.id)).size).toBe(LAYERS.length);
  });

  it("connects every layer to at least two others", () => {
    for (const layer of LAYERS) {
      expect(relationshipsFor(layer.id).length, layer.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("links only to pages that exist", () => {
    const hrefs = LAYERS.flatMap((layer) => layer.code.links ?? []).map((link) => link.href);
    expect(hrefs.filter((href) => !routeExists(href))).toEqual([]);
  });

  it("routes every data-flow step along a real relationship", () => {
    for (const flow of DATA_FLOWS) {
      expect(VIEWS.some((view) => view.id === flow.view), flow.id).toBe(true);
      for (const step of flow.steps) {
        if (step.kind === "edge") {
          expect(findRelationship(step.from, step.to), `${flow.id}: ${step.from} -> ${step.to}`).toBeDefined();
        }
      }
    }
  });

  it("reports travel direction against a relationship's order", () => {
    expect(findRelationship("web", "comm")?.reversed).toBe(false);
    expect(findRelationship("comm", "web")?.reversed).toBe(true);
    expect(findRelationship("web", "physical")).toBeUndefined();
  });

  it("shows only the web platform in Phase One and everything in Phase Two", () => {
    for (const layer of LAYERS) {
      expect(layerPresence("phase1", layer)).toBe(layer.id === "web" ? "active" : "planned");
      expect(layerPresence("phase2", layer)).toBe("active");
    }
    for (const relationship of RELATIONSHIPS) {
      expect(relationshipPresence("phase1", relationship)).toBe("planned");
      expect(relationshipPresence("phase2", relationship)).toBe("active");
    }
  });

  it("matches the code today: desktop not started, backend layers prototyped", () => {
    const presence = Object.fromEntries(LAYERS.map((layer) => [layer.id, layerPresence("now", layer)]));
    expect(presence).toEqual({
      web: "active",
      desktop: "planned",
      comm: "partial",
      virtual: "partial",
      physical: "partial",
    });
  });
});

describe("board geometry", () => {
  const layouts = Object.keys(BOARD_LAYOUTS) as BoardLayoutId[];

  it.each(layouts)("keeps %s nodes inside the board and apart from each other", (id) => {
    const layout = BOARD_LAYOUTS[id];
    const rects = Object.values(layout.nodes);
    for (const rect of rects) {
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.y).toBeGreaterThanOrEqual(6); // room for pin legs
      expect(rect.x + rect.w).toBeLessThanOrEqual(layout.width);
      expect(rect.y + rect.h).toBeLessThanOrEqual(layout.height - 6);
    }
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i];
        const b = rects[j];
        const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        expect(overlap).toBe(false);
      }
    }
  });

  it.each(layouts)("draws every %s trace as a straight horizontal or vertical run", (id) => {
    for (const relationship of RELATIONSHIPS) {
      const [start, end] = relationshipTrace(BOARD_LAYOUTS[id], relationship);
      expect(start.x === end.x || start.y === end.y, relationship.id).toBe(true);
      expect(Math.hypot(end.x - start.x, end.y - start.y), relationship.id).toBeGreaterThan(20);
    }
  });
});

describe("SystemBoard", () => {
  it("renders each layer as a selectable button", () => {
    const onSelect = vi.fn();
    render(<SystemBoard layout="wide" view="now" selected="web" focus={{ layers: [], relationships: [] }} onSelect={onSelect} />);

    const web = screen.getByRole("button", { name: "Web Platform: Live" });
    expect(web).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: /Physical Hardware/ }));
    expect(onSelect).toHaveBeenCalledWith("physical");

    fireEvent.keyDown(screen.getByRole("button", { name: /Virtual Hardware/ }), { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith("virtual");
  });

  it("draws planned layers differently in Phase One", () => {
    const { container } = render(
      <SystemBoard layout="narrow" view="phase1" selected={null} focus={{ layers: [], relationships: [] }} onSelect={() => {}} />,
    );
    expect(container.querySelector('[data-layer="web"]')).toHaveAttribute("data-presence", "active");
    expect(container.querySelector('[data-layer="desktop"]')).toHaveAttribute("data-presence", "planned");
  });

  it("animates a signal only on the relationship carrying data", () => {
    const { container } = render(
      <SystemBoard
        layout="wide"
        view="now"
        selected={null}
        focus={{ layers: ["comm", "physical"], relationships: ["comm-physical"], signal: { id: "comm-physical", reversed: false } }}
        onSelect={() => {}}
      />,
    );
    const signals = container.querySelectorAll("[data-signal]");
    expect(signals).toHaveLength(1);
    expect(signals[0].closest("[data-relationship]")).toHaveAttribute("data-relationship", "comm-physical");
  });
});

describe("ArchitectureExplorer", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const details = () => screen.getByRole("complementary", { name: "Details" });

  it("opens on the web platform as the code stands today", () => {
    render(<ArchitectureExplorer />);
    expect(screen.getByRole("radio", { name: /In the code now/ })).toHaveAttribute("aria-checked", "true");
    expect(within(details()).getByRole("heading", { name: "Web Platform" })).toBeInTheDocument();
  });

  it("moves between layers from the Connected to list", () => {
    render(<ArchitectureExplorer />);
    fireEvent.click(within(details()).getByRole("button", { name: /Communication Layer/ }));
    expect(within(details()).getByRole("heading", { name: "Communication Layer" })).toBeInTheDocument();
    expect(within(details()).getByText("/ws/hardware")).toBeInTheDocument();
  });

  it("switches the stage with the arrow keys", () => {
    render(<ArchitectureExplorer />);
    const now = screen.getByRole("radio", { name: /In the code now/ });
    fireEvent.keyDown(now, { key: "ArrowLeft" });
    expect(screen.getByRole("radio", { name: /Phase One/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText(/The web platform on its own/)).toBeInTheDocument();
  });

  it("steps through a data flow", () => {
    render(<ArchitectureExplorer />);
    fireEvent.click(screen.getByRole("tab", { name: "Data flows" }));
    expect(screen.getByText("Step 1 of 5")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Step 2 of 5")).toBeInTheDocument();
    const current = within(details()).getAllByRole("button").find((button) => button.getAttribute("aria-current") === "step");
    expect(current).toHaveTextContent("simulation/advance");
  });

  it("jumps to Phase Two for the planned desktop journey", () => {
    render(<ArchitectureExplorer />);
    fireEvent.click(screen.getByRole("tab", { name: "Data flows" }));
    fireEvent.click(screen.getByRole("button", { name: /Work offline on the desktop/ }));
    expect(screen.getByRole("radio", { name: /Phase Two/ })).toHaveAttribute("aria-checked", "true");
  });

  it("plays a flow to the end and offers a replay", () => {
    vi.useFakeTimers();
    render(<ArchitectureExplorer />);
    fireEvent.click(screen.getByRole("tab", { name: "Data flows" }));
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(20_000);
    });
    expect(screen.getByText("Step 5 of 5")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Replay" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Replay" }));
    expect(screen.getByText("Step 1 of 5")).toBeInTheDocument();
  });

  it("returns to the layer view when a board layer is clicked during a flow", () => {
    render(<ArchitectureExplorer />);
    fireEvent.click(screen.getByRole("tab", { name: "Data flows" }));
    const [boardPhysical] = screen.getAllByRole("button", { name: /^Physical Hardware:/ });
    fireEvent.click(boardPhysical);
    expect(screen.getByRole("tab", { name: "Layers" })).toHaveAttribute("aria-selected", "true");
    expect(within(details()).getByRole("heading", { name: "Physical Hardware" })).toBeInTheDocument();
  });
});
