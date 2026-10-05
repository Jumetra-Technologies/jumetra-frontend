import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { DashboardShell } from "@/components/layout/sidebar";
import { Inline } from "@/components/learning/Inline";
import { DocsSearch } from "@/components/learning/DocsSearch";
import { ModuleStatus, PathProgress } from "@/components/learning/ProgressControls";
import { Card } from "@/components/ui/card";
import {
  FAQ_ITEMS,
  MODULES,
  articleHref,
  getArticlesByCategory,
  getModulesByTopic,
  moduleHref,
} from "@/lib/learning";

export const metadata: Metadata = {
  title: "Learning Center · HHIP",
  description:
    "A guided path through electronics, Arduino, ESP32, and sensors, finishing with the hybrid hardware workflow.",
};

const LEVEL_LABEL = { beginner: "Beginner", intermediate: "Intermediate" } as const;

export default function LearningCenterPage() {
  const groups = getModulesByTopic();
  const first = MODULES[0];
  const hardwareReference = getArticlesByCategory("hardware-knowledge");

  return (
    <DashboardShell activePath="/learn">
      <div className="mb-8 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Learning Center</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight">Learn hardware by building</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Short, hands-on modules take you from how a circuit works to reading real sensors and mixing virtual and physical parts. No
          hardware is needed to start, and every module links to the matching reference page.
        </p>
        {first ? (
          <Link
            href={moduleHref(first)}
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-[12px] bg-primary px-6 text-sm font-medium text-primary-foreground shadow-[var(--shadow-sm)] transition-all hover:shadow-[var(--shadow-md)]"
          >
            Start with module 1
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        ) : null}
      </div>

      <div className="mb-10 max-w-3xl">
        <DocsSearch scope="learn" placeholder="Search tutorials, hardware, and FAQ" />
      </div>

      <section className="mb-12 max-w-3xl" aria-label="Your progress">
        <Card className="p-5">
          <PathProgress slugs={MODULES.map((lesson) => lesson.slug)} />
        </Card>
      </section>

      <section className="mb-14 max-w-4xl" aria-labelledby="path-heading">
        <h3 id="path-heading" className="mb-1 text-lg font-semibold">The learning path</h3>
        <p className="mb-6 text-sm text-muted">Work through the modules in order, or jump to the topic you need.</p>

        <div className="space-y-10">
          {groups.map((group) => (
            <div key={group.topic}>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted">{group.label}</h4>
              <ul className="space-y-3">
                {group.modules.map((lesson) => (
                  <li key={lesson.slug}>
                    <Link
                      href={moduleHref(lesson)}
                      className="group flex items-start justify-between gap-4 rounded-[14px] border border-border bg-surface px-5 py-4 shadow-[var(--shadow-sm)] transition-colors hover:bg-muted-bg"
                    >
                      <span className="flex min-w-0 gap-4">
                        <span
                          className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted-bg font-mono text-xs font-semibold"
                          aria-hidden
                        >
                          {lesson.order}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold">{lesson.title}</span>
                          <span className="mt-1 block text-sm leading-6 text-muted">{lesson.summary}</span>
                          <span className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                            <span>{LEVEL_LABEL[lesson.level]}</span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="size-3.5" aria-hidden />
                              {lesson.minutes} min
                            </span>
                            <ModuleStatus slug={lesson.slug} />
                          </span>
                        </span>
                      </span>
                      <ArrowRight className="mt-1 size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-14 max-w-4xl" aria-labelledby="reference-heading">
        <h3 id="reference-heading" className="mb-1 text-lg font-semibold">Hardware quick reference</h3>
        <p className="mb-4 text-sm text-muted">Specifications, pin notes, and wiring cautions for parts in the component library.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {hardwareReference.map((article) => (
            <Link
              key={article.slug}
              href={articleHref(article)}
              className="rounded-[10px] border border-border bg-surface px-4 py-3 text-sm font-medium shadow-[var(--shadow-sm)] transition-colors hover:bg-muted-bg"
            >
              {article.title}
            </Link>
          ))}
        </div>
      </section>

      <section id="faq" className="max-w-3xl scroll-mt-6" aria-labelledby="faq-heading">
        <h3 id="faq-heading" className="mb-4 text-lg font-semibold">Frequently asked questions</h3>
        <dl className="divide-y divide-border border-y border-border">
          {FAQ_ITEMS.map((item) => (
            <div key={item.id} id={`faq-${item.id}`} className="scroll-mt-6 py-5">
              <dt className="text-sm font-semibold">{item.question}</dt>
              <dd className="mt-2 text-sm leading-7 text-muted">
                <Inline text={item.answer} />
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </DashboardShell>
  );
}
