import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExperimentJournal } from "@/components/experiments/ExperimentJournal";
import { api } from "@/lib/api-client";
import type { ExperimentRecord, RoboticsProject } from "@/lib/robotics-data";

const project: RoboticsProject = {
  id: "project-1",
  name: "Inspection rover",
  description: "",
  objectives: "Inspect indoor aisles",
  contributors: "",
  category: "robotics",
  hardware: ["ESP32"],
  teammates: [],
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

const record: ExperimentRecord = {
  id: "record-1",
  projectId: project.id,
  title: "Wheel encoder test",
  objective: "Check odometry accuracy",
  hardware: ["ESP32"],
  procedure: "Run the rover for one meter",
  observations: "Stable readings",
  results: "Within tolerance",
  notes: "",
  createdAt: "2025-01-02T00:00:00.000Z",
  updatedAt: "2025-01-02T00:00:00.000Z",
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ExperimentJournal", () => {
  it("loads account projects and records without requiring the legacy experiments endpoint", async () => {
    vi.spyOn(api, "getMyProjects").mockResolvedValue([project]);
    vi.spyOn(api, "getMyProjectExperiments").mockResolvedValue([record]);
    const getExperiments = vi.spyOn(api, "getExperiments").mockRejectedValue(
      new Error("Legacy endpoint is unavailable"),
    );

    render(<ExperimentJournal simulationRuns={[]} />);

    expect(await screen.findByRole("heading", { name: record.title })).toBeInTheDocument();
    expect(screen.getByText(/Inspection rover · Updated/)).toBeInTheDocument();
    expect(api.getMyProjectExperiments).toHaveBeenCalledWith(project.id);
    expect(getExperiments).not.toHaveBeenCalled();
    expect(screen.queryByText("Your projects and experiment records couldn't be loaded.")).not.toBeInTheDocument();
  });
});
