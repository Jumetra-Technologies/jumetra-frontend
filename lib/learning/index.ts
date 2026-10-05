import { DEVELOPER_ARTICLES } from "./content/docs-developer";
import { HARDWARE_ARTICLES } from "./content/docs-hardware";
import { SYSTEM_OVERVIEW_ARTICLES, TECHNICAL_GUIDE_ARTICLES } from "./content/docs-system";
import { FAQ_ITEMS } from "./content/faq";
import { LEARNING_MODULES } from "./content/modules";
import { DOC_CATEGORIES, TOPIC_LABELS, TOPIC_ORDER, getCategory } from "./categories";
import { stripInline } from "./inline";
import type {
  ArticleCategoryId,
  Block,
  DocArticle,
  DocCategoryId,
  FaqItem,
  LearningModule,
  ModuleTopic,
  SearchEntry,
} from "./types";

export { DOC_CATEGORIES, TOPIC_LABELS, TOPIC_ORDER, getCategory };
export { FAQ_ITEMS };
export type { ArticleCategoryId, DocArticle, DocCategoryId, FaqItem, LearningModule, ModuleTopic };

export const ARTICLES: DocArticle[] = [
  ...SYSTEM_OVERVIEW_ARTICLES,
  ...TECHNICAL_GUIDE_ARTICLES,
  ...HARDWARE_ARTICLES,
  ...DEVELOPER_ARTICLES,
];

/** Modules in guided-path order. */
export const MODULES: LearningModule[] = [...LEARNING_MODULES].sort((a, b) => a.order - b.order);

export function articleKey(article: Pick<DocArticle, "category" | "slug">): string {
  return `${article.category}/${article.slug}`;
}

export function articleHref(article: Pick<DocArticle, "category" | "slug">): string {
  return `/docs/${article.category}/${article.slug}`;
}

export function moduleHref(lesson: Pick<LearningModule, "slug">): string {
  return `/learn/${lesson.slug}`;
}

export function getArticle(category: string, slug: string): DocArticle | undefined {
  return ARTICLES.find((article) => article.category === category && article.slug === slug);
}

export function getArticleByKey(key: string): DocArticle | undefined {
  const [category, slug] = key.split("/");
  return category && slug ? getArticle(category, slug) : undefined;
}

export function getArticlesByCategory(category: string): DocArticle[] {
  return ARTICLES.filter((article) => article.category === category);
}

export function getModule(slug: string): LearningModule | undefined {
  return MODULES.find((lesson) => lesson.slug === slug);
}

export function getAdjacentModules(slug: string): {
  previous: LearningModule | undefined;
  next: LearningModule | undefined;
} {
  const index = MODULES.findIndex((lesson) => lesson.slug === slug);
  if (index === -1) return { previous: undefined, next: undefined };
  return { previous: MODULES[index - 1], next: MODULES[index + 1] };
}

export function getModulesByTopic(): Array<{ topic: ModuleTopic; label: string; modules: LearningModule[] }> {
  return TOPIC_ORDER.map((topic) => ({
    topic,
    label: TOPIC_LABELS[topic],
    modules: MODULES.filter((lesson) => lesson.topic === topic),
  })).filter((group) => group.modules.length > 0);
}

export function resolveRelatedArticles(keys: string[] | undefined): DocArticle[] {
  if (!keys) return [];
  return keys.map(getArticleByKey).filter((article): article is DocArticle => Boolean(article));
}

/** Plain text of a block list, with inline markers removed. Used for search and tests. */
export function flattenBlocksText(blocks: Block[]): string {
  const parts: string[] = [];
  for (const block of blocks) {
    switch (block.type) {
      case "h2":
      case "h3":
      case "p":
        parts.push(stripInline(block.text));
        break;
      case "ul":
      case "ol":
        parts.push(...block.items.map(stripInline));
        break;
      case "code":
        parts.push(block.code);
        break;
      case "callout":
        parts.push(stripInline([block.title, block.text].filter(Boolean).join(" ")));
        break;
      case "table":
        parts.push(...block.head.map(stripInline), ...block.rows.flat().map(stripInline));
        break;
      case "link-card":
        parts.push(block.title, stripInline(block.text));
        break;
    }
  }
  return parts.join(" ");
}

let cachedEntries: SearchEntry[] | undefined;

/** Every searchable item: reference articles, tutorials, and FAQ entries. */
export function getSearchEntries(): SearchEntry[] {
  if (cachedEntries) return cachedEntries;

  const docEntries: SearchEntry[] = ARTICLES.map((article) => ({
    id: `doc:${articleKey(article)}`,
    kind: "doc",
    title: article.title,
    summary: article.summary,
    href: articleHref(article),
    label: getCategory(article.category)?.title ?? "Documentation",
    tags: article.tags,
    text: flattenBlocksText(article.blocks),
  }));

  const moduleEntries: SearchEntry[] = MODULES.map((lesson) => ({
    id: `module:${lesson.slug}`,
    kind: "module",
    title: lesson.title,
    summary: lesson.summary,
    href: moduleHref(lesson),
    label: `Tutorial · ${TOPIC_LABELS[lesson.topic]}`,
    tags: lesson.tags,
    text: [lesson.objectives.join(" "), flattenBlocksText(lesson.blocks)].join(" "),
  }));

  const faqEntries: SearchEntry[] = FAQ_ITEMS.map((item) => ({
    id: `faq:${item.id}`,
    kind: "faq",
    title: item.question,
    summary: stripInline(item.answer),
    href: `/learn#faq-${item.id}`,
    label: "FAQ",
    tags: item.tags,
    text: stripInline(item.answer),
  }));

  cachedEntries = [...docEntries, ...moduleEntries, ...faqEntries];
  return cachedEntries;
}

/** Every link found in inline text and link-cards, for integrity tests. */
export function collectInternalHrefs(): Array<{ source: string; href: string }> {
  const found: Array<{ source: string; href: string }> = [];
  const linkPattern = /\[[^\]]+\]\(([^)\s]+)\)/g;

  const scanText = (source: string, text: string) => {
    // Code spans show link syntax as an example; they are not real links.
    const withoutCode = text.replace(/`[^`]+`/g, "");
    for (const match of withoutCode.matchAll(linkPattern)) found.push({ source, href: match[1] });
  };
  const scanBlocks = (source: string, blocks: Block[]) => {
    for (const block of blocks) {
      switch (block.type) {
        case "p":
        case "h2":
        case "h3":
          scanText(source, block.text);
          break;
        case "ul":
        case "ol":
          block.items.forEach((item) => scanText(source, item));
          break;
        case "callout":
          scanText(source, block.text);
          break;
        case "table":
          block.rows.flat().forEach((cell) => scanText(source, cell));
          break;
        case "link-card":
          found.push({ source, href: block.href });
          scanText(source, block.text);
          break;
      }
    }
  };

  ARTICLES.forEach((article) => scanBlocks(`doc:${articleKey(article)}`, article.blocks));
  MODULES.forEach((lesson) => scanBlocks(`module:${lesson.slug}`, lesson.blocks));
  FAQ_ITEMS.forEach((item) => scanText(`faq:${item.id}`, item.answer));
  return found;
}
