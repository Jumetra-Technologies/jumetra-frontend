import { DashboardShell } from "@/components/layout/sidebar";
import { LabSkeleton } from "@/components/lab/LabSkeleton";

export default function Loading() {
  return (
    <DashboardShell activePath="/laboratory/workspace" fullBleed>
      <LabSkeleton />
    </DashboardShell>
  );
}
