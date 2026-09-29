"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/input";
import {
  createExperimentRecord,
  readRoboticsData,
  writeRoboticsData,
  type ExperimentRecord,
  type RoboticsProject,
} from "@/lib/robotics-data";

type ExperimentDraft = Omit<ExperimentRecord, "id" | "createdAt" | "updatedAt">;

function createDraft(projectId: string, record?: ExperimentRecord): ExperimentDraft {
  return record
    ? {
        projectId: record.projectId,
        title: record.title,
        objective: record.objective,
        hardware: record.hardware,
        procedure: record.procedure,
        observations: record.observations,
        results: record.results,
        notes: record.notes,
      }
    : {
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

export function ExperimentRecordDialog({
  open,
  projectId,
  projects,
  record,
  onClose,
}: {
  open: boolean;
  projectId: string;
  projects: RoboticsProject[];
  record?: ExperimentRecord;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(() => createDraft(projectId, record));
  const [hardwareText, setHardwareText] = useState(() => record?.hardware.join(", ") ?? "");
  const [error, setError] = useState("");

  function saveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const current = readRoboticsData();
    const hardware = hardwareText.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
    if (record) {
      const next = {
        ...current,
        experiments: current.experiments.map((item) => item.id === record.id
          ? { ...item, ...draft, hardware, updatedAt: new Date().toISOString() }
          : item),
      };
      if (!writeRoboticsData(next)) {
        setError("Could not save to browser storage.");
        return;
      }
    } else {
      const newRecord = createExperimentRecord({ ...draft, hardware });
      if (!writeRoboticsData({ ...current, experiments: [newRecord, ...current.experiments] })) {
        setError("Could not save to browser storage.");
        return;
      }
    }
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={record ? "Edit experiment record" : "Record an experiment"}
      className="max-h-[90svh] overflow-y-auto"
    >
      <form className="space-y-4" onSubmit={saveRecord}>
        <label className="block text-sm font-medium">
          Title
          <Input required autoFocus value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="mt-1.5" placeholder="e.g. Wheel encoder repeatability" />
        </label>
        <label className="block text-sm font-medium">
          Project
          <Select value={draft.projectId} onChange={(event) => setDraft({ ...draft, projectId: event.target.value })} className="mt-1.5">
            <option value="">Unassigned</option>
            {projects.map((projectOption) => <option key={projectOption.id} value={projectOption.id}>{projectOption.name}</option>)}
          </Select>
        </label>
        <label className="block text-sm font-medium">
          Objective
          <textarea required value={draft.objective} onChange={(event) => setDraft({ ...draft, objective: event.target.value })} className="mt-1.5 min-h-16 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" />
        </label>
        <label className="block text-sm font-medium">
          Hardware
          <textarea value={hardwareText} onChange={(event) => setHardwareText(event.target.value)} className="mt-1.5 min-h-14 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" placeholder="List parts separated by commas or lines" />
        </label>
        <label className="block text-sm font-medium">
          Procedure
          <textarea required value={draft.procedure} onChange={(event) => setDraft({ ...draft, procedure: event.target.value })} className="mt-1.5 min-h-20 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" />
        </label>
        <label className="block text-sm font-medium">
          Observations
          <textarea value={draft.observations} onChange={(event) => setDraft({ ...draft, observations: event.target.value })} className="mt-1.5 min-h-20 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" />
        </label>
        <label className="block text-sm font-medium">
          Results
          <textarea value={draft.results} onChange={(event) => setDraft({ ...draft, results: event.target.value })} className="mt-1.5 min-h-16 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" />
        </label>
        <label className="block text-sm font-medium">
          Notes
          <textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} className="mt-1.5 min-h-14 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" />
        </label>
        {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit">{record ? "Save record" : "Save experiment"}</Button>
        </div>
      </form>
    </Dialog>
  );
}