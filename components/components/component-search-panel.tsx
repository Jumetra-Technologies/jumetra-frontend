"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowDownAZ, Search, SlidersHorizontal, X } from "lucide-react";
import { ComponentCard } from "@/components/components/component-card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import type { ComponentSearchHit, ControllerSpec } from "@/lib/types";

export function ComponentSearchPanel({
  initialQuery,
  initialCategory,
  initialController,
  results,
  controllers,
}: {
  initialQuery: string;
  initialCategory: string;
  initialController: string;
  results: ComponentSearchHit[];
  controllers: ControllerSpec[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [controller, setController] = useState(initialController);
  const popularOrder = [
    "arduino-uno",
    "esp32",
    "breadboard",
    "dht11",
    "hc-sr04",
    "servo",
    "led",
    "resistor",
    "push-button",
    "potentiometer",
    "relay",
    "oled",
  ];
  const orderedResults = [...results].sort((a, b) => {
    const aIndex = popularOrder.indexOf(a.component.component_id);
    const bIndex = popularOrder.indexOf(b.component.component_id);
    if (aIndex === -1 && bIndex === -1) return a.component.name.localeCompare(b.component.name);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
  const hasFilters = Boolean(query || category || controller);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (category) params.set("category", category);
    if (controller) params.set("controller", controller);
    router.push(`/components?${params.toString()}`);
  }

  return (
    <div className="space-y-7">
      <form
        onSubmit={onSubmit}
        className="rounded-2xl border border-border bg-surface p-3 shadow-[var(--shadow-sm)] sm:p-4"
      >
        <div className="relative">
          <Search className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-muted" />
          <Input
            type="search"
            placeholder="Search by name, type, interface, or use case"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 rounded-xl pl-9 pr-3"
            aria-label="Search components"
          />
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-muted-bg px-3 py-2">
            <SlidersHorizontal className="size-4 shrink-0 text-muted" aria-hidden />
            <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category filter" className="h-8 border-0 bg-transparent px-0 shadow-none">
              <option value="">All categories</option>
              <option value="sensor">Sensors</option>
              <option value="actuator">Actuators</option>
              <option value="display">Displays</option>
            </Select>
            <Select value={controller} onChange={(e) => setController(e.target.value)} aria-label="Controller filter" className="h-8 border-0 bg-transparent px-0 shadow-none">
              <option value="">All controllers</option>
              {controllers.map((c) => <option key={c.controller_id} value={c.controller_id}>{c.name}</option>)}
            </Select>
          </div>
          <Button type="submit" className="h-10 px-5">Search library</Button>
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground">{results.length} components</p>
          <span className="text-xs text-muted">Popular parts first</span>
        </div>
        {hasFilters ? (
          <button type="button" onClick={() => router.push("/components")} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            <X className="size-3.5" aria-hidden /> Clear filters
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-muted"><ArrowDownAZ className="size-3.5" aria-hidden /> Curated order</span>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {orderedResults.map((hit) => (
          <ComponentCard
            key={hit.component.component_id}
            component={hit.component}
            compatibleControllers={hit.compatible_controllers}
          />
        ))}
      </div>

      {results.length === 0 ? (
        <p className="text-muted">No components match your search. Ensure the API is running.</p>
      ) : null}
    </div>
  );
}
