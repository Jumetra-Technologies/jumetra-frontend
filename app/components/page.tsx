import type { Metadata } from "next";
import { ComponentLibrary } from "@/components/library/ComponentLibrary";
import { DashboardShell } from "@/components/layout/sidebar";
import { api } from "@/lib/api-client";
import { PARTS, getPart } from "@/lib/parts";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ part?: string }> }): Promise<Metadata> {
  const { part: partId } = await searchParams;
  const part = partId ? getPart(partId) : undefined;
  if (!part) {
    return {
      title: "Component library",
      description: `${PARTS.length} boards, sensors, outputs, displays and radios, each with a 3D model, a labelled top view and a current-flow diagram.`,
    };
  }
  return { title: `${part.name} · Component library`, description: part.summary };
}

/** Compatibility from the backend catalog, when it answers quickly; the library itself needs nothing from it. */
async function loadCompatibility(): Promise<Record<string, string[]>> {
  try {
    const hits = await api.searchComponents({ limit: 100 }, 2500);
    const names = new Map(PARTS.map((part) => [part.id, part.name]));
    return Object.fromEntries(
      hits.map((hit) => [hit.component.component_id, (hit.compatible_controllers ?? []).map((id) => names.get(id) ?? id)]),
    );
  } catch {
    return {};
  }
}

export default async function ComponentsPage({ searchParams }: { searchParams: Promise<{ part?: string; q?: string }> }) {
  const params = await searchParams;
  const compatibility = await loadCompatibility();

  return (
    <DashboardShell activePath="/components">
      <div className="mb-8 max-w-3xl">
        <h2 className="text-3xl font-bold tracking-tight">Component library</h2>
        <p className="mt-2 text-base leading-7 text-muted">
          Every part Kiungo can simulate, drawn to scale. Turn it in 3D, point at its pins in the top view, follow the current inside, then start an
          experiment with it in the lab.
        </p>
      </div>
      <ComponentLibrary initialPart={params.part} initialQuery={params.q ?? ""} compatibility={compatibility} />
    </DashboardShell>
  );
}
