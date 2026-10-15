import type { ReactNode } from "react";
import { Skeleton, SkeletonRegion } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Skeletons shaped like Kiungo's page layouts. Each route's loading.tsx
 * composes these so the page's frame (and its real title, which never
 * depends on data) shows at once, and only the data-driven parts wait.
 * Shapes match the real components closely so nothing jumps when the
 * content arrives.
 */

const card = "rounded-[14px] border border-border bg-surface p-6 shadow-[var(--shadow-sm)]";

/** The whole loading view: announces "Loading …" once to assistive tech. */
export function PageLoading({ label, children, fill = false }: { label: string; children: ReactNode; /** Full-bleed pages: fill the content area. */ fill?: boolean }) {
  return (
    <SkeletonRegion label={label} className={cn(fill && "flex h-full min-h-0 flex-col")}>
      <div data-testid="page-skeleton" className={cn(fill && "flex min-h-0 flex-1 flex-col")}>
        {children}
      </div>
    </SkeletonRegion>
  );
}

/**
 * The page heading. With `title` it shows the real text (static on every
 * page), so only the data below shimmers; without, a placeholder.
 */
export function PageHeaderSkeleton({ eyebrow, title, description, actions = 0, large = false, mutedEyebrow = false }: { eyebrow?: string; title?: string; description?: string; actions?: number; large?: boolean; mutedEyebrow?: boolean }) {
  return (
    <div className={cn("mb-8 flex flex-wrap items-end justify-between gap-4", large && "max-w-3xl")}>
      <div className="min-w-0">
        {eyebrow ? <p className={cn("text-xs font-semibold uppercase", mutedEyebrow ? "tracking-[0.12em] text-muted" : "tracking-[0.14em] text-primary")}>{eyebrow}</p> : null}
        {title ? <h2 className={cn("font-bold", large ? "mt-2 text-3xl tracking-tight" : "text-2xl", eyebrow && !large && "mt-1")}>{title}</h2> : <Skeleton className={cn("h-7", large ? "w-72" : "w-48")} />}
        {description ? <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted">{description}</p> : <Skeleton className="mt-2.5 h-4 w-96 max-w-full" />}
      </div>
      {actions ? (
        <div className="flex gap-2">
          {Array.from({ length: actions }, (_, i) => (
            <Skeleton key={i} className="h-9 w-28" />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** A row of metric tiles. */
export function StatGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={card}>
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-2.5 h-6 w-24" />
        </div>
      ))}
    </div>
  );
}

/** Cards with a title, a status pill and a few labeled values. */
export function CardGridSkeleton({ count = 4, columns = 2, preview = false, lines = 2 }: { count?: number; columns?: 2 | 3; preview?: boolean; lines?: number }) {
  return (
    <div className={cn("grid gap-4", columns === 3 ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-2")}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-[14px] border border-border bg-surface shadow-[var(--shadow-sm)]">
          {preview ? <Skeleton className="aspect-[16/8] w-full rounded-none" /> : null}
          <div className="p-6">
            <div className="flex items-start justify-between gap-3">
              <Skeleton className="h-5 w-2/5" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {Array.from({ length: lines * 2 }, (_, j) => (
                <div key={j} className="space-y-1.5">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** A list of records: a title line and a meta line per row. */
export function ListSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("divide-y divide-border rounded-[14px] border border-border bg-surface", className)}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <Skeleton className="size-9 shrink-0 rounded-[10px]" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4" style={{ width: `${55 - (i % 3) * 10}%` }} />
            <Skeleton className="h-3" style={{ width: `${35 + (i % 2) * 10}%` }} />
          </div>
          <Skeleton className="h-6 w-20 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** A data table. */
export function TableSkeleton({ rows = 6, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className={cn(card, "p-0")}>
      <div className="grid gap-4 border-b border-border px-5 py-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: columns }, (_, i) => (
          <Skeleton key={i} className="h-3 w-16" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="grid gap-4 border-b border-border px-5 py-3.5 last:border-0" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }, (_, c) => (
            <Skeleton key={c} className="h-4" style={{ width: `${70 - ((r + c) % 3) * 15}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Two side-by-side panels with labeled values (detail and analytics pages). */
export function PanelPairSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      {[0, 1].map((p) => (
        <div key={p} className={card}>
          <Skeleton className="mb-5 h-5 w-40" />
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: rows }, (_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-14" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** A chart area. */
export function ChartSkeleton({ height = 220 }: { height?: number }) {
  return (
    <div className={cn(card, "mt-6")}>
      <Skeleton className="mb-4 h-5 w-48" />
      <div className="flex items-end gap-2" style={{ height }}>
        {[38, 62, 48, 80, 55, 70, 44, 90, 60, 74, 52, 66].map((h, i) => (
          <Skeleton key={i} className="flex-1 rounded-t-[6px] rounded-b-none" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

/** Breadcrumbs above a document. */
export function CrumbsSkeleton() {
  return (
    <div className="mb-6 flex items-center gap-2">
      <Skeleton className="h-3 w-12" />
      <Skeleton className="h-3 w-3 rounded-full" />
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-3 w-3 rounded-full" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

/** A long-form article with a contents rail: docs, lessons, legal documents. */
export function ArticleSkeleton({ toc = true }: { toc?: boolean }) {
  return (
    <div className={cn("grid gap-10", toc && "lg:grid-cols-[minmax(0,1fr)_14rem]")}>
      <article className="min-w-0 max-w-3xl">
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="mt-4 h-5 w-full" />
        <Skeleton className="mt-2 h-5 w-5/6" />
        {[0, 1, 2].map((s) => (
          <div key={s} className="mt-10">
            <Skeleton className="h-6 w-1/3" />
            {[96, 100, 92, 70].map((w, i) => (
              <Skeleton key={i} className="mt-3 h-4" style={{ width: `${w - s * 3}%` }} />
            ))}
            {s === 1 ? <Skeleton className="mt-6 h-36 w-full rounded-[12px]" /> : null}
          </div>
        ))}
      </article>
      {toc ? (
        <aside className="hidden space-y-3 lg:block">
          <Skeleton className="h-3 w-20" />
          {[80, 64, 72, 56, 68].map((w, i) => (
            <Skeleton key={i} className="h-3" style={{ width: `${w}%` }} />
          ))}
        </aside>
      ) : null}
    </div>
  );
}

/** A row of tabs or filter chips. */
export function TabsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-8 rounded-full" style={{ width: `${72 + (i % 3) * 18}px` }} />
      ))}
    </div>
  );
}

/** A toolbar with a search box and a couple of filters. */
export function ToolbarSkeleton() {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <Skeleton className="h-10 w-full max-w-md" />
      <Skeleton className="h-10 w-32" />
      <Skeleton className="h-10 w-28" />
    </div>
  );
}

/** Lines of code on the editor's dark background. */
export function CodeSkeleton({ label = "Loading the editor" }: { label?: string }) {
  return (
    <SkeletonRegion label={label} className="dark h-full w-full bg-[#1e1e1e] p-4">
      <div className="space-y-2.5" data-theme="dark">
        {[42, 66, 30, 0, 58, 74, 50, 36, 0, 62, 44, 28].map((w, i) =>
          w ? (
            <div key={i} className="flex items-center gap-4">
              <span className="w-5 shrink-0 text-right font-mono text-[11px] text-white/25">{i + 1}</span>
              <Skeleton className="h-3 !bg-white/10" style={{ width: `${w}%`, marginLeft: `${(i % 4) * 12}px` }} />
            </div>
          ) : (
            <div key={i} className="h-3" />
          ),
        )}
      </div>
    </SkeletonRegion>
  );
}

/** The landing page: hero, a board illustration and a row of feature cards. */
export function LandingSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1120px] px-5 py-14 sm:px-8 lg:px-10">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-5 h-12 w-11/12" />
          <Skeleton className="mt-3 h-12 w-3/4" />
          <Skeleton className="mt-6 h-5 w-full" />
          <Skeleton className="mt-2 h-5 w-5/6" />
          <div className="mt-8 flex gap-3">
            <Skeleton className="h-11 w-40 rounded-[12px]" />
            <Skeleton className="h-11 w-36 rounded-[12px]" />
          </div>
        </div>
        <Skeleton className="aspect-[4/3] w-full rounded-[20px]" />
      </div>
      <div className="mt-16 grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-[14px] border border-border bg-surface p-6">
            <Skeleton className="size-9 rounded-[10px]" />
            <Skeleton className="mt-4 h-5 w-1/2" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-4/5" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** The Embedded Studio: header bar, project column, editor, output panel and upload column. */
export function StudioSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex shrink-0 items-center gap-3 border-b border-border bg-surface px-3 py-2">
        <span className="text-sm font-semibold">Embedded Studio</span>
        <div className="ml-auto flex gap-1">
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-7 w-14" />
          <Skeleton className="h-7 w-12" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="hidden w-56 shrink-0 space-y-2 border-r border-border p-2 sm:block">
          <Skeleton className="h-7 w-full" />
          <Skeleton className="h-7 w-full" />
          <Skeleton className="h-7 w-full" />
          <Skeleton className="h-7 w-full" />
          <div className="space-y-1.5 pt-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">
            <CodeSkeleton label="Loading the studio" />
          </div>
          <div className="h-40 shrink-0 space-y-2 border-t border-border p-2">
            <div className="flex gap-1">
              {[44, 40, 64, 52].map((w, i) => (
                <Skeleton key={i} className="h-5" style={{ width: w }} />
              ))}
            </div>
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
        <div className="hidden w-56 shrink-0 space-y-2 border-l border-border p-2 lg:block">
          <Skeleton className="h-14 w-full rounded-[10px]" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </div>
    </div>
  );
}
