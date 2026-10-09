import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock } from "lucide-react";
import { DashboardShell } from "@/components/layout/sidebar";
import { ContentRenderer } from "@/components/learning/ContentRenderer";
import { Breadcrumbs, PrevNext } from "@/components/learning/Navigation";
import { MarkCompleteButton } from "@/components/learning/ProgressControls";
import { TableOfContents } from "@/components/learning/TableOfContents";
import {
  MODULES,
  TOPIC_LABELS,
  articleHref,
  getAdjacentModules,
  getModule,
  moduleHref,
  resolveRelatedArticles,
} from "@/lib/learning";

interface ModulePageProps {
  params: Promise<{ slug: string }>;
}

const LEVEL_LABEL = { beginner: "Beginner", intermediate: "Intermediate" } as const;

export function generateStaticParams() {
  return MODULES.map((lesson) => ({ slug: lesson.slug }));
}

export async function generateMetadata({ params }: ModulePageProps): Promise<Metadata> {
  const { slug } = await params;
  const lesson = getModule(slug);
  if (!lesson) return { title: "Not found" };
  return { title: `${lesson.title} · Learning Center`, description: lesson.summary };
}

export default async function LearningModulePage({ params }: ModulePageProps) {
  const { slug } = await params;
  const lesson = getModule(slug);
  if (!lesson) notFound();

  const { previous, next } = getAdjacentModules(lesson.slug);
  const relatedDocs = resolveRelatedArticles(lesson.relatedDocs);

  return (
    <DashboardShell activePath="/learn">
      <Breadcrumbs
        items={[
          { label: "Learning Center", href: "/learn" },
          { label: lesson.title },
        ]}
      />

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_14rem]">
        <article className="min-w-0 max-w-3xl">
          <header className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              Module {lesson.order} of {MODULES.length} · {TOPIC_LABELS[lesson.topic]}
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">{lesson.title}</h2>
            <p className="mt-3 text-base leading-7 text-muted">{lesson.summary}</p>
            <p className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted">
              <span>{LEVEL_LABEL[lesson.level]}</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" aria-hidden />
                About {lesson.minutes} minutes
              </span>
            </p>
          </header>

          <section
            aria-labelledby="objectives-heading"
            className="mb-10 rounded-[14px] border border-border bg-surface p-5 shadow-[var(--shadow-sm)]"
          >
            <h3 id="objectives-heading" className="text-sm font-semibold">After this module you can</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              {lesson.objectives.map((objective) => (
                <li key={objective} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  <span>{objective}</span>
                </li>
              ))}
            </ul>
          </section>

          <ContentRenderer blocks={lesson.blocks} />

          <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-[14px] border border-border bg-surface p-5 shadow-[var(--shadow-sm)]">
            <div>
              <p className="text-sm font-semibold">Finished this module?</p>
              <p className="mt-0.5 text-xs text-muted">Marking it complete updates your progress on the Learning Center.</p>
            </div>
            <MarkCompleteButton slug={lesson.slug} />
          </div>

          {relatedDocs.length > 0 ? (
            <section aria-labelledby="reference-heading" className="mt-10">
              <h3 id="reference-heading" className="text-sm font-semibold">Reference for this module</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {relatedDocs.map((item) => (
                  <li key={`${item.category}/${item.slug}`}>
                    <Link href={articleHref(item)} className="font-medium text-primary hover:underline">
                      {item.title}
                    </Link>
                    <span className="text-muted"> — {item.summary}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <PrevNext
            previous={previous ? { href: moduleHref(previous), title: previous.title } : undefined}
            next={next ? { href: moduleHref(next), title: next.title } : undefined}
            previousLabel="Previous module"
            nextLabel="Next module"
          />
        </article>

        <aside className="hidden xl:block">
          <div className="sticky top-6">
            <TableOfContents blocks={lesson.blocks} />
          </div>
        </aside>
      </div>
    </DashboardShell>
  );
}
