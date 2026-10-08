import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { HeroBoard } from "@/components/landing/HeroBoard";
import { HybridSwitch } from "@/components/landing/HybridSwitch";
import { LandingPage } from "@/components/landing/LandingPage";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { HARDWARE_ASSETS } from "@/lib/hardware/asset-data";
import { COUNTS, FOOTER, HERO, HYBRID, LEARN, LIBRARY, SEO, SIGN_UP, SIMULATE, structuredData } from "@/lib/landing/content";
import { ARTICLES, DOC_CATEGORIES, FAQ_ITEMS, MODULES, getArticle, getModule } from "@/lib/learning";
import { LEGAL_DOCUMENTS, getLegalDocument } from "@/lib/legal/content";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

const STATIC_ROUTES = new Set([...NAV_ITEMS.map((item) => item.href), "/legal"]);

/** True when an internal href points at a page or anchor that exists. */
export function routeExists(href: string): boolean {
  if (/^https?:\/\//.test(href)) return true;
  const [path, fragment] = href.split("#");
  if (path === "/learn" && fragment) return fragment === "faq" || FAQ_ITEMS.some((item) => `faq-${item.id}` === fragment);
  if (STATIC_ROUTES.has(path)) return true;
  const parts = path.split("/").filter(Boolean);
  if (parts[0] === "docs" && parts.length === 2) return DOC_CATEGORIES.some((category) => category.id === parts[1]);
  if (parts[0] === "docs" && parts.length === 3) return Boolean(getArticle(parts[1], parts[2]));
  if (parts[0] === "learn" && parts.length === 2) return Boolean(getModule(parts[1]));
  if (parts[0] === "legal" && parts.length === 2) return Boolean(getLegalDocument(parts[1]));
  return false;
}

describe("landing copy", () => {
  it("keeps the search title and description within limits", () => {
    expect(SEO.title.length).toBeLessThanOrEqual(60);
    expect(SEO.description.length).toBeLessThanOrEqual(160);
    expect(SEO.title).toMatch(/Arduino/);
  });

  it("counts parts and modules from the code, not by hand", () => {
    expect(COUNTS.parts).toBe(Object.keys(HARDWARE_ASSETS).length);
    expect(COUNTS.boards).toBe(4);
    expect(COUNTS.modules).toBe(MODULES.length);
    expect(COUNTS.articles).toBe(ARTICLES.length);
    expect(LEARN.body).toContain(`${MODULES.length} short modules`);
    expect(LIBRARY.body).toContain(`${COUNTS.parts} parts`);
  });

  it("links every call to action and footer link to a page that exists", () => {
    const hrefs = [
      HERO.primary.href,
      HERO.secondary.href,
      SIMULATE.cta.href,
      LEARN.cta.href,
      LIBRARY.cta.href,
      HYBRID.cta.href,
      SIGN_UP.cta.href,
      ...FOOTER.columns.flatMap((column) => column.links.map((link) => link.href)),
    ];
    expect(hrefs.filter((href) => !routeExists(href))).toEqual([]);
  });

  it("names the four story actions the way the brief asked", () => {
    expect(HERO.primary.label).toBe("Build a robot now");
    expect(LEARN.cta.href).toBe("/learn");
    expect(LIBRARY.cta.href).toBe("/components");
    expect(FOOTER.columns.map((column) => column.title)).toEqual(["Product", "Learn", "Legal", "About"]);
  });

  it("describes the app for search engines without inventing a site address", () => {
    const data = structuredData();
    expect(data["@type"]).toBe("SoftwareApplication");
    expect(data).not.toHaveProperty("url");
    expect(structuredData("https://example.test").url).toBe("https://example.test");
    expect(data.offers.price).toBe("0");
  });
});

describe("legal documents", () => {
  it("has unique slugs, a summary, headings and a way to get in touch", () => {
    const slugs = LEGAL_DOCUMENTS.map((document) => document.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs).toEqual(["terms", "user-agreement", "acceptable-use", "privacy", "cookies"]);
    for (const document of LEGAL_DOCUMENTS) {
      expect(document.summary.length, document.slug).toBeGreaterThan(20);
      expect(document.blocks.some((block) => block.type === "h2"), document.slug).toBe(true);
      expect(document.blocks.some((block) => block.type === "h2" && block.text === "Contact"), document.slug).toBe(true);
      expect(/^\d{4}-\d{2}-\d{2}$/.test(document.revised), document.slug).toBe(true);
    }
  });

  it("links only to pages that exist", () => {
    const pattern = /\[[^\]]+\]\(([^)\s]+)\)/g;
    const broken: string[] = [];
    for (const document of LEGAL_DOCUMENTS) {
      const texts = document.blocks.flatMap((block) => {
        if ("text" in block) return [block.text];
        if ("items" in block) return block.items;
        if (block.type === "table") return block.rows.flat();
        return [];
      });
      for (const text of texts) {
        for (const match of text.matchAll(pattern)) if (!routeExists(match[1])) broken.push(`${document.slug}: ${match[1]}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it("lists every browser storage key the app uses in the cookie policy", () => {
    const cookies = getLegalDocument("cookies")!;
    const table = cookies.blocks.find((block) => block.type === "table");
    const keys = table && table.type === "table" ? table.rows.map((row) => row[0]) : [];
    for (const key of ["hhip-auth-session", "hhip-account", "hhip-robotics-workspace:v1", "hhip.lab:v1", "hhip-learning-progress:v1", "hhip-theme", "hhip-sidebar-collapsed"]) {
      expect(keys.some((cell) => cell.includes(key)), key).toBe(true);
    }
  });
});

describe("LandingPage", () => {
  beforeEach(() => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 1);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("tells the story in order with one main heading", () => {
    render(<LandingPage />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent("You don't need every component to build a robot.");
    const h2s = screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
    expect(h2s[0]).toMatch(/simulates all the components/);
    expect(h2s[1]).toMatch(/learning path/);
    expect(h2s[2]).toMatch(/component library/);
    expect(h2s[3]).toMatch(/Plug it in/);
    expect(h2s[4]).toMatch(/Save your work/);
  });

  it("puts a real action under every beat", () => {
    render(<LandingPage />);
    expect(screen.getAllByRole("link", { name: "Build a robot now" })[0]).toHaveAttribute("href", "/laboratory/workspace");
    expect(screen.getByRole("link", { name: "Start the learning path" })).toHaveAttribute("href", "/learn");
    expect(screen.getByRole("link", { name: "Open the component library" })).toHaveAttribute("href", "/components");
    expect(screen.getByRole("link", { name: "See how hybrid works" })).toHaveAttribute("href", "/docs/technical-guides/device-modes");
    expect(screen.getByRole("button", { name: /Continue with Google/ })).toBeInTheDocument();
  });

  it("shows live simulated readings and the learning path stages", () => {
    render(<LandingPage />);
    const parts = screen.getByTestId("live-parts");
    expect(within(parts).getByText("DHT11, simulated")).toBeInTheDocument();
    expect(within(parts).getByText("HC-SR04, simulated")).toBeInTheDocument();
    expect(within(parts).getByText("Servo, simulated")).toBeInTheDocument();
    const stages = screen.getByRole("list", { name: "Learning path stages" });
    expect(within(stages).getAllByRole("link")).toHaveLength(5);
    expect(within(stages).getByRole("link", { name: /Foundations/ })).toHaveAttribute("href", "/learn/getting-started-with-hhip");
  });

  it("lists every part in the library section", () => {
    render(<LandingPage />);
    const list = screen.getByTestId("parts-list");
    for (const asset of Object.values(HARDWARE_ASSETS)) {
      expect(within(list).getByText(asset.metadata.name)).toBeInTheDocument();
    }
    expect(within(list).getByRole("link", { name: "DHT11" })).toHaveAttribute("href", "/docs/hardware-knowledge/dht11");
  });

  it("has a footer with the legal documents and the trademark note", () => {
    render(<LandingPage />);
    const footer = screen.getByTestId("site-footer");
    for (const label of ["Terms of Service", "User Agreement", "Acceptable Use Policy", "Privacy Policy", "Cookie Policy"]) {
      expect(within(footer).getByRole("link", { name: label })).toHaveAttribute("href", expect.stringMatching(/^\/legal\//));
    }
    expect(within(footer).getByText(/Arduino is a trademark/)).toBeInTheDocument();
    expect(within(footer).getByRole("link", { name: "GitHub" })).toHaveAttribute("target", "_blank");
  });
});

describe("HeroBoard", () => {
  beforeEach(() => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 1);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("runs Blink when the pin-13 LED is pressed, with a link to the module", () => {
    render(<HeroBoard hint="Drag to turn the board." />);
    const led = screen.getByRole("switch", { name: /Pin 13 LED/ });
    expect(led).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText("Drag to turn the board.")).toBeInTheDocument();
    fireEvent.click(led);
    expect(led).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("link", { name: /Learn it in 20 minutes/ })).toHaveAttribute("href", "/learn/blink-an-led-with-arduino");
    fireEvent.keyDown(led, { key: " " });
    expect(led).toHaveAttribute("aria-checked", "false");
  });

  it("turns with the arrow keys and when dragged, but not when the LED is pressed", () => {
    render(<HeroBoard hint="" />);
    const scene = screen.getByTestId("hero-board");
    const spin = () => parseFloat(scene.style.getPropertyValue("--spin"));
    fireEvent.keyDown(scene, { key: "ArrowRight" });
    const before = spin();
    fireEvent.keyDown(scene, { key: "ArrowRight" });
    expect(spin()).toBeCloseTo(before + 15);

    // jsdom has no PointerEvent; a MouseEvent under the pointer name carries button and coordinates.
    const pointer = (target: Element, type: string, init: MouseEventInit) =>
      target.dispatchEvent(new MouseEvent(type, { bubbles: true, button: 0, ...init }));
    pointer(scene, "pointerdown", { clientX: 100, clientY: 100 });
    expect(scene).toHaveAttribute("data-dragging");
    pointer(scene, "pointermove", { clientX: 140, clientY: 120 });
    pointer(scene, "pointerup", {});
    expect(scene).not.toHaveAttribute("data-dragging");
    expect(spin()).toBeCloseTo(before + 15 + 40 * 0.45, 1);
    expect(parseFloat(scene.style.getPropertyValue("--tilt"))).toBeCloseTo(52 - 20 * 0.3, 1);

    pointer(screen.getByRole("switch"), "pointerdown", { clientX: 0, clientY: 0 });
    expect(scene).not.toHaveAttribute("data-dragging");
  });
});

describe("HybridSwitch", () => {
  it("explains each device mode as it is chosen", () => {
    render(<HybridSwitch />);
    expect(screen.getByRole("radio", { name: "Hybrid" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText(/real board on the bench/)).toBeInTheDocument();
    act(() => {
      fireEvent.click(screen.getByRole("radio", { name: "Virtual" }));
    });
    expect(screen.getByText(/Everything runs in the simulator/)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Virtual mode/ })).toBeInTheDocument();
  });
});
