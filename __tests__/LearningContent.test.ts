import { describe, expect, it } from "vitest";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { getHeadings } from "@/components/learning/ContentRenderer";
import {
  ARTICLES,
  DOC_CATEGORIES,
  FAQ_ITEMS,
  MODULES,
  articleKey,
  collectInternalHrefs,
  getArticle,
  getArticleByKey,
  getModule,
  getSearchEntries,
} from "@/lib/learning";
import type { Block } from "@/lib/learning/types";

const STATIC_ROUTES = new Set(NAV_ITEMS.map((item) => item.href));
const FAQ_ANCHORS = new Set(FAQ_ITEMS.map((item) => `faq-${item.id}`));

function isKnownInternalHref(href: string): boolean {
  if (/^https?:\/\//i.test(href)) return true;
  const [pathAndQuery, fragment] = href.split("#");
  const path = pathAndQuery.split("?")[0];

  if (fragment && path === "/learn" && fragment.startsWith("faq-") && !FAQ_ANCHORS.has(fragment)) {
    return false;
  }
  if (STATIC_ROUTES.has(path)) return true;

  const parts = path.split("/").filter(Boolean);
  if (parts[0] === "docs" && parts.length === 2) {
    return DOC_CATEGORIES.some((category) => category.id === parts[1]);
  }
  if (parts[0] === "docs" && parts.length === 3) {
    return Boolean(getArticle(parts[1], parts[2]));
  }
  if (parts[0] === "learn" && parts.length === 2) {
    return Boolean(getModule(parts[1]));
  }
  return false;
}

describe("documentation articles", () => {
  it("has unique category/slug keys", () => {
    const keys = ARTICLES.map(articleKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("uses only valid article categories (tutorials live in /learn)", () => {
    const valid = new Set(DOC_CATEGORIES.map((category) => category.id));
    for (const article of ARTICLES) {
      expect(valid.has(article.category)).toBe(true);
      expect(article.category).not.toBe("tutorials");
    }
  });

  it("covers every article category from the spec", () => {
    for (const category of DOC_CATEGORIES.filter((c) => c.id !== "tutorials")) {
      expect(ARTICLES.some((article) => article.category === category.id)).toBe(true);
    }
  });

  it("gives every article a summary, tags, and body", () => {
    for (const article of ARTICLES) {
      expect(article.summary.length, article.slug).toBeGreaterThan(20);
      expect(article.tags.length, article.slug).toBeGreaterThan(0);
      expect(article.blocks.length, article.slug).toBeGreaterThan(1);
    }
  });

  it("resolves every related article key", () => {
    for (const article of ARTICLES) {
      for (const key of article.related ?? []) {
        expect(getArticleByKey(key), `${articleKey(article)} -> ${key}`).toBeDefined();
      }
    }
  });
});

describe("learning modules", () => {
  it("has unique slugs and a contiguous 1..N order", () => {
    const slugs = MODULES.map((lesson) => lesson.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(MODULES.map((lesson) => lesson.order)).toEqual(MODULES.map((_, index) => index + 1));
  });

  it("gives every module objectives, a realistic duration, and a body", () => {
    for (const lesson of MODULES) {
      expect(lesson.objectives.length, lesson.slug).toBeGreaterThan(0);
      expect(lesson.minutes, lesson.slug).toBeGreaterThan(0);
      expect(lesson.minutes, lesson.slug).toBeLessThanOrEqual(60);
      expect(lesson.blocks.length, lesson.slug).toBeGreaterThan(2);
    }
  });

  it("resolves every relatedDocs key", () => {
    for (const lesson of MODULES) {
      for (const key of lesson.relatedDocs ?? []) {
        expect(getArticleByKey(key), `${lesson.slug} -> ${key}`).toBeDefined();
      }
    }
  });

  it("covers the Arduino, ESP32, and sensor basics", () => {
    const topics = new Set(MODULES.map((lesson) => lesson.topic));
    for (const topic of ["foundations", "arduino", "esp32", "sensors", "hybrid"] as const) {
      expect(topics.has(topic), topic).toBe(true);
    }
  });
});

describe("content links", () => {
  it("never links to a page that does not exist", () => {
    const broken = collectInternalHrefs().filter(({ href }) => !isKnownInternalHref(href));
    expect(broken).toEqual([]);
  });

  it("finds a healthy number of cross-links", () => {
    expect(collectInternalHrefs().length).toBeGreaterThan(30);
  });
});

describe("content structure", () => {
  const pages: Array<{ id: string; blocks: Block[] }> = [
    ...ARTICLES.map((article) => ({ id: articleKey(article), blocks: article.blocks })),
    ...MODULES.map((lesson) => ({ id: `learn/${lesson.slug}`, blocks: lesson.blocks })),
  ];

  it("keeps table rows the same width as their header", () => {
    for (const page of pages) {
      for (const block of page.blocks) {
        if (block.type !== "table") continue;
        for (const row of block.rows) {
          expect(row.length, `${page.id}: ${row[0]}`).toBe(block.head.length);
        }
      }
    }
  });

  it("labels every code block with a language", () => {
    for (const page of pages) {
      for (const block of page.blocks) {
        if (block.type === "code") {
          expect(block.language.length, page.id).toBeGreaterThan(0);
          expect(block.code.trim().length, page.id).toBeGreaterThan(0);
        }
      }
    }
  });

  it("produces unique heading ids on every page", () => {
    for (const page of pages) {
      const ids = getHeadings(page.blocks).map((heading) => heading.id);
      expect(new Set(ids).size, page.id).toBe(ids.length);
    }
  });
});

describe("search index", () => {
  it("indexes every article, module, and FAQ entry exactly once", () => {
    const entries = getSearchEntries();
    expect(entries).toHaveLength(ARTICLES.length + MODULES.length + FAQ_ITEMS.length);
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(entries.length);
  });
});
