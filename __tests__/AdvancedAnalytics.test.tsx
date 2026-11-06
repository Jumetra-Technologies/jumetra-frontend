import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { newSession } from "@kiungo/core/lab/session";
import { setLabOwner, useLab } from "@kiungo/lab/store";
import { AdvancedAnalytics } from "@/components/analytics/AdvancedAnalytics";
import type { CommunityStats } from "@/lib/analytics/community";
import { useAuthStore } from "@/lib/auth-store";

const breakdown = (rows: Array<[string, number]>) => ({ rows: rows.map(([key, count]) => ({ key, count, people: 12 })), other: null });

const STATS: CommunityStats = {
  generated_at: "2026-11-05T11:00:00Z",
  totals: { builders: 15, active_builders_30d: 9, projects: 33, lab_sessions: 37, experiments: 5, parts_placed: 191, wires: 240, runs: 76, faults_fixed: 40, simulated_hours: 11.8, modules_completed: 41 },
  parts: breakdown([["arduino-uno", 35]]),
  project_hardware: breakdown([]),
  categories: breakdown([["robotics", 17]]),
  modes: breakdown([]),
  monthly: Array.from({ length: 12 }, (_, i) => ({
    month: `2026-${String(i + 1).padStart(2, "0")}`,
    projects: 2,
    lab_sessions: 3,
    projects_to_date: 2 * (i + 1),
    lab_sessions_to_date: 3 * (i + 1),
    builders: i > 8 ? 10 : null,
  })),
  privacy: { min_group: 10, cache_seconds: 600 },
};

function answer(status: number, body?: unknown) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })));
}

beforeEach(() => {
  window.localStorage.clear();
  setLabOwner(null);
  useLab.setState({ hydrated: false, sessions: [], activeId: null, past: [], future: [], saveError: false });
  useAuthStore.setState({ user: null, accessToken: null, isAuthenticated: false, isLoading: false, error: null });
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({ matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Advanced Analytics page", () => {
  it("shows a new visitor where to start, and the community's figures", async () => {
    answer(200, STATS);
    render(<AdvancedAnalytics />);

    expect(screen.getByTestId("analytics-signin")).toBeInTheDocument();
    expect(await screen.findByTestId("analytics-start")).toBeInTheDocument();
    const community = await screen.findByTestId("analytics-community");
    expect(await within(community).findByText("33")).toBeInTheDocument();
    expect(within(community).getByText("Arduino Uno")).toBeInTheDocument();
  });

  it("counts this browser's lab sessions and says plainly when community figures aren't available", async () => {
    answer(404);
    const session = { ...newSession({ name: "Blink" }), log: [{ id: "l1", at: new Date().toISOString(), kind: "run" as const, text: "Run started" }] };
    useLab.setState({ hydrated: true, sessions: [session], activeId: session.id });
    render(<AdvancedAnalytics />);

    expect(screen.queryByTestId("analytics-start")).not.toBeInTheDocument();
    expect(await screen.findByText(/once the community service is switched on/)).toBeInTheDocument();
    // One hole per day, and today's run is on the board.
    expect(screen.getAllByRole("gridcell").some((cell) => /1 run/.test(cell.getAttribute("aria-label") ?? ""))).toBe(true);
  });
});
