import Link from "next/link";
import { BookOpen, Cable, Cpu, FileText, Play, Workflow } from "lucide-react";
import { DashboardShell } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";

const stack = [
  ["Web framework", "Next.js 16 App Router"],
  ["UI runtime", "React 19 with TypeScript"],
  ["Styling and controls", "Tailwind CSS 4 with shared local UI components"],
  ["Engineering canvas", "React Flow (@xyflow/react)"],
  ["Client state", "Zustand; browser localStorage for project journals"],
  ["Charts and icons", "Recharts and lucide-react"],
  ["Service connection", "Typed JSON HTTP API client and WebSocket clients"],
];

export default function DocumentationPage() {
  return (
    <DashboardShell activePath="/docs">
      <div className="mb-10 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">HHIP field guide</p>
        <h2 className="mt-1 text-3xl font-bold">Build, test, and document robotics systems</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">A practical starting point for planning hardware, exploring system behavior, and keeping experiments reproducible.</p>
      </div>

      <section className="mb-12" aria-labelledby="workflow-heading">
        <h3 id="workflow-heading" className="mb-4 text-lg font-semibold">A project workflow</h3>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            { icon: FileText, title: "1. Define the project", body: "Capture the robot's purpose, objectives, contributors, and initial parts list.", href: "/workspace", action: "Open Projects" },
            { icon: Cable, title: "2. Select hardware", body: "Check component specifications, pins, interfaces, and controller compatibility.", href: "/components", action: "Browse hardware" },
            { icon: Workflow, title: "3. Assemble and test", body: "Arrange components, connect signals, and inspect virtual behavior in the lab.", href: "/laboratory/workspace", action: "Open Laboratory" },
            { icon: BookOpen, title: "4. Record the result", body: "Save the procedure, observations, results, and notes with the project.", href: "/experiments", action: "Experiment records" },
          ].map(({ icon: Icon, title, body, href, action }) => (
            <Card key={title} className="p-4">
              <Icon className="size-4 text-primary" aria-hidden />
              <h4 className="mt-3 text-sm font-semibold">{title}</h4>
              <p className="mt-1 min-h-12 text-xs leading-relaxed text-muted">{body}</p>
              <Link href={href} className="mt-3 inline-flex text-xs font-medium text-primary hover:underline">{action}</Link>
            </Card>
          ))}
        </div>
      </section>

      <section className="mb-12" aria-labelledby="fundamentals-heading">
        <h3 id="fundamentals-heading" className="mb-4 text-lg font-semibold">Hardware fundamentals</h3>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="border-t-2 border-primary pt-3">
            <Cpu className="size-4 text-primary" aria-hidden />
            <h4 className="mt-2 text-sm font-semibold">Controllers</h4>
            <p className="mt-1 text-sm leading-relaxed text-muted">A microcontroller executes embedded logic and connects sensors, actuators, and buses. Verify pin capabilities and voltage levels before wiring.</p>
          </div>
          <div className="border-t-2 border-emerald-600 pt-3">
            <Cable className="size-4 text-emerald-700" aria-hidden />
            <h4 className="mt-2 text-sm font-semibold">Sensors and actuators</h4>
            <p className="mt-1 text-sm leading-relaxed text-muted">Sensors turn physical conditions into measurements; actuators turn control signals into motion or other physical change. Confirm power and interface requirements.</p>
          </div>
          <div className="border-t-2 border-amber-500 pt-3">
            <Play className="size-4 text-amber-700" aria-hidden />
            <h4 className="mt-2 text-sm font-semibold">Simulation limits</h4>
            <p className="mt-1 text-sm leading-relaxed text-muted">Virtual behavior helps exercise logic and connections, but is not proof of mechanical performance, electrical safety, or real-world reliability.</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="stack-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 id="stack-heading" className="text-lg font-semibold">How HHIP is built</h3>
            <p className="mt-1 text-sm text-muted">Verified from this frontend repository. Backend implementation details are maintained outside this codebase.</p>
          </div>
          <Link href="/architecture" className="text-sm text-primary hover:underline">View system architecture</Link>
        </div>
        <div className="divide-y divide-border border-y border-border">
          {stack.map(([layer, technology]) => (
            <div key={layer} className="grid gap-1 py-3 sm:grid-cols-[minmax(10rem,0.7fr)_1.3fr] sm:gap-6">
              <h4 className="text-sm font-medium">{layer}</h4>
              <p className="text-sm text-muted">{technology}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <h4 className="text-sm font-semibold">Frontend structure</h4>
            <p className="mt-1 text-sm leading-relaxed text-muted">Route pages render the shared application shell. Interactive engineering tools are client components; project and experiment records in this PoC are stored in browser localStorage. API-backed hardware and simulation surfaces use typed requests from the shared API client.</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Run locally</h4>
            <p className="mt-1 text-sm leading-relaxed text-muted">Install the package dependencies, run <code className="rounded bg-muted-bg px-1">npm run dev</code>, then configure <code className="rounded bg-muted-bg px-1">NEXT_PUBLIC_API_URL</code> and <code className="rounded bg-muted-bg px-1">NEXT_PUBLIC_WS_URL</code> for the connected service. This repository does not include the backend source, so its stack and internals should be confirmed separately.</p>
          </div>
        </div>
      </section>
    </DashboardShell>
  );
}