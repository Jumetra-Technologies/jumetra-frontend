import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppInfo, AuthState, PrivacyChoices, UpdateInfo } from "@kiungo/api";
import { SETTINGS_GROUPS, SettingsPage } from "../src/renderer/src/settings/SettingsPage";
import { PRIVACY_POLICY_URL } from "../src/renderer/src/settings/PrivacySettings";
import type { UpdateControls } from "../src/renderer/src/update/useUpdate";

const signedOut: AuthState = { status: "signed-out", message: null, canSkip: true, skipped: true };
const signedIn: AuthState = { status: "signed-in", user: { id: "u1", email: "ada@example.test", name: "Ada Lovelace", photoUrl: null }, deviceName: "Ada's laptop", offline: false, secureStorage: true };
const info: AppInfo = { appVersion: "0.13.14", platform: "win32", arch: "x64", versions: { electron: "44.9.3", chrome: "140", node: "22" } };

function updateControls(state: UpdateInfo["state"]): UpdateControls {
  return { info: { currentVersion: "0.13.14", channel: "stable", state }, asked: false, refused: null, later: null, check: vi.fn(), install: vi.fn(async () => ({ ok: true as const })), dismiss: vi.fn(), putOff: vi.fn() };
}

let invoke: ReturnType<typeof vi.fn>;
/** What the account says about usage counting; a function so a test can make it fail. */
let account: () => Promise<PrivacyChoices>;

beforeEach(() => {
  account = async () => ({ usage: null, decidedAt: null });
  invoke = vi.fn(async (channel: string, ...args: unknown[]) => {
    if (channel === "privacy:get") return account();
    if (channel === "privacy:set-usage") return { usage: args[0] as boolean, decidedAt: "2026-11-13T08:00:00Z" };
    return undefined;
  });
  (window as unknown as { kiungo: unknown }).kiungo = { invoke, on: vi.fn() };
});

function page(over: Partial<Parameters<typeof SettingsPage>[0]> = {}) {
  const props = { auth: signedIn, appearance: "system" as const, onAppearance: vi.fn(), update: updateControls({ status: "idle" } as UpdateInfo["state"]), info, ...over };
  render(<SettingsPage {...props} />);
  return props;
}

describe("Settings: four groups, nothing that doesn't work", () => {
  it("has only Account, Appearance, Privacy and About, in that order, on one page", async () => {
    page();
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(["Account", "Appearance", "Privacy", "About"]);
    expect(SETTINGS_GROUPS).toEqual(["Account", "Appearance", "Privacy", "About"]);
    // No side menu of sections any more.
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    await waitFor(() => expect(invoke).toHaveBeenCalledWith("privacy:get"));
  });

  it("the removed pages are gone, and so is every placeholder toggle", () => {
    page();
    const text = screen.getByTestId("settings-page").textContent ?? "";
    for (const removed of ["Institution", "Company", "Notifications", "AI Assistant", "Firmware", "Hardware", "Simulation", "Projects", "Preferences", "Roles", "Workspace", "Collaboration", "Marketplace"]) expect(text, removed).not.toContain(removed);
    expect(text).not.toMatch(/Not yet saved|aren't wired/);
  });
});

describe("Account", () => {
  it("shows the profile and how it's signed in, with Switch account and Sign out", () => {
    page();
    const profile = screen.getByTestId("settings-profile");
    expect(profile).toHaveTextContent("Ada Lovelace");
    expect(profile).toHaveTextContent("ada@example.test");
    expect(screen.getByText(/On Ada's laptop/)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("settings-sign-out"));
    expect(invoke).toHaveBeenCalledWith("auth:sign-out");
    expect(screen.getByTestId("settings-switch-account")).toBeInTheDocument();
  });

  it("signed out: one way to sign in", () => {
    page({ auth: signedOut });
    expect(screen.queryByTestId("settings-profile")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("settings-sign-in"));
    expect(invoke).toHaveBeenCalledWith("auth:sign-in");
  });
});

describe("Appearance", () => {
  it("changes the theme at once", () => {
    const props = page();
    fireEvent.click(within(screen.getByTestId("settings-group-appearance")).getByRole("radio", { name: /Dark/ }));
    expect(props.onAppearance).toHaveBeenCalledWith("dark");
  });
});

describe("Privacy: usage counting, saved on the account", () => {
  const toggle = () => screen.getByRole("switch", { name: "Count how I use Kiungo" });

  it("shows the account's answer and saves a change", async () => {
    account = async () => ({ usage: false, decidedAt: "2026-11-01T10:00:00Z" });
    page();
    await waitFor(() => expect(toggle()).not.toBeDisabled());
    expect(toggle()).toHaveAttribute("aria-checked", "false");
    expect(screen.getByTestId("settings-usage")).toHaveTextContent("Off: nothing is counted.");
    await act(async () => {
      fireEvent.click(toggle());
    });
    expect(invoke).toHaveBeenCalledWith("privacy:set-usage", true);
    expect(toggle()).toHaveAttribute("aria-checked", "true");
    expect(screen.getByTestId("settings-usage")).toHaveTextContent(/never what's in it/);
    expect(screen.getByTestId("settings-usage")).toHaveTextContent(/Turning it off deletes what was counted/);
  });

  it("never asked: off, and says nothing is counted", async () => {
    page();
    await waitFor(() => expect(toggle()).not.toBeDisabled());
    expect(toggle()).toHaveAttribute("aria-checked", "false");
    expect(screen.getByTestId("settings-usage")).toHaveTextContent("Not chosen yet, so nothing is counted.");
  });

  it("signed out: nothing to choose, and the account isn't asked", () => {
    page({ auth: signedOut });
    expect(toggle()).toBeDisabled();
    expect(screen.getByTestId("settings-usage")).toHaveTextContent("Signed out, nothing is counted.");
    expect(invoke).not.toHaveBeenCalledWith("privacy:get");
  });

  it("offline: says why and offers to try again", async () => {
    account = async () => {
      throw new Error("Kiungo's servers can't be reached. Check the internet connection.");
    };
    page();
    await screen.findByTestId("settings-usage-retry");
    expect(screen.getByTestId("settings-usage")).toHaveTextContent("can't be reached");
    account = async () => ({ usage: true, decidedAt: null });
    await act(async () => {
      fireEvent.click(screen.getByTestId("settings-usage-retry"));
    });
    await waitFor(() => expect(toggle()).toHaveAttribute("aria-checked", "true"));
  });

  it("a save that fails says so and leaves the switch as it was", async () => {
    page();
    await waitFor(() => expect(toggle()).not.toBeDisabled());
    invoke.mockImplementationOnce(async () => {
      throw new Error("Kiungo's servers answered 503.");
    });
    await act(async () => {
      fireEvent.click(toggle());
    });
    expect(screen.getByRole("alert")).toHaveTextContent("503");
    expect(toggle()).toHaveAttribute("aria-checked", "false");
  });

  it("links the privacy policy, which opens in the browser", () => {
    page();
    const link = screen.getByRole("link", { name: "Read it" });
    expect(link).toHaveAttribute("href", PRIVACY_POLICY_URL);
    expect(link).toHaveAttribute("target", "_blank");
  });
});

describe("About, with updates, at the bottom", () => {
  it("shows the version and platform, and checks for updates", () => {
    const props = page();
    const about = screen.getByTestId("settings-group-about");
    expect(within(about).getByTestId("settings-version")).toHaveTextContent("Kiungo 0.13.14");
    expect(about).toHaveTextContent("Windows · x64");
    fireEvent.click(within(about).getByTestId("settings-update-check"));
    expect(props.update!.check).toHaveBeenCalled();
  });

  it("offers the update once it's downloaded", () => {
    page({ update: updateControls({ status: "ready", version: "0.13.15" } as UpdateInfo["state"]) });
    expect(screen.getByTestId("settings-update-install")).toHaveTextContent("Update to 0.13.15");
  });
});
