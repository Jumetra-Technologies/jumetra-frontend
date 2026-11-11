import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectHub } from "@/components/projects/ProjectHub";
import { api } from "@/lib/api-client";
import { closeAccountDialog, useAccountDialog } from "@/lib/account-dialogs";
import { useAuthStore } from "@/lib/auth-store";
import { isUnsavedProject, resetProjectsWorkspace } from "@/lib/projects/workspace";
import { readRoboticsData, type RoboticsProject } from "@/lib/robotics-data";
import { useLab } from "@kiungo/lab/store";
import { freshLab } from "./helpers/lab";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const now = new Date().toISOString();
const saved = (input: Partial<RoboticsProject>): RoboticsProject => ({
  id: "user-project-1",
  name: "",
  description: "",
  objectives: "",
  contributors: "",
  category: "robotics",
  hardware: [],
  teammates: [],
  createdAt: now,
  updatedAt: now,
  ...input,
});

function signIn() {
  useAuthStore.setState({ isAuthenticated: true, isLoading: false, user: { id: "u1", email: "ada@school.ac.ke", display_name: "Ada" } as never, accessToken: "t" });
}

beforeEach(() => {
  freshLab("u1");
  resetProjectsWorkspace();
  vi.spyOn(api, "getMyProjects").mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useAuthStore.setState({ isAuthenticated: false, user: null, accessToken: null });
});

async function openCreate() {
  render(<ProjectHub serverProjects={[]} />);
  fireEvent.click(await screen.findByRole("button", { name: "New project" }));
  return screen.getByRole("dialog");
}

describe("robotics projects, saved to the account", () => {
  it("creates a project on the account with its objectives and hardware list", async () => {
    signIn();
    const create = vi.spyOn(api, "createMyProject").mockImplementation(async (input) => saved({ ...input, id: "user-project-7" }));
    const dialog = await openCreate();
    fireEvent.change(within(dialog).getByLabelText("Project name"), { target: { value: "Inspection rover" } });
    fireEvent.change(within(dialog).getByLabelText("Objectives"), { target: { value: "Inspect indoor aisles" } });
    fireEvent.change(within(dialog).getByLabelText("Hardware"), { target: { value: "ESP32, wheel encoders\nmotor driver" } });
    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: "Create project" }));
    });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ name: "Inspection rover", objectives: "Inspect indoor aisles", hardware: ["ESP32", "wheel encoders", "motor driver"], contributors: "", teammates: [] }));
    expect(await screen.findByRole("heading", { name: "Inspection rover" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("adds teammates found by search, and saves them with the project", async () => {
    signIn();
    const search = vi.spyOn(api, "searchUsers").mockResolvedValue([{ id: "u2", display_name: "Brian Otieno", email: "brian@school.ac.ke" }] as never);
    const create = vi.spyOn(api, "createMyProject").mockImplementation(async (input) => saved({ ...input }));
    const dialog = await openCreate();
    fireEvent.change(within(dialog).getByLabelText("Project name"), { target: { value: "Assistive rover" } });
    fireEvent.change(within(dialog).getByLabelText("Add teammates"), { target: { value: "br" } });
    await waitFor(() => expect(search).toHaveBeenCalledWith("br"));
    fireEvent.click(await within(dialog).findByRole("button", { name: /Brian Otieno/ }));
    expect(within(within(dialog).getByRole("list", { name: "Selected teammates" })).getByText(/Brian Otieno/)).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: "Create project" }));
    });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ contributors: "Brian Otieno", teammates: [{ id: "u2", display_name: "Brian Otieno", email: "brian@school.ac.ke" }] }));
  });

  it("says plainly when the project wasn't saved, and keeps the form open", async () => {
    signIn();
    vi.spyOn(api, "createMyProject").mockRejectedValue(new Error("boom"));
    const dialog = await openCreate();
    fireEvent.change(within(dialog).getByLabelText("Project name"), { target: { value: "Rover" } });
    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: "Create project" }));
    });
    expect(within(dialog).getByText(/^Your project wasn't saved\. /)).toBeInTheDocument();
    expect(within(dialog).queryByText(/\.\./)).toBeNull();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

});

describe("robotics projects without an account", () => {
  it("shows the page to a signed-out visitor, says nothing is saved, and offers to sign in", async () => {
    render(<ProjectHub serverProjects={[]} />);
    const notice = await screen.findByTestId("projects-sign-in");
    expect(notice).toHaveTextContent("Everything here works, but nothing is saved");
    fireEvent.click(within(notice).getByRole("button", { name: "Sign in to save" }));
    const { result } = renderHook(() => useAccountDialog());
    expect(result.current).toEqual({ kind: "auth", mode: "login" });
    act(() => closeAccountDialog());
    expect(api.getMyProjects).not.toHaveBeenCalled();
  });

  it("creates a project signed out: it works, is marked not saved, and nothing is sent to the server", async () => {
    const create = vi.spyOn(api, "createMyProject");
    const dialog = await openCreate();
    expect(within(dialog).getByTestId("create-unsaved-note")).toHaveTextContent("won't be saved");
    fireEvent.change(within(dialog).getByLabelText("Project name"), { target: { value: "Rover" } });
    fireEvent.change(within(dialog).getByLabelText("Hardware"), { target: { value: "Arduino Uno, L298N" } });
    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: "Create project" }));
    });
    expect(create).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const card = (await screen.findByRole("heading", { name: "Rover" })).closest("a")!;
    expect(within(card).getByText("Not saved")).toBeInTheDocument();
    expect(within(card).getByText("2 hardware items")).toBeInTheDocument();
    const [project] = readRoboticsData().projects;
    expect(isUnsavedProject(project.id)).toBe(true);
    expect(card).toHaveAttribute("href", `/workspace/projects/${project.id}`);
    // Nothing went into the browser's storage either: unsaved means this tab's memory.
    expect(window.localStorage.length).toBe(0);
  });

  it("asks for a sign-in only where one is needed: adding teammates, who are other accounts", async () => {
    const search = vi.spyOn(api, "searchUsers");
    const dialog = await openCreate();
    expect(within(dialog).queryByLabelText("Add teammates")).not.toBeInTheDocument();
    fireEvent.click(within(within(dialog).getByTestId("teammates-sign-in")).getByRole("button", { name: "Sign in" }));
    const { result } = renderHook(() => useAccountDialog());
    expect(result.current).toEqual({ kind: "auth", mode: "login" });
    act(() => closeAccountDialog());
    expect(search).not.toHaveBeenCalled();
  });

  it("starts a lab session without signing in", async () => {
    render(<ProjectHub serverProjects={[]} />);
    fireEvent.click(await screen.findByTestId("new-lab-session"));
    expect(useLab.getState().sessions).toHaveLength(1);
    const { result } = renderHook(() => useAccountDialog());
    expect(result.current).toBeNull();
  });

  it("signing in saves the unsaved project to the account, and the card stops saying not saved", async () => {
    const dialog = await openCreate();
    fireEvent.change(within(dialog).getByLabelText("Project name"), { target: { value: "Rover" } });
    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: "Create project" }));
    });
    expect(within((await screen.findByRole("heading", { name: "Rover" })).closest("a")!).getByText("Not saved")).toBeInTheDocument();

    const create = vi.spyOn(api, "createMyProject").mockImplementation(async (input) => saved({ ...input, id: "user-project-3" }));
    vi.spyOn(api, "getMyProjects").mockImplementation(async () => [saved({ name: "Rover", id: "user-project-3" })]);
    await act(async () => {
      signIn();
    });
    await waitFor(() => expect(create).toHaveBeenCalledWith(expect.objectContaining({ name: "Rover" })));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Rover" }).closest("a")).toHaveAttribute("href", "/workspace/projects/user-project-3"));
    expect(screen.queryByTestId("projects-sign-in")).not.toBeInTheDocument();
    expect(within(screen.getByRole("heading", { name: "Rover" }).closest("a")!).queryByText("Not saved")).not.toBeInTheDocument();
  });
});
