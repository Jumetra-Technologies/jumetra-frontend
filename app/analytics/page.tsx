import { Card } from "@/components/ui/card";
import { api } from "@/lib/api-client";
import { formatMs, formatPercent } from "@/lib/utils";

export default async function AnalyticsPage() {
  let analytics;
  try {
    analytics = await api.getAnalytics();
  } catch {
    analytics = null;
  }

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Analytics</h2>
        <p className="mt-1 text-muted">Aggregated research metrics across all experiments</p>
      </div>

      {!analytics ? (
        <Card>
          <p className="text-muted">Unable to load analytics. Ensure the API is running.</p>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Experiments", value: String(analytics.experiment_count) },
              { label: "Devices", value: String(analytics.device_count) },
              { label: "Avg Sync Error", value: formatMs(analytics.average_sync_error) },
              { label: "Offset Stability", value: analytics.offset_stability.toFixed(3) },
              { label: "Drift Rate", value: analytics.drift_rate.toFixed(6) },
              {
                label: "Correction Success",
                value: formatPercent(analytics.correction_success_rate),
              },
              { label: "Rollback Freq", value: formatPercent(analytics.rollback_frequency) },
              { label: "Comm Cost", value: String(analytics.communication_cost) },
            ].map((item) => (
              <Card key={item.label}>
                <p className="text-xs text-muted">{item.label}</p>
                <p className="mt-1 text-xl font-semibold">{item.value}</p>
              </Card>
            ))}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <Card>
              <h3 className="mb-4 font-medium">Latency Distribution</h3>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                {Object.entries(analytics.latency_distribution).map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-muted">{key}</dt>
                    <dd className="font-medium">{formatMs(Number(value))}</dd>
                  </div>
                ))}
              </dl>
            </Card>

            <Card>
              <h3 className="mb-4 font-medium">Device Reliability Rankings</h3>
              <ul className="space-y-2 text-sm">
                {analytics.device_rankings.map((rank, i) => (
                  <li
                    key={String(rank.device_id)}
                    className="flex justify-between rounded-[10px] border border-border px-3 py-2 "
                  >
                    <span>
                      {i + 1}. {String(rank.device_id)}
                    </span>
                    <span className="font-medium">{Number(rank.score).toFixed(3)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
