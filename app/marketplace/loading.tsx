import { CardGridSkeleton, PageHeaderSkeleton, PageLoading } from "@/components/ui/page-skeletons";

/** Shown inside the app frame while this page's data loads. */
export default function Loading() {
  return (
    <PageLoading label="Loading the hardware catalog">
      <PageHeaderSkeleton title="Hardware catalog" description="The component catalog is the supported place to find hardware profiles and controller compatibility." />
      <CardGridSkeleton count={2} lines={1} />
    </PageLoading>
  );
}
