import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api-client";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("engineering workspace API requests", () => {
  it("times out when workspace creation never receives a response", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), {
          once: true,
        });
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const request = api.createEngineeringWorkspace({ name: "Engineering Lab" });
    const rejection = expect(request).rejects.toThrow("timed out after 15000 ms");
    await vi.advanceTimersByTimeAsync(15_000);

    await rejection;
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});