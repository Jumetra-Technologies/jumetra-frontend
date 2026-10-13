import { ComparisonBarChart } from "@/components/charts/charts";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api-client";
import type { ComparisonResult } from "@/lib/types";
import { formatPercent } from "@/lib/utils";

export default async function ComparisonPage() {
  let comparison: ComparisonResult | null = null;
  try {
    comparison = await api.getComparison();
  } catch {
    comparison = null;
  }

  const hasData = Boolean(
    comparison?.fixed_experiment_id && comparison?.adaptive_experiment_id,
  );

  const chartData = hasData && comparison
    ? [
        {
          metric: "Accuracy Δ",
          fixed: 0,
          adaptive: comparison.accuracy_difference,
        },
        {
          metric: "Comm Savings",
          fixed: 0,
          adaptive: comparison.communication_savings,
        },
        {
          metric: "Corr. Efficiency",
          fixed: 0,
          adaptive: comparison.correction_efficiency,
        },
        {
          metric: "Failure Δ",
          fixed: 0,
          adaptive: comparison.failure_difference,
        },
      ]
    : [];

  const emptyMessage =
    typeof comparison?.metadata?.message === "string"
      ? comparison.metadata.message
      : "Run both fixed and adaptive experiments to enable comparison.";

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Fixed vs Adaptive Comparison</h2>
        <p className="mt-1 text-zinc-500">Research comparison between synchronization strategies</p>
      </div>

      {!hasData || !comparison ? (
        <Card>
          <p className="text-zinc-500">{emptyMessage}</p>
        </Card>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Fixed Experiment",
                value: comparison.fixed_experiment_id,
              },
              {
                label: "Adaptive Experiment",
                value: comparison.adaptive_experiment_id,
              },
              {
                label: "Communication Savings",
                value: String(comparison.communication_savings),
              },
              {
                label: "Accuracy Difference",
                value: formatPercent(comparison.accuracy_difference),
              },
            ].map((item) => (
              <Card key={item.label}>
                <p className="text-xs text-zinc-500">{item.label}</p>
                <p className="mt-1 text-lg font-semibold">{item.value}</p>
              </Card>
            ))}
          </div>

          <Card>
            <h3 className="mb-4 font-medium">Strategy Comparison</h3>
            <ComparisonBarChart data={chartData} />
          </Card>

          <Card className="mt-6">
            <h3 className="mb-4 font-medium">Detailed Metrics</h3>
            <dl className="grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-zinc-500">Correction Efficiency</dt>
                <dd className="font-medium">{formatPercent(comparison.correction_efficiency)}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Failure Difference</dt>
                <dd className="font-medium">{comparison.failure_difference}</dd>
              </div>
            </dl>
          </Card>
        </>
      )}
    </>
  );
}
