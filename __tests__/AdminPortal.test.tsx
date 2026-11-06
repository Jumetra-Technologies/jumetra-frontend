import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdminDoor } from "@/components/admin/AdminDoor";
import { accountsCsv, ago, AdminPortal, hoursMinutes, pageName } from "@/components/admin/AdminPortal";
import { counted, heartbeatBody, mayTrack } from "@/lib/activity/heartbeat";
import type { Overview } from "@/lib/admin/api";
import { DOOR_CLICKS, logoClicked, useAdminDoor } from "@/lib/admin/door";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => "/" }));

const NOW = Date.parse("2026-11-06T09:00:00Z");

const OVERVIEW: Overview = {
  generated_at: "2026-11-06T09:00:00Z",
  days: 7,
  range: { start: "2026-10-31", end: "2026-11-06" },
  tracked_since: "2026-11-01",
  totals: { accounts: 3, accounts_new_range: 1, projects: 12, desktop_projects: 4, lab_sessions: 30, experiments: 8, desktop_devices: 2, online_accounts: 1, online_visitors: 2, seconds_range: 9000, active_accounts_range: 2 },
  online: [{ user_id: "a", name: "Ada Lovelace", email: "ada@example.test", client: "desktop", page: "/desktop/project", since: "2026-11-06T08:40:00Z", last_seen: "2026-11-06T08:59:30Z", app_version: "0.13.0" }],
  online_visitors: { web: 2, desktop: 0 },
  accounts: [
    { id: "a", name: "Ada Lovelace", email: "ada@example.test", created_at: "2026-10-01T00:00:00Z", sign_in: ["google"], last_seen: "2026-11-06T08:59:30Z", online: true, seconds_total: 20000, seconds_range: 7200, seconds_web: 3600, seconds_desktop: 3600, active_days: 4, projects: 7, lab_sessions: 20 },
    { id: "b", name: "Bo Diddley", email: "bo@example.test", created_at: "2026-11-05T00:00:00Z", sign_in: ["github"], last_seen: "2026-11-05T12:00:00Z", online: false, seconds_total: 1800, seconds_range: 1800, seconds_web: 1800, seconds_desktop: 0, active_days: 1, projects: 5, lab_sessions: 10 },
    { id: "c", name: "Cy Young", email: "cy@example.test", created_at: "2026-09-01T00:00:00Z", sign_in: ["google"], last_seen: null, online: false, seconds_total: 0, seconds_range: 0, seconds_web: 0, seconds_desktop: 0, active_days: 0, projects: 0, lab_sessions: 0 },
  ],
  pages: [
    { page: "/laboratory/workspace", views: 40, seconds: 5400, web: 5400, desktop: 0 },
    { page: "/desktop/project", views: 6, seconds: 3600, web: 0, desktop: 3600 },
  ],
  daily: Array.from({ length: 7 }, (_, i) => ({ day: `2026-10-${31 + i > 31 ? `0${i}` : "31"}`.replace("2026-10-0", "2026-11-0"), active_accounts: i % 2, visitors: 1, seconds: i * 300, new_accounts: i === 5 ? 1 : 0 })),
  clients: { web: 5400, desktop: 3600 },
  admin_sign_ins: [
    { at: "2026-11-06T08:58:00Z", ok: true, from: "a1b2c3" },
    { at: "2026-11-06T08:57:00Z", ok: false, from: "a1b2c3" },
  ],
};

function respond(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

beforeEach(() => {
  window.sessionStorage.clear();
  useAdminDoor.setState({ open: false });
  push.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the way in", () => {
  it("opens on the eighth quick click, and a pause starts the count again", () => {
    let t = 10_000;
    for (let i = 0; i < 7; i++) logoClicked((t += 300));
    expect(useAdminDoor.getState().open).toBe(false);
    logoClicked((t += 300));
    expect(useAdminDoor.getState().open).toBe(true);
    useAdminDoor.setState({ open: false });
    for (let i = 0; i < 5; i++) logoClicked((t += 300));
    logoClicked((t += 4000)); // too slow: this is click one again
    for (let i = 0; i < 6; i++) logoClicked((t += 300));
    expect(useAdminDoor.getState().open).toBe(false);
    logoClicked((t += 300));
    expect(useAdminDoor.getState().open).toBe(true);
  });

  it("the logo's clicks open the password box, and the right password goes to /admin", async () => {
    const fetchMock = vi.fn().mockResolvedValue(respond(200, { token: "admin-token", expires_at: new Date(Date.now() + 1_800_000).toISOString() }));
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminDoor />);
    expect(screen.queryByTestId("admin-door")).not.toBeInTheDocument();
    act(() => {
      for (let i = 0; i < DOOR_CLICKS; i++) logoClicked(100_000 + i * 200);
    });
    expect(screen.getByTestId("admin-door")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("admin-password"), { target: { value: "Kiungo1.!" } });
    fireEvent.click(screen.getByTestId("admin-open"));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin"));
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/admin\/session$/);
    expect(JSON.parse(init.body)).toEqual({ password: "Kiungo1.!" });
    expect(JSON.parse(window.sessionStorage.getItem("kiungo.admin.session") ?? "{}").token).toBe("admin-token");
    expect(screen.queryByTestId("admin-door")).not.toBeInTheDocument();
  });

  it("says plainly when the password is wrong, or sign-in is locked", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(respond(401, { detail: "That password isn't right." })).mockResolvedValueOnce(respond(429, { detail: "Too many wrong passwords. Try again in 15 minutes." }));
    vi.stubGlobal("fetch", fetchMock);
    useAdminDoor.setState({ open: true });
    render(<AdminDoor />);
    fireEvent.change(screen.getByTestId("admin-password"), { target: { value: "guess" } });
    fireEvent.click(screen.getByTestId("admin-open"));
    expect(await screen.findByText("That password isn't right.")).toBeInTheDocument();
    expect(screen.getByTestId("admin-password")).toHaveValue("");
    fireEvent.change(screen.getByTestId("admin-password"), { target: { value: "guess again" } });
    fireEvent.click(screen.getByTestId("admin-open"));
    expect(await screen.findByText(/Try again in 15 minutes/)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});

describe("the portal", () => {
  it("asks for the password when this tab isn't signed in", () => {
    render(<AdminPortal />);
    expect(screen.getByTestId("admin-locked")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-portal")).not.toBeInTheDocument();
  });

  it("shows accounts, projects, who's online, time per account and the busiest pages", async () => {
    window.sessionStorage.setItem("kiungo.admin.session", JSON.stringify({ token: "admin-token", expiresAt: new Date(Date.now() + 1_800_000).toISOString() }));
    const fetchMock = vi.fn().mockResolvedValue(respond(200, OVERVIEW));
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminPortal />);

    expect(await screen.findByTestId("admin-accounts")).toHaveTextContent("3");
    expect(screen.getByTestId("admin-projects")).toHaveTextContent("12");
    expect(screen.getByTestId("admin-projects")).toHaveTextContent("4 from the desktop app");
    expect(screen.getByTestId("admin-online")).toHaveTextContent("and 2 signed-out visitors");
    expect(screen.getByTestId("admin-time")).toHaveTextContent("2 h 30 min");
    expect(within(screen.getByTestId("admin-online-list")).getByText("Ada Lovelace")).toBeInTheDocument();
    expect(within(screen.getByTestId("admin-online-list")).getByText("Desktop app: a project")).toBeInTheDocument();
    expect(screen.getByText("Engineering Lab")).toBeInTheDocument();

    const rows = within(screen.getByTestId("admin-accounts-table")).getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Ada Lovelace");
    expect(rows[1]).toHaveTextContent("2 h");
    expect(rows[1]).toHaveTextContent("Online now");

    fireEvent.change(screen.getByTestId("admin-search"), { target: { value: "bo@" } });
    expect(within(screen.getByTestId("admin-accounts-table")).getAllByRole("row")).toHaveLength(2);

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/admin\/overview\?days=7$/);
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer admin-token");
  });

  it("goes back to the password when the server says the session ended", async () => {
    window.sessionStorage.setItem("kiungo.admin.session", JSON.stringify({ token: "old", expiresAt: new Date(Date.now() + 1_800_000).toISOString() }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respond(401, { detail: "Sign in to the admin portal again." })));
    render(<AdminPortal />);
    expect(await screen.findByTestId("admin-locked")).toBeInTheDocument();
    expect(screen.getByText("Your admin session ended. Enter the password again.")).toBeInTheDocument();
    expect(window.sessionStorage.getItem("kiungo.admin.session")).toBeNull();
  });
});

describe("formatting and the heartbeat", () => {
  it("formats time in hours and minutes", () => {
    expect([hoursMinutes(0), hoursMinutes(2700), hoursMinutes(3600), hoursMinutes(12_000), hoursMinutes(500_000)]).toEqual(["0 min", "45 min", "1 h", "3 h 20 min", "138 h"]);
    expect(ago(null, NOW)).toBe("never");
    expect(ago("2026-11-06T08:56:00Z", NOW)).toBe("4 min ago");
    expect(ago("2026-11-04T09:00:00Z", NOW)).toBe("2 days ago");
    expect(pageName("/analytics")).toBe("Advanced Analytics");
    expect(pageName("/projects/:id")).toBe("/projects/:id");
  });

  it("exports the accounts as CSV with minutes", () => {
    const csv = accountsCsv(OVERVIEW.accounts.slice(0, 1), 7).split("\n");
    expect(csv[0]).toContain("Minutes (last 7 days)");
    expect(csv[1]).toBe("Ada Lovelace,ada@example.test,google,yes,120,60,60,333,4,7,20,2026-11-06T08:59:30Z,2026-10-01T00:00:00Z");
  });

  it("doesn't count the admin portal, and respects Do Not Track for signed-out visitors", () => {
    expect(counted("/admin")).toBe(false);
    expect(counted("/administration-guide")).toBe(true);
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
    Object.defineProperty(nav, "globalPrivacyControl", { value: true, configurable: true });
    expect(mayTrack(false)).toBe(false);
    expect(mayTrack(true)).toBe(true);
    Object.defineProperty(nav, "globalPrivacyControl", { value: undefined, configurable: true });
    expect(mayTrack(false)).toBe(true);
  });

  it("sends a visitor id only when signed out", () => {
    const out = JSON.parse(heartbeatBody("view", "/lab", false));
    expect(out).toMatchObject({ client: "web", page: "/lab", event: "view" });
    expect(out.visitor).toMatch(/^[A-Za-z0-9_-]{8,64}$/);
    expect(JSON.parse(heartbeatBody("beat", "/lab", false)).visitor).toBe(out.visitor);
    expect(JSON.parse(heartbeatBody("beat", "/lab", true)).visitor).toBeUndefined();
  });
});
