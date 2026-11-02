import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  getDesktopSignIn: vi.fn(),
  approveDesktopSignIn: vi.fn(),
  denyDesktopSignIn: vi.fn(),
}));
vi.mock("@/lib/api-client", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/api-client")>()), api }));
const openAuth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/account-dialogs", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/account-dialogs")>()), openAuth }));

import { DesktopSignIn } from "@/components/auth/DesktopSignIn";
import { ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";

const DETAILS = { code_id: "c1", status: "pending", device: { name: "BRAD-THINKPAD", platform: "windows", app_version: "0.4.0" }, expires_at: "2026-11-02T08:10:00Z" };

function signIn() {
  act(() => useAuthStore.setState({ user: { id: "u1", email: "brad@example.test", display_name: "Brad" } as never, accessToken: "tok", isAuthenticated: true, isLoading: false, error: null }));
}

let assigned: string | null = null;
beforeEach(() => {
  assigned = null;
  // The page hands the code to the app by navigating to kiungo://; jsdom can't, so record it.
  Object.defineProperty(window, "location", { configurable: true, value: { ...window.location, set href(v: string) { assigned = v; }, get href() { return "http://localhost/desktop/sign-in"; } } });
  for (const fn of Object.values(api)) fn.mockReset();
  openAuth.mockReset();
});
afterEach(() => {
  useAuthStore.setState({ user: null, accessToken: null, isAuthenticated: false, isLoading: false, error: null });
});

describe("Signing in the desktop app on the website (DSK-02)", () => {
  it("asks a signed-out visitor to sign in first", () => {
    useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false });
    render(<DesktopSignIn codeId="c1" />);
    expect(screen.getByRole("heading", { name: "Sign in to Kiungo on your computer" })).toBeInTheDocument();
    screen.getByTestId("desktop-sign-in-login").click();
    expect(openAuth).toHaveBeenCalledWith("login");
  });

  it("names the computer asking, and on Yes sends the code back to the app", async () => {
    api.getDesktopSignIn.mockResolvedValue(DETAILS);
    api.approveDesktopSignIn.mockResolvedValue({ status: "approved", redirect_url: "kiungo://signin?code=x&code_id=c1" });
    signIn();
    render(<DesktopSignIn codeId="c1" />);
    expect(await screen.findByRole("heading", { name: "Sign in to Kiungo on BRAD-THINKPAD?" })).toBeInTheDocument();
    expect(screen.getByText(/Kiungo 0\.4\.0 on BRAD-THINKPAD \(Windows\)/)).toBeInTheDocument();
    expect(screen.getByText(/Signed in as brad@example\.test/)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("desktop-sign-in-approve"));
    expect(api.approveDesktopSignIn).toHaveBeenCalledWith("c1");
    expect(await screen.findByRole("heading", { name: "You're signed in on BRAD-THINKPAD" })).toBeInTheDocument();
    expect(assigned).toBe("kiungo://signin?code=x&code_id=c1");
  });

  it("lets the person turn it down", async () => {
    api.getDesktopSignIn.mockResolvedValue(DETAILS);
    api.denyDesktopSignIn.mockResolvedValue({ status: "denied" });
    signIn();
    render(<DesktopSignIn codeId="c1" />);
    fireEvent.click(await screen.findByTestId("desktop-sign-in-deny"));
    expect(await screen.findByRole("heading", { name: "Cancelled" })).toBeInTheDocument();
    expect(assigned).toBeNull();
  });

  it("explains an expired or already used link in plain words", async () => {
    api.getDesktopSignIn.mockResolvedValue({ ...DETAILS, status: "expired" });
    signIn();
    render(<DesktopSignIn codeId="c1" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("This sign-in link has expired. Choose Sign in in Kiungo on your computer to get a new one.");
  });

  it("passes on the service's own sentence when the attempt is gone", async () => {
    api.getDesktopSignIn.mockRejectedValue(new ApiError("/auth/desktop/codes/c1/details", 404, "That sign-in attempt doesn't exist. Start again from the app."));
    signIn();
    render(<DesktopSignIn codeId="c1" />);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("That sign-in attempt doesn't exist. Start again from the app."));
  });

  it("without a code, says to start from the app", () => {
    render(<DesktopSignIn codeId={null} />);
    expect(screen.getByRole("heading", { name: "Sign in from the Kiungo app" })).toBeInTheDocument();
  });
});
