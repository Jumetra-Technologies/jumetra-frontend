import Link from "next/link";
import { DashboardShell } from "@/components/layout/sidebar";
import { MetricTiles } from "@/components/charts/charts";
import { LiveOperationsPanel } from "@/components/live/live-panel";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api-client";
import { formatMs, formatPercent } from "@/lib/utils";

export default async function DashboardPage() {
  let overview;
  try {
    overview = await api.getDashboardOverview();
  } catch {
    overview = null;
  }

  if (!overview) {
    return (
      <DashboardShell activePath="/dashboard">
        <h2 className="text-2xl font-bold">Dashboard Overview</h2>
        <p className="mt-4 text-muted">
          Unable to load data. Start the API:{" "}
          <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">
            uvicorn api.main:app --reload
          </code>
        </p>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell activePath="/dashboard">
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Dashboard Overview</h2>
        <p className="mt-1 text-muted">HHIP hybrid hardware research metrics at a glance</p>
      </div>

      <MetricTiles
        items={[
          {
            label: "Active Experiments",
            value: String(overview.active_experiments),
            hint: `${overview.total_experiments} total`,
          },
          {
            label: "Connected Devices",
            value: String(overview.connected_devices),
          },
          {
            label: "Sync Accuracy",
            value: `${overview.synchronization_accuracy.toFixed(1)}%`,
          },
          {
            label: "System Health",
            value: `${overview.system_health.toFixed(1)}%`,
          },
        ]}
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 text-sm font-medium text-muted">Latency Summary</h3>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted">p50</dt>
              <dd className="text-lg font-semibold">{formatMs(overview.latency.p50)}</dd>
            </div>
            <div>
              <dt className="text-muted">p95</dt>
              <dd className="text-lg font-semibold">{formatMs(overview.latency.p95)}</dd>
            </div>
            <div>
              <dt className="text-muted">Mean</dt>
              <dd className="text-lg font-semibold">{formatMs(overview.latency.mean)}</dd>
            </div>
            <div>
              <dt className="text-muted">Range</dt>
              <dd className="text-lg font-semibold">
                {formatMs(overview.latency.min)} – {formatMs(overview.latency.max)}
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h3 className="mb-4 text-sm font-medium text-muted">Recent Experiments</h3>
          <ul className="space-y-3">
            {overview.recent_experiments.map((exp) => (
              <li
                key={exp.experiment_id}
                className="flex items-center justify-between rounded-[10px] border border-border px-3 py-2 "
              >
                <div>
                  <Link
                    href={`/experiments/${exp.experiment_id}`}
                    className="font-medium hover:underline"
                  >
                    {exp.name}
                  </Link>
                  <p className="text-xs text-muted">{exp.experiment_id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={exp.strategy === "adaptive" ? "info" : "default"}>
                    {exp.strategy}
                  </Badge>
                  <span className="text-xs text-muted">
                    {formatPercent(exp.correction_success_rate)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-10">
        <h3 className="mb-4 text-lg font-semibold">Live Operations</h3>
        <LiveOperationsPanel />
      </div>
    </DashboardShell>
  );
}
