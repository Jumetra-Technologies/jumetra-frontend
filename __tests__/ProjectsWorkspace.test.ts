import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api-client";
import {
  createProject,
  deleteProject,
  deleteRecord,
  isUnsavedProject,
  listRecords,
  movedProjectId,
  resetProjectsWorkspace,
  saveRecord,
  saveUnsaved,
  setProjectsAccount,
  updateProject,
} from "@/lib/projects/workspace";
import { readRoboticsData, type ExperimentRecord, type NewProject, type RoboticsProject } from "@/lib/robotics-data";
import { useLab } from "@kiungo/lab/store";
import { freshLab } from "./helpers/lab";

/**
 * Projects and experiment records work without an account: made signed out
 * they are unsaved and live in memory, and signing in saves them.
 */

const rover: NewProject = { name: "Line rover", description: "Follows a line", objectives: "Finish the course", contributors: "", category: "robotics", hardware: ["Arduino Uno"], teammates: [] };
const record = (projectId: string) => ({ projectId, title: "First run", objective: "Stay on the line", hardware: ["Arduino Uno"], procedure: "One lap", observations: "Drifts left", results: "Finished", notes: "" });

let serverIds = 0;
const onAccount = (input: NewProject): RoboticsProject => ({ ...input, id: `user-project-${++serverIds}`, createdAt: "2026-11-11T08:00:00.000Z", updatedAt: "2026-11-11T08:00:00.000Z" });
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  serverIds = 0;
  freshLab("acct-1");
  resetProjectsWorkspace();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("signed out", () => {
  it("makes a project that works in full and never reaches the server", async () => {
    const create = vi.spyOn(api, "createMyProject");
    const project = await createProject(rover);
    expect(isUnsavedProject(project.id)).toBe(true);
    expect(readRoboticsData().projects).toEqual([project]);

    const changed = await updateProject({ ...project, name: "Line rover 2" });
    expect(readRoboticsData().projects[0].name).toBe("Line rover 2");
    expect(changed.updatedAt >= project.updatedAt).toBe(true);

    const first = await saveRecord(record(project.id));
    await saveRecord({ ...record(project.id), title: "First run, again" }, first);
    expect((await listRecords(project.id)).map((r) => r.title)).toEqual(["First run, again"]);
    await deleteRecord(first);
    expect(await listRecords(project.id)).toEqual([]);

    await deleteProject(project.id);
    expect(readRoboticsData().projects).toEqual([]);
    expect(create).not.toHaveBeenCalled();
  });

  it("leaves teammates out: they are other accounts", async () => {
    const project = await createProject({ ...rover, teammates: [{ id: "u2", display_name: "Brian", email: "brian@school.ac.ke" }] });
    expect(project.teammates).toEqual([]);
  });

  it("unlinks a deleted project's lab sessions and keeps the sessions", async () => {
    const project = await createProject(rover);
    useLab.getState().hydrate();
    const session = useLab.getState().createSession({ name: "Bench", projectId: project.id });
    await deleteProject(project.id);
    expect(useLab.getState().sessions.find((s) => s.id === session.id)?.projectId).toBeNull();
  });
});

describe("signing in", () => {
  it("saves what was made signed out to the account, with its records, and points its lab sessions at the saved project", async () => {
    const project = await createProject(rover);
    await saveRecord(record(project.id));
    useLab.getState().hydrate();
    const session = useLab.getState().createSession({ name: "Bench", projectId: project.id });

    const create = vi.spyOn(api, "createMyProject").mockImplementation(async (input) => onAccount(input));
    const createRecord = vi.spyOn(api, "createMyProjectExperiment").mockImplementation(async (projectId, input) => ({ ...input, projectId, id: "server-record-1", createdAt: "", updatedAt: "" }) as ExperimentRecord);
    vi.spyOn(api, "getMyProjects").mockImplementation(async () => [onAccount({ ...rover, name: "Already there" }), { ...onAccount(rover), id: "user-project-1" }]);

    setProjectsAccount("acct-1");
    await vi.waitFor(() => expect(readRoboticsData().projects.map((p) => p.name).sort()).toEqual(["Already there", "Line rover"]));

    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ name: "Line rover", hardware: ["Arduino Uno"] }));
    expect(createRecord).toHaveBeenCalledWith("user-project-1", expect.objectContaining({ title: "First run" }));
    expect(movedProjectId(project.id)).toBe("user-project-1");
    expect(readRoboticsData().projects.some((p) => isUnsavedProject(p.id))).toBe(false);
    expect(readRoboticsData().experiments).toEqual([]);
    expect(useLab.getState().sessions.find((s) => s.id === session.id)?.projectId).toBe("user-project-1");
  });

  it("keeps a project unsaved when the account can't be reached, and saves it on the next try", async () => {
    const project = await createProject(rover);
    const create = vi.spyOn(api, "createMyProject").mockRejectedValueOnce(new TypeError("Failed to fetch")).mockImplementation(async (input) => onAccount(input));
    vi.spyOn(api, "getMyProjects").mockResolvedValue([]);

    setProjectsAccount("acct-1");
    await vi.waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    await settle();
    expect(readRoboticsData().projects.map((p) => p.id)).toEqual([project.id]);

    await saveUnsaved();
    expect(create).toHaveBeenCalledTimes(2);
    expect(readRoboticsData().projects.map((p) => p.id)).toEqual(["user-project-1"]);
  });

  it("keeps a record that didn't save with its project, and shows it with the project's saved ones", async () => {
    const project = await createProject(rover);
    await saveRecord(record(project.id));
    vi.spyOn(api, "createMyProject").mockImplementation(async (input) => onAccount(input));
    const createRecord = vi.spyOn(api, "createMyProjectExperiment").mockRejectedValue(new TypeError("Failed to fetch"));
    vi.spyOn(api, "getMyProjects").mockImplementation(async () => [{ ...onAccount(rover), id: "user-project-1" }]);
    vi.spyOn(api, "getMyProjectExperiments").mockResolvedValue([]);

    setProjectsAccount("acct-1");
    await vi.waitFor(() => expect(createRecord).toHaveBeenCalled());
    await settle();
    expect(readRoboticsData().experiments.map((r) => r.projectId)).toEqual(["user-project-1"]);
    expect((await listRecords("user-project-1")).map((r) => r.title)).toEqual(["First run"]);
  });

  it("creates on the account once signed in", async () => {
    vi.spyOn(api, "getMyProjects").mockResolvedValue([]);
    setProjectsAccount("acct-1");
    const create = vi.spyOn(api, "createMyProject").mockImplementation(async (input) => onAccount(input));
    const project = await createProject(rover);
    expect(create).toHaveBeenCalledTimes(1);
    expect(isUnsavedProject(project.id)).toBe(false);
  });
});

describe("signing out", () => {
  it("shows nothing of the account that left, and nothing of it to the next one", async () => {
    vi.spyOn(api, "getMyProjects").mockImplementation(async () => [{ ...onAccount(rover), id: "user-project-9" }]);
    setProjectsAccount("acct-1");
    await vi.waitFor(() => expect(readRoboticsData().projects).toHaveLength(1));

    setProjectsAccount(null);
    expect(readRoboticsData().projects).toEqual([]);

    const create = vi.spyOn(api, "createMyProject");
    vi.spyOn(api, "getMyProjects").mockResolvedValue([]);
    setProjectsAccount("acct-2");
    await settle();
    expect(create).not.toHaveBeenCalled();
    expect(readRoboticsData().projects).toEqual([]);
  });
});
