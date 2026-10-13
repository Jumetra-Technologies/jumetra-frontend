import { CardGridSkeleton, PageHeaderSkeleton, PageLoading, ToolbarSkeleton } from "@/components/ui/page-skeletons";

/** Shown inside the app frame while this page's data loads. */
export default function Loading() {
  return (
    <PageLoading label="Loading the component library">
      <PageHeaderSkeleton title="Component library" description="Every part Kiungo can simulate, drawn to scale." large />
      <ToolbarSkeleton />
      <CardGridSkeleton count={6} columns={3} preview lines={1} />
    </PageLoading>
  );
}
