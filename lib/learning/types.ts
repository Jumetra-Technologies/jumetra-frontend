/**
 * Content model for the Documentation Center (/docs) and Learning Center (/learn).
 *
 * Content is plain typed data (no MDX/CMS dependency) so it is easy to review in
 * pull requests, type-checked, searchable, and ready to move behind an API later.
 *
 * Inline text supports three lightweight markers, parsed by `lib/learning/inline.ts`:
 *   `code`            -> inline code
 *   **bold**          -> bold
 *   [label](/path)    -> link (internal paths use next/link, http(s) opens a new tab)
 */

export type CalloutTone = "tip" | "warning" | "note";

export type Block =
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "code"; language: string; filename?: string; code: string }
  | { type: "callout"; tone: CalloutTone; title?: string; text: string }
  | { type: "table"; head: string[]; rows: string[][]; caption?: string }
  | { type: "link-card"; href: string; title: string; text: string };

/** The five Documentation Center categories from the Phase One spec (7.1). */
export type DocCategoryId =
  | "system-overview"
  | "technical-guides"
  | "tutorials"
  | "hardware-knowledge"
  | "developer-resources";

/** Categories whose pages are reference articles rendered at /docs/[category]/[slug]. */
export type ArticleCategoryId = Exclude<DocCategoryId, "tutorials">;

export interface DocCategory {
  id: DocCategoryId;
  title: string;
  description: string;
  /** lucide icon name resolved in the UI layer so this file stays data-only */
  icon: "layers" | "wrench" | "graduation-cap" | "cpu" | "code";
}

export interface DocArticle {
  slug: string;
  category: ArticleCategoryId;
  title: string;
  summary: string;
  tags: string[];
  blocks: Block[];
  /** Other articles worth reading next, as `category/slug` keys. */
  related?: string[];
}

export type ModuleLevel = "beginner" | "intermediate";

export type ModuleTopic = "foundations" | "arduino" | "esp32" | "sensors" | "hybrid";

export interface LearningModule {
  slug: string;
  /** Position in the guided learning path (1-based, unique). */
  order: number;
  topic: ModuleTopic;
  level: ModuleLevel;
  /** Rough reading + build time. */
  minutes: number;
  title: string;
  summary: string;
  /** "After this module you can ..." bullet points. */
  objectives: string[];
  tags: string[];
  blocks: Block[];
  /** Reference articles to open alongside, as `category/slug` keys. */
  relatedDocs?: string[];
}

export interface FaqItem {
  id: string;
  question: string;
  /** Inline-formatted answer text. */
  answer: string;
  tags: string[];
}

export type SearchEntryKind = "doc" | "module" | "faq";

export interface SearchEntry {
  id: string;
  kind: SearchEntryKind;
  title: string;
  summary: string;
  href: string;
  /** Short label such as the category or topic name, shown beside results. */
  label: string;
  tags: string[];
  /** Flattened body text used for matching. */
  text: string;
}
