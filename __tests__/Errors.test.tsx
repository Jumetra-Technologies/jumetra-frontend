import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorNotice } from "@/components/ui/error-notice";
import { ErrorScreen } from "@/components/ui/error-screen";
import { ApiError, api } from "@/lib/api-client";
import { readDiagnostics, resetDiagnosticsCache } from "@/lib/diagnostics/store";
import { NEXT_STEP, describeError, errorKind, storageError } from "@/lib/errors";

const DEV_WORDS = /API|HTTP|\b[45]\d\d\b|gateway|fetch|NEXT_PUBLIC|127\.0|localhost|stack|undefined|null|TypeError/i;

beforeEach(() => {
  window.localStorage.clear();
  resetDiagnosticsCache();
});
afterEach(() => vi.unstubAllGlobals());

describe("What people are told", () => {
  it("names the failure and the next step, with no technical details", () => {
    const cases: Array<[unknown, keyof typeof NEXT_STEP]> = [
      [new ApiError("/projects", 502, "Bad Gateway"), "fault"],
      [new ApiError("/projects", 500), "fault"],
      [new ApiError("/projects", 401), "sign-in"],
      [new ApiError("/projects/x", 404), "not-found"],
      [new ApiError("/upload", 413), "too-big"],
      [new ApiError("/x", 429), "busy"],
      [new ApiError("/x", 504), "timeout"],
      [new Error("API /x timed out after 15000 ms."), "timeout"],
      [new TypeError("Failed to fetch. Cannot reach the Kiungo API at http://127.0.0.1:8000."), "offline"],
      ["weird", "fault"],
    ];
    for (const [err, kind] of cases) {
      expect(errorKind(err)).toBe(kind);
      const text = describeError(err, "Your project wasn't saved");
      expect(text).toBe(`Your project wasn't saved. ${NEXT_STEP[kind]}`);
      expect(text).not.toMatch(DEV_WORDS);
    }
    expect(NEXT_STEP.fault).toMatch(/logged/);
  });

  it("says you're offline when the browser is", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    expect(errorKind(new ApiError("/x", 500))).toBe("offline");
    vi.restoreAllMocks();
  });

  it("logs the technical details for System Diagnostics, with what the person saw", () => {
    describeError(new Error("Cannot read properties of undefined (reading 'x')"), "That didn't work");
    expect(readDiagnostics().errors.at(-1)).toMatchObject({ source: "action", message: "Cannot read properties of undefined (reading 'x')", shown: "That didn't work. We've logged the problem and will look into it. Try again in a moment." });
    // A missing sign-in isn't a fault: nothing logged.
    const n = readDiagnostics().errors.length;
    describeError(new ApiError("/x", 401), "Couldn't open the project");
    expect(readDiagnostics().errors).toHaveLength(n);
    expect(storageError("The record wasn't saved")).toMatch(/^The record wasn't saved\. This browser isn't letting Kiungo save data/);
  });

  it("adds what the person saw to the entry the request already logged, instead of logging twice", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: "boom" }), { status: 502 })));
    const err = await api.getAnalytics().catch((e: unknown) => e);
    const before = readDiagnostics().errors.length;
    const shown = describeError(err, "Analytics didn't load");
    expect(readDiagnostics().errors).toHaveLength(before);
    expect(readDiagnostics().errors.at(-1)).toMatchObject({ source: "request", message: "API /analytics failed: 502", shown });
  });

  it("also sends each logged error to the backend's error collector", () => {
    const beacon = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, "sendBeacon", { configurable: true, value: beacon });
    describeError(new Error("x"), "Nope");
    expect(beacon).toHaveBeenCalledTimes(1);
    expect(String(beacon.mock.calls[0][0])).toMatch(/\/telemetry\/error$/);
    delete (navigator as unknown as { sendBeacon?: unknown }).sendBeacon;
  });
});

describe("How it looks", () => {
  it("an inline notice with an optional Try again", () => {
    const retry = vi.fn();
    render(<ErrorNotice message="Your file wasn't saved. Try again in a moment." onRetry={retry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Your file wasn't saved.");
    screen.getByRole("button", { name: /Try again/ }).click();
    expect(retry).toHaveBeenCalled();
  });

  it("a whole page that broke: plain words, a way out, a reference, and the details logged", async () => {
    const err = Object.assign(new Error("Minified React error #31"), { digest: "abc123" });
    render(<ErrorScreen error={err} retry={() => {}} />);
    expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();
    expect(screen.getByRole("alert").textContent).not.toMatch(/Minified|#31/);
    expect(screen.getByRole("link", { name: "Go home" })).toHaveAttribute("href", "/");
    await waitFor(() => expect(screen.getByText("Reference abc123")).toBeInTheDocument());
    expect(readDiagnostics().errors.at(-1)).toMatchObject({ source: "render", message: "Minified React error #31", shown: "Something went wrong" });
  });
});
