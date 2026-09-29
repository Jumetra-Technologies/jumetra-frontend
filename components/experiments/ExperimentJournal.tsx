"use client";

import { useState, useSyncExternalStore, type FormEvent } from "react";
import Link from "next/link";
import { FilePlus2, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/input";
import {
  createExperimentRecord,
  getServerRoboticsDataSnapshot,
  readRoboticsData,
  subscribeToRoboticsData,
  writeRoboticsData,
  type ExperimentRecord,
} from "@/lib/robotics-data";
import type { ExperimentSummary } from "@/lib/types";

type ExperimentDraft = Omit<ExperimentRecord, "id" | "createdAt" | "updatedAt">;

function emptyDraft(projectId = ""): ExperimentDraft {
  return {
    projectId,
    title: "",
    objective: "",
    hardware: [],
    procedure: "",
    observations: "",
    results: "",
    notes: "",
  };
}

export function ExperimentJournal({
  initialProjectId,
  initialRecordId,
  simulationRuns,
}: {
  initialProjectId?: string;
  initialRecordId?: string;
  simulationRuns: ExperimentSummary[];
}) {
  const data = useSyncExternalStore(
    subscribeToRoboticsData,
    readRoboticsData,
    getServerRoboticsDataSnapshot,
  );
  const [creating, setCreating] = useState(Boolean(initialProjectId));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(() => emptyDraft(initialProjectId));
  const [hardwareText, setHardwareText] = useState("");
  const [filterProjectId, setFilterProjectId] = useState(initialProjectId ?? "all");
  const [error, setError] = useState("");

  const projects = data?.projects ?? [];
  const records = (data?.experiments ?? []).filter(
    (record) => filterProjectId === "all" || record.projectId === filterProjectId,
  );

  function startCreate() {
    setDraft(emptyDraft(initialProjectId ?? projects[0]?.id ?? ""));
    setHardwareText("");
    setEditingId(null);
    setError("");
    setCreating(true);
  }

  function startEdit(record: ExperimentRecord) {
    setDraft({
      projectId: record.projectId,
      title: record.title,
      objective: record.objective,
      hardware: record.hardware,
      procedure: record.procedure,
      observations: record.observations,
      results: record.results,
      notes: record.notes,
    });
    setHardwareText(record.hardware.join(", "));
    setEditingId(record.id);
    setError("");
    setCreating(true);
  }

  function saveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const current = readRoboticsData();
    const hardware = hardwareText.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
    if (editingId) {
      const next = {
        ...current,
        experiments: current.experiments.map((record) => record.id === editingId
          ? { ...record, ...draft, hardware, updatedAt: new Date().toISOString() }
          : record),
      };
      if (!writeRoboticsData(next)) {
        setError("Could not save to browser storage.");
        return;
      }
    } else {
      const record = createExperimentRecord({ ...draft, hardware });
      if (!writeRoboticsData({ ...current, experiments: [record, ...current.experiments] })) {
        setError("Could not save to browser storage.");
        return;
      }
    }
    setCreating(false);
    setEditingId(null);
  }

  function deleteRecord(record: ExperimentRecord) {
    if (!window.confirm(`Delete the experiment record “${record.title}”?`)) return;
    const current = readRoboticsData();
    writeRoboticsData({
      ...current,
      experiments: current.experiments.filter((item) => item.id !== record.id),
    });
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
        <Button onClick={startCreate}>
          <FilePlus2 className="size-4" aria-hidden /> Record experiment
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted">Project</span>
          <Select value={filterProjectId} onChange={(event) => setFilterProjectId(event.target.value)} className="h-8 w-auto min-w-44">
            <option value="all">All projects</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </Select>
        </label>
        <span className="text-xs text-muted">Records are saved in this browser</span>
      </div>

      {!data ? (
        <p className="text-sm text-muted">Loading experiment records…</p>
      ) : records.length === 0 ? (
        <Card className="py-8">
          <h3 className="font-medium">No experiment records yet</h3>
          <p className="mt-1 text-sm text-muted">Start with an objective, the hardware under test, and the procedure.</p>
          {projects.length === 0 ? (
            <Link href="/workspace" className="mt-4 inline-flex text-sm text-primary hover:underline">Create a project first</Link>
          ) : null}
        </Card>
      ) : (
        <div className="divide-y divide-border border-y border-border">
          {records.map((record) => {
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
                    <Link href="/reports" className="ml-auto self-center text-xs text-primary hover:underline">Export report</Link>
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
          <p className="text-sm text-muted">Live and synchronization runs supplied by the connected API.</p>
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

      <Dialog open={creating} onClose={() => setCreating(false)} title={editingId ? "Edit experiment record" : "Record an experiment"} className="max-h-[90svh] overflow-y-auto">
        <form className="space-y-4" onSubmit={saveRecord}>
          <label className="block text-sm font-medium">Title<Input required autoFocus value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="mt-1.5" placeholder="e.g. Wheel encoder repeatability" /></label>
          <label className="block text-sm font-medium">Project<Select value={draft.projectId} onChange={(event) => setDraft({ ...draft, projectId: event.target.value })} className="mt-1.5"><option value="">Unassigned</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</Select></label>
          <label className="block text-sm font-medium">Objective<textarea required value={draft.objective} onChange={(event) => setDraft({ ...draft, objective: event.target.value })} className="mt-1.5 min-h-16 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" /></label>
          <label className="block text-sm font-medium">Hardware<textarea value={hardwareText} onChange={(event) => setHardwareText(event.target.value)} className="mt-1.5 min-h-14 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" placeholder="List parts separated by commas or lines" /></label>
          <label className="block text-sm font-medium">Procedure<textarea required value={draft.procedure} onChange={(event) => setDraft({ ...draft, procedure: event.target.value })} className="mt-1.5 min-h-20 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" /></label>
          <label className="block text-sm font-medium">Observations<textarea value={draft.observations} onChange={(event) => setDraft({ ...draft, observations: event.target.value })} className="mt-1.5 min-h-20 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" /></label>
          <label className="block text-sm font-medium">Results<textarea value={draft.results} onChange={(event) => setDraft({ ...draft, results: event.target.value })} className="mt-1.5 min-h-16 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" /></label>
          <label className="block text-sm font-medium">Notes<textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} className="mt-1.5 min-h-14 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" /></label>
          {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
            <Button type="submit">{editingId ? "Save record" : "Save experiment"}</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}