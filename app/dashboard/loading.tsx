import { CardGridSkeleton, ListSkeleton, PageHeaderSkeleton, PageLoading, StatGridSkeleton } from "@/components/ui/page-skeletons";

/** Shown inside the app frame while this page's data loads. */
export default function Loading() {
  return (
    <PageLoading label="Loading diagnostics">
      <PageHeaderSkeleton title="System diagnostics" description="Robotics projects first; connected system metrics below." />
      <StatGridSkeleton />
      <div className="mt-8">
        <CardGridSkeleton count={2} />
      </div>
      <ListSkeleton rows={3} className="mt-8" />
    </PageLoading>
  );
}
