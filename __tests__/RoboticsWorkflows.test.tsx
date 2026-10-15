import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectHub } from "@/components/projects/ProjectHub";
import { api } from "@/lib/api-client";
import { closeAccountDialog, useAccountDialog } from "@/lib/account-dialogs";
import { useAuthStore } from "@/lib/auth-store";
import { EMPTY_ROBOTICS_DATA, writeRoboticsData, type RoboticsProject } from "@/lib/robotics-data";
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
  writeRoboticsData(EMPTY_ROBOTICS_DATA);
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

  it("asks a signed-out visitor to sign in instead of creating anything", async () => {
    const create = vi.spyOn(api, "createMyProject");
    const dialog = await openCreate();
    fireEvent.change(within(dialog).getByLabelText("Project name"), { target: { value: "Rover" } });
    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: "Create project" }));
    });
    expect(create).not.toHaveBeenCalled();
    const { result } = renderHook(() => useAccountDialog());
    expect(result.current).toEqual({ kind: "auth", mode: "login" });
    act(() => closeAccountDialog());
  });
});
