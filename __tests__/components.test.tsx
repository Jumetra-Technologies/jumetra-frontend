import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "@/components/ui/badge";
import { MetricTiles } from "@/components/charts/charts";

describe("Badge", () => {
  it("renders label", () => {
    render(<Badge>adaptive</Badge>);
    expect(screen.getByText("adaptive")).toBeInTheDocument();
  });

  it("applies success variant", () => {
    render(<Badge variant="success">connected</Badge>);
    expect(screen.getByText("connected")).toHaveClass("bg-emerald-100");
  });
});

describe("MetricTiles", () => {
  it("renders metric items", () => {
    render(
      <MetricTiles
        items={[
          { label: "Active Experiments", value: "2", hint: "2 total" },
          { label: "Devices", value: "3" },
        ]}
      />,
    );
    expect(screen.getByText("Active Experiments")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Devices")).toBeInTheDocument();
  });
});

describe("API client", () => {
  it("exposes platform control methods", async () => {
    const { api } = await import("@/lib/api-client");
    expect(typeof api.startExperiment).toBe("function");
    expect(typeof api.getProjects).toBe("function");
    expect(typeof api.getExperimentStatus).toBe("function");
  });
});

describe("WebSocket client", () => {
  it("builds ws url from api base", async () => {
    const { getWsUrl } = await import("@/lib/api-client");
    expect(getWsUrl()).toContain("/ws/events");
  });
});

describe("Auth session persistence", () => {
  it("stores and restores a bearer token session", async () => {
    const {
      AUTH_STORAGE_KEY,
      clearStoredAuthSession,
      getStoredAuthSession,
      setStoredAuthSession,
    } = await import("@/lib/auth-session");

    const session = {
      access_token: "demo-token",
      token_type: "bearer",
      user: {
        id: "u-1",
        email: "person@example.com",
        display_name: "Person Example",
        google_sub: "google-123",
        picture_url: "https://example.com/avatar.png",
      },
    };

    clearStoredAuthSession();
    setStoredAuthSession(session);

    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeTruthy();
    expect(getStoredAuthSession()).toEqual(session);

    clearStoredAuthSession();
    expect(getStoredAuthSession()).toBeNull();
  });

  it("builds authorization headers for API calls", async () => {
    const { buildAuthHeaders } = await import("@/lib/auth-session");
    expect(buildAuthHeaders("jwt-token")).toEqual({ Authorization: "Bearer jwt-token" });
  });
});

describe("Google auth code flow", () => {
  it("sends the backend authorization code instead of the Google ID token credential", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "jwt-token",
        token_type: "bearer",
        user: {
          id: "u-1",
          email: "person@example.com",
          display_name: "Person Example",
          google_sub: "google-123",
          picture_url: "https://example.com/avatar.png",
        },
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    const { useAuthStore } = await import("@/lib/auth-store");
    const session = await useAuthStore.getState().loginWithGoogleCode("auth-code-123");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/auth/google/callback?code=auth-code-123",
      expect.objectContaining({ method: "GET" }),
    );
    expect(session.access_token).toBe("jwt-token");

    vi.unstubAllGlobals();
  });
});

describe("Live panel exports", () => {
  it("exports LiveOperationsPanel", async () => {
    const mod = await import("@/components/live/live-panel");
    expect(mod.LiveOperationsPanel).toBeDefined();
  });
});
