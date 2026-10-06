"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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

  const choose = (item: PartModel) => {
    setSelected(item.id);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      document.getElementById("part-detail-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-10">
      <aside className="order-2 lg:order-1 lg:sticky lg:top-6 lg:max-h-[calc(100svh-3rem)] lg:overflow-y-auto lg:pr-1" aria-label="Parts">
        <label className="relative block">
          <span className="sr-only">Search parts</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${PARTS.length} parts: dht11, servo, i2c…`}
            className="h-10 w-full rounded-[10px] border border-border bg-surface pl-9 pr-9 text-sm outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          />
          {query ? (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted hover:text-foreground">
              <X className="size-4" aria-hidden />
            </button>
          ) : null}
        </label>
        <p className="mt-2 font-mono text-xs text-muted" aria-live="polite">
          {query ? `${total} ${total === 1 ? "part matches" : "parts match"}` : `${total} parts in ${PART_GROUPS.length} groups, most common first`}
        </p>

        {groups.length === 0 ? (
          <p className="mt-6 text-sm leading-6 text-muted">
            Nothing matches &ldquo;{query}&rdquo;. Try a part number, a sensor type or an interface like <span className="font-mono">i2c</span>.
          </p>
        ) : null}

        <nav className="mt-4 space-y-6">
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
