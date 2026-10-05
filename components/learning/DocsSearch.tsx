"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getSearchEntries } from "@/lib/learning";
import { searchEntries } from "@/lib/learning/search";
import type { SearchEntryKind } from "@/lib/learning/types";

const DEFAULT_SUGGESTIONS = ["ESP32", "DHT11", "run locally", "device modes", "PWM"];

interface DocsSearchProps {
  /** Restrict results: `docs` for reference articles, `learn` for tutorials and FAQ. */
  scope?: "all" | "docs" | "learn";
  placeholder?: string;
  suggestions?: string[];
}

const SCOPE_KINDS: Record<NonNullable<DocsSearchProps["scope"]>, SearchEntryKind[]> = {
  all: ["doc", "module", "faq"],
  docs: ["doc", "module"],
  learn: ["module", "faq", "doc"],
};

export function DocsSearch({
  scope = "all",
  placeholder = "Search docs, tutorials, and FAQ",
  suggestions = DEFAULT_SUGGESTIONS,
}: DocsSearchProps) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const allowed = SCOPE_KINDS[scope];
    const entries = getSearchEntries().filter((entry) => allowed.includes(entry.kind));
    return searchEntries(entries, query, 12);
  }, [query, scope]);

  const trimmed = query.trim();

  return (
    <div role="search" className="w-full">
      <label htmlFor="docs-search-input" className="sr-only">
        Search documentation and learning material
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <Input
          id="docs-search-input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="h-11 pl-9 pr-9 text-sm"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted hover:bg-muted-bg hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="size-4" aria-hidden />
          </button>
        ) : null}
      </div>

      {!trimmed ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
          <span>Try:</span>
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setQuery(suggestion)}
              className="rounded-full border border-border bg-surface px-2.5 py-1 font-medium text-foreground transition-colors hover:bg-muted-bg"
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-xs text-muted" aria-live="polite">
            {results.length === 0
              ? `No results for "${trimmed}"`
              : `${results.length} ${results.length === 1 ? "result" : "results"}`}
          </p>
          {results.length === 0 ? (
            <p className="mt-2 text-sm text-muted">
              Try a part name such as <button type="button" className="font-medium text-primary hover:underline" onClick={() => setQuery("sensor")}>sensor</button>, or a simpler word.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-border overflow-hidden rounded-[10px] border border-border bg-surface shadow-[var(--shadow-sm)]">
              {results.map(({ entry }) => (
                <li key={entry.id}>
                  <Link href={entry.href} className="block px-4 py-3 transition-colors hover:bg-muted-bg">
                    <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="text-sm font-semibold">{entry.title}</span>
                      <span className="text-xs font-medium uppercase tracking-wide text-muted">{entry.label}</span>
                    </span>
                    <span className="mt-1 line-clamp-2 block text-sm text-muted">{entry.summary}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
