import { Skeleton, SkeletonRegion } from "@/components/ui/skeleton";

function CardSkeleton({ preview = false }: { preview?: boolean }) {
  return (
    <div className="overflow-hidden rounded-[var(--radius)] border border-border bg-surface">
      {preview ? <Skeleton className="aspect-[16/7] w-full rounded-none" /> : null}
      <div className="space-y-2.5 p-4">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-5/6" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/** Projects page while sessions and projects load from the browser. */
export function ProjectsSkeleton() {
  return (
    <SkeletonRegion label="Loading projects">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
      <Skeleton className="mb-3 h-4 w-28" />
      <div className="mb-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <CardSkeleton preview />
        <CardSkeleton preview />
        <CardSkeleton preview />
      </div>
      <Skeleton className="mb-3 h-4 w-44" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </SkeletonRegion>
  );
}

/** A project's page while it loads. */
export function ProjectDetailSkeleton() {
  return (
    <SkeletonRegion label="Loading project" className="space-y-6">
      <Skeleton className="h-4 w-20" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-20 rounded-[var(--radius)]" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-3 rounded-[var(--radius)] border border-border bg-surface p-4">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="size-4 shrink-0 rounded-full" />
              <Skeleton className="h-4" style={{ width: `${85 - i * 8}%` }} />
            </div>
          ))}
        </div>
        <CardSkeleton preview />
      </div>
    </SkeletonRegion>
  );
}
