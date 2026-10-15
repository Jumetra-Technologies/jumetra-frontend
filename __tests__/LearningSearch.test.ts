import { beforeEach, describe, expect, it } from "vitest";
import { getSearchEntries } from "@/lib/learning";
import { isExternalHref, parseInline, slugify, stripInline } from "@/lib/learning/inline";
import {
  PROGRESS_STORAGE_KEY,
  parseProgress,
  readProgressRaw,
  serializeProgress,
  setModuleComplete,
} from "@/lib/learning/progress";
import { searchEntries, tokenize } from "@/lib/learning/search";
import type { SearchEntry } from "@/lib/learning/types";

describe("tokenize", () => {
  it("lowercases and splits on non-alphanumerics", () => {
    expect(tokenize("HC-SR04  Sensor!")).toEqual(["hc", "sr04", "sensor"]);
  });

  it("returns an empty list for blank input", () => {
    expect(tokenize("   ")).toEqual([]);
  });
});

describe("searchEntries", () => {
  const entries = getSearchEntries();

  it("returns nothing for an empty query", () => {
    expect(searchEntries(entries, "")).toEqual([]);
    expect(searchEntries(entries, "   ")).toEqual([]);
  });

  it("ranks a title match first", () => {
    const [top] = searchEntries(entries, "dht11");
    expect(top.entry.title.toLowerCase()).toContain("dht11");
  });

  it("finds hyphenated part names", () => {
    const results = searchEntries(entries, "hc-sr04");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((result) => result.entry.href === "/docs/hardware-knowledge/hc-sr04")).toBe(true);
  });

  it("requires every word to match (AND semantics)", () => {
    expect(searchEntries(entries, "dht11 zzzznotaword")).toEqual([]);
  });

  it("matches across fields, such as a FAQ about 5 V on an ESP32", () => {
    const results = searchEntries(entries, "esp32 5v");
    expect(results.some((result) => result.entry.kind === "faq")).toBe(true);
  });

  it("supports prefix matching on titles", () => {
    const results = searchEntries(entries, "temperat");
    expect(results.length).toBeGreaterThan(0);
  });

  it("respects the result limit and sorts by score", () => {
    const results = searchEntries(entries, "sensor", 3);
    expect(results.length).toBeLessThanOrEqual(3);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  it("weights titles above body text", () => {
    const sample: SearchEntry[] = [
      { id: "a", kind: "doc", title: "Unrelated", summary: "x", href: "/a", label: "A", tags: [], text: "servo servo servo" },
      { id: "b", kind: "doc", title: "Servo guide", summary: "x", href: "/b", label: "B", tags: [], text: "nothing" },
    ];
    expect(searchEntries(sample, "servo")[0].entry.id).toBe("b");
  });
});

describe("inline markup", () => {
  it("parses code, bold, and links", () => {
    expect(parseInline("Use `analogRead` for **analog** pins, see [docs](/docs).")).toEqual([
      { kind: "text", text: "Use " },
      { kind: "code", text: "analogRead" },
      { kind: "text", text: " for " },
      { kind: "bold", text: "analog" },
      { kind: "text", text: " pins, see " },
      { kind: "link", text: "docs", href: "/docs" },
      { kind: "text", text: "." },
    ]);
  });

  it("treats link syntax inside backticks as code", () => {
    expect(parseInline("`[label](/path)`")).toEqual([{ kind: "code", text: "[label](/path)" }]);
  });

  it("strips markers for indexing", () => {
    expect(stripInline("a `b` **c** [d](/e)")).toBe("a b c d");
  });

  it("builds stable URL-safe slugs", () => {
    expect(slugify("What is `Kiungo`?")).toBe("what-is-kiungo");
    expect(slugify("Wire it to an Arduino Uno")).toBe("wire-it-to-an-arduino-uno");
  });

  it("detects external links", () => {
    expect(isExternalHref("https://example.com")).toBe(true);
    expect(isExternalHref("/learn")).toBe(false);
  });
});

describe("learning progress storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("parses defensively", () => {
    expect(parseProgress(null)).toEqual([]);
    expect(parseProgress("")).toEqual([]);
    expect(parseProgress("not json")).toEqual([]);
    expect(parseProgress('{"a":1}')).toEqual([]);
    expect(parseProgress('["a", 3, "b", "a"]')).toEqual(["a", "b"]);
  });

  it("round-trips unique slugs", () => {
    expect(parseProgress(serializeProgress(["a", "b", "a"]))).toEqual(["a", "b"]);
  });

  it("marks modules complete and incomplete", () => {
    setModuleComplete("electronics-basics", true);
    setModuleComplete("esp32-first-steps", true);
    expect(parseProgress(readProgressRaw())).toEqual(["electronics-basics", "esp32-first-steps"]);

    setModuleComplete("electronics-basics", false);
    expect(parseProgress(readProgressRaw())).toEqual(["esp32-first-steps"]);
    expect(window.localStorage.getItem(PROGRESS_STORAGE_KEY)).toBe('["esp32-first-steps"]');
  });

  it("notifies subscribers when progress changes", async () => {
    const { subscribeProgress } = await import("@/lib/learning/progress");
    let calls = 0;
    const unsubscribe = subscribeProgress(() => {
      calls += 1;
    });
    setModuleComplete("a", true);
    expect(calls).toBe(1);
    unsubscribe();
    setModuleComplete("b", true);
    expect(calls).toBe(1);
  });
});
