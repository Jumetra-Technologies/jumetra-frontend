import { Skeleton, SkeletonRegion } from "@/components/ui/skeleton";

/**
 * The Engineering Lab's shape while it loads: top bar, components panel,
 * a canvas with two part cards and a wire, and the dock.
 */
export function LabSkeleton() {
  return (
    <SkeletonRegion label="Loading the Engineering Lab" className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-3">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="hidden h-6 w-28 rounded-full sm:block" />
        <Skeleton className="mx-auto h-9 w-[19rem] rounded-[12px]" />
        <Skeleton className="h-9 w-20" />
        <Skeleton className="hidden h-9 w-28 md:block" />
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="hidden w-[300px] shrink-0 flex-col gap-3 border-r border-border bg-surface p-3 lg:flex">
          <Skeleton className="h-10 w-full rounded-[10px]" />
          <Skeleton className="mt-1 h-3 w-32" />
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-11 shrink-0 rounded-[10px]" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5" style={{ width: `${70 - i * 6}%` }} />
                <Skeleton className="h-3 w-4/5" />
              </div>
            </div>
          ))}
        </div>
        <div className="relative min-w-0 flex-1 overflow-hidden bg-canvas" style={{ backgroundImage: "radial-gradient(var(--canvas-grid) 1px, transparent 1px)", backgroundSize: "18px 18px" }}>
          <div className="absolute left-[12%] top-[16%] w-[300px] max-w-[42%] rounded-[14px] border border-border bg-surface p-3 shadow-[var(--shadow-sm)]">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="mt-3 h-44 w-full rounded-[10px]" />
          </div>
          <div className="absolute left-[58%] top-[30%] w-[230px] max-w-[34%] rounded-[14px] border border-border bg-surface p-3 shadow-[var(--shadow-sm)]">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-24 w-full rounded-[10px]" />
          </div>
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <path d="M 42 34 C 50 34, 50 42, 58 42" fill="none" stroke="var(--border)" strokeWidth="3" strokeDasharray="6 8" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
        <div className="hidden w-[320px] shrink-0 flex-col gap-3 border-l border-border bg-surface p-4 xl:flex">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-36 w-full rounded-[12px]" />
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-3.5 w-2/3" />
          <Skeleton className="h-3.5 w-1/2" />
        </div>
      </div>
      <div className="flex h-10 shrink-0 items-center gap-4 border-t border-border bg-surface px-3">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-4 w-16" />
        ))}
      </div>
    </SkeletonRegion>
  );
}
