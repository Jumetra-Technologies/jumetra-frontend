import { PageHeaderSkeleton, PageLoading, PanelPairSkeleton } from "@/components/ui/page-skeletons";

/** Shown inside the app frame while this page's data loads. */
export default function Loading() {
  return (
    <PageLoading label="Loading the architecture">
      <PageHeaderSkeleton title="How Kiungo fits together" description="Five layers make up the system, from the web app you are using to the boards on your bench." large />
      <div className="hhip-skeleton h-72 rounded-[14px]" aria-hidden />
      <PanelPairSkeleton rows={2} />
    </PageLoading>
  );
}
