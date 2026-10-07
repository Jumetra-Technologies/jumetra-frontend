import { DashboardShell } from "@/components/layout/sidebar";
import { ProjectsSkeleton } from "@/components/projects/ProjectsSkeleton";

export default function Loading() {
  return (
    <DashboardShell activePath="/workspace">
      <ProjectsSkeleton />
    </DashboardShell>
  );
}
