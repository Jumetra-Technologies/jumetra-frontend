import type { SearchEntry } from "./types";

export interface SearchResult {
  entry: SearchEntry;
  score: number;
}

const MAX_TOKENS = 8;

/** Lowercase alphanumeric tokens. "HC-SR04" becomes ["hc", "sr04"]. */
export function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

interface PreparedEntry {
  entry: SearchEntry;
  title: string;
  titleTokens: string[];
  tagTokens: string[];
  summary: string;
  text: string;
}

function prepare(entry: SearchEntry): PreparedEntry {
  return {
    entry,
    title: entry.title.toLowerCase(),
    titleTokens: tokenize(entry.title),
    tagTokens: entry.tags.flatMap(tokenize),
    summary: entry.summary.toLowerCase(),
    text: entry.text.toLowerCase(),
  };
}

/**
 * Score one query token against an entry. Returns 0 when the token matches nowhere,
 * which excludes the entry (all tokens must match, in any field).
 */
function scoreToken(token: string, item: PreparedEntry): number {
  let best = 0;

  if (item.titleTokens.includes(token)) best = Math.max(best, 10);
  else if (item.titleTokens.some((t) => t.startsWith(token))) best = Math.max(best, 7);
  else if (item.title.includes(token)) best = Math.max(best, 4);

  if (item.tagTokens.includes(token)) best = Math.max(best, 6);
  else if (item.tagTokens.some((t) => t.startsWith(token))) best = Math.max(best, 4);

  if (item.summary.includes(token)) best = Math.max(best, 3);
  if (item.text.includes(token)) best = Math.max(best, 1);

  return best;
}

/**
 * Ranks entries against a free-text query. Every token must match somewhere (AND),
 * with title matches weighted above tags, summary, and body text. Returns [] for
 * an empty query.
 */
export function searchEntries(entries: SearchEntry[], query: string, limit = 20): SearchResult[] {
  const tokens = tokenize(query).slice(0, MAX_TOKENS);
  if (tokens.length === 0) return [];

  const phrase = query.trim().toLowerCase();
  const results: SearchResult[] = [];

  for (const entry of entries) {
    const item = prepare(entry);
    let total = 0;
    let matchedAll = true;

    for (const token of tokens) {
      const score = scoreToken(token, item);
      if (score === 0) {
        matchedAll = false;
        break;
      }
      total += score;
    }
    if (!matchedAll) continue;

    if (tokens.length > 1) {
      if (item.title.includes(phrase)) total += 8;
      else if (item.summary.includes(phrase)) total += 3;
    }
    results.push({ entry, score: total });
  }

  return results
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
    .slice(0, limit);
}
