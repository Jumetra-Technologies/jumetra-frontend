import { notFound } from "next/navigation";
import { DriftChart, SyncOffsetChart } from "@/components/charts/charts";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api-client";
import { formatMs, formatPercent } from "@/lib/utils";

export default async function ExperimentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let experiment;
  try {
    experiment = await api.getExperiment(id);
  } catch {
    notFound();
  }

  const report = experiment.report as Record<string, number>;
  const syncChartData = experiment.sync_time_series.map((point, index) => ({
    label: String(point.elapsed_ms ?? point.timestamp ?? index),
    offset: Number(point.estimated_offset ?? 0),
  }));

  if (!syncChartData.length) {
    experiment.sync_measurements.forEach((sample, index) => {
      syncChartData.push({
        label: String(sample.timestamp ?? index),
        offset: Number(sample.estimated_offset ?? 0),
      });
    });
  }

  const driftData = experiment.sync_results.map((result) => ({
    device: String(result.device_id ?? "device"),
    drift: Number(result.drift_rate ?? result.drift ?? 0),
  }));

  return (
    <>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{experiment.name}</h2>
          <p className="mt-1 text-muted">{experiment.experiment_id}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant={experiment.strategy === "adaptive" ? "info" : "default"}>
            {experiment.strategy}
          </Badge>
          <Badge>{experiment.status}</Badge>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Avg Sync Error", value: formatMs(Number(report.average_sync_error ?? 0)) },
          { label: "Drift Rate", value: Number(report.drift_rate ?? 0).toFixed(6) },
          {
            label: "Correction Success",
            value: formatPercent(Number(report.correction_success_rate ?? 0)),
          },
          { label: "Rollback Freq", value: formatPercent(Number(report.rollback_frequency ?? 0)) },
        ].map((item) => (
          <Card key={item.label}>
            <p className="text-xs text-muted">{item.label}</p>
            <p className="mt-1 text-xl font-semibold">{item.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-medium">Synchronization Offset</h3>
          <SyncOffsetChart data={syncChartData} />
        </Card>
        <Card>
          <h3 className="mb-4 font-medium">Drift by Device</h3>
          <DriftChart data={driftData} />
        </Card>
      </div>

      <Card className="mt-6">
        <h3 className="mb-4 font-medium">Correction History</h3>
        {experiment.transactions.length === 0 ? (
          <p className="text-sm text-muted">No correction transactions recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 pr-4">Device</th>
                  <th className="py-2 pr-4">State</th>
                  <th className="py-2">Improvement</th>
                </tr>
              </thead>
              <tbody>
                {experiment.transactions.map((txn, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="py-2 pr-4">{String(txn.device_id ?? "—")}</td>
                    <td className="py-2 pr-4">{String(txn.state ?? "—")}</td>
                    <td className="py-2">{String(txn.improvement ?? "—")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
