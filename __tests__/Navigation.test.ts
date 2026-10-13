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

describe("Documentation holds Architecture and Roadmap", () => {
  it("drops them from the sidebar, redirects their old URLs, and lists them on the Documentation home", async () => {
    const { DOC_PAGES } = await import("@/lib/learning/doc-pages");
    expect(NAV_ITEMS.map((item) => item.href)).not.toEqual(expect.arrayContaining(["/architecture"]));
    expect(NAV_ITEMS.map((item) => item.href)).not.toContain("/roadmap");
    expect(NAV_ITEMS.map((item) => item.href)).toContain("/docs");
    const redirects = (await nextConfig.redirects?.()) ?? [];
    expect(redirects).toEqual(expect.arrayContaining([
      { source: "/architecture", destination: "/docs/architecture", permanent: true },
      { source: "/roadmap", destination: "/docs/roadmap", permanent: true },
    ]));
    expect(DOC_PAGES.map((p) => p.href)).toEqual(["/docs/architecture", "/docs/roadmap"]);
    const { getSearchEntries } = await import("@/lib/learning");
    expect(getSearchEntries().find((e) => e.href === "/docs/roadmap")?.tags).toContain("hhip");
  });
});
