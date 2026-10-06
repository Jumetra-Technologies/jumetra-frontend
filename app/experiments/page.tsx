import Link from "next/link";
import { DashboardShell } from "@/components/layout/sidebar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api-client";
import type { ExperimentSummary } from "@/lib/types";
import { formatMs, formatPercent } from "@/lib/utils";

export default async function ExperimentsPage() {
  let experiments: ExperimentSummary[] = [];
  try {
    experiments = await api.getExperiments();
  } catch {
    experiments = [];
  }

  return (
    <DashboardShell activePath="/experiments">
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Experiments</h2>
        <p className="mt-1 text-zinc-500">Synchronization and correction experiment runs</p>
      </div>

      {experiments.length === 0 ? (
        <Card>
          <p className="text-zinc-500">No experiments found. Seed sample data or run an experiment.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {experiments.map((exp) => (
            <Link key={exp.experiment_id} href={`/experiments/${exp.experiment_id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">{exp.name}</h3>
                    <p className="text-sm text-zinc-500">{exp.experiment_id}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={exp.strategy === "adaptive" ? "info" : "default"}>
                      {exp.strategy}
                    </Badge>
                    <Badge variant={exp.status === "active" ? "success" : "default"}>
                      {exp.status}
                    </Badge>
                  </div>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-zinc-500">Devices</dt>
                    <dd className="font-medium">{exp.device_count}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Avg Sync Error</dt>
                    <dd className="font-medium">{formatMs(exp.average_sync_error)}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Correction Rate</dt>
                    <dd className="font-medium">{formatPercent(exp.correction_success_rate)}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Duration</dt>
                    <dd className="font-medium">
                      {exp.duration_ms ? `${exp.duration_ms} ms` : "—"}
                    </dd>
                  </div>
                </dl>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
