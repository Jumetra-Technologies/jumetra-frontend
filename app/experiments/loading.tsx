import { ListSkeleton, PageHeaderSkeleton, PageLoading, ToolbarSkeleton } from "@/components/ui/page-skeletons";

/** Shown inside the app frame while this page's data loads. */
export default function Loading() {
  return (
    <PageLoading label="Loading experiment records">
      <PageHeaderSkeleton eyebrow="Robotics workspace" mutedEyebrow title="Experiment records" description="Capture procedures and results so a test can be understood and repeated later." actions={1} />
      <ToolbarSkeleton />
      <ListSkeleton rows={5} />
    </PageLoading>
  );
}
