"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { PARTS, PART_GROUPS, getPart, getPartsByGroup, searchParts } from "@/lib/parts";
import type { PartModel } from "@/lib/parts/types";
import { cn } from "@/lib/utils";
import { PartDetail } from "./PartDetail";
import { PartThumb } from "./PartThumb";

export function ComponentLibrary({ initialPart, initialQuery = "", compatibility = {} }: { initialPart?: string; initialQuery?: string; compatibility?: Record<string, string[]> }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [selected, setSelected] = useState<string>(() => (initialPart && getPart(initialPart) ? initialPart : getPartsByGroup()[0].parts[0].id));
  const part = getPart(selected) ?? getPartsByGroup()[0].parts[0];

  // Keep the address in step so a part can be linked to.
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("part", selected);
    if (query.trim()) params.set("q", query.trim());
    router.replace(`/components?${params.toString()}`, { scroll: false });
  }, [selected, query, router]);

  const matches = useMemo(() => searchParts(query), [query]);
  const matchIds = useMemo(() => new Set(matches.map((item) => item.id)), [matches]);
  const groups = useMemo(
    () =>
      getPartsByGroup()
        .map((entry) => ({ ...entry, parts: entry.parts.filter((item) => matchIds.has(item.id)) }))
        .filter((entry) => entry.parts.length > 0),
    [matchIds],
  );
  const total = matches.length;
  const input = useRef<HTMLInputElement>(null);
  const typing = query.length > 0;

  // "/" jumps to the search box from anywhere on the page, as in the lab.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (t && (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || t.isContentEditable)) return;
      e.preventDefault();
      input.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const choose = (item: PartModel) => {
    setSelected(item.id);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      document.getElementById("part-detail-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-10">
      <aside className="order-2 lg:order-1 lg:sticky lg:top-6 lg:max-h-[calc(100svh-3rem)] lg:-ml-1.5 lg:overflow-y-auto lg:pl-1.5 lg:pr-3" aria-label="Parts">
        <div role="search" className="sticky top-0 z-10 bg-canvas pb-3 pt-1.5">
          <label className="group/search relative block">
            <span className="sr-only">Search parts</span>
            {typing ? null : (
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted transition-colors group-focus-within/search:text-primary" aria-hidden data-testid="library-search-icon" />
            )}
            <input
              ref={input}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape" && query) {
                  event.preventDefault();
                  setQuery("");
                }
              }}
              placeholder={`Search ${PARTS.length} parts: dht11, i2c…`}
              autoComplete="off"
              spellCheck={false}
              className={cn(
                "h-11 w-full rounded-[12px] border border-border bg-surface pr-11 text-sm text-foreground shadow-[var(--shadow-sm)] outline-none focus-visible:!outline-none transition-[padding,border-color,box-shadow] duration-150 placeholder:text-muted hover:border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] focus:border-primary focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_16%,transparent)]",
                typing ? "pl-3.5" : "pl-10",
              )}
            />
            {typing ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  input.current?.focus();
                }}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted transition-colors hover:bg-muted-bg hover:text-foreground focus-visible:outline-2 focus-visible:outline-[var(--ring)]"
              >
                <X className="size-4" aria-hidden />
              </button>
            ) : (
              <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-[6px] border border-border bg-muted-bg px-1.5 font-mono text-[10.5px] leading-5 text-muted group-focus-within/search:opacity-0" aria-hidden>
                /
              </kbd>
            )}
          </label>
          <p className="mt-2 flex items-center gap-2 text-xs text-muted" aria-live="polite">
            {typing ? (
              <>
                <span className={cn("rounded-full px-2 py-0.5 font-semibold tabular-nums", total ? "bg-accent text-primary" : "bg-muted-bg text-muted")}>{total}</span>
                <span>{total === 1 ? "part matches" : "parts match"} &ldquo;{query.trim()}&rdquo;</span>
              </>
            ) : (
              <span className="font-mono">{`${total} parts in ${PART_GROUPS.length} groups, most common first`}</span>
            )}
          </p>
        </div>

        {groups.length === 0 ? (
          <p className="mt-6 text-sm leading-6 text-muted">
            Nothing matches &ldquo;{query}&rdquo;. Try a part number, a sensor type or an interface like <span className="font-mono">i2c</span>.
          </p>
        ) : null}

        <nav className="mt-2 space-y-6">
          {groups.map(({ group, parts }) => (
            <section key={group.id} aria-labelledby={`group-${group.id}`}>
              <h3 id={`group-${group.id}`} className="text-sm font-semibold">
                {group.title}
              </h3>
              <p className="mt-0.5 text-xs leading-5 text-muted">{group.blurb}</p>
              <ul className="mt-2 space-y-1">
                {parts.map((item) => {
                  const active = item.id === part.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => choose(item)}
                        aria-current={active ? "true" : undefined}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-[10px] border px-2.5 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]",
                          active ? "border-primary bg-accent" : "border-transparent hover:bg-muted-bg",
                        )}
                      >
                        <PartThumb model={item} className="size-11 shrink-0" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{item.name}</span>
                          <span className="block truncate text-xs text-muted">
                            {item.facts[0]?.label} · {item.facts[0]?.value}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </nav>
      </aside>

      <div className="order-1 min-w-0 lg:order-2" id="part-detail-anchor">
        <PartDetail key={part.id} part={part} compatible={compatibility[part.id]} />
      </div>
    </div>
  );
}
