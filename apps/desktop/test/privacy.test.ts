// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { readPrivacy, setUsageCounting } from "../src/main/account/privacy";

const account = (data: unknown) => ({ request: vi.fn(async () => ({ status: 200, headers: new Headers(), data })) });

describe("the account's privacy choices", () => {
  it("reads usage counting from the account, null when never asked", async () => {
    expect(await readPrivacy(account({ usage: true, crash_reports: null, decided_at: "2026-11-01T10:00:00Z", decided_in: "website" }))).toEqual({ usage: true, decidedAt: "2026-11-01T10:00:00Z" });
    expect(await readPrivacy(account({ usage: null, crash_reports: null, decided_at: null, decided_in: null }))).toEqual({ usage: null, decidedAt: null });
    expect(await readPrivacy(account(null))).toEqual({ usage: null, decidedAt: null });
  });

  it("saves the answer on the account, marked as made in the desktop app", async () => {
    const client = account({ usage: false, decided_at: "2026-11-13T08:00:00Z" });
    expect(await setUsageCounting(client, false)).toEqual({ usage: false, decidedAt: "2026-11-13T08:00:00Z" });
    expect(client.request).toHaveBeenCalledWith("/auth/me/consents", { method: "PUT", body: { usage: false, decided_in: "desktop" } });
  });

  it("refuses anything but on or off", async () => {
    const client = account({});
    await expect(setUsageCounting(client, "yes")).rejects.toThrow(/on or off/);
    expect(client.request).not.toHaveBeenCalled();
  });
});
