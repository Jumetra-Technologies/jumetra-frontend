import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RoadmapPage from "@/app/docs/roadmap/page";
import { GOALS, HISTORY, PHASES, RENAME } from "@/lib/roadmap";
import { getArticle } from "@/lib/learning";

describe("Roadmap", () => {
  it("defines three phases, each serving named goals, with milestones and exit criteria", () => {
    expect(PHASES.map((p) => p.name)).toEqual(["Phase One: Web platform", "Phase Two: Desktop and real hardware", "Phase Three: Classrooms and clubs"]);
    const goalIds = new Set(GOALS.map((g) => g.id));
    for (const phase of PHASES) {
      expect(phase.goals.length).toBeGreaterThan(0);
      expect(phase.goals.every((g) => goalIds.has(g))).toBe(true);
      expect(phase.milestones.length).toBeGreaterThan(0);
      expect(phase.exit.length).toBeGreaterThan(0);
    }
    // Every goal is served by at least one phase.
    for (const g of goalIds) expect(PHASES.some((p) => p.goals.includes(g))).toBe(true);
    // One phase is in progress at a time.
    expect(PHASES.filter((p) => p.status === "active")).toHaveLength(1);
  });

  it("records when HHIP became Kiungo", () => {
    expect(RENAME).toMatchObject({ from: "HHIP", to: "Kiungo", version: "v1.1.0", date: "2026-10-09", pullRequest: 11 });
    expect(HISTORY.find((h) => h.version === RENAME.version)?.text).toMatch(/HHIP becomes Kiungo.*#11/);
    expect(JSON.stringify(getArticle("system-overview", "what-is-kiungo"))).toMatch(/renamed on 9 October 2026 in v1\.1\.0/);
  });

  it("renders the goals, phases, and the rename in the history", () => {
    render(<RoadmapPage />);
    expect(screen.getByRole("heading", { name: "Roadmap and development phases" })).toBeInTheDocument();
    expect(screen.getAllByTestId("roadmap-phase")).toHaveLength(3);
    for (const g of GOALS) expect(screen.getAllByText(g.title).length).toBeGreaterThan(0);
    expect(within(screen.getByTestId("history-rename")).getByText(/HHIP becomes Kiungo/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Documentation" })).toHaveAttribute("href", "/docs");
  });

  it("keeps the Development phases article in step with the roadmap", () => {
    const text = JSON.stringify(getArticle("system-overview", "development-phases"));
    for (const p of PHASES) expect(text).toContain(p.name.split(": ")[1]);
  });
});
