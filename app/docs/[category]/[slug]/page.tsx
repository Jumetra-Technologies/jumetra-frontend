import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/layout/sidebar";
import { ContentRenderer } from "@/components/learning/ContentRenderer";
import { Breadcrumbs, PrevNext } from "@/components/learning/Navigation";
import { TableOfContents } from "@/components/learning/TableOfContents";
import {
  ARTICLES,
  articleHref,
  getArticle,
  getArticlesByCategory,
  getCategory,
  resolveRelatedArticles,
} from "@/lib/learning";

interface ArticlePageProps {
  params: Promise<{ category: string; slug: string }>;
}

export function generateStaticParams() {
  return ARTICLES.map((article) => ({ category: article.category, slug: article.slug }));
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { category, slug } = await params;
  const article = getArticle(category, slug);
  if (!article) return { title: "Not found" };
  return { title: `${article.title} · Kiungo Documentation`, description: article.summary };
}

export default async function DocsArticlePage({ params }: ArticlePageProps) {
  const { category: categoryId, slug } = await params;
  const category = getCategory(categoryId);
  const article = getArticle(categoryId, slug);
  if (!category || !article) notFound();

  const siblings = getArticlesByCategory(category.id);
  const position = siblings.findIndex((item) => item.slug === article.slug);
  const previous = position > 0 ? siblings[position - 1] : undefined;
  const next = position < siblings.length - 1 ? siblings[position + 1] : undefined;
  const related = resolveRelatedArticles(article.related);

  return (
    <DashboardShell activePath="/docs">
      <Breadcrumbs
        items={[
          { label: "Documentation", href: "/docs" },
          { label: category.title, href: `/docs/${category.id}` },
          { label: article.title },
        ]}
      />

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_14rem]">
        <article className="min-w-0 max-w-3xl">
          <header className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{category.title}</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">{article.title}</h2>
            <p className="mt-3 text-base leading-7 text-muted">{article.summary}</p>
          </header>

          <ContentRenderer blocks={article.blocks} />

          {related.length > 0 ? (
            <section aria-labelledby="related-heading" className="mt-12 border-t border-border pt-6">
              <h3 id="related-heading" className="text-sm font-semibold">Related</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {related.map((item) => (
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
            previous={previous ? { href: articleHref(previous), title: previous.title } : undefined}
            next={next ? { href: articleHref(next), title: next.title } : undefined}
          />
        </article>

        <aside className="hidden xl:block">
          <div className="sticky top-6">
            <TableOfContents blocks={article.blocks} />
          </div>
        </aside>
      </div>
    </DashboardShell>
  );
}
