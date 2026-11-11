"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, FilePlus2, Pencil, Trash2 } from "lucide-react";
import { exportExperiment } from "@/lib/reports";
import { Badge } from "@/components/ui/badge";
import { Button } from "@kiungo/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorNotice } from "@/components/ui/error-notice";
import { Select } from "@/components/ui/input";
import { ExperimentRecordDialog } from "@/components/experiments/ExperimentRecordDialog";
import { SignInNotice } from "@/components/auth/SignInNotice";
import { describeError } from "@/lib/errors";
import { deleteRecord as removeRecord, listRecords, movedProjectId, saveRecord as storeRecord, useProjects } from "@/lib/projects/workspace";
import type { ExperimentRecord } from "@/lib/robotics-data";
import type { ExperimentSummary } from "@/lib/types";
import { SkeletonRegion } from "@kiungo/ui/skeleton";
import { ListSkeleton } from "@/components/ui/page-skeletons";

export function ExperimentJournal({
  initialProjectId,
  initialRecordId,
  simulationRuns,
}: {
  initialProjectId?: string;
  initialRecordId?: string;
  simulationRuns: ExperimentSummary[];
}) {
  const [creating, setCreating] = useState(Boolean(initialProjectId));
  const [editingRecord, setEditingRecord] = useState<ExperimentRecord | null>(null);
  const [filterProjectId, setFilterProjectId] = useState(initialProjectId ?? "all");
  // Open to everyone: signed out, the projects and records are the unsaved ones in this tab.
  const workspace = useProjects();
  const signedIn = workspace?.signedIn ?? false;
  const projects = useMemo(() => workspace?.projects ?? [], [workspace]);
  const projectsReady = workspace?.ready ?? false;
  const unsavedRecords = workspace?.unsavedRecords;
  const [records, setRecords] = useState<ExperimentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const loadError = workspace?.error ? describeError(workspace.error, "Your projects and experiment records couldn't be loaded.") : "";

  useEffect(() => {
    if (!projectsReady) return;
    let active = true;
    Promise.all(projects.map((project) => listRecords(project.id))).then((projectRecords) => {
      if (active) {
        setRecords(projectRecords.flat());
        setError("");
      }
    }).catch((recordsError: unknown) => {
      if (active) setError(describeError(recordsError, "Your projects and experiment records couldn't be loaded."));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [projects, projectsReady, unsavedRecords]);

  // Signing in saves an unsaved project to the account under a new id; a filter or link on the old id follows it.
  const current = (id: string) => movedProjectId(id) ?? id;
  const shownProjectId = current(filterProjectId);
  // Only records of the projects listed now: none of an account that has signed out.
  const visibleRecords = records.filter(
    (record) => projects.some((project) => project.id === record.projectId) && (shownProjectId === "all" || record.projectId === shownProjectId),
  );

  function startCreate() {
    setEditingRecord(null);
    setCreating(true);
  }

  function startEdit(record: ExperimentRecord) {
    setEditingRecord(record);
    setCreating(true);
  }

  function closeEditor() {
    setCreating(false);
    setEditingRecord(null);
  }

  async function deleteRecord(record: ExperimentRecord) {
    if (!window.confirm(`Delete the experiment record “${record.title}”?`)) return;
    try {
      await removeRecord(record);
      setRecords((current) => current.filter((item) => item.id !== record.id));
      setError("");
    } catch (deleteError) {
      setError(describeError(deleteError, "The record wasn't deleted. Try again."));
    }
  }

  async function saveRecord(
    draft: Omit<ExperimentRecord, "id" | "createdAt" | "updatedAt">,
    existing?: ExperimentRecord,
  ) {
    await storeRecord(draft, existing);
    const savedRecords = await Promise.all(projects.map((project) => listRecords(project.id)));
    setRecords(savedRecords.flat());
    setError("");
  }

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Robotics workspace</p>
          <h2 className="mt-1 text-2xl font-bold">Experiment records</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Capture procedures and results so a test can be understood and repeated later.
          </p>
        </div>
        <Button onClick={startCreate} disabled={projects.length === 0}>
          <FilePlus2 className="size-4" aria-hidden /> Record experiment
        </Button>
      </div>

      {workspace && !signedIn ? (
        <SignInNotice className="mb-4" testId="experiments-sign-in">
          You&apos;re not signed in. You can record experiments for the projects you make here, but they aren&apos;t saved: they&apos;re gone when you close or reload this page.
        </SignInNotice>
      ) : null}
      {error || loadError ? <ErrorNotice message={error || loadError} className="mb-4" /> : null}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted">Project</span>
          <Select value={shownProjectId} onChange={(event) => setFilterProjectId(event.target.value)} className="w-auto min-w-44">
            <option value="all">All projects</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </Select>
        </label>
        <span className="text-xs text-muted">{signedIn ? "Records are saved to your account" : "Not saved"}</span>
      </div>

      {loading ? (
        <SkeletonRegion label="Loading experiment records">
          <ListSkeleton rows={4} />
        </SkeletonRegion>
      ) : visibleRecords.length === 0 ? (
        <Card className="py-8">
          <h3 className="font-medium">No experiment records yet</h3>
          <p className="mt-1 text-sm text-muted">Start with an objective, the hardware under test, and the procedure.</p>
          {projects.length === 0 ? (
            <Link href="/workspace?new=1" className="mt-4 inline-flex text-sm text-primary hover:underline">Create a project first</Link>
          ) : null}
        </Card>
      ) : (
        <div className="divide-y divide-border border-y border-border">
          {visibleRecords.map((record) => {
            const project = projects.find((item) => item.id === record.projectId);
            return (
              <details key={record.id} open={record.id === initialRecordId} className="group py-4">
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold">{record.title}</h3>
                    <p className="mt-1 text-xs text-muted">{project?.name ?? "Unassigned"} · Updated {new Date(record.updatedAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>{record.hardware.length} hardware</Badge>
                    <span className="text-xs text-muted group-open:hidden">View record</span>
                    <span className="hidden text-xs text-muted group-open:inline">Hide</span>
                  </div>
                </summary>
                <div className="mt-4 grid gap-x-8 gap-y-4 border-t border-border pt-4 md:grid-cols-2">
                  {[
                    ["Objective", record.objective],
                    ["Hardware", record.hardware.join(", ")],
                    ["Procedure", record.procedure],
                    ["Observations", record.observations],
                    ["Results", record.results],
                    ["Notes", record.notes],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</h4>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{value || "Not recorded."}</p>
                    </div>
                  ))}
                  <div className="flex gap-2 md:col-span-2">
                    <Button size="sm" variant="secondary" onClick={() => startEdit(record)}><Pencil className="size-3.5" aria-hidden /> Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteRecord(record)}><Trash2 className="size-3.5" aria-hidden /> Delete</Button>
                    <Button size="sm" variant="ghost" className="ml-auto" onClick={() => exportExperiment(record, project)}>
                      <Download className="size-3.5" aria-hidden /> Export report
                    </Button>
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}

      <section className="mt-12" aria-labelledby="simulation-runs-heading">
        <div className="mb-3">
          <h3 id="simulation-runs-heading" className="text-lg font-semibold">Simulation runs</h3>
          <p className="text-sm text-muted">Live and synchronization runs recorded by Kiungo.</p>
        </div>
        {simulationRuns.length === 0 ? (
          <p className="border-y border-border py-4 text-sm text-muted">No connected simulation runs available.</p>
        ) : (
          <div className="divide-y divide-border border-y border-border">
            {simulationRuns.map((run) => (
              <Link key={run.experiment_id} href={`/experiments/${run.experiment_id}`} className="flex flex-wrap items-center justify-between gap-3 py-3 hover:text-primary">
                <span><span className="block text-sm font-medium">{run.name}</span><span className="text-xs text-muted">{run.device_count} devices · {run.status}</span></span>
                <span className="text-xs text-muted">Sync error {run.average_sync_error.toFixed(2)} ms</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {creating ? (
        <ExperimentRecordDialog
          key={editingRecord?.id ?? `new-${initialProjectId ?? "unassigned"}`}
          open
          projectId={initialProjectId ? current(initialProjectId) : (projects[0]?.id ?? "")}
          projects={projects}
          record={editingRecord ?? undefined}
          onSave={saveRecord}
          onClose={closeEditor}
        />
      ) : null}
    </>
  );
}