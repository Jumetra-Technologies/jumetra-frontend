// @vitest-environment node
import { describe, expect, it } from "vitest";
import { ActivityReporter, IDLE_SECONDS, type DesktopPage } from "../src/main/activity/reporter";

function setup(overrides: { token?: string | null } = {}) {
  const sent: Array<{ event: string; page: string; auth: string | null }> = [];
  const state = { visible: true, minimized: false, idle: 0, page: "/desktop/home" as DesktopPage, online: true };
  const reporter = new ActivityReporter({
    apiBase: "https://api.example/",
    token: async () => (overrides.token === undefined ? "desk-token" : overrides.token),
    window: () => ({ isDestroyed: () => false, isVisible: () => state.visible, isMinimized: () => state.minimized }),
    idleSeconds: () => state.idle,
    page: () => state.page,
    appVersion: "0.13.0",
    intervalMs: 1_000_000,
    fetch: (async (url: string, init: RequestInit) => {
      if (!state.online) throw new TypeError("fetch failed");
      expect(url).toBe("https://api.example/telemetry/heartbeat");
      const body = JSON.parse(String(init.body));
      expect(body).toMatchObject({ client: "desktop", app_version: "0.13.0" });
      sent.push({ event: body.event, page: body.page, auth: new Headers(init.headers).get("authorization") });
      return new Response(null, { status: 204 });
    }) as typeof fetch,
  });
  return { reporter, sent, state };
}

describe("desktop activity reporter", () => {
  it("sends a view, then beats while the window is in use, with the desktop token", async () => {
    const { reporter, sent, state } = setup();
    await reporter.tick();
    await reporter.tick();
    state.page = "/desktop/project";
    await reporter.tick();
    expect(sent.map((s) => `${s.event} ${s.page}`)).toEqual(["view /desktop/home", "beat /desktop/home", "view /desktop/project"]);
    expect(sent[0].auth).toBe("Bearer desk-token");
  });

  it("says it left when the window is hidden, minimized or nobody touches the computer", async () => {
    const { reporter, sent, state } = setup();
    await reporter.tick();
    state.minimized = true;
    await reporter.tick();
    await reporter.tick(); // already gone: nothing more
    state.minimized = false;
    state.idle = IDLE_SECONDS + 1;
    await reporter.tick();
    state.idle = 0;
    await reporter.tick(); // back: a new view
    state.visible = false;
    await reporter.tick();
    expect(sent.map((s) => s.event)).toEqual(["view", "leave", "view", "leave"]);
  });

  it("sends nothing signed out, and shrugs off being offline", async () => {
    const signedOut = setup({ token: null });
    await signedOut.reporter.tick();
    expect(signedOut.sent).toEqual([]);

    const { reporter, sent, state } = setup();
    state.online = false;
    await reporter.tick();
    state.online = true;
    await reporter.tick();
    expect(sent.map((s) => s.event)).toEqual(["view"]);
  });

  it("stopping says goodbye once", async () => {
    const { reporter, sent } = setup();
    await reporter.tick();
    await reporter.stop();
    await reporter.stop();
    expect(sent.map((s) => s.event)).toEqual(["view", "leave"]);
  });
});
