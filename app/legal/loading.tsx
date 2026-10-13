import { CrumbsSkeleton, ListSkeleton, PageHeaderSkeleton, PageLoading } from "@/components/ui/page-skeletons";

/** Shown inside the app frame while this page's data loads. */
export default function Loading() {
  return (
    <PageLoading label="Loading legal documents">
      <CrumbsSkeleton />
      <PageHeaderSkeleton title="Legal" description="Five short documents in plain words. Together they say what Kiungo is, what it keeps, and what we ask of you." large />
      <ListSkeleton rows={5} />
    </PageLoading>
  );
}
