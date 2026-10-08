import { DashboardShell } from "@/components/layout/sidebar";
import { ProjectHub } from "@/components/projects/ProjectHub";
import { api } from "@/lib/api-client";
import type { ProjectSummary } from "@/lib/types";

export default async function WorkspacePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  let projects: ProjectSummary[] = [];
  try {
    projects = await api.getProjects();
  } catch {
    projects = [];
  }

  return (
    <DashboardShell activePath="/workspace">
      <ProjectHub serverProjects={projects} startCreating={params.new === "1"} />
    </DashboardShell>
  );
}
