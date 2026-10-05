import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import { DOC_CATEGORIES } from "@/lib/learning/categories";
import type { DocCategoryId } from "@/lib/learning/types";
import { cn } from "@/lib/utils";

export function Breadcrumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-5">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {item.href && !last ? (
                <Link href={item.href} className="hover:text-foreground hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className={last ? "text-foreground" : undefined}>
                  {item.label}
                </span>
              )}
              {!last ? <ChevronRight className="size-3" aria-hidden /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

interface PrevNextLink {
  href: string;
  title: string;
}

export function PrevNext({
  previous,
  next,
  previousLabel = "Previous",
  nextLabel = "Next",
}: {
  previous?: PrevNextLink;
  next?: PrevNextLink;
  previousLabel?: string;
  nextLabel?: string;
}) {
  if (!previous && !next) return null;

  return (
    <nav aria-label="Pagination" className="mt-10 grid gap-3 border-t border-border pt-6 sm:grid-cols-2">
      {previous ? (
        <Link
          href={previous.href}
          className="group rounded-[10px] border border-border bg-surface px-4 py-3 shadow-[var(--shadow-sm)] transition-colors hover:bg-muted-bg"
        >
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <ArrowLeft className="size-3.5" aria-hidden />
            {previousLabel}
          </span>
          <span className="mt-1 block text-sm font-semibold">{previous.title}</span>
        </Link>
      ) : (
        <span aria-hidden className="hidden sm:block" />
      )}
      {next ? (
        <Link
          href={next.href}
          className="group rounded-[10px] border border-border bg-surface px-4 py-3 text-right shadow-[var(--shadow-sm)] transition-colors hover:bg-muted-bg"
        >
          <span className="flex items-center justify-end gap-1.5 text-xs text-muted">
            {nextLabel}
            <ArrowRight className="size-3.5" aria-hidden />
          </span>
          <span className="mt-1 block text-sm font-semibold">{next.title}</span>
        </Link>
      ) : null}
    </nav>
  );
}

/** Horizontal switcher between the five Documentation Center categories. */
export function CategoryTabs({ active }: { active?: DocCategoryId }) {
  return (
    <nav aria-label="Documentation categories" className="mb-8 flex flex-wrap gap-2">
      {DOC_CATEGORIES.map((category) => {
        const isActive = category.id === active;
        return (
          <Link
            key={category.id}
            href={`/docs/${category.id}`}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-muted hover:bg-muted-bg hover:text-foreground",
            )}
          >
            {category.title}
          </Link>
        );
      })}
    </nav>
  );
}
