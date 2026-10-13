import { CrumbsSkeleton, ListSkeleton, PageHeaderSkeleton, PageLoading } from "@/components/ui/page-skeletons";

/** Shown inside the app frame while this page's data loads. */
export default function Loading() {
  return (
    <PageLoading label="Loading the roadmap">
      <CrumbsSkeleton />
      <PageHeaderSkeleton title="Roadmap and development phases" description="What Kiungo is for, the phases that get it there, and where each one stands." large />
      <ListSkeleton rows={6} />
    </PageLoading>
  );
}
