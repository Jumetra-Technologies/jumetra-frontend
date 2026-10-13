import { PageHeaderSkeleton, PageLoading, PanelPairSkeleton, StatGridSkeleton } from "@/components/ui/page-skeletons";

/** Shown inside the app frame while this page's data loads. */
export default function Loading() {
  return (
    <PageLoading label="Loading analytics">
      <PageHeaderSkeleton title="Analytics" description="Aggregated research metrics across all experiments" />
      <StatGridSkeleton count={8} />
      <PanelPairSkeleton />
    </PageLoading>
  );
}
