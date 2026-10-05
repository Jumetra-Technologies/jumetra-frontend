/**
 * Tiny inline-markup parser for content strings.
 * Supports `code`, **bold**, and [label](href) only — deliberately minimal so
 * content stays predictable and no markdown dependency is needed.
 */

export type InlineToken =
  | { kind: "text"; text: string }
  | { kind: "code"; text: string }
  | { kind: "bold"; text: string }
  | { kind: "link"; text: string; href: string };

const INLINE_PATTERN = /`([^`]+)`|\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;

export function parseInline(input: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let cursor = 0;

  for (const match of input.matchAll(INLINE_PATTERN)) {
    const index = match.index ?? 0;
    if (index > cursor) {
      tokens.push({ kind: "text", text: input.slice(cursor, index) });
    }
    if (match[1] !== undefined) {
      tokens.push({ kind: "code", text: match[1] });
    } else if (match[2] !== undefined) {
      tokens.push({ kind: "bold", text: match[2] });
    } else {
      tokens.push({ kind: "link", text: match[3], href: match[4] });
    }
    cursor = index + match[0].length;
  }

  if (cursor < input.length) {
    tokens.push({ kind: "text", text: input.slice(cursor) });
  }
  return tokens;
}

/** Strips inline markers, leaving readable plain text (used for search indexing). */
export function stripInline(input: string): string {
  return parseInline(input)
    .map((token) => token.text)
    .join("");
}

/** URL-safe heading id, stable between server render and table of contents. */
export function slugify(input: string): string {
  return stripInline(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}
