import Link from "next/link";
import { DashboardShell } from "@/components/layout/sidebar";
import { LaboratoryPanel } from "@/components/laboratory/laboratory-panel";
import { api } from "@/lib/api-client";
import type { ComponentSearchHit, ControllerSpec } from "@/lib/types";

export default async function LaboratoryPage() {
  let controllers: ControllerSpec[] = [];
  let components: ComponentSearchHit[] = [];
  try {
    [controllers, components] = await Promise.all([
      api.getControllers(),
      api.searchComponents({}),
    ]);
  } catch {
    controllers = [];
    components = [];
  }

  return (
    <DashboardShell activePath="/laboratory">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Laboratory</h2>
          <p className="mt-1 text-muted">
            Create virtual labs or open the full engineering workspace
          </p>
        </div>
        <Link
          href="/laboratory/workspace"
          className="rounded-[10px] bg-primary px-4 py-2 text-sm font-medium text-white"
        >
          Open the Engineering Lab →
        </Link>
        <Link
          href="/laboratory/hybrid"
          className="rounded-[10px] border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-muted-bg"
        >
          Hybrid Laboratory →
        </Link>
      </div>
      <LaboratoryPanel controllers={controllers} componentHits={components} />
    </DashboardShell>
  );
}
