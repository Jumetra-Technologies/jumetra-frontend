import { afterEach, describe, expect, it, vi } from "vitest";
import nextConfig, { SECURITY_HEADERS } from "../next.config";
import { GET } from "@/app/api/desktop/download/route";
import { isAppLink } from "@/components/auth/DesktopSignIn";
import { ApiError } from "@/lib/api-client";
import { withSignIn } from "@/lib/auth-recovery";
import { getStoredAuthSession, setStoredAuthSession } from "@/lib/auth-session";
import { useAuthStore } from "@/lib/auth-store";
import { contentDisposition } from "@/lib/releases";

/** Website fixes from the 13 Nov 2026 audit (claude/kiungo-audit-2026-11-13.md). */

const EXE = "https://github.com/Jumetra-Technologies/jumetra-frontend/releases/download/desktop-v0.11.0/Kiungo-0.11.0-win-x64.exe";
const user = { id: "u1", email: "ada@example.test", display_name: "Ada" } as never;

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  window.localStorage.clear();
  useAuthStore.setState({ user: null, accessToken: null, isAuthenticated: false });
});

describe("security headers (WEB-002)", () => {
  it("every page refuses framing, sniffing and plugins", async () => {
    const rules = await nextConfig.headers!();
    expect(rules).toEqual([{ source: "/:path*", headers: SECURITY_HEADERS }]);
    const byName = Object.fromEntries(SECURITY_HEADERS.map((h) => [h.key, h.value]));
    expect(byName["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(byName["Content-Security-Policy"]).toContain("object-src 'none'");
    expect(byName["X-Frame-Options"]).toBe("DENY");
    expect(byName["X-Content-Type-Options"]).toBe("nosniff");
    expect(byName["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(byName["Strict-Transport-Security"]).toMatch(/max-age=\d+/);
  });

  it("keeps what the site uses: geolocation (welcome dialog) and Web Serial (Firmware page)", () => {
    const policy = SECURITY_HEADERS.find((h) => h.key === "Permissions-Policy")!.value;
    expect(policy).not.toMatch(/geolocation|serial/);
    expect(SECURITY_HEADERS.some((h) => h.key === "Cross-Origin-Opener-Policy")).toBe(false); // Firebase's popup needs its opener
  });
});

describe("a corrupt saved session (WEB-001)", () => {
  it("is forgotten instead of breaking every page", () => {
    window.localStorage.setItem("hhip-auth-session", '{"access_token": "cut off');
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(getStoredAuthSession()).toBeNull();
    expect(window.localStorage.getItem("hhip-auth-session")).toBeNull();
  });
});

describe("a 403 (WEB-009)", () => {
  it("is passed on, without refreshing or signing out", async () => {
    useAuthStore.setState({ user, accessToken: "t", isAuthenticated: true });
    const refresh = vi.spyOn(useAuthStore.getState(), "refreshSession");
    const denied = new ApiError("/admin/stats", 403, "Not allowed");
    await expect(withSignIn("see this", () => Promise.reject(denied))).rejects.toBe(denied);
    expect(refresh).not.toHaveBeenCalled();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });
});

describe("desktop sign-in hands over to the app only (WEB-007)", () => {
  it("accepts kiungo:// and nothing else", () => {
    expect(isAppLink("kiungo://signin?code=abc&code_id=c1")).toBe(true);
    for (const link of ["javascript:alert(1)", "https://evil.example/kiungo://signin", "KIUNGO-signin", "", "data:text/html,x"]) {
      expect(isAppLink(link)).toBe(false);
    }
  });
});

describe("the installer download (WEB-003, WEB-005)", () => {
  it("names the file safely whatever the URL holds", () => {
    const header = contentDisposition("Kiungo\r\nSet-Cookie: x=1\u0000 é.exe");
    expect(() => new Headers({ "content-disposition": header })).not.toThrow();
    expect(header).not.toMatch(/[\r\n\u0000]/);
    expect(header).toContain(`filename*=UTF-8''${encodeURIComponent("KiungoSet-Cookie: x=1 é.exe")}`);
  });

  it("gives up with a timeout when the host doesn't answer in 30 s", async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, "fetch").mockImplementation((_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal!.reason));
      }),
    );
    const pending = GET(new Request(`http://site/api/desktop/download?url=${encodeURIComponent(EXE)}`));
    await vi.advanceTimersByTimeAsync(30_001);
    const res = await pending;
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ error: "timeout" });
  });
});

describe("signing out (N-6)", () => {
  it("ends the session on the server too", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}"));
    setStoredAuthSession({ access_token: "acc", refresh_token: "ref", token_type: "Bearer", user } as never);
    useAuthStore.setState({ user, accessToken: "acc", isAuthenticated: true });
    useAuthStore.getState().logout();
    const call = fetchSpy.mock.calls.find(([url]) => String(url).endsWith("/auth/logout"));
    expect(call).toBeDefined();
    const init = call![1] as RequestInit;
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer acc");
    expect(JSON.parse(String(init.body))).toEqual({ refresh_token: "ref" });
    expect(getStoredAuthSession()).toBeNull();
  });

  it("signs out in the browser even when the server can't be reached", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
    setStoredAuthSession({ access_token: "acc", refresh_token: "ref", token_type: "Bearer", user } as never);
    useAuthStore.setState({ user, accessToken: "acc", isAuthenticated: true });
    useAuthStore.getState().logout();
    await Promise.resolve();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(getStoredAuthSession()).toBeNull();
  });
});
