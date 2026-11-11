import { act, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { newSession } from "@kiungo/core/lab/session";
import { labKeyFor, setLabOwner, useLab } from "@kiungo/lab/store";
import { LabAccountSync } from "@/components/lab/LabAccountSync";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";

const user = { id: "acct-sync", email: "brad@example.test", display_name: "Brad" } as never;

beforeEach(() => {
  setLabOwner(null);
  window.localStorage.clear();
  useLab.setState({ hydrated: false, sessions: [], activeId: null, past: [], future: [], saveError: false, cloudSaveState: "idle" });
  useAuthStore.setState({ user: null, accessToken: null, isAuthenticated: false, isLoading: false, error: null });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("LabAccountSync", () => {
  it("keeps the account's sessions when a page loads the lab after they arrive", async () => {
    // Signing in on a browser that has never seen these sessions, on a page that doesn't open the lab.
    const remote = [newSession({ name: "Rover chassis" }), newSession({ name: "Arm joints" })];
    vi.spyOn(api, "getMyLabSessions").mockResolvedValue(remote);
    const deleted = vi.spyOn(api, "deleteMyLabSession").mockResolvedValue({ deleted: true });
    vi.spyOn(api, "saveMyLabSession").mockImplementation(async (s) => s);

    render(<LabAccountSync />);
    act(() => useAuthStore.setState({ user, accessToken: "tok", isAuthenticated: true }));
    await waitFor(() => expect(useLab.getState().sessions).toHaveLength(2));

    // Then going to the lab, Projects or Analytics, which load the lab if nobody has.
    act(() => {
      if (!useLab.getState().hydrated) useLab.getState().hydrate();
    });
    await new Promise((r) => setTimeout(r, 700));

    expect(useLab.getState().sessions.map((s) => s.name).sort()).toEqual(["Arm joints", "Rover chassis"]);
    expect(deleted).not.toHaveBeenCalled();
  });

  it("signing in keeps what was built signed out: it becomes the account's and is saved there", async () => {
    // Signed out, in the lab: a session with a part on it, one started for a project, and a blank one nobody touched.
    render(<LabAccountSync />);
    act(() => useLab.getState().hydrate());
    let built = "";
    let forProject = "";
    act(() => {
      useLab.getState().createSession({ name: "Empty" });
      forProject = useLab.getState().createSession({ name: "Rover lab", projectId: "local-project-1" }).id;
      built = useLab.getState().createSession({ name: "Blink on a breadboard" }).id;
      useLab.getState().addNode("arduino-uno");
    });
    expect(window.localStorage.length).toBe(0);

    const onAccount = newSession({ name: "From another computer" });
    vi.spyOn(api, "getMyLabSessions").mockResolvedValue([onAccount]);
    const saved = vi.spyOn(api, "saveMyLabSession").mockImplementation(async (s) => s);
    act(() => useAuthStore.setState({ user, accessToken: "tok", isAuthenticated: true }));

    // The session that was open stays open, joined by the account's own; the blank one is left behind.
    await waitFor(() => expect(useLab.getState().sessions.map((s) => s.name).sort()).toEqual(["Blink on a breadboard", "From another computer", "Rover lab"]));
    expect(useLab.getState().activeId).toBe(built);
    await waitFor(() => expect(saved).toHaveBeenCalledWith(expect.objectContaining({ id: built, name: "Blink on a breadboard" })));
    // A session started for a project comes along with no parts yet: the project it belongs to is saved too.
    await waitFor(() => expect(saved).toHaveBeenCalledWith(expect.objectContaining({ id: forProject, projectId: "local-project-1" })));
    expect(saved).toHaveBeenCalledTimes(2);
    expect(JSON.parse(window.localStorage.getItem(labKeyFor("acct-sync"))!).sessions.map((s: { id: string }) => s.id)).toContain(built);
  });

  it("signing out shows nothing of the account, and a second person signing in gets none of it", async () => {
    const mine = newSession({ name: "Brad's rover" });
    vi.spyOn(api, "getMyLabSessions").mockResolvedValueOnce([mine]).mockResolvedValue([]);
    vi.spyOn(api, "saveMyLabSession").mockImplementation(async (s) => s);
    render(<LabAccountSync />);
    act(() => useLab.getState().hydrate());
    act(() => useAuthStore.setState({ user, accessToken: "tok", isAuthenticated: true }));
    await waitFor(() => expect(useLab.getState().sessions).toHaveLength(1));

    act(() => useAuthStore.setState({ user: null, accessToken: null, isAuthenticated: false }));
    expect(useLab.getState().sessions).toEqual([]);

    act(() => useAuthStore.setState({ user: { id: "acct-other", email: "ada@example.test", display_name: "Ada" } as never, accessToken: "tok2", isAuthenticated: true }));
    await new Promise((r) => setTimeout(r, 50));
    expect(useLab.getState().sessions).toEqual([]);
  });

  it("still deletes a session the person deletes", async () => {
    const remote = [newSession({ name: "Keep" }), newSession({ name: "Bin" })];
    vi.spyOn(api, "getMyLabSessions").mockResolvedValue(remote);
    const deleted = vi.spyOn(api, "deleteMyLabSession").mockResolvedValue({ deleted: true });
    vi.spyOn(api, "saveMyLabSession").mockImplementation(async (s) => s);

    render(<LabAccountSync />);
    act(() => useAuthStore.setState({ user, accessToken: "tok", isAuthenticated: true }));
    await waitFor(() => expect(useLab.getState().sessions).toHaveLength(2));

    act(() => useLab.getState().deleteSession(remote[1].id));
    await waitFor(() => expect(deleted).toHaveBeenCalledWith(remote[1].id));
    expect(deleted).toHaveBeenCalledTimes(1);
  });
});
