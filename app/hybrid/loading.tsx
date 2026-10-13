import { ListSkeleton, PageHeaderSkeleton, PageLoading, PanelPairSkeleton } from "@/components/ui/page-skeletons";

/** Shown inside the app frame while this page's data loads. */
export default function Loading() {
  return (
    <PageLoading label="Loading the hybrid bridge">
      <PageHeaderSkeleton title="Hybrid Hardware Bridge" description="Combine physical ESP32 hardware, virtual simulation, and external simulators in one experiment" />
      <ListSkeleton rows={3} />
      <PanelPairSkeleton />
    </PageLoading>
  );
}
