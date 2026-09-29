import { DashboardShell } from "@/components/layout/sidebar";
import { ProjectHub } from "@/components/projects/ProjectHub";
import { api } from "@/lib/api-client";
import type { ProjectSummary } from "@/lib/types";

export default async function WorkspacePage() {
  let projects: ProjectSummary[] = [];
  try {
    projects = await api.getProjects();
  } catch {
    projects = [];
  }

  return (
    <DashboardShell activePath="/workspace">
      <ProjectHub serverProjects={projects} />
    </DashboardShell>
  );
}
