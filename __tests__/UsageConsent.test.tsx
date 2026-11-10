import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ActivityTracker } from "@/components/activity/ActivityTracker";
import { PrivacyTile } from "@/components/consent/PrivacyTile";
import { UsageConsentBanner, UsageConsentSync } from "@/components/consent/UsageConsent";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { readUsageConsent, reconcile, storeUsageConsent } from "@/lib/consent/usage";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname, useRouter: () => ({ push: vi.fn() }) }));

const KEY = "kiungo.consent.usage";
const user = { id: "acct-1", email: "a@example.test", display_name: "A" } as never;

function heartbeats(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/telemetry/heartbeat"));
}

beforeEach(() => {
  pathname = "/";
  window.localStorage.clear();
  useAuthStore.setState({ user: null, accessToken: null, isAuthenticated: false, isLoading: false, error: null });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("the banner", () => {
  it("asks until answered, with Allow and Don't allow side by side and alike", () => {
    render(<UsageConsentBanner />);
    const banner = screen.getByTestId("usage-consent-banner");
    expect(banner).toHaveTextContent("never records what you type or build");
    const allow = screen.getByTestId("usage-allow");
    const decline = screen.getByTestId("usage-decline");
    expect(allow.className).toBe(decline.className); // same size, colour and weight
    expect(screen.getByRole("link", { name: "Cookie Policy" })).toHaveAttribute("href", "/legal/cookies");
  });

  it("Allow keeps the answer and the banner goes", () => {
    render(<UsageConsentBanner />);
    fireEvent.click(screen.getByTestId("usage-allow"));
    expect(readUsageConsent()?.allowed).toBe(true);
    expect(screen.queryByTestId("usage-consent-banner")).not.toBeInTheDocument();
  });

  it("Don't allow keeps the answer and asks the server to forget this browser", () => {
    window.localStorage.setItem("kiungo.visitor", "visitor-abc-123");
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<UsageConsentBanner />);
    fireEvent.click(screen.getByTestId("usage-decline"));
    expect(readUsageConsent()?.allowed).toBe(false);
    expect(screen.queryByTestId("usage-consent-banner")).not.toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/telemetry\/forget$/);
    expect(JSON.parse(init.body)).toEqual({ visitor: "visitor-abc-123" });
  });

  it("signed in, the answer stays in this browser (accounts are on the main server, which doesn't keep it)", async () => {
    useAuthStore.setState({ user, isAuthenticated: true });
    const save = vi.spyOn(api, "saveMyConsents");
    render(<UsageConsentBanner />);
    fireEvent.click(screen.getByTestId("usage-allow"));
    expect(readUsageConsent()?.allowed).toBe(true);
    await new Promise((r) => setTimeout(r, 10));
    expect(save).not.toHaveBeenCalled();
  });

  it("stays out of the way on the Cookie Policy itself and in the admin portal", () => {
    for (const p of ["/legal/cookies", "/admin"]) {
      pathname = p;
      const { unmount } = render(<UsageConsentBanner />);
      expect(screen.queryByTestId("usage-consent-banner")).not.toBeInTheDocument();
      unmount();
    }
  });
});

describe("Settings, Privacy", () => {
  it("shows the answer and changes it", () => {
    render(<PrivacyTile />);
    expect(screen.getByTestId("privacy-status")).toHaveTextContent("You haven't chosen yet, so nothing is counted.");
    fireEvent.click(screen.getByRole("radio", { name: "Allow" }));
    expect(readUsageConsent()?.allowed).toBe(true);
    expect(screen.getByTestId("privacy-status")).toHaveTextContent("Allowed in this browser.");
    fireEvent.click(screen.getByRole("radio", { name: "Don't allow" }));
    expect(readUsageConsent()?.allowed).toBe(false);
    expect(screen.getByTestId("privacy-status")).toHaveTextContent("Not allowed. Nothing is counted.");
  });
});

describe("this browser and the account", () => {
  it("the newer answer wins", () => {
    const local = { allowed: true, decidedAt: "2026-11-09T08:00:00Z" };
    expect(reconcile(null, { usage: null, decided_at: null })).toBe("none");
    expect(reconcile(local, { usage: null, decided_at: null })).toBe("push");
    expect(reconcile(null, { usage: false, decided_at: "2026-11-01T00:00:00Z" })).toBe("pull");
    expect(reconcile(local, { usage: false, decided_at: "2026-11-01T00:00:00Z" })).toBe("push");
    expect(reconcile(local, { usage: false, decided_at: "2026-11-09T09:00:00Z" })).toBe("pull");
    expect(reconcile(local, { usage: true, decided_at: "2026-11-01T00:00:00Z" })).toBe("none");
  });

  it("signing in on a new browser brings the account's answer, so the banner doesn't ask again", async () => {
    vi.spyOn(api, "getMyConsents").mockResolvedValue({ usage: false, crash_reports: null, decided_at: "2026-11-01T00:00:00Z", decided_in: "website" });
    render(
      <>
        <UsageConsentSync />
        <UsageConsentBanner />
      </>,
    );
    expect(screen.getByTestId("usage-consent-banner")).toBeInTheDocument();
    act(() => useAuthStore.setState({ user, isAuthenticated: true }));
    await waitFor(() => expect(screen.queryByTestId("usage-consent-banner")).not.toBeInTheDocument());
    expect(readUsageConsent()?.allowed).toBe(false);
  });

  it("an answer given before signing in goes to an account that hasn't been asked", async () => {
    storeUsageConsent({ allowed: true, decidedAt: "2026-11-09T08:00:00Z" });
    vi.spyOn(api, "getMyConsents").mockResolvedValue({ usage: null, crash_reports: null, decided_at: null, decided_in: null });
    const save = vi.spyOn(api, "saveMyConsents").mockResolvedValue({ usage: true, crash_reports: null, decided_at: "x", decided_in: "website" });
    render(<UsageConsentSync />);
    act(() => useAuthStore.setState({ user, isAuthenticated: true }));
    await waitFor(() => expect(save).toHaveBeenCalledWith({ usage: true, decided_in: "website" }));
  });
});

describe("the tracker", () => {
  it("sends nothing until the answer is yes, then starts", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    pathname = "/learn";
    render(<ActivityTracker />);
    await new Promise((r) => setTimeout(r, 20));
    expect(heartbeats(fetchMock)).toHaveLength(0);
    act(() => storeUsageConsent({ allowed: true, decidedAt: new Date().toISOString() }));
    await waitFor(() => expect(heartbeats(fetchMock)).toHaveLength(1));
    expect(JSON.parse(heartbeats(fetchMock)[0][1].body)).toMatchObject({ event: "view", page: "/learn" });
    expect(window.localStorage.getItem(KEY)).toContain('"allowed":true');
  });
});
