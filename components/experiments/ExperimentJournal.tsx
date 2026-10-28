"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, FilePlus2, Pencil, Trash2 } from "lucide-react";
import { exportExperiment } from "@/lib/reports";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorNotice } from "@/components/ui/error-notice";
import { Select } from "@/components/ui/input";
import { ExperimentRecordDialog } from "@/components/experiments/ExperimentRecordDialog";
import { describeError } from "@/lib/errors";
import { api } from "@/lib/api-client";
import {
  type ExperimentRecord,
  type RoboticsProject,
} from "@/lib/robotics-data";
import type { ExperimentSummary } from "@/lib/types";
import { SkeletonRegion } from "@/components/ui/skeleton";
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
  const [projects, setProjects] = useState<RoboticsProject[]>([]);
  const [records, setRecords] = useState<ExperimentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.getMyProjects().then(async (savedProjects) => {
      const projectRecords = await Promise.all(
        savedProjects.map((project) => api.getMyProjectExperiments(project.id)),
      );
      if (active) {
        setProjects(savedProjects);
        setRecords(projectRecords.flat());
        setError("");
      }
    }).catch((loadError: unknown) => {
      if (active) setError(describeError(loadError, "Your projects and experiment records couldn't be loaded."));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const visibleRecords = records.filter(
    (record) => filterProjectId === "all" || record.projectId === filterProjectId,
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
      await api.deleteMyProjectExperiment(record.projectId, record.id);
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
    if (existing) {
      await api.updateMyProjectExperiment(existing.projectId, existing.id, draft);
    } else {
      await api.createMyProjectExperiment(draft.projectId, draft);
    }
    const savedRecords = await Promise.all(
      projects.map((project) => api.getMyProjectExperiments(project.id)),
    );
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

      {error ? <ErrorNotice message={error} className="mb-4" /> : null}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted">Project</span>
          <Select value={filterProjectId} onChange={(event) => setFilterProjectId(event.target.value)} className="h-8 w-auto min-w-44">
            <option value="all">All projects</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </Select>
        </label>
        <span className="text-xs text-muted">Records are saved to your account</span>
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
            <Link href="/workspace" className="mt-4 inline-flex text-sm text-primary hover:underline">Create a project first</Link>
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
          projectId={initialProjectId ?? projects[0]?.id ?? ""}
          projects={projects}
          record={editingRecord ?? undefined}
          onSave={saveRecord}
          onClose={closeEditor}
        />
      ) : null}
    </>
  );
}