"use client";

import { describeError } from "@/lib/errors";
import { ErrorNotice } from "@/components/ui/error-notice";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, FlaskConical, FolderKanban, Plus } from "lucide-react";
import { SignInNotice } from "@/components/auth/SignInNotice";
import { LabSessionCard, labHref } from "@/components/projects/LabSessionCard";
import { ProjectsSkeleton } from "@/components/projects/ProjectsSkeleton";
import { useLab } from "@kiungo/lab/store";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { openAuth } from "@/lib/account-dialogs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@kiungo/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/input";
import { createProject, isUnsavedProject, saveUnsaved, useProjects } from "@/lib/projects/workspace";
import type { ProjectCategory, ProjectTeammate } from "@/lib/robotics-data";
import type { ProjectSummary } from "@/lib/types";

const emptyDraft = {
  name: "",
  description: "",
  objectives: "",
  category: "robotics" as ProjectCategory,
  hardware: "",
};

/**
 * Projects, open to everyone. Signed in, projects and lab sessions are the
 * account's. Signed out, both can be made and used in full but aren't saved:
 * they live in this tab until it is closed, and signing in saves them.
 * Teammates are other accounts, so adding them is the one thing here that
 * needs a sign-in.
 */
export function ProjectHub({ serverProjects, startCreating = false }: { serverProjects: ProjectSummary[]; startCreating?: boolean }) {
  const router = useRouter();
  const workspace = useProjects();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const labReady = useLab((s) => s.hydrated);
  const sessions = useLab((s) => s.sessions);
  useEffect(() => {
    if (!useLab.getState().hydrated) useLab.getState().hydrate();
  }, []);
  const recentSessions = [...sessions].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const [creating, setCreating] = useState(startCreating);
  const [draft, setDraft] = useState(emptyDraft);
  const [teammateQuery, setTeammateQuery] = useState("");
  const [teammateResults, setTeammateResults] = useState<ProjectTeammate[]>([]);
  const [selectedTeammates, setSelectedTeammates] = useState<ProjectTeammate[]>([]);
  const [searchingTeammates, setSearchingTeammates] = useState(false);
  const [teammateSearchError, setTeammateSearchError] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // A search runs for two or more characters while signed in; otherwise nothing it found earlier is shown.
  const searchActive = teammateQuery.trim().length >= 2 && isAuthenticated;
  const shownResults = searchActive ? teammateResults : [];
  const shownSearching = searchActive && searchingTeammates;
  const shownSearchError = searchActive ? teammateSearchError : "";

  useEffect(() => {
    const query = teammateQuery.trim();
    if (query.length < 2 || !isAuthenticated) return;

    let active = true;
    const timer = setTimeout(() => {
      setSearchingTeammates(true);
      void api.searchUsers(query).then((users) => {
        if (active) {
          const selectedIds = new Set(selectedTeammates.map((teammate) => teammate.id));
          setTeammateResults(users.filter((teammate) => !selectedIds.has(teammate.id)));
          setTeammateSearchError("");
        }
      }).catch((searchError: unknown) => {
        if (active) {
          setTeammateSearchError(describeError(searchError, "Users couldn't be searched."));
          setTeammateResults([]);
        }
      }).finally(() => {
        if (active) setSearchingTeammates(false);
      });
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isAuthenticated, selectedTeammates, teammateQuery]);

  const signedIn = workspace?.signedIn ?? false;
  const projects = workspace?.projects ?? [];
  const loadError = workspace?.error ? describeError(workspace.error, "Your saved projects couldn't be loaded.") : "";
  const unsavedError = workspace?.unsavedError ? describeError(workspace.unsavedError, "Some of what you made before signing in wasn't saved to your account.") : "";

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Teammates are chosen from other accounts, which takes a sign-in.
    const teammates = signedIn ? selectedTeammates : [];
    const input = {
      name: draft.name.trim(),
      description: draft.description.trim(),
      objectives: draft.objectives.trim(),
      contributors: teammates.map((teammate) => teammate.display_name).join(", "),
      category: draft.category,
      hardware: draft.hardware.split(/[\n,]/).map((item) => item.trim()).filter(Boolean),
      teammates,
    };
    setSaving(true);
    try {
      // On the account when signed in. Signed out it is made all the same, unsaved.
      await createProject(input);
      setDraft(emptyDraft);
      setSelectedTeammates([]);
      setTeammateQuery("");
      setTeammateResults([]);
      setError("");
      setCreating(false);
      if (startCreating) router.replace("/workspace");
    } catch (saveError) {
      setError(describeError(saveError, "Your project wasn't saved. Try again."));
    } finally {
      setSaving(false);
    }
  }

  function newLabSession() {
    const session = useLab.getState().createSession({ name: "Untitled lab" });
    router.push(labHref(session.id));
  }

  if (!workspace || !labReady) return <ProjectsSkeleton />;

  function closeCreate() {
    setCreating(false);
    if (startCreating) router.replace("/workspace");
    setSelectedTeammates([]);
    setTeammateQuery("");
    setTeammateResults([]);
    setTeammateSearchError("");
    setDraft(emptyDraft);
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
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={newLabSession} data-testid="new-lab-session">
            <FlaskConical className="size-4" aria-hidden />
            New lab session
          </Button>
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" aria-hidden />
            New project
          </Button>
        </div>
      </div>

      {!signedIn ? (
        <SignInNotice className="mb-8" testId="projects-sign-in">
          You&apos;re not signed in. Everything here works, but nothing is saved: your projects and lab sessions are gone when you close or reload this page.
        </SignInNotice>
      ) : null}
      {workspace.saving ? <p role="status" className="mb-6 text-sm text-muted">Saving what you made before signing in…</p> : null}
      {unsavedError ? <ErrorNotice message={unsavedError} onRetry={() => void saveUnsaved()} className="mb-6" /> : null}

      <section aria-labelledby="lab-sessions-heading" className="mb-10">
        <div className="mb-3 flex items-center justify-between">
          <h3 id="lab-sessions-heading" className="text-sm font-semibold">Lab sessions</h3>
          <span className="text-xs text-muted">{signedIn ? "Saved to your account" : "Not saved"}</span>
        </div>
        {recentSessions.length === 0 ? (
          <Card className="flex flex-col items-start gap-3 py-8">
            <FlaskConical className="size-5 text-muted" aria-hidden />
            <div>
              <p className="font-medium">No lab sessions yet</p>
              <p className="mt-1 text-sm text-muted">{signedIn ? "Build a circuit in the Engineering Lab; it is saved here automatically, with a log of what happened." : "Build a circuit in the Engineering Lab; it shows up here, with a log of what happened."}</p>
            </div>
            <Button variant="secondary" onClick={newLabSession}>
              <FlaskConical className="size-4" aria-hidden /> Open the lab
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recentSessions.slice(0, 6).map((session) => (
              <LabSessionCard key={session.id} session={session} projects={projects} />
            ))}
          </div>
        )}
        {recentSessions.length > 6 ? <p className="mt-3 text-xs text-muted">{recentSessions.length - 6} older sessions are in the lab&apos;s session menu.</p> : null}
      </section>

      <section aria-labelledby="robotics-projects-heading">
        <div className="mb-3 flex items-center justify-between">
          <h3 id="robotics-projects-heading" className="text-sm font-semibold">Your robotics projects</h3>
          <span className="text-xs text-muted">{signedIn ? "Saved to your account" : "Not saved"}</span>
        </div>
        {loadError ? <ErrorNotice message={loadError} className="mb-3" /> : null}
        {signedIn && !workspace.ready && projects.length === 0 ? (
          <Card className="py-8">
            <p role="status" className="text-sm text-muted">Loading your projects…</p>
          </Card>
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
              const experimentCount = workspace.unsavedRecords.filter((experiment) => experiment.projectId === project.id).length;
              const linked = recentSessions.filter((session) => session.projectId === project.id);
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
                      {isUnsavedProject(project.id) ? <Badge variant="warning">Not saved</Badge> : null}
                      <span className="text-xs text-muted">{project.hardware.length} hardware items</span>
                      {/* An account project's records are on the server; only an unsaved project's are known here. */}
                      {isUnsavedProject(project.id) ? <span className="text-xs text-muted">{experimentCount} record{experimentCount === 1 ? "" : "s"}</span> : null}
                      <span className="text-xs text-muted">{linked.length} lab session{linked.length === 1 ? "" : "s"}</span>
                    </div>
                    {linked[0] ? (
                      <p className="mt-3 line-clamp-1 text-xs text-muted">
                        <span className="font-medium text-foreground">Latest in the lab</span> {[...linked[0].log].reverse().find((e) => e.kind !== "session")?.text ?? linked[0].name}
                      </p>
                    ) : null}
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
            <span className="text-xs text-muted">Shared records (read-only)</span>
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
          {!signedIn ? (
            <div className="rounded-md border border-dashed border-border px-3 py-2.5 text-sm" data-testid="teammates-sign-in">
              <p className="font-medium">Add teammates</p>
              <p className="mt-0.5 text-xs leading-5 text-muted">
                Teammates are other Kiungo accounts, so adding them needs yours.{" "}
                <button type="button" onClick={() => openAuth("login")} className="font-medium text-primary hover:underline">
                  Sign in
                </button>{" "}
                to add them. The rest of the project works without it.
              </p>
            </div>
          ) : (
          <div className="space-y-2">
            <label htmlFor="project-teammate-search" className="block text-sm font-medium">Add teammates</label>
            <Input
              id="project-teammate-search"
              value={teammateQuery}
              onChange={(event) => setTeammateQuery(event.target.value)}
              placeholder="Search users by name or email"
              autoComplete="off"
            />
            <p className="text-xs text-muted">Search for at least two characters. Added teammates will be saved with this project.</p>
            {selectedTeammates.length ? (
              <ul className="flex flex-wrap gap-2" aria-label="Selected teammates">
                {selectedTeammates.map((teammate) => (
                  <li key={teammate.id} className="flex items-center gap-2 rounded-full border border-border bg-muted-bg px-3 py-1 text-xs">
                    <span>{teammate.display_name} <span className="text-muted">({teammate.email})</span></span>
                    <button
                      type="button"
                      aria-label={`Remove ${teammate.display_name}`}
                      onClick={() => setSelectedTeammates((current) => current.filter((item) => item.id !== teammate.id))}
                      className="font-semibold text-muted hover:text-foreground"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {shownSearching ? <p role="status" className="text-xs text-muted">Searching users…</p> : null}
            {shownSearchError ? <ErrorNotice message={shownSearchError} size="sm" /> : null}
            {teammateQuery.trim().length >= 2 && !shownSearching && !shownSearchError && shownResults.length === 0 ? (
              <p className="text-xs text-muted">No matching users found.</p>
            ) : null}
            {shownResults.length ? (
              <ul className="max-h-40 overflow-y-auto rounded-md border border-border" aria-label="User search results">
                {shownResults.map((teammate) => (
                  <li key={teammate.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTeammates((current) => (
                          current.some((item) => item.id === teammate.id) ? current : [...current, teammate]
                        ));
                        setTeammateQuery("");
                        setTeammateResults([]);
                      }}
                      className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-muted-bg"
                    >
                      <span className="text-sm font-medium">{teammate.display_name}</span>
                      <span className="text-xs text-muted">{teammate.email}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          )}
          <label className="block text-sm font-medium">
            Hardware
            <textarea value={draft.hardware} onChange={(event) => setDraft({ ...draft, hardware: event.target.value })} className="mt-1.5 min-h-16 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]" placeholder="ESP32, motor driver, encoders" />
          </label>
          {error ? <ErrorNotice message={error} /> : null}
          {!signedIn ? <p className="text-xs leading-5 text-muted" data-testid="create-unsaved-note">You&apos;re not signed in, so this project won&apos;t be saved. You can sign in later to keep it.</p> : null}
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="ghost" onClick={closeCreate}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Create project"}</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}