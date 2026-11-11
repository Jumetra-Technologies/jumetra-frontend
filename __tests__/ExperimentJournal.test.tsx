import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExperimentJournal } from "@/components/experiments/ExperimentJournal";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { createProject, resetProjectsWorkspace, saveRecord } from "@/lib/projects/workspace";
import { readRoboticsData, type ExperimentRecord, type RoboticsProject } from "@/lib/robotics-data";
import { freshLab } from "./helpers/lab";

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

beforeEach(() => {
  freshLab("u1");
  resetProjectsWorkspace();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useAuthStore.setState({ isAuthenticated: false, user: null, accessToken: null });
});

describe("ExperimentJournal", () => {
  it("loads account projects and records without requiring the legacy experiments endpoint", async () => {
    useAuthStore.setState({ isAuthenticated: true, isLoading: false, user: { id: "u1", email: "ada@school.ac.ke", display_name: "Ada" } as never, accessToken: "t" });
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

  it("works signed out: records an experiment for an unsaved project, without the server, and says it isn't saved", async () => {
    const listProjects = vi.spyOn(api, "getMyProjects");
    const createRecord = vi.spyOn(api, "createMyProjectExperiment");
    const unsaved = await createProject({ name: "Line rover", description: "", objectives: "", contributors: "", category: "robotics", hardware: ["Arduino Uno"], teammates: [] });

    render(<ExperimentJournal simulationRuns={[]} />);
    expect(await screen.findByTestId("experiments-sign-in")).toHaveTextContent("they aren't saved");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Record experiment" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/title/i), { target: { value: "First lap" } });
    await act(async () => {
      fireEvent.submit(dialog.querySelector("form")!);
    });

    expect(await screen.findByRole("heading", { name: "First lap" })).toBeInTheDocument();
    expect(screen.getByText(/Line rover · Updated/)).toBeInTheDocument();
    expect(readRoboticsData().experiments).toEqual([expect.objectContaining({ title: "First lap", projectId: unsaved.id })]);
    expect(listProjects).not.toHaveBeenCalled();
    expect(createRecord).not.toHaveBeenCalled();
  });

  it("signed out with no project yet, it points to making one instead of showing an error", async () => {
    render(<ExperimentJournal simulationRuns={[]} />);
    expect(await screen.findByRole("link", { name: "Create a project first" })).toHaveAttribute("href", "/workspace?new=1");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record experiment" })).toBeDisabled();
  });

  it("signing in keeps the records on screen: the project is saved under a new id and a filter on it follows", async () => {
    const unsaved = await createProject({ name: "Line rover", description: "", objectives: "", contributors: "", category: "robotics", hardware: [], teammates: [] });
    await saveRecord({ projectId: unsaved.id, title: "First lap", objective: "Stay on the line", hardware: [], procedure: "", observations: "", results: "", notes: "" });
    render(<ExperimentJournal simulationRuns={[]} />);
    expect(await screen.findByRole("heading", { name: "First lap" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Project"), { target: { value: unsaved.id } });

    const onAccount = { ...unsaved, id: "user-project-5" };
    const savedRecord = { ...record, id: "experiment-1", projectId: onAccount.id, title: "First lap" };
    vi.spyOn(api, "createMyProject").mockResolvedValue(onAccount);
    const createRecord = vi.spyOn(api, "createMyProjectExperiment").mockResolvedValue(savedRecord);
    vi.spyOn(api, "getMyProjects").mockResolvedValue([onAccount]);
    vi.spyOn(api, "getMyProjectExperiments").mockResolvedValue([savedRecord]);
    await act(async () => {
      useAuthStore.setState({ isAuthenticated: true, isLoading: false, user: { id: "u1", email: "ada@school.ac.ke", display_name: "Ada" } as never, accessToken: "t" });
    });

    expect(await screen.findByText("Records are saved to your account")).toBeInTheDocument();
    expect(createRecord).toHaveBeenCalledWith("user-project-5", expect.objectContaining({ title: "First lap" }));
    await waitFor(() => expect(screen.getByLabelText("Project")).toHaveValue("user-project-5"));
    expect(await screen.findByRole("heading", { name: "First lap" })).toBeInTheDocument();
    expect(screen.queryByTestId("experiments-sign-in")).not.toBeInTheDocument();
    expect(readRoboticsData().experiments).toEqual([]);
  });

  it("signing out takes the account's records off the page at once", async () => {
    useAuthStore.setState({ isAuthenticated: true, isLoading: false, user: { id: "u1", email: "ada@school.ac.ke", display_name: "Ada" } as never, accessToken: "t" });
    vi.spyOn(api, "getMyProjects").mockResolvedValue([project]);
    vi.spyOn(api, "getMyProjectExperiments").mockResolvedValue([record]);
    render(<ExperimentJournal simulationRuns={[]} />);
    expect(await screen.findByRole("heading", { name: record.title })).toBeInTheDocument();

    act(() => useAuthStore.setState({ isAuthenticated: false, user: null, accessToken: null }));
    expect(screen.queryByRole("heading", { name: record.title })).not.toBeInTheDocument();
    expect(screen.getByTestId("experiments-sign-in")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record experiment" })).toBeDisabled();
  });
});
