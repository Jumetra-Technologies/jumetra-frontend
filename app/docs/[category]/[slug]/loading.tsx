import { ArticleSkeleton, CrumbsSkeleton, PageLoading } from "@/components/ui/page-skeletons";

/** Shown inside the app frame while this page's data loads. */
export default function Loading() {
  return (
    <PageLoading label="Loading the page">
      <CrumbsSkeleton />
      <ArticleSkeleton />
    </PageLoading>
  );
}
