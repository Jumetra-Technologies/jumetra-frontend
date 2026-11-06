import { PageHeaderSkeleton, PageLoading, PanelPairSkeleton, StatGridSkeleton } from "@/components/ui/page-skeletons";

/** Shown inside the app frame while the admin portal loads. */
export default function Loading() {
  return (
    <PageLoading label="Loading the admin portal">
      <PageHeaderSkeleton title="Admin portal" description="Kiungo on the website and the desktop app." actions={3} />
      <StatGridSkeleton count={5} />
      <PanelPairSkeleton />
    </PageLoading>
  );
}
