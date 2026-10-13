"use client";

import { ErrorNotice } from "@/components/ui/error-notice";
import { describeError } from "@/lib/errors";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { api } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import type { ComponentV2SearchHit } from "@/lib/types";
import { ComponentCard } from "./ComponentCard";
import { ComponentPreview } from "./ComponentPreview";

type Props = {
  onAddToWorkspace?: (item: ComponentV2SearchHit) => void;
  onInspect?: (item: ComponentV2SearchHit) => void;
};

export function ComponentBrowser({ onAddToWorkspace, onInspect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ComponentV2SearchHit[]>([]);
  const [selected, setSelected] = useState<ComponentV2SearchHit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [totalPackages, setTotalPackages] = useState(0);

  useEffect(() => {
    api
      .debugComponentsV2()
      .then((d) => setTotalPackages(d.total_packages || 0))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .searchComponentsV2({ q: query || undefined, limit: 80 })
      .then((data) => {
        if (cancelled) return;
        setResults(data.results || []);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setResults([]);
        setError(describeError(err, "The parts list couldn't be searched"));
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground" data-testid="component-browser-v2">
      <div className="space-y-2 border-b border-white/10 px-3 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sidebar-muted">
          Search Components
        </p>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-sidebar-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="dht, temperature, esp32…"
            className="border-white/10 bg-white/5 pl-9 text-sidebar-foreground"
            aria-label="Search components v2"
            data-testid="v2-search-input"
          />
        </div>
        {error ? <ErrorNotice message={error} size="sm" /> : null}
      </div>
      <div className="border-b border-white/10 p-2">
        <ComponentPreview item={selected} />
      </div>
      <div className="hhip-scroll flex-1 space-y-2 overflow-y-auto p-2" data-testid="v2-search-results">
        {totalPackages === 0 && results.length === 0 ? (
          <p className="py-6 text-center text-xs text-amber-300" data-testid="v2-empty-loaded">
            No components loaded
          </p>
        ) : results.length === 0 ? (
          <p className="py-6 text-center text-xs text-sidebar-muted" data-testid="v2-empty-matching">
            No matching components found
          </p>
        ) : (
          results.map((item) => (
            <ComponentCard
              key={item.id}
              item={item}
              selected={selected?.id === item.id}
              onSelect={(it) => {
                setSelected(it);
                onInspect?.(it);
              }}
              onAdd={onAddToWorkspace}
            />
          ))
        )}
      </div>
    </div>
  );
}
