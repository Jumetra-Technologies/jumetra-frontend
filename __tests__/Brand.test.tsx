import { execSync } from "node:child_process";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { KiungoLoader, KiungoLogo, KiungoMark } from "@/components/brand/KiungoMark";
import NotFound from "@/app/not-found";
import { parseProgress } from "@/lib/learning/progress";
import { getArticle } from "@/lib/learning";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => "/" }));

describe("Kiungo mark", () => {
  it("draws the logo's parts: five beads, the stem, two traces and two pads", () => {
    const { container } = render(<KiungoMark />);
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg.querySelectorAll('[class*="bead"]:not([class*="beads"])')).toHaveLength(5);
    expect(svg.querySelectorAll('[class*="trace"]')).toHaveLength(2);
    expect(svg.querySelectorAll('[class*="node"]')).toHaveLength(2);
    expect(svg.dataset.state).toBe("still");
  });

  it("can be named for assistive tech, and shows the name beside it", () => {
    render(<KiungoMark title="Kiungo" />);
    expect(screen.getByRole("img", { name: "Kiungo" })).toBeInTheDocument();
    render(<KiungoLogo variant="full" />);
    expect(screen.getByText("Kiungo")).toBeInTheDocument();
    expect(screen.getByText("Labs Technologies")).toBeInTheDocument();
  });

  it("announces loading once, with the animated mark", () => {
    render(<KiungoLoader label="Setting up the lab" />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Setting up the lab…");
    expect(status.querySelector("svg")!.dataset.state).toBe("loading");
  });

  it("shows a broken link on the 404 page", () => {
    render(<NotFound />);
    expect(screen.getByRole("heading", { name: "This link is broken" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /two links pulled apart/ }).dataset.state).toBe("broken");
  });
});

describe("rename", () => {
  it("keeps progress on the renamed first module", () => {
    expect(parseProgress('["getting-started-with-hhip","electronics-basics"]')).toEqual(["getting-started-with-kiungo", "electronics-basics"]);
  });

  it("explains the name in the docs", () => {
    const article = getArticle("system-overview", "what-is-kiungo");
    expect(article?.title).toBe("What is Kiungo?");
    expect(JSON.stringify(article?.blocks)).toContain("Swahili for a link");
  });

  it("leaves HHIP only where it names the old product or a backend setting", () => {
    const hits = execSync("grep -rnw HHIP app components lib --include=*.ts --include=*.tsx || true", { encoding: "utf8" })
      .split("\n")
      .filter(Boolean)
      .filter((line) => !/formerly HHIP|became Kiungo|alternateName/.test(line));
    expect(hits).toEqual([]);
  });
});
