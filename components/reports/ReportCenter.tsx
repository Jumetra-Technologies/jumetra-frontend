"use client";

import { useState, useSyncExternalStore } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import {
  formatExperimentReport,
  getServerRoboticsDataSnapshot,
  readRoboticsData,
  subscribeToRoboticsData,
} from "@/lib/robotics-data";

function downloadMarkdown(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeFilename(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "hhip-report";
}

export function ReportCenter() {
  const data = useSyncExternalStore(
    subscribeToRoboticsData,
    readRoboticsData,
    getServerRoboticsDataSnapshot,
  );
  const [projectId, setProjectId] = useState("all");
  const projects = data?.projects ?? [];
  const records = (data?.experiments ?? []).filter(
    (record) => projectId === "all" || record.projectId === projectId,
  );
  const selectedProject = projects.find((project) => project.id === projectId);

  function exportProject() {
    if (!selectedProject) return;
    const projectRecords = records.filter((record) => record.projectId === selectedProject.id);
    const content = [
      `# ${selectedProject.name}`,
      "",
      selectedProject.description,
      "",
      "## Objectives",
      selectedProject.objectives || "Not recorded.",
      "",
      "## Hardware",
      selectedProject.hardware.length ? selectedProject.hardware.map((item) => `- ${item}`).join("\n") : "Not recorded.",
      "",
      "## Experiment records",
      projectRecords.length
        ? projectRecords.map((record) => formatExperimentReport(record, selectedProject)).join("\n---\n\n")
        : "No experiment records yet.",
      "",
    ].join("\n");
    downloadMarkdown(`${safeFilename(selectedProject.name)}-report.md`, content);
  }

  return (
    <>
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Robotics workspace</p>
        <h2 className="mt-1 text-2xl font-bold">Reports</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">Export reproducible project and experiment notes as portable Markdown files.</p>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted">Project</span>
          <Select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="h-8 w-auto min-w-44">
            <option value="all">All project records</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </Select>
        </label>
        {selectedProject ? (
          <Button variant="secondary" onClick={exportProject}>
            <Download className="size-4" aria-hidden /> Export project report
          </Button>
        ) : null}
      </div>

      {!data ? (
        <p className="text-sm text-muted">Loading report records…</p>
      ) : records.length === 0 ? (
        <Card>
          <h3 className="font-medium">No reportable experiment records</h3>
          <p className="mt-1 text-sm text-muted">Record an experiment with its procedure and results before exporting.</p>
        </Card>
      ) : (
        <div className="divide-y divide-border border-y border-border">
          {records.map((record) => {
            const project = projects.find((item) => item.id === record.projectId);
            return (
              <div key={record.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold">{record.title}</h3>
                  <p className="mt-1 text-xs text-muted">{project?.name ?? "Unassigned"} · Updated {new Date(record.updatedAt).toLocaleDateString()}</p>
                  <p className="mt-1 line-clamp-1 text-xs text-muted">{record.objective}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => downloadMarkdown(`${safeFilename(record.title)}.md`, formatExperimentReport(record, project))}>
                  <Download className="size-3.5" aria-hidden /> Export
                </Button>
              </div>
            );
          })}
        </div>
      )}
      <p className="mt-4 text-xs text-muted">Reports are generated from records stored in this browser; connected simulation-run exports are not included.</p>
    </>
  );
}