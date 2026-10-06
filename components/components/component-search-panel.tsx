"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Search } from "lucide-react";
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

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (category) params.set("category", category);
    if (controller) params.set("controller", controller);
    router.push(`/components?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={onSubmit}
        className="grid gap-4 rounded-[12px] border border-border bg-surface p-4 shadow-[var(--shadow-sm)] md:grid-cols-4"
      >
        <div className="relative md:col-span-1">
          <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-muted" />
          <Input
            type="search"
            placeholder="Search components…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
            aria-label="Search components"
          />
        </div>
        <Select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Category filter"
        >
          <option value="">All categories</option>
          <option value="sensor">Sensors</option>
          <option value="actuator">Actuators</option>
          <option value="display">Displays</option>
        </Select>
        <Select
          value={controller}
          onChange={(e) => setController(e.target.value)}
          aria-label="Controller filter"
        >
          <option value="">All controllers</option>
          {controllers.map((c) => (
            <option key={c.controller_id} value={c.controller_id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Button type="submit">Search</Button>
      </form>

      <p className="text-sm text-muted">{results.length} component(s) found</p>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {results.map((hit) => (
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
