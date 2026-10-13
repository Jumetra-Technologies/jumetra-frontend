"use client";

import { usePathname } from "next/navigation";
import { CardGridSkeleton, LandingSkeleton, PageHeaderSkeleton, PageLoading } from "@/components/ui/page-skeletons";

/**
 * The fallback for any page without its own loading view, shown inside the
 * app frame: the landing page's shape on Home, a generic page elsewhere.
 */
export default function Loading() {
  const pathname = usePathname();
  if (pathname === "/") {
    return (
      <PageLoading label="Loading Kiungo">
        <LandingSkeleton />
      </PageLoading>
    );
  }
  return (
    <PageLoading label="Loading">
      <PageHeaderSkeleton />
      <CardGridSkeleton count={4} />
    </PageLoading>
  );
}
