import { ChartSkeleton, PageHeaderSkeleton, PageLoading, PanelPairSkeleton, StatGridSkeleton } from "@/components/ui/page-skeletons";

/** Shown inside the app frame while this page's data loads. */
export default function Loading() {
  return (
    <PageLoading label="Loading the experiment">
      <PageHeaderSkeleton actions={2} />
      <StatGridSkeleton />
      <ChartSkeleton />
      <PanelPairSkeleton />
    </PageLoading>
  );
}
