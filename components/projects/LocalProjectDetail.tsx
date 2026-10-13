"use client";

import { ErrorNotice } from "@/components/ui/error-notice";
import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, FilePlus2, FlaskConical, Trash2 } from "lucide-react";
import { labHref } from "@/components/projects/LabSessionCard";
import { ProjectDetailSkeleton } from "@/components/projects/ProjectsSkeleton";
import { labHardware, ProjectLabActivity, useProjectSessions } from "@/components/projects/ProjectLabActivity";
import { useLab } from "@/lib/lab/store";
import { api } from "@/lib/api-client";
import { ExperimentRecordDialog } from "@/components/experiments/ExperimentRecordDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import {
  getServerRoboticsDataSnapshot,
  readRoboticsData,
  subscribeToRoboticsData,
  type ExperimentRecord,
  type ProjectCategory,
  type RoboticsProject,
} from "@/lib/robotics-data";
import { describeError } from "@/lib/errors";

export function LocalProjectDetail({ projectId }: { projectId: string }) {
  const router = useRouter();
  const data = useSyncExternalStore(
    subscribeToRoboticsData,
    readRoboticsData,
    getServerRoboticsDataSnapshot,
  );
  const [serverProject, setServerProject] = useState<RoboticsProject | null>(null);
  const [hardwareText, setHardwareText] = useState("");
  const [draft, setDraft] = useState<RoboticsProject | null>(null);
  const [editing, setEditing] = useState(false);
  const [creatingRecord, setCreatingRecord] = useState(false);
  const [records, setRecords] = useState<Awaited<ReturnType<typeof api.getMyProjectExperiments>>>([]);
  const [error, setError] = useState("");
  const lab = useProjectSessions(projectId);

  useEffect(() => {
    if (!data || !projectId.startsWith("user-project-")) return;
    let active = true;
    void api.getMyProject(projectId).then((saved) => {
      if (active) setServerProject(saved);
    }).catch((loadError: unknown) => {
      if (active) setError(describeError(loadError, "This project couldn't be loaded."));
    });
    return () => {
      active = false;
    };
  }, [data, projectId]);

  const project = serverProject;

  useEffect(() => {
    if (!project) return;
    let active = true;
    void api.getMyProjectExperiments(project.id).then((savedRecords) => {
      if (active) setRecords(savedRecords);
    }).catch((loadError: unknown) => {
      if (active) setError(describeError(loadError, "Experiment records couldn't be loaded."));
    });
    return () => {
      active = false;
    };
  }, [project]);

  if (!data || !lab.ready) {
    return <ProjectDetailSkeleton />;
  }
  if (!project && projectId.startsWith("user-project-") && !error) {
    return <ProjectDetailSkeleton />;
  }
  if (!project) {
    return (
      <Card>
        <p className="font-medium">Project not found in your account</p>
        <p className="mt-1 text-sm text-muted">Check that you are signed in to the account that owns this project.</p>
        <Link href="/workspace" className="mt-4 inline-flex text-sm text-primary hover:underline">Back to projects</Link>
      </Card>
    );
  }

  function startEditing() {
    const currentProject = project;
    if (!currentProject) return;
    setDraft(currentProject);
    setHardwareText(currentProject.hardware.join(", "));
    setEditing(true);
  }

  async function saveExperimentRecord(
    recordDraft: Omit<ExperimentRecord, "id" | "createdAt" | "updatedAt">,
    existing?: ExperimentRecord,
  ) {
    const currentProject = project;
    if (!currentProject) {
      setError("This project is no longer available.");
      return;
    }
    const saved = existing
      ? await api.updateMyProjectExperiment(currentProject.id, existing.id, recordDraft)
      : await api.createMyProjectExperiment(currentProject.id, recordDraft);
    setRecords((current) => {
      const next = current.filter((item) => item.id !== saved.id);
      return [saved, ...next];
    });
    setError("");
  }

  async function saveProject(event: FormEvent<HTMLFormElement>) {
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
    try {
      const savedProject = project.id.startsWith("user-project-")
        ? await api.updateMyProject(project.id, updated)
        : updated;
      setServerProject(savedProject);
      setEditing(false);
      setError("");
    } catch (saveError) {
      setError(describeError(saveError, "Your changes weren't saved. Try again."));
    }
  }

  async function deleteProject() {
    if (!project || !window.confirm(`Delete ${project.name} and its experiment records?`)) return;
    try {
      if (project.id.startsWith("user-project-")) await api.deleteMyProject(project.id);
    } catch (deleteError) {
      setError(describeError(deleteError, "The project wasn't deleted. Try again."));
      return;
    }
    // Its lab sessions stay, unlinked.
    for (const session of lab.sessions) useLab.getState().linkProject(session.id, null);
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
          <p className="mt-1 text-sm text-muted">Saved to your account · Updated {new Date(project.updatedAt).toLocaleDateString()}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={lab.sessions[0] ? labHref(lab.sessions[0].id) : `/laboratory/workspace?project=${encodeURIComponent(project.id)}`} className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90" data-testid="project-open-lab">
            <FlaskConical className="size-4" aria-hidden /> {lab.sessions[0] ? "Open in lab" : "Start in the lab"}
          </Link>
          <Button variant="secondary" onClick={() => editing ? setEditing(false) : startEditing()}>{editing ? "Cancel edit" : "Edit project"}</Button>
          <Button variant="ghost" onClick={deleteProject} aria-label="Delete project">
            <Trash2 className="size-4" aria-hidden /> Delete
          </Button>
        </div>
      </div>
      {error && !editing ? <ErrorNotice message={error} /> : null}

      {editing ? (
        <Card>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={saveProject}>
            <label className="text-sm font-medium">Name<Input required name="name" defaultValue={project.name} className="mt-1.5" /></label>
            <label className="text-sm font-medium">Category<Select name="category" defaultValue={project.category} className="mt-1.5"><option value="robotics">Robotics</option><option value="embedded">Embedded systems</option><option value="autonomy">Autonomy</option><option value="iot">IoT</option><option value="other">Other</option></Select></label>
            <label className="text-sm font-medium">Contributors<Input name="contributors" defaultValue={project.contributors} className="mt-1.5" /></label>
            <label className="text-sm font-medium md:col-span-2">Description<textarea name="description" defaultValue={project.description} className="mt-1.5 min-h-20 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" /></label>
            <label className="text-sm font-medium md:col-span-2">Objectives<textarea name="objectives" defaultValue={project.objectives} className="mt-1.5 min-h-20 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" /></label>
            <label className="text-sm font-medium md:col-span-2">Hardware<textarea value={hardwareText} onChange={(event) => setHardwareText(event.target.value)} className="mt-1.5 min-h-16 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm" /></label>
            {error ? <ErrorNotice message={error} className="md:col-span-2" /> : null}
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
          {labHardware(lab.sessions).length ? (
            <div className="mt-3 border-t border-border pt-3">
              <p className="text-xs font-medium text-muted">Used in the lab</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5" data-testid="lab-hardware">
                {labHardware(lab.sessions).map((name) => (
                  <span key={name} className="rounded-full bg-muted-bg px-2 py-0.5 text-xs text-foreground">{name}</span>
                ))}
              </div>
            </div>
          ) : null}
        </Card>
        <Card>
          <h3 className="text-sm font-semibold">Contributors</h3>
          {project.teammates?.length ? (
            <ul className="mt-2 space-y-2 text-sm text-muted">
              {project.teammates.map((teammate) => (
                <li key={teammate.id}>
                  <span className="font-medium text-foreground">{teammate.display_name}</span>
                  <span className="block text-xs">{teammate.email}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{project.contributors || "No contributors listed."}</p>
          )}
        </Card>
      </div>

      <ProjectLabActivity project={project} projects={data.projects} />

      <section aria-labelledby="project-records-heading">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 id="project-records-heading" className="text-lg font-semibold">Experiment records</h3>
            <p className="text-sm text-muted">{records.length} recorded for this project</p>
          </div>
          <Button onClick={() => setCreatingRecord(true)}>
            <FilePlus2 className="size-4" aria-hidden /> Record experiment
          </Button>
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
      {creatingRecord ? (
        <ExperimentRecordDialog
          open
          projectId={project.id}
          projects={data.projects}
          onSave={saveExperimentRecord}
          onClose={() => setCreatingRecord(false)}
        />
      ) : null}
    </div>
  );
}