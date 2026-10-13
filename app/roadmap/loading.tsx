import { ListSkeleton, PageHeaderSkeleton, PageLoading } from "@/components/ui/page-skeletons";

/** Shown inside the app frame while this page's data loads. */
export default function Loading() {
  return (
    <PageLoading label="Loading the roadmap">
      <PageHeaderSkeleton eyebrow="Product direction" mutedEyebrow title="Kiungo roadmap" description="A user-focused view of what is available and what would make robotics projects more durable, testable, and easier to reproduce." large />
      <ListSkeleton rows={6} />
    </PageLoading>
  );
}
