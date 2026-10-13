import { CardGridSkeleton, PageHeaderSkeleton, PageLoading } from "@/components/ui/page-skeletons";

/** Shown inside the app frame while this page's data loads. */
export default function Loading() {
  return (
    <PageLoading label="Loading devices">
      <PageHeaderSkeleton title="Devices" description="Connected hardware and observed virtual devices" />
      <CardGridSkeleton count={4} />
    </PageLoading>
  );
}
