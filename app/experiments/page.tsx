import { ExperimentJournal } from "@/components/experiments/ExperimentJournal";

export default async function ExperimentsPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; record?: string }>;
}) {
  const params = await searchParams;

  return (
    <>
      <ExperimentJournal
        initialProjectId={params.project}
        initialRecordId={params.record}
        simulationRuns={[]}
      />
    </>
  );
}
