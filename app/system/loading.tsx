import { PageHeaderSkeleton, PageLoading, StatGridSkeleton } from "@/components/ui/page-skeletons";

/** Shown inside the app frame while this page loads. Untitled: the page isn't advertised. */
export default function Loading() {
  return (
    <PageLoading label="Loading">
      <PageHeaderSkeleton />
      <StatGridSkeleton />
    </PageLoading>
  );
}
