import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { DashboardShell } from "@/components/layout/sidebar";
import { Breadcrumbs, CategoryTabs } from "@/components/learning/Navigation";
import { ModuleStatus } from "@/components/learning/ProgressControls";
import {
  DOC_CATEGORIES,
  MODULES,
  articleHref,
  getArticlesByCategory,
  getCategory,
  moduleHref,
} from "@/lib/learning";

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

export function generateStaticParams() {
  return DOC_CATEGORIES.map((category) => ({ category: category.id }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category } = await params;
  const found = getCategory(category);
  if (!found) return { title: "Not found" };
  return { title: `${found.title} · Kiungo Documentation`, description: found.description };
}

export default async function DocsCategoryPage({ params }: CategoryPageProps) {
  const { category: categoryId } = await params;
  const category = getCategory(categoryId);
  if (!category) notFound();

  const isTutorials = category.id === "tutorials";
  const articles = isTutorials ? [] : getArticlesByCategory(category.id);

  return (
    <DashboardShell activePath="/docs">
      <Breadcrumbs
        items={[
          { label: "Documentation", href: "/docs" },
          { label: category.title },
        ]}
      />
      <CategoryTabs active={category.id} />

      <div className="mb-8 max-w-3xl">
        <h2 className="text-3xl font-bold tracking-tight">{category.title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted">{category.description}</p>
      </div>

      <ul className="max-w-3xl space-y-3">
        {isTutorials
          ? MODULES.map((lesson) => (
              <li key={lesson.slug}>
                <Link
                  href={moduleHref(lesson)}
                  className="group flex items-center justify-between gap-4 rounded-[14px] border border-border bg-surface px-5 py-4 shadow-[var(--shadow-sm)] transition-colors hover:bg-muted-bg"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">
                      <span className="mr-2 font-mono text-xs text-muted">{String(lesson.order).padStart(2, "0")}</span>
                      {lesson.title}
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-muted">{lesson.summary}</span>
                    <span className="mt-2 block">
                      <ModuleStatus slug={lesson.slug} />
                    </span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
              </li>
            ))
          : articles.map((article) => (
              <li key={article.slug}>
                <Link
                  href={articleHref(article)}
                  className="group flex items-center justify-between gap-4 rounded-[14px] border border-border bg-surface px-5 py-4 shadow-[var(--shadow-sm)] transition-colors hover:bg-muted-bg"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{article.title}</span>
                    <span className="mt-1 block text-sm leading-6 text-muted">{article.summary}</span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
              </li>
            ))}
      </ul>
    </DashboardShell>
  );
}
