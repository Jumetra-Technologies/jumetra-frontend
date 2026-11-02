import { CardGridSkeleton, PageHeaderSkeleton, PageLoading } from "@/components/ui/page-skeletons";

/** Shown while the latest release is read. */
export default function Loading() {
  return (
    <PageLoading label="Loading the desktop app download">
      <PageHeaderSkeleton title="Kiungo for your computer" description="Run your own code on an emulated board or a real one." />
      <CardGridSkeleton count={3} columns={3} lines={2} />
    </PageLoading>
  );
}
