import { readFileSync } from "node:fs";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { HeroActions } from "@/components/landing/HeroActions";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { FOOTER_ROUTES } from "@/components/layout/sidebar";
import { closeAccountDialog, useAccountDialog } from "@/lib/account-dialogs";
import { renderHook } from "@testing-library/react";
import { useAuthStore } from "@/lib/auth-store";

/** WCAG relative luminance and contrast of two #rrggbb colours. */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const css = readFileSync("app/globals.css", "utf8");
function palette(theme: string): Record<string, string> {
  const block = new RegExp(String.raw`\[data-theme="${theme}"\] \{([^}]*)\}`).exec(css)![1];
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}

describe("Colour themes are clear", () => {
  for (const theme of ["blue", "red", "green"]) {
    it(`${theme}: a solid sidebar with readable text, and real hierarchy on the page`, () => {
      const p = palette(theme);
      for (const key of ["sidebar", "sidebar-foreground", "sidebar-muted", "background", "foreground", "surface", "muted", "primary", "primary-foreground"]) {
        expect(p[key], key).toMatch(/^#[0-9a-f]{6}$/i);
      }
      expect(contrast(p["sidebar-foreground"], p.sidebar)).toBeGreaterThanOrEqual(10);
      expect(contrast(p["sidebar-muted"], p.sidebar)).toBeGreaterThanOrEqual(7);
      expect(contrast(p["primary-foreground"], p.sidebar)).toBeGreaterThanOrEqual(10);
      expect(contrast(p.foreground, p.background)).toBeGreaterThanOrEqual(12);
      expect(contrast(p.muted, p.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p["primary-foreground"], p.primary)).toBeGreaterThanOrEqual(4.5);
      expect(p.surface).toBe("#ffffff");
    });
  }
  it("reverses the logo on the coloured sidebars", () => {
    expect(css).toMatch(/\[data-theme="blue"\] \[data-sidebar\][\s\S]*--kiungo-word: #ffffff/);
  });
});

describe("Home page", () => {
  beforeEach(() => closeAccountDialog());

  it("offers Log in next to Build a robot now when signed out, and it opens Continue with Google", () => {
    useAuthStore.setState({ isAuthenticated: false, isLoading: false, user: null });
    render(<HeroActions />);
    expect(screen.getByRole("link", { name: "Build a robot now" })).toHaveAttribute("href", "/laboratory/workspace");
    fireEvent.click(screen.getByTestId("hero-login"));
    expect(renderHook(() => useAccountDialog()).result.current).toMatchObject({ kind: "auth", mode: "login" });
  });

  it("offers the learning path instead once signed in", () => {
    useAuthStore.setState({ isAuthenticated: true, isLoading: false, user: { id: "u", email: "a@b.c", display_name: "A" } });
    render(<HeroActions />);
    expect(screen.getByRole("link", { name: "Take the learning path" })).toHaveAttribute("href", "/learn");
    expect(screen.queryByTestId("hero-login")).toBeNull();
  });

  it("closes with the brand footer, also on the Learning Center and Documentation", () => {
    render(<SiteFooter />);
    expect(screen.getByTestId("site-footer")).toHaveClass("kiungo-footer");
    expect(css).toMatch(/\.kiungo-footer \{[\s\S]*linear-gradient\(160deg, #077a7d/);
    expect(FOOTER_ROUTES).toEqual(["/learn", "/docs"]);
  });
});
