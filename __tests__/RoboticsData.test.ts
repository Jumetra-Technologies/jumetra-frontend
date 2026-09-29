import { afterEach, describe, expect, it } from "vitest";
import {
  createExperimentRecord,
  createProjectRecord,
  formatExperimentReport,
  readRoboticsData,
  ROBOTICS_DATA_KEY,
  writeRoboticsData,
} from "@/lib/robotics-data";

afterEach(() => {
  window.localStorage.clear();
});

describe("robotics workspace data", () => {
  it("creates timestamped project and experiment records", () => {
    const now = "2026-09-29T12:00:00.000Z";
    const project = createProjectRecord(
      {
        name: "Rover",
        description: "Indoor mobile robot",
        objectives: "Map the lab",
        contributors: "Robotics team",
        category: "robotics",
        hardware: ["ESP32"],
      },
      now,
    );
    const experiment = createExperimentRecord(
      {
        projectId: project.id,
        title: "Range sensor check",
        objective: "Confirm distance readings",
        hardware: ["HC-SR04"],
        procedure: "Sample at three distances",
        observations: "Stable after 20 cm",
        results: "Within expected tolerance",
        notes: "Bench test",
      },
      now,
    );

    expect(project.id).toMatch(/^local-project-/);
    expect(experiment.projectId).toBe(project.id);
    expect(experiment.createdAt).toBe(now);
  });

  it("persists valid data and tolerates malformed stored data", () => {
    const data = {
      projects: [
        createProjectRecord({
          name: "Rover",
          description: "",
          objectives: "",
          contributors: "",
          category: "robotics",
          hardware: [],
        }),
      ],
      experiments: [],
    };

    expect(writeRoboticsData(data)).toBe(true);
    expect(readRoboticsData()).toEqual(data);

    window.localStorage.setItem(ROBOTICS_DATA_KEY, "not-json");
    expect(readRoboticsData()).toEqual({ projects: [], experiments: [] });
  });

  it("formats a self-contained experiment report", () => {
    const project = createProjectRecord({
      name: "Rover",
      description: "",
      objectives: "",
      contributors: "",
      category: "robotics",
      hardware: [],
    });
    const experiment = createExperimentRecord({
      projectId: project.id,
      title: "Drive test",
      objective: "Test wheel control",
      hardware: ["Motor driver"],
      procedure: "Run at 50%",
      observations: "Tracks straight",
      results: "Pass",
      notes: "",
    });

    const report = formatExperimentReport(experiment, project);
    expect(report).toContain("# Drive test");
    expect(report).toContain("Project: Rover");
    expect(report).toContain("## Observations\nTracks straight");
  });
});