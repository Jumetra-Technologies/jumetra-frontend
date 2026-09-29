"use client";

import { useState, useSyncExternalStore, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, FilePlus2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import {
  getServerRoboticsDataSnapshot,
  readRoboticsData,
  subscribeToRoboticsData,
  writeRoboticsData,
  type ProjectCategory,
  type RoboticsProject,
} from "@/lib/robotics-data";

export function LocalProjectDetail({ projectId }: { projectId: string }) {
  const router = useRouter();
  const data = useSyncExternalStore(
    subscribeToRoboticsData,
    readRoboticsData,
    getServerRoboticsDataSnapshot,
  );
  const project = data?.projects.find((item) => item.id === projectId) ?? null;
  const [hardwareText, setHardwareText] = useState("");
  const [draft, setDraft] = useState<RoboticsProject | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");

  if (!data) {
    return <Card><p className="text-sm text-muted">Loading project…</p></Card>;
  }
  if (!project) {
    return (
      <Card>
        <p className="font-medium">Project not found in this browser</p>
        <p className="mt-1 text-sm text-muted">Local projects are saved in the browser where they were created.</p>
        <Link href="/workspace" className="mt-4 inline-flex text-sm text-primary hover:underline">Back to projects</Link>
      </Card>
    );
  }

  const records = data.experiments.filter((item) => item.projectId === project.id);

  function startEditing() {
    const currentProject = readRoboticsData().projects.find((item) => item.id === projectId);
    if (!currentProject) return;
    setDraft(currentProject);
    setHardwareText(currentProject.hardware.join(", "));
    setEditing(true);
  }

  function saveProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project || !draft) return;
    const formData = new FormData(event.currentTarget);
    const updated: RoboticsProject = {
      ...draft,
      name: String(formData.get("name") ?? "").trim(),
      category: String(formData.get("category") ?? project.category) as ProjectCategory,
      description: String(formData.get("description") ?? "").trim(),
      objectives: String(formData.get("objectives") ?? "").trim(),
      contributors: String(formData.get("contributors") ?? "").trim(),
      hardware: hardwareText.split(/[\n,]/).map((item) => item.trim()).filter(Boolean),
      updatedAt: new Date().toISOString(),
    };
    const data = readRoboticsData();
    const next = { ...data, projects: data.projects.map((item) => item.id === updated.id ? updated : item) };
    if (!writeRoboticsData(next)) {
      setError("Could not save changes to browser storage.");
      return;
    }
    setEditing(false);
    setError("");
  }

  function deleteProject() {
    if (!project || !window.confirm(`Delete ${project.name} and its experiment records?`)) return;
    const data = readRoboticsData();
    const saved = writeRoboticsData({
      projects: data.projects.filter((item) => item.id !== project.id),
      experiments: data.experiments.filter((item) => item.projectId !== project.id),
    });
    if (!saved) {
      setError("Could not delete this project from browser storage.");
      return;
    }
    router.push("/workspace");
  }

  return (
    <div className="space-y-6">
      <Link href="/workspace" className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Projects
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold">{project.name}</h2>
            <Badge variant="info">{project.category}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted">Saved in this browser · Updated {new Date(project.updatedAt).toLocaleDateString()}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => editing ? setEditing(false) : startEditing()}>{editing ? "Cancel edit" : "Edit project"}</Button>
          <Button variant="ghost" onClick={deleteProject} aria-label="Delete project">
            <Trash2 className="size-4" aria-hidden /> Delete
          </Button>
        </div>
      </div>
      {error && !editing ? <p role="alert" className="text-sm text-danger">{error}</p> : null}

      {editing ? (
        <Card>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={saveProject}>
            <label className="text-sm font-medium">Name<Input required name="name" defaultValue={project.name} className="mt-1.5" /></label>
            <label className="text-sm font-medium">Category<Select name="category" defaultValue={project.category} className="mt-1.5"><option value="robotics">Robotics</option><option value="embedded">Embedded systems</option><option value="autonomy">Autonomy</option><option value="iot">IoT</option><option value="other">Other</option></Select></label>
            <label className="text-sm font-medium">Contributors<Input name="contributors" defaultValue={project.contributors} className="mt-1.5" /></label>
            <label className="text-sm font-medium md:col-span-2">Description<textarea name="description" defaultValue={project.description} className="mt-1.5 min-h-20 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" /></label>
            <label className="text-sm font-medium md:col-span-2">Objectives<textarea name="objectives" defaultValue={project.objectives} className="mt-1.5 min-h-20 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" /></label>
            <label className="text-sm font-medium md:col-span-2">Hardware<textarea value={hardwareText} onChange={(event) => setHardwareText(event.target.value)} className="mt-1.5 min-h-16 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" /></label>
            {error ? <p role="alert" className="text-sm text-danger md:col-span-2">{error}</p> : null}
            <div className="flex justify-end md:col-span-2"><Button type="submit">Save changes</Button></div>
          </form>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <h3 className="text-sm font-semibold">Objectives</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">{project.objectives || "No objectives recorded."}</p>
        </Card>
        <Card>
          <h3 className="text-sm font-semibold">Hardware</h3>
          {project.hardware.length ? (
            <ul className="mt-2 space-y-1 text-sm text-muted">{project.hardware.map((item) => <li key={item}>{item}</li>)}</ul>
          ) : <p className="mt-2 text-sm text-muted">No hardware recorded.</p>}
        </Card>
        <Card>
          <h3 className="text-sm font-semibold">Contributors</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{project.contributors || "No contributors listed."}</p>
        </Card>
      </div>

      <section aria-labelledby="project-records-heading">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 id="project-records-heading" className="text-lg font-semibold">Experiment records</h3>
            <p className="text-sm text-muted">{records.length} recorded for this project</p>
          </div>
          <Link href={`/experiments?project=${encodeURIComponent(project.id)}`}>
            <Button><FilePlus2 className="size-4" aria-hidden /> Record experiment</Button>
          </Link>
        </div>
        {records.length === 0 ? (
          <Card><p className="text-sm text-muted">Procedures, observations, and results will appear here after you record an experiment.</p></Card>
        ) : (
          <div className="divide-y divide-border border-y border-border">
            {records.map((record) => (
              <Link key={record.id} href={`/experiments?record=${encodeURIComponent(record.id)}`} className="flex items-center justify-between gap-4 py-3 hover:text-primary">
                <span><span className="block text-sm font-medium">{record.title}</span><span className="text-xs text-muted">{new Date(record.updatedAt).toLocaleDateString()} · {record.hardware.length} hardware items</span></span>
                <span className="text-xs text-muted">View record</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}