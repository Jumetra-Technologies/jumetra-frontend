import Link from "next/link";
import { DashboardShell } from "@/components/layout/sidebar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Research Workspace</h2>
        <p className="mt-1 text-muted">
          Projects, experiments, datasets, and reports for your organization
        </p>
      </div>

      {projects.length === 0 ? (
        <Card>
          <p className="text-muted">No projects found. Ensure the API and platform DB are running.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((project) => (
            <Link key={project.id} href={`/workspace/projects/${project.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">{project.name}</h3>
                    <p className="mt-1 text-sm text-muted">{project.organization}</p>
                  </div>
                  <Badge variant="info">{project.experiment_count} experiments</Badge>
                </div>
                {project.description ? (
                  <p className="mt-3 text-sm text-muted">{project.description}</p>
                ) : null}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
