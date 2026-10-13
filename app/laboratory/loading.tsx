import { CardGridSkeleton, PageHeaderSkeleton, PageLoading } from "@/components/ui/page-skeletons";

/** Shown inside the app frame while this page's data loads. */
export default function Loading() {
  return (
    <PageLoading label="Loading the laboratory">
      <PageHeaderSkeleton title="Laboratory" description="Create virtual labs or open the full engineering workspace" actions={2} />
      <CardGridSkeleton count={4} />
    </PageLoading>
  );
}
