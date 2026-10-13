import { CardGridSkeleton, PageHeaderSkeleton, PageLoading, PanelPairSkeleton } from "@/components/ui/page-skeletons";

/** Shown inside the app frame while this page's data loads. */
export default function Loading() {
  return (
    <PageLoading label="Loading hybrid hardware">
      <PageHeaderSkeleton title="Hybrid Hardware" description="Run one experiment with real and virtual parts together." />
      <CardGridSkeleton count={4} columns={2} lines={2} />
      <PanelPairSkeleton />
    </PageLoading>
  );
}
