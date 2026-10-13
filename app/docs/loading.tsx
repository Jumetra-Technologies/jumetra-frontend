import { CardGridSkeleton, PageHeaderSkeleton, PageLoading } from "@/components/ui/page-skeletons";

/** Shown inside the app frame while this page's data loads. */
export default function Loading() {
  return (
    <PageLoading label="Loading the documentation">
      <PageHeaderSkeleton eyebrow="Documentation Center" title="Kiungo documentation" description="The official reference for how Kiungo works, how to run it, and the hardware it supports." large />
      <CardGridSkeleton count={6} columns={3} lines={1} />
    </PageLoading>
  );
}
