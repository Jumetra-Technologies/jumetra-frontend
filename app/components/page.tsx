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
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Component Catalog</h2>
        <p className="mt-1 text-zinc-500">
          Search hardware components, view specifications, and check microcontroller compatibility
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
