import { act, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectsAccountSync, hasUnsavedWork } from "@/components/projects/ProjectsAccountSync";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { createProject, resetProjectsWorkspace } from "@/lib/projects/workspace";
import { readRoboticsData, type NewProject, type RoboticsProject } from "@/lib/robotics-data";
import { setLabOwner, useLab } from "@kiungo/lab/store";

/**
 * Mounted once for the whole app (app/layout.tsx): it keeps projects with the
 * signed-in account, and stops a signed-out visitor losing work by accident.
 */

const rover: NewProject = { name: "Line rover", description: "", objectives: "", contributors: "", category: "robotics", hardware: [], teammates: [] };
const user = { id: "acct-1", email: "ada@example.test", display_name: "Ada" } as never;

/** Close or reload the tab; true when the browser would ask "Leave site?" first. */
function leaving(): boolean {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

beforeEach(() => {
  setLabOwner(null);
  window.localStorage.clear();
  useLab.setState({ hydrated: false, sessions: [], activeId: null, past: [], future: [], saveError: false, cloudSaveState: "idle" });
  useAuthStore.setState({ user: null, accessToken: null, isAuthenticated: false, isLoading: false, error: null });
  resetProjectsWorkspace();
});

afterEach(() => {
  vi.restoreAllMocks();
  useAuthStore.setState({ user: null, accessToken: null, isAuthenticated: false });
});

describe("leaving the page signed out", () => {
  it("isn't interrupted when nothing was made: the blank session the lab opens with doesn't count", () => {
    render(<ProjectsAccountSync />);
    act(() => {
      useLab.getState().hydrate();
      useLab.getState().createSession({ name: "My first lab" });
    });
    expect(hasUnsavedWork(false)).toBe(false);
    expect(leaving()).toBe(false);
  });

  it("asks first when there is a circuit, a project or an experiment record that would be lost", async () => {
    render(<ProjectsAccountSync />);
    act(() => {
      useLab.getState().hydrate();
      useLab.getState().createSession({ name: "Blink" });
      useLab.getState().addNode("arduino-uno");
    });
    expect(leaving()).toBe(true);

    act(() => useLab.setState({ sessions: [], activeId: null }));
    expect(leaving()).toBe(false);

    await act(async () => {
      await createProject(rover);
    });
    expect(leaving()).toBe(true);
  });
});

describe("signed in", () => {
  it("doesn't interrupt leaving: lab sessions and projects are saved to the account", async () => {
    vi.spyOn(api, "getMyProjects").mockResolvedValue([{ ...rover, id: "user-project-7", createdAt: "", updatedAt: "" } as RoboticsProject]);
    render(<ProjectsAccountSync />);
    act(() => useAuthStore.setState({ user, accessToken: "t", isAuthenticated: true }));
    act(() => {
      useLab.getState().hydrate();
      useLab.getState().createSession({ name: "Blink" });
      useLab.getState().addNode("arduino-uno");
    });
    await waitFor(() => expect(readRoboticsData().projects).toHaveLength(1));
    expect(leaving()).toBe(false);
  });

  it("signing in on any page saves the projects made signed out, and then leaving is free", async () => {
    render(<ProjectsAccountSync />);
    await act(async () => {
      await createProject(rover);
    });
    const saved = { ...rover, id: "user-project-1", createdAt: "", updatedAt: "" } as RoboticsProject;
    const create = vi.spyOn(api, "createMyProject").mockResolvedValue(saved);
    vi.spyOn(api, "getMyProjects").mockResolvedValue([saved]);
    act(() => useAuthStore.setState({ user, accessToken: "t", isAuthenticated: true }));
    await waitFor(() => expect(create).toHaveBeenCalledWith(expect.objectContaining({ name: "Line rover" })));
    await waitFor(() => expect(readRoboticsData().projects.map((project) => project.id)).toEqual(["user-project-1"]));
    expect(leaving()).toBe(false);
  });

  it("still asks before leaving while something made signed out couldn't be saved to the account", async () => {
    render(<ProjectsAccountSync />);
    await act(async () => {
      await createProject(rover);
    });
    vi.spyOn(api, "createMyProject").mockRejectedValue(new TypeError("Failed to fetch"));
    const list = vi.spyOn(api, "getMyProjects").mockResolvedValue([]);
    act(() => useAuthStore.setState({ user, accessToken: "t", isAuthenticated: true }));
    await waitFor(() => expect(list).toHaveBeenCalled());
    expect(leaving()).toBe(true);
  });
});
