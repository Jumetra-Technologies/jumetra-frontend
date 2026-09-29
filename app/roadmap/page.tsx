import { Check, Clock3, Compass } from "lucide-react";
import { DashboardShell } from "@/components/layout/sidebar";

const milestones = [
  {
    status: "Available",
    title: "Robotics project foundation",
    items: ["Project objectives, category, contributors, and hardware list", "Project-linked experiment journal", "Markdown experiment and project reports"],
  },
  {
    status: "Available",
    title: "Virtual engineering workflows",
    items: ["Component catalog and controller compatibility", "Wiring canvas and virtual simulation controls", "Hybrid and embedded firmware interfaces"],
  },
  {
    status: "Next",
    title: "Durable project collaboration",
    items: ["Move browser-local project records behind authenticated API persistence", "Link saved project records to engineering workspaces and simulation runs", "Add project files and shared activity history"],
  },
  {
    status: "Later",
    title: "Robotics-specific validation",
    items: ["Reusable robot subsystem templates", "Repeatable test plans with measured acceptance criteria", "Richer sensor, actuator, and device health reporting"],
  },
];

export default function RoadmapPage() {
  return (
    <DashboardShell activePath="/roadmap">
      <div className="mb-8 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Product direction</p>
        <h2 className="mt-1 text-2xl font-bold">HHIP roadmap</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">A user-focused view of what is available and what would make robotics projects more durable, testable, and easier to reproduce.</p>
      </div>

      <div className="max-w-4xl divide-y divide-border border-y border-border">
        {milestones.map((milestone, index) => {
          const Icon = milestone.status === "Available" ? Check : milestone.status === "Next" ? Compass : Clock3;
          return (
            <section key={milestone.title} className="grid gap-3 py-6 sm:grid-cols-[10rem_1fr] sm:gap-8">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                <Icon className="size-4 text-primary" aria-hidden />
                {milestone.status}
              </div>
              <div>
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-xs text-muted">0{index + 1}</span>
                  <h3 className="text-base font-semibold">{milestone.title}</h3>
                </div>
                <ul className="mt-3 space-y-2 text-sm text-muted">
                  {milestone.items.map((item) => <li key={item} className="border-l border-border pl-3">{item}</li>)}
                </ul>
              </div>
            </section>
          );
        })}
      </div>
      <p className="mt-5 max-w-4xl text-xs leading-relaxed text-muted">Current project journals are stored in the browser and are not shared or backed up. Durable authenticated storage is the next prerequisite for team collaboration.</p>
    </DashboardShell>
  );
}