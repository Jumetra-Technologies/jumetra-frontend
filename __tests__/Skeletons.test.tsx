import { readFileSync, readdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";
import type { ComponentType } from "react";
import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppShell, FULL_BLEED_ROUTES } from "@/components/layout/sidebar";
import { FOOTER } from "@/lib/landing/content";

let pathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

const APP = join(process.cwd(), "app");
const files = (readdirSync(APP, { recursive: true }) as string[]).map((f) => `/${f.replaceAll("\\", "/")}`);
const route = (file: string) => file.replace(/\/(page|loading)\.tsx$/, "") || "/";
const pageFiles = files.filter((f) => f.endsWith("/page.tsx"));
const loaders: Record<string, { default: ComponentType }> = Object.fromEntries(
  await Promise.all(files.filter((f) => f.endsWith("/loading.tsx")).map(async (f) => [f, (await import(/* @vite-ignore */ join(APP, f))) as { default: ComponentType }] as const)),
);

afterEach(() => {
  pathname = "/";
});

describe("Every page loads its frame first", () => {
  it("has a loading view for every route that renders data or heavy client code", () => {
    const withLoader = new Set(Object.keys(loaders).map(route));
    const allRoutes = pageFiles.map(route);
    // /settings only redirects; everything else gets its own skeleton (Home uses the root one).
    const missing = allRoutes.filter((r) => r !== "/settings" && r !== "/" && !withLoader.has(r));
    expect(missing).toEqual([]);
  });

  it.each(Object.entries(loaders))("%s shows a labeled skeleton, never a spinner", (file, mod) => {
    pathname = route(file).replace(/\[[^\]]+\]/g, "x");
    const Loading = mod.default;
    const { container } = render(<Loading />);
    const region = screen.getAllByRole("status")[0];
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(region.textContent).toMatch(/Loading/);
    expect(container.querySelector(".hhip-skeleton")).not.toBeNull();
    expect(container.querySelector("[data-testid=kiungo-loader]")).toBeNull();
  });

  it("shows the page's real title while its data loads, so nothing jumps when it arrives", async () => {
    const Analytics = loaders["/analytics/loading.tsx"].default;
    render(<Analytics />);
    expect(screen.getByRole("heading", { name: "Analytics" })).toBeInTheDocument();
  });

  it("no page draws its own shell any more; the root layout does, once", () => {
    const hits = execSync("grep -rln '<DashboardShell' app || true", { encoding: "utf8" }).trim();
    expect(hits).toBe("");
    const layout = readFileSync(join(process.cwd(), "app/layout.tsx"), "utf8");
    expect(layout).toMatch(/<AppShell>\{children\}<\/AppShell>/);
  });
});

describe("AppShell", () => {
  it("lights the nav item for the current URL, including pages below it", () => {
    pathname = "/docs/system-overview/what-is-kiungo";
    render(
      <AppShell>
        <p>content</p>
      </AppShell>,
    );
    const nav = screen.getAllByRole("navigation")[0];
    expect(within(nav).getByRole("link", { name: /Documentation/ })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: /Learning Center/ })).not.toHaveAttribute("aria-current");
  });

  it("marks the current page for assistive tech and pads ordinary pages", () => {
    pathname = "/experiments/e-12";
    render(
      <AppShell>
        <p>content</p>
      </AppShell>,
    );
    const current = screen.getAllByRole("link", { current: "page" });
    expect(current.map((l) => l.textContent)).toContain("Experiment Records");
    expect(screen.getByText("content").parentElement).toHaveClass("max-w-7xl");
  });

  it("lets full-bleed pages fill the content area", () => {
    for (const p of FULL_BLEED_ROUTES) {
      pathname = p;
      const { unmount } = render(
        <AppShell>
          <p>content</p>
        </AppShell>,
      );
      expect(screen.getByText("content").parentElement).not.toHaveClass("max-w-7xl");
      expect(screen.getByTestId("app-main")).toHaveClass("overflow-hidden");
      unmount();
    }
  });
});

describe("Company name", () => {
  it("credits Kiungo Labs Technologies, not Jumetra Technologies, everywhere in the UI", () => {
    expect(FOOTER.about).toMatch(/Kiungo Labs Technologies/);
    expect(FOOTER.copyright).toMatch(/Kiungo Labs Technologies/);
    // Repository names and the GitHub organization URL are addresses, not wording, and stay.
    const hits = execSync("grep -rn 'Jumetra' app components lib --include=*.ts --include=*.tsx || true", { encoding: "utf8" })
      .split("\n")
      .filter(Boolean)
      .filter((line) => !/github\.com\/Jumetra-Technologies|Jumetra-Backend/.test(line));
    expect(hits).toEqual([]);
  });
});
