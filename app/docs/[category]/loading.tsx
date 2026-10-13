import { CrumbsSkeleton, ListSkeleton, PageHeaderSkeleton, PageLoading, TabsSkeleton } from "@/components/ui/page-skeletons";

/** Shown inside the app frame while this page's data loads. */
export default function Loading() {
  return (
    <PageLoading label="Loading the section">
      <CrumbsSkeleton />
      <TabsSkeleton count={5} />
      <PageHeaderSkeleton  />
      <ListSkeleton rows={6} />
    </PageLoading>
  );
}
