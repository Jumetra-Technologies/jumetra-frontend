import { PageHeaderSkeleton, PageLoading, StatGridSkeleton, TableSkeleton } from "@/components/ui/page-skeletons";

/** Shown inside the app frame while this page's data loads. */
export default function Loading() {
  return (
    <PageLoading label="Loading the comparison">
      <PageHeaderSkeleton title="Fixed vs Adaptive Comparison" description="Research comparison between synchronization strategies" />
      <StatGridSkeleton />
      <div className="mt-8">
        <TableSkeleton columns={5} />
      </div>
    </PageLoading>
  );
}
