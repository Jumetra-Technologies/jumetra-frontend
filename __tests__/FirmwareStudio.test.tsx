import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FirmwareStudio } from "@/components/firmware/FirmwareStudio";
import { ApiError } from "@/lib/api-client";
import { closeAccountDialog, useAccountDialog } from "@/lib/account-dialogs";
import { AUTH_STORAGE_KEY } from "@/lib/auth-session";
import { useAuthStore } from "@/lib/auth-store";
import { SignInNeeded, withSignIn } from "@/lib/auth-recovery";
import { BUILT_IN_TEMPLATES, readCache, summarize } from "@/lib/firmware/studio-data";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => "/firmware" }));
// The editor is a multi-megabyte CDN download; the studio must not depend on it to paint.
vi.mock("@monaco-editor/react", () => ({ default: () => null, loader: { init: () => Promise.resolve() } }));

type Call = { path: string; method: string; headers: Headers };
let calls: Call[] = [];
let routes: Record<string, () => Response | Promise<Response>> = {};
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const never = () => new Promise<Response>(() => {});

function DialogProbe() {
  const dialog = useAccountDialog();
  return <output data-testid="dialog">{dialog ? `${dialog.kind}:${"mode" in dialog ? dialog.mode : ""}` : "none"}</output>;
}

beforeEach(() => {
  calls = [];
  routes = {};
  window.sessionStorage.clear();
  window.localStorage.clear();
  useAuthStore.setState({ user: null, accessToken: null, isAuthenticated: false, isLoading: false, error: null });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const path = new URL(url).pathname;
      const method = init?.method ?? "GET";
      calls.push({ path, method, headers: new Headers(init?.headers) });
      const route = routes[`${method} ${path}`] ?? routes[path];
      return route ? route() : json(404, { detail: `no route ${method} ${path}` });
    }),
  );
  vi.stubGlobal("WebSocket", class { onmessage: unknown; close() {} });
});

afterEach(() => {
  act(() => closeAccountDialog());
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("Embedded Studio opening", () => {
  it("paints at once and loads the lists in the background", async () => {
    routes["/firmware/projects"] = never;
    routes["/firmware/templates"] = never;
    render(<FirmwareStudio />);
    // The whole studio is there before the server answers: header, form, panels.
    expect(screen.getByText("Embedded Studio")).toBeInTheDocument();
    expect(screen.getByTestId("new-project")).toBeEnabled();
    expect(screen.getByTestId("connection-bar")).toHaveAttribute("data-state", "connecting");
    expect(within(screen.getByTestId("project-list")).getByRole("status")).toHaveTextContent("Loading projects");
    // The built-in templates fill the picker so New Project is usable straight away.
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(expect.arrayContaining(["Blink", "DHT11", "MQTT"]));
  });

  it("says Kiungo is getting ready when nothing has answered after a few seconds", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    routes["/firmware/projects"] = never;
    routes["/firmware/templates"] = never;
    render(<FirmwareStudio />);
    await act(async () => {
      vi.advanceTimersByTime(4100);
    });
    expect(screen.getByTestId("connection-bar")).toHaveAttribute("data-state", "slow");
    expect(screen.getByTestId("connection-bar")).toHaveTextContent(/getting ready/);
  });

  it("shows each list as it lands, then clears the bar, and remembers the lists for next time", async () => {
    routes["/firmware/projects"] = () => json(200, { projects: [{ project_id: "p1", name: "Greenhouse", board_type: "esp32", project_type: "arduino-sketch", files: [{ path: "main.ino", content: "x".repeat(5000) }] }], count: 1 });
    routes["/firmware/templates"] = () => json(200, { templates: [{ id: "blink", name: "Blink" }, { id: "custom", name: "School kit" }], count: 2 });
    render(<FirmwareStudio />);
    expect(await screen.findByText("Greenhouse")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByTestId("connection-bar")).not.toBeInTheDocument());
    expect(screen.getByRole("option", { name: "School kit" })).toBeInTheDocument();
    // Only what the list needs is cached, not every file's contents.
    const cache = readCache()!;
    expect(cache.projects).toEqual([{ project_id: "p1", name: "Greenhouse", board_type: "esp32", project_type: "arduino-sketch" }]);
    expect(cache.templates.map((t) => t.id)).toEqual(["blink", "custom"]);
  });

  it("paints the last-seen lists from the cache while the server is still waking", () => {
    window.sessionStorage.setItem("hhip-firmware-studio:v1", JSON.stringify({ projects: [{ project_id: "p9", name: "Rover", board_type: "esp32", project_type: "arduino-sketch" }], templates: BUILT_IN_TEMPLATES, savedAt: 1 }));
    routes["/firmware/projects"] = never;
    routes["/firmware/templates"] = never;
    render(<FirmwareStudio />);
    expect(screen.getByText("Rover")).toBeInTheDocument();
    expect(within(screen.getByTestId("project-list")).queryByRole("status")).not.toBeInTheDocument();
  });

  it("reports an unreachable server inline with Retry, keeping the studio usable", async () => {
    routes["/firmware/projects"] = () => json(503, { detail: "unavailable" });
    routes["/firmware/templates"] = () => json(503, { detail: "unavailable" });
    render(<FirmwareStudio />);
    await waitFor(() => expect(screen.getByTestId("connection-bar")).toHaveAttribute("data-state", "offline"));
    expect(screen.getByText("Embedded Studio")).toBeInTheDocument();
    routes["/firmware/projects"] = () => json(200, { projects: [], count: 0 });
    routes["/firmware/templates"] = () => json(200, { templates: [], count: 0 });
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.queryByTestId("connection-bar")).not.toBeInTheDocument());
    expect(screen.getByText("No projects yet.")).toBeInTheDocument();
  });
});

describe("New Project and sign-in", () => {
  it("asks a signed-out user to log in when the server answers 401, and opens the sign-in modal", async () => {
    routes["/firmware/projects"] = () => json(200, { projects: [], count: 0 });
    routes["POST /firmware/projects"] = () => json(401, { detail: "Not authenticated" });
    routes["/firmware/templates"] = () => json(200, { templates: [], count: 0 });
    render(
      <>
        <FirmwareStudio />
        <DialogProbe />
      </>,
    );
    await waitFor(() => expect(screen.queryByTestId("connection-bar")).not.toBeInTheDocument());
    fireEvent.click(screen.getByTestId("new-project"));
    const prompt = await screen.findByTestId("sign-in-prompt");
    expect(prompt).toHaveTextContent("Sign in to create a firmware project.");
    expect(screen.queryByText(/failed: 401/)).not.toBeInTheDocument();
    fireEvent.click(within(prompt).getByRole("button", { name: "Log in" }));
    expect(screen.getByTestId("dialog")).toHaveTextContent("auth:login");
  });

  it("retries once with a refreshed session, and reports an expired session if that fails", async () => {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ access_token: "stale", token_type: "Bearer", user: { id: "u1", email: "a@b.c", display_name: "A" } }));
    useAuthStore.setState({ user: { id: "u1", email: "a@b.c", display_name: "A" }, accessToken: "stale", isAuthenticated: true, isLoading: false });
    routes["/firmware/projects"] = () => json(200, { projects: [], count: 0 });
    routes["/firmware/templates"] = () => json(200, { templates: [], count: 0 });
    routes["POST /firmware/projects"] = () => json(401, { detail: "Token expired" });
    routes["/auth/me"] = () => json(401, { detail: "Token expired" });
    render(<FirmwareStudio />);
    await waitFor(() => expect(screen.queryByTestId("connection-bar")).not.toBeInTheDocument());
    fireEvent.click(screen.getByTestId("new-project"));
    const prompt = await screen.findByTestId("sign-in-prompt");
    expect(prompt).toHaveTextContent("Your session has expired. Log in again to create a firmware project.");
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual(expect.arrayContaining(["POST /firmware/projects", "GET /auth/me"]));
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(window.localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });

  it("creates the project after the user signs in", async () => {
    routes["/firmware/projects"] = () => json(200, { projects: [], count: 0 });
    routes["/firmware/templates"] = () => json(200, { templates: [], count: 0 });
    routes["POST /firmware/projects"] = () => (useAuthStore.getState().isAuthenticated ? json(200, { project_id: "new1", name: "Blink Demo", board_type: "esp32", project_type: "arduino-sketch" }) : json(401, { detail: "Not authenticated" }));
    routes["/firmware/projects/new1"] = () => json(200, { project_id: "new1", name: "Blink Demo", board_type: "esp32", project_type: "arduino-sketch", files: [{ path: "src/main.ino", content: "void loop() {}" }], tree: { Source: ["src/main.ino"] } });
    render(<FirmwareStudio />);
    await waitFor(() => expect(screen.queryByTestId("connection-bar")).not.toBeInTheDocument());
    fireEvent.click(screen.getByTestId("new-project"));
    await screen.findByTestId("sign-in-prompt");
    // The user signs in (the modal does this); the pending create runs by itself.
    act(() => useAuthStore.getState().setSession({ access_token: "fresh", token_type: "Bearer", user: { id: "u1", email: "a@b.c", display_name: "A" } }));
    expect(await screen.findByText("src/main.ino", { selector: "span" })).toBeInTheDocument();
    expect(screen.queryByTestId("sign-in-prompt")).not.toBeInTheDocument();
    const create = calls.filter((c) => c.method === "POST" && c.path === "/firmware/projects");
    expect(create.at(-1)!.headers.get("Authorization")).toBe("Bearer fresh");
  });
});

describe("withSignIn", () => {
  it("passes other errors through untouched", async () => {
    await expect(withSignIn("do it", () => Promise.reject(new ApiError("/x", 500)))).rejects.toMatchObject({ status: 500 });
    await expect(withSignIn("do it", () => Promise.reject(new ApiError("/x", 401)))).rejects.toBeInstanceOf(SignInNeeded);
  });
});

describe("studio data", () => {
  it("keeps only the fields the list shows", () => {
    expect(summarize([{ project_id: "a", name: "A", board_type: "esp32", project_type: "arduino-sketch", files: [{}] }, { name: "no id" }])).toEqual([{ project_id: "a", name: "A", board_type: "esp32", project_type: "arduino-sketch" }]);
  });
});
