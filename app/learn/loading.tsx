import { CardGridSkeleton, PageHeaderSkeleton, PageLoading } from "@/components/ui/page-skeletons";

/** Shown inside the app frame while this page's data loads. */
export default function Loading() {
  return (
    <PageLoading label="Loading the Learning Center">
      <PageHeaderSkeleton eyebrow="Learning Center" title="Learn hardware by building" description="Short, hands-on modules take you from how a circuit works to reading real sensors and mixing virtual and physical parts." large />
      <CardGridSkeleton count={6} columns={3} preview lines={1} />
    </PageLoading>
  );
}
