"use client";

import { useState, useSyncExternalStore, type FormEvent } from "react";
import Link from "next/link";
import { ArrowUpRight, FolderKanban, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/input";
import {
  createProjectRecord,
  getServerRoboticsDataSnapshot,
  readRoboticsData,
  subscribeToRoboticsData,
  writeRoboticsData,
  type ProjectCategory,
} from "@/lib/robotics-data";
import type { ProjectSummary } from "@/lib/types";

const emptyDraft = {
  name: "",
  description: "",
  objectives: "",
  contributors: "",
  category: "robotics" as ProjectCategory,
  hardware: "",
};

export function ProjectHub({ serverProjects }: { serverProjects: ProjectSummary[] }) {
  const data = useSyncExternalStore(
    subscribeToRoboticsData,
    readRoboticsData,
    getServerRoboticsDataSnapshot,
  );
  const projects = data?.projects ?? [];
  const [creating, setCreating] = useState(false);
  const [includeContributor, setIncludeContributor] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [error, setError] = useState("");

  function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const project = createProjectRecord({
      name: draft.name.trim(),
      description: draft.description.trim(),
      objectives: draft.objectives.trim(),
      contributors: includeContributor ? draft.contributors.trim() : "",
      category: draft.category,
      hardware: draft.hardware.split(/[\n,]/).map((item) => item.trim()).filter(Boolean),
    });
    const next = { ...readRoboticsData(), projects: [project, ...projects] };
    if (!writeRoboticsData(next)) {
      setError("Browser storage is unavailable. Check this browser's storage settings.");
      return;
    }
    setDraft(emptyDraft);
    setIncludeContributor(false);
    setError("");
    setCreating(false);
  }

  function closeCreate() {
    setCreating(false);
    setIncludeContributor(false);
    setDraft((current) => ({ ...current, contributors: "" }));
  }

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Robotics workspace</p>
          <h2 className="mt-1 text-2xl font-bold text-foreground">Projects</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Organize project objectives, hardware, and experiment records in one place.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" aria-hidden />
          New project
        </Button>
      </div>

      <section aria-labelledby="robotics-projects-heading">
        <div className="mb-3 flex items-center justify-between">
          <h3 id="robotics-projects-heading" className="text-sm font-semibold">Your robotics projects</h3>
          <span className="text-xs text-muted">Saved in this browser</span>
        </div>
        {!data ? (
          <p className="text-sm text-muted">Loading projects…</p>
        ) : projects.length === 0 ? (
          <Card className="flex flex-col items-start gap-3 py-8">
            <FolderKanban className="size-5 text-muted" aria-hidden />
            <div>
              <p className="font-medium">No robotics projects yet</p>
              <p className="mt-1 text-sm text-muted">Create a project to organize its hardware and test records.</p>
            </div>
            <Button variant="secondary" onClick={() => setCreating(true)}>
              <Plus className="size-4" aria-hidden /> Create project
            </Button>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => {
              const experimentCount = (data?.experiments ?? []).filter(
                (experiment) => experiment.projectId === project.id,
              ).length;
              return (
                <Link key={project.id} href={`/workspace/projects/${project.id}`} className="group">
                  <Card className="h-full transition-colors group-hover:border-primary/50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="truncate font-semibold text-foreground">{project.name}</h4>
                        <p className="mt-1 line-clamp-2 min-h-10 text-sm text-muted">
                          {project.description || "No description added."}
                        </p>
                      </div>
                      <ArrowUpRight className="size-4 shrink-0 text-muted transition-colors group-hover:text-primary" aria-hidden />
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Badge variant="info">{project.category}</Badge>
                      <span className="text-xs text-muted">{project.hardware.length} hardware items</span>
                      <span className="text-xs text-muted">{experimentCount} records</span>
                    </div>
                    {project.objectives ? (
                      <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-muted">
                        <span className="font-medium text-foreground">Objective</span> {project.objectives}
                      </p>
                    ) : null}
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {serverProjects.length > 0 ? (
        <section className="mt-10" aria-labelledby="connected-projects-heading">
          <div className="mb-3 flex items-center justify-between">
            <h3 id="connected-projects-heading" className="text-sm font-semibold">Connected platform projects</h3>
            <span className="text-xs text-muted">Read-only API records</span>
          </div>
          <div className="divide-y divide-border border-y border-border">
            {serverProjects.map((project) => (
              <Link
                key={project.id}
                href={`/workspace/projects/${project.id}`}
                className="flex items-center justify-between gap-4 py-3 hover:text-primary"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{project.name}</span>
                  <span className="block truncate text-xs text-muted">{project.organization}</span>
                </span>
                <span className="shrink-0 text-xs text-muted">{project.experiment_count} runs</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <Dialog open={creating} onClose={closeCreate} title="Create robotics project" className="max-h-[90svh] overflow-y-auto">
        <form className="space-y-4" onSubmit={onCreate}>
          <label className="block text-sm font-medium">
            Project name
            <Input required autoFocus value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="mt-1.5" placeholder="e.g. Indoor inspection rover" />
          </label>
          <label className="block text-sm font-medium">
            Category
            <Select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as ProjectCategory })} className="mt-1.5">
              <option value="robotics">Robotics</option>
              <option value="embedded">Embedded systems</option>
              <option value="autonomy">Autonomy</option>
              <option value="iot">IoT</option>
              <option value="other">Other</option>
            </Select>
          </label>
          <label className="block text-sm font-medium">
            Description
            <textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className="mt-1.5 min-h-20 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]" placeholder="What are you building?" />
          </label>
          <label className="block text-sm font-medium">
            Objectives
            <textarea value={draft.objectives} onChange={(event) => setDraft({ ...draft, objectives: event.target.value })} className="mt-1.5 min-h-20 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]" placeholder="What should the robot or system achieve?" />
          </label>
          <div className="flex items-center justify-between gap-4 py-3">
            <span id="include-teammate-label" className="text-sm font-medium">Add a teammate</span>
            <button
              type="button"
              role="switch"
              aria-checked={includeContributor}
              aria-labelledby="include-teammate-label"
              onClick={() => {
                setIncludeContributor((enabled) => !enabled);
                if (includeContributor) setDraft({ ...draft, contributors: "" });
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 ${includeContributor ? "border-primary bg-primary" : "border-border bg-muted-bg"}`}
            >
              <span
                aria-hidden="true"
                className={`size-4 rounded-full bg-white shadow-sm transition-transform ${includeContributor ? "translate-x-5" : "translate-x-1"}`}
              />
            </button>
          </div>
          {includeContributor ? (
            <label className="block text-sm font-medium">
              Teammate name or email
              <Input
                required
                autoFocus
                value={draft.contributors}
                onChange={(event) => setDraft({ ...draft, contributors: event.target.value })}
                className="mt-1.5"
                placeholder="Name or email address"
              />
            </label>
          ) : null}
          <label className="block text-sm font-medium">
            Hardware
            <textarea value={draft.hardware} onChange={(event) => setDraft({ ...draft, hardware: event.target.value })} className="mt-1.5 min-h-16 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]" placeholder="ESP32, motor driver, encoders" />
          </label>
          {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="ghost" onClick={closeCreate}>Cancel</Button>
            <Button type="submit">Create project</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}