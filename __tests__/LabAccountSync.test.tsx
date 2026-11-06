import { act, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { newSession } from "@kiungo/core/lab/session";
import { setLabOwner, useLab } from "@kiungo/lab/store";
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
