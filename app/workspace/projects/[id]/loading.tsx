import { DashboardShell } from "@/components/layout/sidebar";
import { ProjectDetailSkeleton } from "@/components/projects/ProjectsSkeleton";

export default function Loading() {
  return (
    <DashboardShell activePath="/workspace">
      <ProjectDetailSkeleton />
    </DashboardShell>
  );
}
