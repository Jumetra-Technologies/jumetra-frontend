import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/layout/sidebar";
import { SyncOffsetChart } from "@/components/charts/charts";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api-client";

export default async function DeviceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let device;
  try {
    device = await api.getDevice(id);
  } catch {
    notFound();
  }

  const sync = (device.metrics.synchronization ?? {}) as Record<string, number>;
  const correction = (device.metrics.correction ?? {}) as Record<string, number>;
  const reliability = device.reliability as Record<string, number>;

  const historyData = device.sync_history.map((point, index) => ({
    label: String(point.timestamp ?? point.elapsed_ms ?? index),
    offset: Number(point.estimated_offset ?? 0),
  }));

  return (
    <DashboardShell activePath="/devices">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{device.device_id}</h2>
          <p className="mt-1 text-zinc-500">Device synchronization profile</p>
        </div>
        <Badge variant={device.status === "connected" ? "success" : "default"}>
          {device.status}
        </Badge>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Reliability Score", value: (reliability.score ?? 0).toFixed(3) },
          { label: "Health (Success Rate)", value: `${((correction.correction_success_rate ?? 0) * 100).toFixed(1)}%` },
          { label: "Avg Sync Error", value: `${(sync.average_sync_error ?? 0).toFixed(2)} ms` },
          { label: "Drift Rate", value: (sync.drift_rate ?? 0).toFixed(6) },
        ].map((item) => (
          <Card key={item.label}>
            <p className="text-xs text-zinc-500">{item.label}</p>
            <p className="mt-1 text-xl font-semibold">{item.value}</p>
          </Card>
        ))}
      </div>

      <Card className="mb-6">
        <h3 className="mb-4 font-medium">Synchronization History</h3>
        <SyncOffsetChart data={historyData} />
      </Card>

      <Card>
        <h3 className="mb-4 font-medium">Linked Experiments</h3>
        {device.experiments.length === 0 ? (
          <p className="text-sm text-zinc-500">No experiments linked.</p>
        ) : (
          <ul className="list-inside list-disc text-sm">
            {device.experiments.map((expId) => (
              <li key={expId}>
                <a href={`/experiments/${expId}`} className="text-primary hover:underline">
                  {expId}
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </DashboardShell>
  );
}
