import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { ContentRenderer } from "@/components/learning/ContentRenderer";
import { DocsSearch } from "@/components/learning/DocsSearch";
import { MarkCompleteButton, PathProgress } from "@/components/learning/ProgressControls";
import { TableOfContents } from "@/components/learning/TableOfContents";
import type { Block } from "@/lib/learning/types";
import { setModuleComplete } from "@/lib/learning/progress";
import { act } from "react";

const SAMPLE_BLOCKS: Block[] = [
  { type: "h2", text: "Wire it" },
  { type: "p", text: "Use `GND` and **5 V**, then read [the docs](/docs)." },
  { type: "callout", tone: "warning", title: "Careful", text: "3.3 V logic only." },
  { type: "table", head: ["Pin", "Use"], rows: [["D2", "DATA"]], caption: "Wiring" },
  { type: "code", language: "cpp", filename: "blink.ino", code: "void setup() {}" },
  { type: "h3", text: "Details" },
  { type: "link-card", href: "/learn", title: "Learning Center", text: "Start here." },
];

describe("ContentRenderer", () => {
  it("renders headings with anchor ids", () => {
    render(<ContentRenderer blocks={SAMPLE_BLOCKS} />);
    expect(screen.getByRole("heading", { level: 2, name: "Wire it" })).toHaveAttribute("id", "wire-it");
    expect(screen.getByRole("heading", { level: 3, name: "Details" })).toHaveAttribute("id", "details");
  });

  it("renders inline code, bold, and links", () => {
    render(<ContentRenderer blocks={SAMPLE_BLOCKS} />);
    expect(screen.getByText("GND").tagName).toBe("CODE");
    expect(screen.getByText("5 V").tagName).toBe("STRONG");
    expect(screen.getByRole("link", { name: "the docs" })).toHaveAttribute("href", "/docs");
  });

  it("renders callouts, tables, and code with a copy button", () => {
    render(<ContentRenderer blocks={SAMPLE_BLOCKS} />);
    expect(screen.getByRole("note")).toHaveTextContent("Careful");
    const table = screen.getByRole("table", { name: "Wiring" });
    expect(within(table).getByRole("columnheader", { name: "Pin" })).toBeInTheDocument();
    expect(within(table).getByRole("cell", { name: "DATA" })).toBeInTheDocument();
    expect(screen.getByText("void setup() {}")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy code/i })).toBeInTheDocument();
  });

  it("renders link cards as links", () => {
    render(<ContentRenderer blocks={SAMPLE_BLOCKS} />);
    expect(screen.getByRole("link", { name: /Learning Center/ })).toHaveAttribute("href", "/learn");
  });

  it("disambiguates repeated headings", () => {
    render(
      <ContentRenderer
        blocks={[
          { type: "h2", text: "Notes" },
          { type: "h2", text: "Notes" },
        ]}
      />,
    );
    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings.map((heading) => heading.id)).toEqual(["notes", "notes-2"]);
  });
});

describe("TableOfContents", () => {
  it("lists headings as anchors", () => {
    render(<TableOfContents blocks={SAMPLE_BLOCKS} />);
    expect(screen.getByRole("link", { name: "Wire it" })).toHaveAttribute("href", "#wire-it");
    expect(screen.getByRole("link", { name: "Details" })).toHaveAttribute("href", "#details");
  });

  it("renders nothing when a page has fewer than two sections", () => {
    const { container } = render(<TableOfContents blocks={[{ type: "h2", text: "Only one" }]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("DocsSearch", () => {
  it("shows suggestions before typing and results after", () => {
    render(<DocsSearch />);
    expect(screen.getByRole("button", { name: "ESP32" })).toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "dht11" } });
    expect(screen.getByRole("link", { name: /DHT11 temperature and humidity sensor/ })).toHaveAttribute(
      "href",
      "/docs/hardware-knowledge/dht11",
    );
    expect(screen.getByText(/results?$/)).toBeInTheDocument();
  });

  it("fills the query from a suggestion", () => {
    render(<DocsSearch />);
    fireEvent.click(screen.getByRole("button", { name: "ESP32" }));
    expect(screen.getByRole("searchbox")).toHaveValue("ESP32");
  });

  it("shows an empty state and can be cleared", () => {
    render(<DocsSearch />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "zzzznotaword" } });
    expect(screen.getByText(/No results for/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByRole("searchbox")).toHaveValue("");
  });

  it("limits results to tutorials and FAQ-first when scoped to learn", () => {
    render(<DocsSearch scope="learn" />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "5v esp32" } });
    expect(screen.getAllByRole("link").length).toBeGreaterThan(0);
  });
});

describe("learning progress UI", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("toggles a module complete and persists it", () => {
    render(<MarkCompleteButton slug="electronics-basics" />);
    const button = screen.getByRole("button", { name: /mark module complete/i });
    expect(button).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(button);
    expect(screen.getByRole("button", { name: /completed/i })).toHaveAttribute("aria-pressed", "true");
    expect(window.localStorage.getItem("hhip-learning-progress:v1")).toBe('["electronics-basics"]');

    fireEvent.click(screen.getByRole("button", { name: /completed/i }));
    expect(screen.getByRole("button", { name: /mark module complete/i })).toBeInTheDocument();
  });

  it("reflects stored progress in the path progress bar", () => {
    setModuleComplete("a", true);
    render(<PathProgress slugs={["a", "b", "c", "d"]} />);
    expect(screen.getByText("1 of 4 modules complete")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Learning path progress" })).toHaveAttribute("aria-valuenow", "1");
  });

  it("updates when progress changes elsewhere on the page", () => {
    render(<PathProgress slugs={["a", "b"]} />);
    expect(screen.getByText("0 of 2 modules complete")).toBeInTheDocument();
    act(() => {
      setModuleComplete("b", true);
    });
    expect(screen.getByText("1 of 2 modules complete")).toBeInTheDocument();
  });
});
