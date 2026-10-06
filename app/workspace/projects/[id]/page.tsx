import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/layout/sidebar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api-client";
import type { ProjectDetail } from "@/lib/types";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let project: ProjectDetail | null = null;
  try {
    project = await api.getProject(id);
  } catch {
    notFound();
  }

  return (
    <DashboardShell activePath="/workspace">
      <div className="mb-8">
        <h2 className="text-2xl font-bold">{project.name}</h2>
        <p className="mt-1 text-muted">{project.organization}</p>
        {project.description ? (
          <p className="mt-2 text-sm text-muted">{project.description}</p>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-medium">Experiments</h3>
          <ul className="space-y-3 text-sm">
            {project.experiments.map((exp) => (
              <li
                key={String(exp.id)}
                className="flex items-center justify-between rounded-[10px] border border-border px-3 py-2 "
              >
                <div>
                  <p className="font-medium">{String(exp.name)}</p>
                  <p className="text-xs text-muted">{String(exp.external_id ?? "—")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{String(exp.strategy)}</Badge>
                  {exp.external_id ? (
                    <Link
                      href={`/experiments/${exp.external_id}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h3 className="mb-4 font-medium">Datasets</h3>
          {project.datasets.length === 0 ? (
            <p className="text-sm text-muted">No exported datasets yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {project.datasets.map((ds) => (
                <li
                  key={String(ds.path)}
                  className="rounded-[10px] border border-border px-3 py-2 "
                >
                  <p className="font-medium">{String(ds.name)}</p>
                  <p className="text-xs text-muted">
                    {String(ds.experiment_name)} · {String(ds.type)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="mb-4 font-medium">Reports</h3>
          {project.reports.length === 0 ? (
            <p className="text-sm text-muted">No research reports generated yet.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {project.reports.map((report) => (
                <div
                  key={String(report.experiment_id)}
                  className="rounded-[10px] border border-border px-4 py-3 "
                >
                  <p className="font-medium">{String(report.title)}</p>
                  <p className="mt-1 text-xs text-muted">{String(report.experiment_id)}</p>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <dt className="text-muted">Sync Error</dt>
                      <dd>{Number(report.average_sync_error ?? 0).toFixed(2)} ms</dd>
                    </div>
                    <div>
                      <dt className="text-muted">Correction Rate</dt>
                      <dd>{((Number(report.correction_success_rate ?? 0)) * 100).toFixed(1)}%</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardShell>
  );
}
