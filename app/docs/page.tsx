import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Cable, FileText, Workflow } from "lucide-react";
import { DashboardShell } from "@/components/layout/sidebar";
import { CategoryIcon } from "@/components/learning/CategoryIcon";
import { DocsSearch } from "@/components/learning/DocsSearch";
import { Card } from "@/components/ui/card";
import { DOC_CATEGORIES, MODULES, getArticlesByCategory } from "@/lib/learning";

export const metadata: Metadata = {
  title: "Documentation Center · HHIP",
  description:
    "Reference documentation for the HHIP platform: system overview, technical guides, tutorials, hardware knowledge, and developer resources.",
};

const WORKFLOW = [
  { icon: FileText, title: "1. Define the project", body: "Capture the robot's purpose, objectives, contributors, and initial parts list.", href: "/workspace", action: "Open Projects" },
  { icon: Cable, title: "2. Select hardware", body: "Check component specifications, pins, interfaces, and controller compatibility.", href: "/components", action: "Browse hardware" },
  { icon: Workflow, title: "3. Assemble and test", body: "Arrange components, connect signals, and inspect virtual behavior in the lab.", href: "/laboratory/workspace", action: "Open Laboratory" },
  { icon: BookOpen, title: "4. Record the result", body: "Save the procedure, observations, results, and notes with the project.", href: "/experiments", action: "Experiment records" },
];

const START_HERE = [
  { href: "/docs/system-overview/what-is-hhip", title: "What is HHIP?", text: "The purpose and vision of the platform." },
  { href: "/learn", title: "Learning Center", text: "A guided path from first circuit to hybrid projects." },
  { href: "/docs/technical-guides/run-locally", title: "Run HHIP locally", text: "Start the backend and frontend on your machine." },
];

export default function DocumentationPage() {
  return (
    <DashboardShell activePath="/docs">
      <div className="mb-8 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Documentation Center</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight">HHIP documentation</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          The official reference for how HHIP works, how to run it, and the hardware it supports. New to hardware? The{" "}
          <Link href="/learn" className="font-medium text-primary hover:underline">Learning Center</Link> teaches the basics step by step.
        </p>
      </div>

      <div className="mb-10 max-w-3xl">
        <DocsSearch scope="all" />
      </div>

      <section className="mb-12" aria-labelledby="start-heading">
        <h3 id="start-heading" className="mb-4 text-lg font-semibold">Start here</h3>
        <div className="grid gap-3 md:grid-cols-3">
          {START_HERE.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center justify-between gap-3 rounded-[14px] border border-border bg-surface px-5 py-4 shadow-[var(--shadow-sm)] transition-colors hover:bg-muted-bg"
            >
              <span>
                <span className="block text-sm font-semibold">{item.title}</span>
                <span className="mt-1 block text-xs leading-5 text-muted">{item.text}</span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-12" aria-labelledby="categories-heading">
        <h3 id="categories-heading" className="mb-4 text-lg font-semibold">Browse by category</h3>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {DOC_CATEGORIES.map((category) => {
            const count = category.id === "tutorials" ? MODULES.length : getArticlesByCategory(category.id).length;
            return (
              <Link key={category.id} href={`/docs/${category.id}`} className="group block">
                <Card className="h-full p-5 transition-colors group-hover:bg-muted-bg">
                  <span className="flex size-9 items-center justify-center rounded-md border border-border bg-muted-bg text-primary">
                    <CategoryIcon icon={category.icon} className="size-4" />
                  </span>
                  <h4 className="mt-3 text-sm font-semibold">{category.title}</h4>
                  <p className="mt-1 min-h-[3.75rem] text-sm leading-6 text-muted">{category.description}</p>
                  <p className="mt-3 text-xs font-medium text-muted">
                    {count} {category.id === "tutorials" ? (count === 1 ? "module" : "modules") : count === 1 ? "article" : "articles"}
                  </p>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="workflow-heading">
        <h3 id="workflow-heading" className="mb-4 text-lg font-semibold">A project workflow</h3>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {WORKFLOW.map(({ icon: Icon, title, body, href, action }) => (
            <Card key={title} className="p-4">
              <Icon className="size-4 text-primary" aria-hidden />
              <h4 className="mt-3 text-sm font-semibold">{title}</h4>
              <p className="mt-1 min-h-12 text-xs leading-relaxed text-muted">{body}</p>
              <Link href={href} className="mt-3 inline-flex text-xs font-medium text-primary hover:underline">{action}</Link>
            </Card>
          ))}
        </div>
      </section>
    </DashboardShell>
  );
}
