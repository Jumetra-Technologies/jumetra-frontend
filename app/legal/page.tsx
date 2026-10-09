import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DashboardShell } from "@/components/layout/sidebar";
import { Breadcrumbs } from "@/components/learning/Navigation";
import { DRAFT_NOTICE, LEGAL_DOCUMENTS } from "@/lib/legal/content";

export const metadata: Metadata = {
  title: "Legal",
  description: "Kiungo's terms of service, user agreement, acceptable use policy, privacy policy and cookie policy.",
};

export default function LegalIndexPage() {
  return (
    <DashboardShell activePath="/legal">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Legal" }]} />
      <div className="max-w-3xl">
        <h2 className="text-3xl font-bold tracking-tight">Legal</h2>
        <p className="mt-3 text-base leading-7 text-muted">
          Five short documents in plain words. Together they say what Kiungo is, what it keeps, and what we ask of you.
        </p>
        <p className="mt-4 text-sm leading-6 text-muted">{DRAFT_NOTICE}</p>
        <ul className="mt-8 space-y-3">
          {LEGAL_DOCUMENTS.map((document) => (
            <li key={document.slug}>
              <Link
                href={`/legal/${document.slug}`}
                className="group flex items-center justify-between gap-4 rounded-[14px] border border-border bg-surface px-5 py-4 shadow-[var(--shadow-sm)] transition-colors hover:bg-muted-bg"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{document.title}</span>
                  <span className="mt-1 block text-sm leading-6 text-muted">{document.summary}</span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </DashboardShell>
  );
}
