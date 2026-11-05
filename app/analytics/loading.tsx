import { ChartSkeleton, PageHeaderSkeleton, PageLoading, PanelPairSkeleton, StatGridSkeleton } from "@/components/ui/page-skeletons";

/** Shown inside the app frame while the page loads. */
export default function Loading() {
  return (
    <PageLoading label="Loading Advanced Analytics">
      <PageHeaderSkeleton title="Advanced Analytics" description="What you've built, tested and learned in Kiungo, and what the community is building." actions={1} />
      <StatGridSkeleton count={5} />
      <div className="mt-6">
        <ChartSkeleton height={180} />
      </div>
      <PanelPairSkeleton />
    </PageLoading>
  );
}
