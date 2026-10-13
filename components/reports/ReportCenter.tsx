"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { ErrorNotice } from "@/components/ui/error-notice";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { formatExperimentReport, type ExperimentRecord, type RoboticsProject } from "@/lib/robotics-data";
import { describeError } from "@/lib/errors";
import { api } from "@/lib/api-client";
import { downloadMarkdown, safeFilename } from "@/lib/reports";

/** Markdown reports of account-owned experiment records. `embedded`: inside System Diagnostics, without the page title. */
export function ReportCenter({ embedded = false }: { embedded?: boolean } = {}) {
  const [projectId, setProjectId] = useState("all");
  const [projects, setProjects] = useState<RoboticsProject[]>([]);
  const [allRecords, setAllRecords] = useState<ExperimentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const records = allRecords.filter(
    (record) => projectId === "all" || record.projectId === projectId,
  );
  const selectedProject = projects.find((project) => project.id === projectId);

  useEffect(() => {
    let active = true;
    void api.getMyProjects().then(async (savedProjects) => {
      const savedRecords = await Promise.all(
        savedProjects.map((project) => api.getMyProjectExperiments(project.id)),
      );
      if (active) {
        setProjects(savedProjects);
        setAllRecords(savedRecords.flat());
      }
    }).catch((loadError: unknown) => {
      if (active) setError(describeError(loadError, "Your report records couldn't be loaded."));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

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
      {embedded ? (
        <p className="mb-4 max-w-2xl text-sm text-muted">Export project and experiment records saved to your account as Markdown files.</p>
      ) : (
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Robotics workspace</p>
          <h2 className="mt-1 text-2xl font-bold">Reports</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">Export reproducible project and experiment notes as portable Markdown files.</p>
        </div>
      )}

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

      {error ? <ErrorNotice message={error} className="mb-4" /> : null}

      {loading ? (
        <p className="py-6 text-sm text-muted" role="status">Loading report records…</p>
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
      <p className="mt-4 text-xs text-muted">Reports are generated from account-owned records; connected simulation-run exports are not included.</p>
    </>
  );
}