import { DashboardShell } from "@/components/layout/sidebar";
import { ExperimentJournal } from "@/components/experiments/ExperimentJournal";

export default async function ExperimentsPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; record?: string }>;
}) {
  const params = await searchParams;

  return (
    <DashboardShell activePath="/experiments">
      <ExperimentJournal
        initialProjectId={params.project}
        initialRecordId={params.record}
        simulationRuns={[]}
      />
    </DashboardShell>
  );
}
