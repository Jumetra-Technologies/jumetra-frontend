import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthState, UpdateState } from "@kiungo/api";
import { Header } from "../src/renderer/src/shell/Header";
import { Sidebar } from "../src/renderer/src/shell/Sidebar";
import { useNotifications } from "../src/renderer/src/notifications/useNotifications";
import type { UpdateControls } from "../src/renderer/src/update/useUpdate";

const signedOut: AuthState = {
  status: "signed-out",
  message: null,
  canSkip: true,
  skipped: true,
};
const noCli = { cli: { found: false as const, hint: "not found" }, cores: [] };
const withCli = {
  cli: { found: true as const, version: "1.1.1", path: "/x" },
  cores: [],
};

function controls(state: UpdateState, extra: Partial<UpdateControls> = {}): UpdateControls {
  return {
    info: { currentVersion: "0.13.6", channel: "beta", state },
    asked: false,
    refused: null,
    later: null,
    check: vi.fn(),
    install: vi.fn(async () => ({ ok: true as const })),
    dismiss: vi.fn(),
    putOff: vi.fn(),
    ...extra,
  };
}

function bridge(toolchain: unknown) {
  (window as unknown as { kiungo: unknown }).kiungo = {
    invoke: vi.fn().mockResolvedValue(toolchain),
    on: vi.fn(() => () => undefined),
  };
}

beforeEach(() => {
  localStorage.clear();
  bridge(withCli);
});

describe("what Kiungo notifies about", () => {
  it("nothing made up: a current, set-up copy has no notifications", async () => {
    const { result } = renderHook(() =>
      useNotifications({
        update: controls({ status: "up-to-date", checkedAt: "x" }),
        auth: signedOut,
        onToolchain: vi.fn(),
      }),
    );
    await waitFor(() => expect(localStorage.getItem("kiungo.lastSeenVersion")).toBe("0.13.6"));
    expect(result.current.notices).toEqual([]);
  });

  it("an update ready to install, with Update now that installs it", async () => {
    const update = controls({
      status: "ready",
      version: "0.13.7",
      checkedAt: "x",
    });
    const { result } = renderHook(() => useNotifications({ update, auth: signedOut, onToolchain: vi.fn() }));
    const ready = result.current.notices.find((n) => n.id === "update-ready-0.13.7")!;
    expect(ready.title).toBe("Kiungo 0.13.7 is ready to install");
    expect(ready.action?.label).toBe("Update now");
    await ready.action!.run();
    expect(update.install).toHaveBeenCalledTimes(1);
  });

  it("a missing toolchain, a failed check, being offline, and what's new after an update", async () => {
    bridge(noCli);
    localStorage.setItem("kiungo.lastSeenVersion", "0.13.5");
    const onToolchain = vi.fn();
    const update = controls({
      status: "error",
      message: "No connection.",
      quiet: false,
      checkedAt: null,
    });
    const auth: AuthState = {
      status: "signed-in",
      user: { id: "u", name: "Brad", email: "b@x", photoUrl: null },
      deviceName: "PC",
      offline: true,
      secureStorage: true,
    } as AuthState;
    const { result } = renderHook(() => useNotifications({ update, auth, onToolchain }));
    await waitFor(() => expect(result.current.notices.map((n) => n.id)).toEqual(["update-error", "toolchain-missing", "offline", "whats-new"]));
    result.current.notices.find((n) => n.id === "update-error")!.action!.run();
    expect(update.check).toHaveBeenCalled();
    result.current.notices.find((n) => n.id === "toolchain-missing")!.action!.run();
    expect(onToolchain).toHaveBeenCalled();
    act(() => result.current.dismiss("whats-new"));
    expect(result.current.notices.map((n) => n.id)).not.toContain("whats-new");
    expect(localStorage.getItem("kiungo.lastSeenVersion")).toBe("0.13.6");
  });

  it("a quiet background failure isn't news", () => {
    const { result } = renderHook(() =>
      useNotifications({
        update: controls({
          status: "error",
          message: "x",
          quiet: true,
          checkedAt: null,
        }),
        auth: signedOut,
        onToolchain: vi.fn(),
      }),
    );
    expect(result.current.notices).toEqual([]);
  });
});

describe("the top bar", () => {
  const notices = [
    {
      id: "a",
      tone: "update" as const,
      title: "Kiungo 0.13.7 is ready to install",
      detail: "d",
      action: { label: "Update now", run: vi.fn() },
      dismissible: true,
    },
    {
      id: "b",
      tone: "warning" as const,
      title: "Firmware can't be compiled yet",
      detail: "d",
      dismissible: true,
    },
    {
      id: "c",
      tone: "info" as const,
      title: "Updated to Kiungo 0.13.6",
      detail: "d",
      dismissible: true,
    },
  ];

  it("has only the bell: no breadcrumb, search, status chip or theme toggle", () => {
    render(<Header notices={[]} onDismiss={vi.fn()} />);
    const bar = screen.getByTestId("app-header");
    expect(bar).not.toHaveTextContent(/Dashboard|Search|Systems nominal/);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByTestId("notifications-button")).toHaveAccessibleName("Notifications: nothing new");
    expect(screen.queryByTestId("notifications-count")).toBeNull();
  });

  it("the bell shows how many, and the list's quick actions work", () => {
    const onDismiss = vi.fn();
    render(<Header notices={notices} onDismiss={onDismiss} />);
    expect(screen.getByTestId("notifications-count")).toHaveTextContent("3");
    fireEvent.click(screen.getByTestId("notifications-button"));
    expect(screen.getByTestId("notifications-panel")).toHaveTextContent("3 need your attention");
    fireEvent.click(screen.getByRole("button", { name: "Update now" }));
    expect(notices[0]!.action!.run).toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Dismiss: Firmware can't be compiled yet",
      }),
    );
    expect(onDismiss).toHaveBeenCalledWith("b");
  });

  it("says when there's nothing to see", () => {
    render(<Header notices={[]} onDismiss={vi.fn()} />);
    fireEvent.click(screen.getByTestId("notifications-button"));
    expect(screen.getByTestId("notifications-panel")).toHaveTextContent(/You.re all caught up/);
  });
});

describe("the sidebar's ends", () => {
  it("one name at the top, and one way to Settings at the bottom", () => {
    render(<Sidebar view="dashboard" onView={vi.fn()} auth={signedOut} onSettings={vi.fn()} />);
    expect(screen.getByTestId("app-name")).toHaveTextContent("Kiungo");
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getAllByRole("button", { name: /settings/i })).toHaveLength(1);
    expect(screen.getByTestId("account-sign-in")).toHaveTextContent("Sign in");
  });
});
