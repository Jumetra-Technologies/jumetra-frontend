import Link from "next/link";
import { ArrowDown, CircuitBoard, Cloud, Monitor, RadioTower, Workflow } from "lucide-react";
import { DashboardShell } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";

const layers = [
  { icon: Monitor, title: "HHIP web application", detail: "Projects and experiment journal are browser-local in this PoC; the hardware catalog and interactive engineering workspace are frontend experiences." },
  { icon: Workflow, title: "Typed service boundary", detail: "The shared client sends JSON HTTP requests and opens WebSocket connections for API-backed hardware, simulation, and hybrid workflows." },
  { icon: CircuitBoard, title: "Hardware and simulation services", detail: "Controller, component, simulation, firmware, and hybrid operations are supplied by the connected API. Backend internals are not present in this frontend repository." },
  { icon: RadioTower, title: "Physical devices", detail: "Physical connections are an API-mediated integration path. Availability and safety depend on the connected backend and the user's hardware setup." },
];

export default function ArchitecturePage() {
  return (
    <DashboardShell activePath="/architecture">
      <div className="mb-8 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">System map</p>
        <h2 className="mt-1 text-2xl font-bold">HHIP architecture</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">The current frontend combines project knowledge with API-backed hardware workflows. The boundary is explicit: local notes are not yet synchronized to the connected service.</p>
      </div>

      <section aria-label="System layers" className="max-w-4xl">
        {layers.map(({ icon: Icon, title, detail }, index) => (
          <div key={title}>
            <Card className="flex items-start gap-4 p-4 sm:p-5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted-bg text-primary">
                <Icon className="size-4" aria-hidden />
              </span>
              <div>
                <h3 className="text-sm font-semibold">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{detail}</p>
              </div>
            </Card>
            {index < layers.length - 1 ? <div className="flex h-10 items-center pl-7 text-muted"><ArrowDown className="size-4" aria-hidden /></div> : null}
          </div>
        ))}
      </section>

      <section className="mt-12 max-w-4xl border-t border-border pt-6">
        <h3 className="text-lg font-semibold">Robotics project data flow</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="border-l-2 border-primary pl-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Plan</p>
            <p className="mt-1 text-sm">Define objectives, contributors, and a parts list in Projects.</p>
          </div>
          <div className="border-l-2 border-emerald-600 pl-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Build and test</p>
            <p className="mt-1 text-sm">Use the catalog, engineering canvas, and simulator to explore the system.</p>
          </div>
          <div className="border-l-2 border-amber-500 pl-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Record</p>
            <p className="mt-1 text-sm">Link test notes to a project and export a Markdown report.</p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-4 text-sm">
          <Link href="/docs" className="text-primary hover:underline">Technology stack and build guide</Link>
          <Link href="/roadmap" className="text-primary hover:underline">Development roadmap</Link>
        </div>
      </section>
      <div className="mt-10 flex items-center gap-2 text-xs text-muted"><Cloud className="size-3.5" aria-hidden />Backend service topology is intentionally not inferred from frontend code.</div>
    </DashboardShell>
  );
}