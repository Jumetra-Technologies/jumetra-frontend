import { PageLoading, StudioSkeleton } from "@/components/ui/page-skeletons";

/** The studio's frame, edge to edge, while its code loads. */
export default function Loading() {
  return (
    <PageLoading label="Loading Embedded Studio" fill>
      <StudioSkeleton />
    </PageLoading>
  );
}
