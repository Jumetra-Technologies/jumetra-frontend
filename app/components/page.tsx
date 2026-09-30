import { DashboardShell } from "@/components/layout/sidebar";
import { ComponentSearchPanel } from "@/components/components/component-search-panel";
import { api } from "@/lib/api-client";
import type { ComponentSearchHit, ControllerSpec } from "@/lib/types";

export default async function ComponentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; controller?: string }>;
}) {
  const params = await searchParams;
  let results: ComponentSearchHit[] = [];
  let controllers: ControllerSpec[] = [];
  try {
    [results, controllers] = await Promise.all([
      api.searchComponents({
        q: params.q,
        category: params.category,
        controller_id: params.controller,
      }),
      api.getControllers(),
    ]);
  } catch {
    results = [];
    controllers = [];
  }

  return (
    <DashboardShell activePath="/components">
      <div className="mb-8 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Hardware library</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight">Component library</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Find the right board, sensor, or actuator for your next build. Start with a search or browse the most-used parts first.
        </p>
      </div>
      <ComponentSearchPanel
        initialQuery={params.q ?? ""}
        initialCategory={params.category ?? ""}
        initialController={params.controller ?? ""}
        results={results}
        controllers={controllers}
      />
    </DashboardShell>
  );
}
