import { PageHeaderSkeleton, PageLoading, PanelPairSkeleton, StatGridSkeleton } from "@/components/ui/page-skeletons";

/** Shown inside the app frame while this page's data loads. */
export default function Loading() {
  return (
    <PageLoading label="Loading the device">
      <PageHeaderSkeleton description="Device synchronization profile" actions={1} />
      <StatGridSkeleton />
      <PanelPairSkeleton />
    </PageLoading>
  );
}
