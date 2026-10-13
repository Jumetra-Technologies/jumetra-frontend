import { describe, expect, it } from "vitest";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import nextConfig from "@/next.config";

describe("Navigation", () => {
  it("has no System Diagnostics link; its old URL goes to Advanced Analytics", async () => {
    expect(NAV_ITEMS.some((item) => item.href === "/dashboard" || /diagnostics/i.test(item.label))).toBe(false);
    expect(NAV_ITEMS.some((item) => item.href === "/analytics")).toBe(true);
    const redirects = (await nextConfig.redirects?.()) ?? [];
    expect(redirects).toContainEqual({ source: "/dashboard", destination: "/analytics", permanent: true });
  });
});
