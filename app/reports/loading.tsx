import { ListSkeleton, PageHeaderSkeleton, PageLoading, ToolbarSkeleton } from "@/components/ui/page-skeletons";

/** Shown inside the app frame while this page's data loads. */
export default function Loading() {
  return (
    <PageLoading label="Loading reports">
      <PageHeaderSkeleton eyebrow="Robotics workspace" mutedEyebrow title="Reports" description="Export reproducible project and experiment notes as portable Markdown files." />
      <ToolbarSkeleton />
      <ListSkeleton rows={4} />
    </PageLoading>
  );
}
