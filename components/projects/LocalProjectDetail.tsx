"use client";

import { ErrorNotice } from "@/components/ui/error-notice";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, FilePlus2, FlaskConical, Trash2 } from "lucide-react";
import { SignInNotice, SignInPrompt } from "@/components/auth/SignInNotice";
import { labHref } from "@/components/projects/LabSessionCard";
import { ProjectDetailSkeleton } from "@/components/projects/ProjectsSkeleton";
import { labHardware, ProjectLabActivity, useProjectSessions } from "@/components/projects/ProjectLabActivity";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { deleteProject as removeProject, isUnsavedProject, listRecords, movedProjectId, saveRecord, saveUnsaved, updateProject, useProjects } from "@/lib/projects/workspace";
import { ExperimentRecordDialog } from "@/components/experiments/ExperimentRecordDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@kiungo/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import type { ExperimentRecord, ProjectCategory, RoboticsProject } from "@/lib/robotics-data";
import { describeError } from "@/lib/errors";

/**
 * One of a person's own projects. An unsaved one (made signed out) lives in
 * this tab and works in full; one saved to an account is read from the server,
 * which needs that account signed in.
 */
export function LocalProjectDetail({ projectId: openedId }: { projectId: string }) {
  const router = useRouter();
  const workspace = useProjects();
  const signedIn = useAuthStore((state) => state.isAuthenticated);
  const account = useAuthStore((state) => state.user?.id ?? null);
  // Signing in saves an unsaved project to the account under a new id. The page follows it where it
  // stands, so the project stays on screen and nothing being typed is lost.
  const projectId = (workspace ? movedProjectId(openedId) : undefined) ?? openedId;
  const unsaved = isUnsavedProject(projectId);
  // The account's copy, kept with the account it was read for: this page stays open through signing out and in.
  const [loaded, setLoaded] = useState<{ account: string | null; project: RoboticsProject } | null>(null);
  const [hardwareText, setHardwareText] = useState("");
  const [draft, setDraft] = useState<RoboticsProject | null>(null);
  const [editing, setEditing] = useState(false);
  const [creatingRecord, setCreatingRecord] = useState(false);
  const [records, setRecords] = useState<ExperimentRecord[]>([]);
  const [error, setError] = useState("");
  const lab = useProjectSessions(projectId);

  // The address follows too, so a reload or a shared link opens the saved project.
  useEffect(() => {
    if (projectId === openedId) return;
    window.history.replaceState(window.history.state, "", `/workspace/projects/${encodeURIComponent(projectId)}`);
  }, [projectId, openedId]);

  useEffect(() => {
    if (unsaved || !signedIn) return;
    let active = true;
    void api.getMyProject(projectId).then((saved) => {
      if (active) {
        setLoaded({ account, project: saved });
        setError("");
      }
    }).catch((loadError: unknown) => {
      if (active) setError(describeError(loadError, "This project couldn't be loaded."));
    });
    return () => {
      active = false;
    };
  }, [unsaved, signedIn, account, projectId]);

  const listed = workspace?.projects.find((item) => item.id === projectId) ?? null;
  const serverProject = loaded && loaded.account === account && loaded.project.id === projectId ? loaded.project : null;
  const project = unsaved ? listed : signedIn ? (serverProject ?? listed) : null;
  const projectIdLoaded = project?.id;
  // An unsaved project's records are in this tab; the list changes as they are added.
  const unsavedRecords = workspace?.unsavedRecords;

  useEffect(() => {
    if (!projectIdLoaded) return;
    let active = true;
    void listRecords(projectIdLoaded).then((savedRecords) => {
      if (active) setRecords(savedRecords);
    }).catch((loadError: unknown) => {
      if (active) setError(describeError(loadError, "Experiment records couldn't be loaded."));
    });
    return () => {
      active = false;
    };
  }, [projectIdLoaded, unsavedRecords]);

  if (!workspace || !lab.ready) {
    return <ProjectDetailSkeleton />;
  }
  if (!unsaved && !signedIn) {
    return (
      <SignInPrompt title="Sign in to open this project" footer={<Link href="/workspace" className="text-primary hover:underline">Back to projects</Link>}>
        This project is saved to an account. Sign in to that account to open it. You can still start a new project without signing in.
      </SignInPrompt>
    );
  }
  if (!project && !unsaved && !error) {
    return <ProjectDetailSkeleton />;
  }
  if (!project) {
    return (
      <Card>
        {unsaved ? (
          <>
            <p className="font-medium">This project wasn&apos;t saved</p>
            <p className="mt-1 text-sm text-muted">
              A project made without signing in lasts until its page is closed or reloaded.{" "}
              {signedIn ? "The projects you make now are saved to your account." : "Sign in before you start the next one to keep it."}
            </p>
          </>
        ) : (
          <>
            <p className="font-medium">Project not found in your account</p>
            <p className="mt-1 text-sm text-muted">Check that you are signed in to the account that owns this project.</p>
          </>
        )}
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
    const saved = await saveRecord({ ...recordDraft, projectId: currentProject.id }, existing);
    setRecords((current) => {
      const next = current.filter((item) => item.id !== saved.id && item.id !== existing?.id);
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
      // The project may have been saved to the account, under a new id, since the form was opened.
      id: project.id,
      name: String(formData.get("name") ?? "").trim(),
      category: String(formData.get("category") ?? project.category) as ProjectCategory,
      description: String(formData.get("description") ?? "").trim(),
      objectives: String(formData.get("objectives") ?? "").trim(),
      contributors: String(formData.get("contributors") ?? "").trim(),
      hardware: hardwareText.split(/[\n,]/).map((item) => item.trim()).filter(Boolean),
      updatedAt: new Date().toISOString(),
    };
    try {
      // To the account when the project is saved there; an unsaved one changes in this tab.
      setLoaded({ account, project: await updateProject(updated) });
      setEditing(false);
      setError("");
    } catch (saveError) {
      setError(describeError(saveError, "Your changes weren't saved. Try again."));
    }
  }

  async function deleteProject() {
    if (!project || !window.confirm(`Delete ${project.name} and its experiment records?`)) return;
    try {
      // Its lab sessions stay, unlinked.
      await removeProject(project.id);
    } catch (deleteError) {
      setError(describeError(deleteError, "The project wasn't deleted. Try again."));
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
          <p className="mt-1 text-sm text-muted">{unsaved ? "Not saved" : "Saved to your account"} · Updated {new Date(project.updatedAt).toLocaleDateString()}</p>
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
      {unsaved && !signedIn ? (
        <SignInNotice testId="project-sign-in">This project isn&apos;t saved. It works in full, and it is gone when you close or reload this page.</SignInNotice>
      ) : null}
      {unsaved && signedIn ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-border bg-[var(--accent)] px-4 py-3 text-sm" data-testid="project-unsaved">
          <p className="min-w-0 flex-1">This project isn&apos;t saved to your account yet. It stays in this tab until it is.</p>
          <Button size="sm" onClick={() => void saveUnsaved()} disabled={workspace.saving}>
            {workspace.saving ? "Saving…" : "Save to my account"}
          </Button>
        </div>
      ) : null}
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

      <ProjectLabActivity project={project} projects={workspace.projects} />

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
          projects={workspace.projects}
          onSave={saveExperimentRecord}
          onClose={() => setCreatingRecord(false)}
        />
      ) : null}
    </div>
  );
}