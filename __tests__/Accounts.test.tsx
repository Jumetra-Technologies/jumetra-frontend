import { act } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountDialogs } from "@/components/account/AccountDialogs";
import { GoogleSignInButton } from "@/components/auth/google-signin-button";
import { Sidebar } from "@/components/layout/sidebar";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { closeAccountDialog } from "@/lib/account-dialogs";
import { AUTH_STORAGE_KEY, type AuthUser } from "@/lib/auth-session";
import { useAuthStore } from "@/lib/auth-store";
import { describeSignInError } from "@/lib/firebase-auth";
import { changedFields, fieldsOf, sizedPhoto, validateFields } from "@/lib/profile";
import { closeSettings, openSettings } from "@/lib/settings-dialog";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

const signInWithGoogle = vi.fn();
vi.mock("@/lib/firebase-auth", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/firebase-auth")>();
  return { ...real, prepareGoogleSignIn: vi.fn().mockResolvedValue(undefined), signInWithGoogle: () => signInWithGoogle() };
});

const PHOTO = "https://lh3.googleusercontent.com/a/abc123=s96-c";
const BRAD: AuthUser = { id: "u1", email: "bradr3671@gmail.com", display_name: "Brad Robinson", picture_url: PHOTO };

function signIn(user: AuthUser = BRAD) {
  const session = { access_token: "tok", token_type: "Bearer", user };
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  act(() => useAuthStore.setState({ user, accessToken: "tok", isAuthenticated: true, isLoading: false, error: null }));
}

const json = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function app() {
  return render(
    <ThemeProvider>
      <Sidebar activePath="/" />
      <SettingsDialog />
      <AccountDialogs />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  useAuthStore.setState({ user: null, accessToken: null, isAuthenticated: false, isLoading: false, error: null });
  signInWithGoogle.mockReset();
});

afterEach(() => {
  act(() => {
    closeAccountDialog();
    closeSettings();
  });
  vi.unstubAllGlobals();
});

describe("Continue with Google", () => {
  it("uses Google's four-colour G and stays readable while sign-in loads", () => {
    render(<GoogleSignInButton />);
    const button = screen.getByRole("button", { name: "Continue with Google" });
    expect(button).toBeEnabled();
    expect(button).toHaveClass("kiungo-gbtn");
    const fills = Array.from(within(button).getByTestId("google-logo").querySelectorAll("path")).map((p) => p.getAttribute("fill"));
    expect(fills).toEqual(["#EA4335", "#4285F4", "#FBBC05", "#34A853"]);
  });

  it("signs in, keeps the Google photo when the backend has none, and reads a nested user", async () => {
    signInWithGoogle.mockResolvedValue({ idToken: "google-id", photoURL: PHOTO });
    const fetchMock = vi.fn().mockResolvedValue(json(200, { access_token: "jwt", token_type: "bearer", user: { id: "u1", email: BRAD.email, display_name: BRAD.display_name, picture_url: null } }));
    vi.stubGlobal("fetch", fetchMock);
    const done = vi.fn();
    render(<GoogleSignInButton onSignedIn={done} />);
    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    await waitFor(() => expect(done).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ id_token: "google-id" });
    expect(useAuthStore.getState().user).toMatchObject({ id: "u1", display_name: "Brad Robinson", picture_url: PHOTO });
  });

  it("says nothing when the Google window is closed, and explains real failures", () => {
    expect(describeSignInError({ code: "auth/popup-closed-by-user" })).toBeNull();
    expect(describeSignInError({ code: "auth/popup-blocked" })).toMatch(/Allow pop-ups/);
    expect(describeSignInError({ code: "auth/unauthorized-domain" })).toMatch(/web address/);
  });
});

describe("Signed out", () => {
  it("offers Log in (primary) and Sign up in Settings, and opens the sign-in modal", () => {
    app();
    act(() => openSettings());
    const login = screen.getByTestId("settings-login");
    const signup = screen.getByTestId("settings-signup");
    expect(login).toHaveClass("bg-primary");
    expect(signup).not.toHaveClass("bg-primary");
    expect(screen.queryByText("Go to Home to sign in")).not.toBeInTheDocument();

    fireEvent.click(login);
    const dialog = screen.getByTestId("auth-dialog");
    expect(within(dialog).getByRole("heading", { name: "Log in to Kiungo" })).toBeInTheDocument();
    expect(within(dialog).getByTestId("google-logo")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByTestId("auth-switch"));
    expect(within(screen.getByTestId("auth-dialog")).getByRole("heading", { name: "Create your Kiungo account" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign up with Google" })).toBeInTheDocument();

    // The sign-in modal sits on Settings: Escape closes it alone.
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByTestId("auth-dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Settings" })).toBeInTheDocument();
  });

  it("opens sign-in from the sidebar account row", () => {
    app();
    fireEvent.click(screen.getByTestId("sidebar-account"));
    expect(screen.getByRole("heading", { name: "Log in to Kiungo" })).toBeInTheDocument();
  });
});

describe("Signed in", () => {
  it("shows the Google photo in the sidebar instead of initials", () => {
    signIn();
    app();
    const row = screen.getByTestId("sidebar-account");
    const img = within(row).getByTestId("avatar-photo");
    expect(img).toHaveAttribute("src", "https://lh3.googleusercontent.com/a/abc123=s64-c");
    expect(img).toHaveAttribute("referrerpolicy", "no-referrer");
    expect(within(row).queryByTestId("avatar-initials")).not.toBeInTheDocument();
  });

  it("falls back to initials when the photo fails", () => {
    signIn();
    app();
    fireEvent.error(within(screen.getByTestId("sidebar-account")).getByTestId("avatar-photo"));
    expect(within(screen.getByTestId("sidebar-account")).getByTestId("avatar-initials")).toHaveTextContent("BR");
  });

  it("opens the profile from the sidebar row", () => {
    signIn();
    app();
    fireEvent.click(screen.getByTestId("sidebar-account"));
    const profile = screen.getByTestId("profile-dialog");
    expect(within(profile).getByTestId("profile-name")).toHaveTextContent("Brad Robinson");
    expect(within(profile).getByText("Signed in with Google")).toBeInTheDocument();
  });

  it("previews the profile in Settings and opens it on top", () => {
    signIn({ ...BRAD, role: "instructor", organization: "Strathmore University" });
    app();
    act(() => openSettings());
    const tile = screen.getByTestId("profile-tile");
    expect(tile).toHaveTextContent("Brad Robinson");
    expect(tile).toHaveTextContent("Instructor · Strathmore University");
    fireEvent.click(tile);
    expect(screen.getByTestId("profile-dialog")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByTestId("profile-dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Settings" })).toBeInTheDocument();
  });

  it("edits and saves the profile to the server", async () => {
    signIn();
    const fetchMock = vi.fn().mockImplementation(async (_url: string, init: RequestInit) => json(200, { ...BRAD, ...JSON.parse(String(init.body)) }));
    vi.stubGlobal("fetch", fetchMock);
    app();
    fireEvent.click(screen.getByTestId("sidebar-account"));
    fireEvent.click(screen.getByTestId("profile-edit"));
    fireEvent.change(screen.getByLabelText("Role"), { target: { value: "instructor" } });
    fireEvent.change(screen.getByLabelText("School or organisation"), { target: { value: "  Strathmore University " } });
    fireEvent.click(screen.getByTestId("profile-save"));

    expect(await screen.findByText("Profile saved.")).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/auth\/me$/);
    expect(init.method).toBe("PATCH");
    expect(init.headers.Authorization).toBe("Bearer tok");
    expect(JSON.parse(init.body)).toMatchObject({ display_name: "Brad Robinson", role: "instructor", organization: "Strathmore University" });
    expect(within(screen.getByTestId("profile-details")).getByText("Instructor")).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(AUTH_STORAGE_KEY)!).user.organization).toBe("Strathmore University");
  });

  it("keeps edits on this device, and says so, when the backend can't store them yet", async () => {
    signIn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(405, { detail: "Method Not Allowed" })));
    app();
    fireEvent.click(screen.getByTestId("sidebar-account"));
    fireEvent.click(screen.getByTestId("profile-edit"));
    fireEvent.change(screen.getByLabelText("Location"), { target: { value: "Nairobi" } });
    fireEvent.click(screen.getByTestId("profile-save"));
    expect(await screen.findByText(/Saved on this device/)).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem("hhip-profile:u1")!).fields.location).toBe("Nairobi");

    // A refresh from the server keeps the device edit on top.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(200, { id: "u1", email: BRAD.email, display_name: BRAD.display_name })));
    await act(() => useAuthStore.getState().refreshSession());
    expect(useAuthStore.getState().user).toMatchObject({ location: "Nairobi", picture_url: PHOTO });
  });

  it("checks fields before saving", () => {
    signIn();
    app();
    fireEvent.click(screen.getByTestId("sidebar-account"));
    fireEvent.click(screen.getByTestId("profile-edit"));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "   " } });
    fireEvent.click(screen.getByTestId("profile-save"));
    expect(screen.getByText("Enter your name.")).toBeInTheDocument();
  });

  it("clears the details after confirming", async () => {
    signIn({ ...BRAD, role: "student", bio: "Rover builder" });
    const fetchMock = vi.fn().mockImplementation(async (_url: string, init: RequestInit) => json(200, { ...BRAD, ...JSON.parse(String(init.body)) }));
    vi.stubGlobal("fetch", fetchMock);
    app();
    fireEvent.click(screen.getByTestId("sidebar-account"));
    fireEvent.click(screen.getByTestId("profile-clear"));
    fireEvent.click(screen.getByTestId("profile-confirm"));
    expect(await screen.findByText("Your details were cleared.")).toBeInTheDocument();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ role: null, organization: null, location: null, bio: null });
  });

  it("deletes the account and signs out", async () => {
    signIn();
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    app();
    fireEvent.click(screen.getByTestId("sidebar-account"));
    fireEvent.click(screen.getByTestId("profile-delete"));
    fireEvent.click(screen.getByTestId("profile-confirm"));
    await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(false));
    expect(fetchMock.mock.calls[0][1].method).toBe("DELETE");
    expect(window.localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(screen.queryByTestId("profile-dialog")).not.toBeInTheDocument();
  });

  it("doesn't pretend to delete when the backend can't", async () => {
    signIn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(405, { detail: "Method Not Allowed" })));
    app();
    fireEvent.click(screen.getByTestId("sidebar-account"));
    fireEvent.click(screen.getByTestId("profile-delete"));
    fireEvent.click(screen.getByTestId("profile-confirm"));
    expect(await screen.findByText(/Nothing was deleted/)).toBeInTheDocument();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });
});

describe("Profile rules", () => {
  it("validates, normalises and diffs fields", () => {
    const base = fieldsOf(BRAD);
    expect(validateFields({ ...base, bio: "x".repeat(281) })).toEqual({ bio: "Keep it under 280 characters." });
    expect(changedFields(base, { ...base, location: " Nairobi ", organization: "" })).toEqual({ location: "Nairobi" });
  });

  it("sizes Google photos for the space they fill", () => {
    expect(sizedPhoto(PHOTO, 72)).toBe("https://lh3.googleusercontent.com/a/abc123=s144-c");
    expect(sizedPhoto("https://example.com/me.png", 72)).toBe("https://example.com/me.png");
    expect(sizedPhoto(null, 72)).toBeNull();
  });
});

describe("AccountDialogs on their own", () => {
  it("renders nothing until opened", () => {
    render(<AccountDialogs />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    render(<SettingsDialog />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
