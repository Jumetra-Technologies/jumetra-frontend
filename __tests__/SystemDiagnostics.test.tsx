import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SpinningBoard } from "@/components/diagnostics/SpinningBoard";
import { SystemDiagnostics } from "@/components/diagnostics/SystemDiagnostics";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { UNLOCK_KEY, adminAccess, makeClickCounter } from "@/lib/diagnostics/access";
import { DIAGNOSTICS_KEY, endpointStats, normalizePath, readDiagnostics, recordError, recordRequest, resetDiagnosticsCache } from "@/lib/diagnostics/store";
import nextConfig from "@/next.config";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }), usePathname: () => "/" }));

const user = (platform_role?: string | null) => ({ id: "u1", email: "a@b.c", display_name: "Ada", ...(platform_role !== undefined ? { platform_role } : {}) });

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  resetDiagnosticsCache();
  push.mockReset();
  useAuthStore.setState({ user: null, isLoading: false, isAuthenticated: false });
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  vi.stubGlobal("WebSocket", class {
    onopen?: () => void;
    onerror?: () => void;
    constructor() {
      setTimeout(() => this.onerror?.(), 0);
    }
    close() {}
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("The way in", () => {
  it("takes seven clicks in a run; a pause starts the count again", () => {
    let t = 0;
    const click = makeClickCounter(7, 1500, () => t);
    for (let i = 0; i < 6; i++) {
      expect(click()).toBe(false);
      t += 300;
    }
    t += 2000; // too slow: starts over
    for (let i = 0; i < 6; i++) {
      expect(click()).toBe(false);
      t += 300;
    }
    expect(click()).toBe(true);
  });

  it("the spinning board opens System Diagnostics on the seventh click, not before", () => {
    const onOpen = vi.fn();
    render(<SpinningBoard onOpen={onOpen} />);
    const board = screen.getByTestId("spinning-board");
    for (let i = 0; i < 6; i++) fireEvent.click(board);
    expect(push).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem(UNLOCK_KEY)).toBeNull();
    fireEvent.click(board);
    expect(push).toHaveBeenCalledWith("/system");
    expect(onOpen).toHaveBeenCalled();
    expect(window.sessionStorage.getItem(UNLOCK_KEY)).toBe("1");
  });

  it("isn't in the navigation; Reports is gone too, and its old URL goes to Experiment Records", async () => {
    expect(NAV_ITEMS.some((i) => /system|diagnostic|report/i.test(i.href + i.label))).toBe(false);
    const redirects = (await nextConfig.redirects?.()) ?? [];
    expect(redirects).toContainEqual({ source: "/reports", destination: "/experiments", permanent: true });
  });
});

describe("Who gets in", () => {
  it("decides by the server's platform role, never the profile's", () => {
    expect(adminAccess(null)).toBe("signed-out");
    expect(adminAccess(user())).toBe("unknown");
    expect(adminAccess(user("STUDENT"))).toBe("denied");
    expect(adminAccess(user("ADMIN"))).toBe("admin");
    // The profile's self-described role never counts, whatever it says.
    expect(adminAccess({ ...user("STUDENT"), role: "ADMIN" } as never)).toBe("denied");
  });

  it("shows the broken-link page when it wasn't opened the hidden way", async () => {
    render(<SystemDiagnostics />);
    expect(await screen.findByTestId("not-found")).toBeInTheDocument();
  });

  it("asks for an administrator when unlocked but signed out or not an admin", async () => {
    window.sessionStorage.setItem(UNLOCK_KEY, "1");
    const { unmount } = render(<SystemDiagnostics />);
    expect(await screen.findByTestId("diagnostics-denied")).toHaveTextContent("Sign in with an administrator account");
    unmount();
    useAuthStore.setState({ user: user("STUDENT") });
    render(<SystemDiagnostics />);
    expect(await screen.findByTestId("diagnostics-denied")).toHaveTextContent("doesn't have administrator access");
  });

  it("opens for an admin, with health, usage, errors, architecture and reports", async () => {
    window.sessionStorage.setItem(UNLOCK_KEY, "1");
    useAuthStore.setState({ user: user("ADMIN") });
    recordError({ source: "request", message: "API /projects failed: 502", detail: "GET /projects" });
    render(<SystemDiagnostics />);
    expect(await screen.findByTestId("system-diagnostics")).toBeInTheDocument();
    expect(screen.queryByTestId("role-unknown")).toBeNull();
    await waitFor(() => expect(screen.getAllByText("Down").length).toBeGreaterThan(0));
    for (const tab of ["Health", "Performance", "Usage", "Architecture", "Reports"]) {
      fireEvent.click(screen.getByRole("tab", { name: new RegExp(tab) }));
      expect(screen.getByRole("tab", { name: new RegExp(tab) })).toHaveAttribute("aria-selected", "true");
    }
    fireEvent.click(screen.getByRole("tab", { name: /Errors/ }));
    expect(screen.getByTestId("error-log")).toHaveTextContent("API /projects failed: 502");
  });

  it("says plainly when the server can't confirm the role yet", async () => {
    window.sessionStorage.setItem(UNLOCK_KEY, "1");
    useAuthStore.setState({ user: user() });
    render(<SystemDiagnostics />);
    expect(await screen.findByTestId("role-unknown")).toHaveTextContent("doesn't report platform roles yet");
  });
});

describe("What it records", () => {
  it("groups requests by endpoint, with ids taken out", () => {
    expect(normalizePath("/projects/abc123def456/files?x=1")).toBe("/projects/:id/files");
    expect(normalizePath("/experiments/EXP001")).toBe("/experiments/:id");
    recordRequest({ method: "GET", path: "/projects/abc123def456", status: 200, ms: 100 });
    recordRequest({ method: "GET", path: "/projects/fff123def456", status: 500, ms: 300 });
    const stats = endpointStats(readDiagnostics().requests);
    expect(stats[0]).toMatchObject({ key: "GET /projects/:id", count: 2, failed: 1, p95: 300 });
  });

  it("logs failed server calls as errors, but not a missing sign-in", async () => {
    await expect(api.getAnalytics()).rejects.toThrow();
    expect(readDiagnostics().errors.at(-1)).toMatchObject({ source: "request", detail: "GET /analytics" });
    const before = readDiagnostics().errors.length;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: "no" }), { status: 401 })));
    await expect(api.getAnalytics()).rejects.toThrow();
    expect(readDiagnostics().errors.length).toBe(before);
    expect(readDiagnostics().requests.at(-1)).toMatchObject({ path: "/analytics", status: 401 });
  });

  it("keeps the log bounded and saves it", async () => {
    vi.useFakeTimers();
    for (let i = 0; i < 400; i++) recordError({ source: "page", message: `e${i}` });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    vi.useRealTimers();
    expect(readDiagnostics().errors).toHaveLength(150);
    expect(JSON.parse(window.localStorage.getItem(DIAGNOSTICS_KEY)!).errors.at(-1).message).toBe("e399");
  });
});
