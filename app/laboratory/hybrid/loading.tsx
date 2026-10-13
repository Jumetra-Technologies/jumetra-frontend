import { ListSkeleton, PageHeaderSkeleton, PageLoading, PanelPairSkeleton } from "@/components/ui/page-skeletons";

/** Shown inside the app frame while this page's data loads. */
export default function Loading() {
  return (
    <PageLoading label="Loading the hybrid laboratory">
      <PageHeaderSkeleton  />
      <ListSkeleton rows={3} />
      <PanelPairSkeleton />
    </PageLoading>
  );
}
