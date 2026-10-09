import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/layout/sidebar";
import { ContentRenderer } from "@/components/learning/ContentRenderer";
import { Breadcrumbs } from "@/components/learning/Navigation";
import { TableOfContents } from "@/components/learning/TableOfContents";
import { DRAFT_NOTICE, LEGAL_DOCUMENTS, getLegalDocument } from "@/lib/legal/content";

interface LegalPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return LEGAL_DOCUMENTS.map((document) => ({ slug: document.slug }));
}

export async function generateMetadata({ params }: LegalPageProps): Promise<Metadata> {
  const { slug } = await params;
  const document = getLegalDocument(slug);
  if (!document) return { title: "Not found" };
  return { title: `${document.title}`, description: document.summary };
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export default async function LegalPage({ params }: LegalPageProps) {
  const { slug } = await params;
  const document = getLegalDocument(slug);
  if (!document) notFound();

  const others = LEGAL_DOCUMENTS.filter((item) => item.slug !== document.slug);

  return (
    <DashboardShell activePath="/legal">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Legal", href: "/legal" }, { label: document.title }]} />

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_14rem]">
        <article className="min-w-0 max-w-3xl">
          <header className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight">{document.title}</h2>
            <p className="mt-3 text-base leading-7 text-muted">{document.summary}</p>
            <p className="mt-3 font-mono text-xs text-muted">Draft revised {formatDate(document.revised)}</p>
            <p
              role="note"
              className="mt-5 rounded-[10px] border px-4 py-3 text-sm leading-6"
              style={{
                borderColor: "color-mix(in srgb, var(--warning) 40%, transparent)",
                background: "color-mix(in srgb, var(--warning) 10%, transparent)",
              }}
            >
              {DRAFT_NOTICE}
            </p>
          </header>

          <ContentRenderer blocks={document.blocks} />

          <nav aria-label="Other legal documents" className="mt-12 border-t border-border pt-6">
            <p className="text-sm font-semibold">Also read</p>
            <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
              {others.map((item) => (
                <li key={item.slug}>
                  <Link href={`/legal/${item.slug}`} className="text-primary underline-offset-4 hover:underline">
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </article>

        <aside className="hidden xl:block">
          <div className="sticky top-6">
            <TableOfContents blocks={document.blocks} />
          </div>
        </aside>
      </div>
    </DashboardShell>
  );
}
