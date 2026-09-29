import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ExperimentJournal } from "@/components/experiments/ExperimentJournal";
import { ProjectHub } from "@/components/projects/ProjectHub";
import {
  createProjectRecord,
  readRoboticsData,
  ROBOTICS_DATA_KEY,
  writeRoboticsData,
} from "@/lib/robotics-data";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("robotics project workflows", () => {
  it("creates a project with its objectives and hardware list", () => {
    render(<ProjectHub serverProjects={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "New project" }));

    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Project name"), { target: { value: "Inspection rover" } });
    fireEvent.change(within(dialog).getByLabelText("Objectives"), { target: { value: "Inspect indoor aisles" } });
    fireEvent.change(within(dialog).getByLabelText("Hardware"), { target: { value: "ESP32, wheel encoders" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create project" }));

    expect(screen.getByRole("heading", { name: "Inspection rover" })).toBeInTheDocument();
    expect(readRoboticsData().projects[0].hardware).toEqual(["ESP32", "wheel encoders"]);
    expect(readRoboticsData().projects[0].contributors).toBe("");
    expect(window.localStorage.getItem(ROBOTICS_DATA_KEY)).toContain("Inspect indoor aisles");
  });

  it("requires a teammate name or email only when the switch is on", () => {
    render(<ProjectHub serverProjects={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "New project" }));

    const dialog = screen.getByRole("dialog");
    const teammateSwitch = within(dialog).getByRole("switch", { name: "Add a teammate" });
    expect(teammateSwitch).toHaveAttribute("aria-checked", "false");
    expect(within(dialog).queryByLabelText("Teammate name or email")).not.toBeInTheDocument();

    fireEvent.click(teammateSwitch);
    const teammateInput = within(dialog).getByLabelText("Teammate name or email");
    expect(teammateInput).toBeRequired();
    fireEvent.change(within(dialog).getByLabelText("Project name"), { target: { value: "Assistive rover" } });
    fireEvent.change(teammateInput, { target: { value: "robotics@example.com" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create project" }));

    expect(readRoboticsData().projects[0].contributors).toBe("robotics@example.com");
  });

  it("records a structured experiment linked to a robotics project", () => {
    const project = createProjectRecord({
      name: "Inspection rover",
      description: "",
      objectives: "Inspect indoor aisles",
      contributors: "",
      category: "robotics",
      hardware: ["ESP32"],
    });
    writeRoboticsData({ projects: [project], experiments: [] });
    render(<ExperimentJournal simulationRuns={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Record experiment" }));

    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Title"), { target: { value: "Encoder repeatability" } });
    fireEvent.change(within(dialog).getByLabelText("Project"), { target: { value: project.id } });
    fireEvent.change(within(dialog).getByLabelText("Objective"), { target: { value: "Measure wheel distance error" } });
    fireEvent.change(within(dialog).getByLabelText("Hardware"), { target: { value: "Wheel encoders, ruler" } });
    fireEvent.change(within(dialog).getByLabelText("Procedure"), { target: { value: "Drive a measured 1 m path" } });
    fireEvent.change(within(dialog).getByLabelText("Observations"), { target: { value: "Left wheel leads by 2 cm" } });
    fireEvent.change(within(dialog).getByLabelText("Results"), { target: { value: "Calibration needed" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save experiment" }));

    expect(screen.getByText("Encoder repeatability")).toBeInTheDocument();
    expect(readRoboticsData().experiments[0]).toMatchObject({
      projectId: project.id,
      objective: "Measure wheel distance error",
      procedure: "Drive a measured 1 m path",
      observations: "Left wheel leads by 2 cm",
      results: "Calibration needed",
      hardware: ["Wheel encoders", "ruler"],
    });
  });
});