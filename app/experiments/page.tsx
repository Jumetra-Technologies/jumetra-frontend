import { DashboardShell } from "@/components/layout/sidebar";
import { ExperimentJournal } from "@/components/experiments/ExperimentJournal";
import { api } from "@/lib/api-client";
import type { ExperimentSummary } from "@/lib/types";

export default async function ExperimentsPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; record?: string }>;
}) {
  const params = await searchParams;
  let experiments: ExperimentSummary[] = [];
  try {
    experiments = await api.getExperiments();
  } catch {
    experiments = [];
  }

  return (
    <DashboardShell activePath="/experiments">
      <ExperimentJournal
        initialProjectId={params.project}
        initialRecordId={params.record}
        simulationRuns={experiments}
      />
    </DashboardShell>
  );
}
