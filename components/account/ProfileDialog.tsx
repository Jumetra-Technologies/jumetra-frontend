"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { Check, Info, LogOut, Pencil, Trash2, X } from "lucide-react";
import { Avatar } from "@/components/account/Avatar";
import { GoogleLogo } from "@/components/auth/google-logo";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { ModalShell } from "@/components/ui/modal";
import { closeAccountDialog } from "@/lib/account-dialogs";
import { useAuthStore } from "@/lib/auth-store";
import {
  EMPTY_DETAILS,
  LIMITS,
  ROLES,
  deleteAccount,
  fieldsOf,
  roleLabel,
  saveProfile,
  validateFields,
  type FieldErrors,
  type ProfileFields,
} from "@/lib/profile";
import { closeSettings } from "@/lib/settings-dialog";
import { cn } from "@/lib/utils";

type Notice = { tone: "ok" | "info" | "error"; text: string } | null;
type Confirm = "clear" | "delete" | null;

const DEVICE_NOTE = "Saved on this device. Kiungo's server can't store profile details yet, so they won't follow you to other devices until it can.";

/**
 * The signed-in user's profile: view, edit and save, clear details, or
 * delete the account. Mounted only while open, so each opening starts fresh.
 */
export function ProfileDialog({ open }: { open: boolean }) {
  const titleId = useId();
  const { user, accessToken, isAuthenticated, updateUser, logout } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ProfileFields | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);

  // Signed out underneath us (here or in another tab): nothing to show.
  useEffect(() => {
    if (open && !isAuthenticated) closeAccountDialog();
  }, [open, isAuthenticated]);

  if (!user) return null;
  const current = fieldsOf(user);

  function startEdit() {
    setForm(current);
    setErrors({});
    setNotice(null);
    setConfirm(null);
    setEditing(true);
  }

  async function persist(next: ProfileFields, done: string) {
    if (!user || !accessToken) return;
    const found = validateFields(next);
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    setNotice(null);
    try {
      const result = await saveProfile(user, accessToken, next);
      updateUser(result.user);
      setEditing(false);
      setConfirm(null);
      setNotice(result.savedTo === "server" ? { tone: "ok", text: done } : { tone: "info", text: DEVICE_NOTE });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Your changes weren't saved." });
    } finally {
      setBusy(false);
    }
  }

  async function removeAccount() {
    if (!user || !accessToken) return;
    setBusy(true);
    setNotice(null);
    const result = await deleteAccount(user, accessToken);
    setBusy(false);
    if (!result.deleted) {
      setConfirm(null);
      setNotice({ tone: "error", text: result.reason });
      return;
    }
    logout();
    closeAccountDialog();
    closeSettings();
  }

  const set = <K extends keyof ProfileFields>(key: K, value: ProfileFields[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));

  return (
    <ModalShell open={open} onClose={closeAccountDialog} labelledBy={titleId} className="max-w-[520px]" testId="profile-dialog">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-6 py-4">
        <h2 id={titleId} className="text-lg font-semibold tracking-tight text-foreground">
          {editing ? "Edit profile" : "Profile"}
        </h2>
        <button
          type="button"
          onClick={closeAccountDialog}
          aria-label="Close profile"
          className="inline-flex size-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-muted-bg hover:text-foreground"
        >
          <X className="size-4" aria-hidden />
        </button>
      </header>

      <div className="min-h-0 overflow-y-auto">
        <section className="flex items-center gap-4 px-6 pb-5 pt-6">
          <Avatar name={user.display_name} src={user.picture_url} size={72} />
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-foreground" data-testid="profile-name">
              {user.display_name}
            </p>
            <p className="truncate text-sm text-muted">{user.email}</p>
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border bg-canvas px-2.5 py-1 text-[11px] font-medium text-muted">
              <GoogleLogo className="size-3" />
              Signed in with Google
            </p>
          </div>
        </section>

        {notice ? <NoticeLine notice={notice} /> : null}

        {editing && form ? (
          <form
            className="space-y-4 px-6 pb-6"
            onSubmit={(event) => {
              event.preventDefault();
              void persist(form, "Profile saved.");
            }}
            noValidate
          >
            <Field label="Name" error={errors.display_name} count={[form.display_name.length, LIMITS.display_name]}>
              {(id, describedBy) => (
                <Input id={id} aria-describedby={describedBy} aria-invalid={Boolean(errors.display_name)} value={form.display_name} autoComplete="name" onChange={(e) => set("display_name", e.target.value)} />
              )}
            </Field>
            <Field label="Email" hint="Managed by your Google account.">
              {(id, describedBy) => <Input id={id} aria-describedby={describedBy} value={user.email} readOnly disabled className="opacity-70" />}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Role">
                {(id) => (
                  <Select id={id} value={form.role ?? ""} onChange={(e) => set("role", (e.target.value || null) as ProfileFields["role"])}>
                    <option value="">Not set</option>
                    {ROLES.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Location" error={errors.location}>
                {(id, describedBy) => (
                  <Input id={id} aria-describedby={describedBy} value={form.location ?? ""} placeholder="e.g. Nairobi" autoComplete="address-level2" onChange={(e) => set("location", e.target.value)} />
                )}
              </Field>
            </div>
            <Field label="School or organisation" error={errors.organization}>
              {(id, describedBy) => (
                <Input id={id} aria-describedby={describedBy} value={form.organization ?? ""} placeholder="e.g. Strathmore University" autoComplete="organization" onChange={(e) => set("organization", e.target.value)} />
              )}
            </Field>
            <Field label="About you" error={errors.bio} count={[form.bio?.length ?? 0, LIMITS.bio]}>
              {(id, describedBy) => (
                <textarea
                  id={id}
                  aria-describedby={describedBy}
                  rows={3}
                  value={form.bio ?? ""}
                  placeholder="What you're building or teaching"
                  onChange={(e) => set("bio", e.target.value)}
                  className="w-full resize-none rounded-[10px] border border-border bg-surface px-3 py-2 text-sm leading-6 text-foreground shadow-[var(--shadow-sm)] placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                />
              )}
            </Field>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={() => setForm((f) => (f ? { ...f, ...EMPTY_DETAILS } : f))}
                className="text-sm font-medium text-muted underline-offset-4 hover:text-foreground hover:underline"
              >
                Clear details
              </button>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => setEditing(false)} disabled={busy}>
                  Cancel
                </Button>
                <Button type="submit" disabled={busy} data-testid="profile-save">
                  {busy ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </div>
          </form>
        ) : (
          <>
            <dl className="mx-6 divide-y divide-border rounded-[12px] border border-border" data-testid="profile-details">
              <Row label="Name" value={user.display_name} />
              <Row label="Email" value={user.email} note="Managed by Google" />
              <Row label="Role" value={roleLabel(current.role)} />
              <Row label="Organisation" value={current.organization} />
              <Row label="Location" value={current.location} />
              <Row label="About" value={current.bio} multiline />
            </dl>

            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
              <Button onClick={startEdit} data-testid="profile-edit">
                <Pencil className="size-4" aria-hidden />
                Edit profile
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  logout();
                  closeAccountDialog();
                }}
              >
                <LogOut className="size-4" aria-hidden />
                Sign out
              </Button>
            </div>

            <section className="mx-6 mb-6 rounded-[12px] border border-danger/30 p-4" aria-labelledby={`${titleId}-danger`}>
              <h3 id={`${titleId}-danger`} className="text-sm font-semibold text-foreground">
                Your data
              </h3>
              {confirm === null ? (
                <>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    Clear the details you added, or delete your Kiungo account. Projects saved in this browser stay here either way.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setConfirm("clear")} disabled={!hasDetails(current)} data-testid="profile-clear">
                      Clear my details
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => setConfirm("delete")} data-testid="profile-delete">
                      <Trash2 className="size-3.5" aria-hidden />
                      Delete account
                    </Button>
                  </div>
                </>
              ) : (
                <div role="alertdialog" aria-label={confirm === "clear" ? "Clear your details?" : "Delete your account?"} className="mt-1">
                  <p className="text-xs leading-5 text-foreground">
                    {confirm === "clear"
                      ? "Remove your role, organisation, location and about text? Your name and email stay."
                      : "Delete your Kiungo account and the details stored with it? You'll be signed out. This can't be undone."}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setConfirm(null)} disabled={busy}>
                      Keep them
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={busy}
                      data-testid="profile-confirm"
                      onClick={() => (confirm === "clear" ? void persist({ ...current, ...EMPTY_DETAILS }, "Your details were cleared.") : void removeAccount())}
                    >
                      {busy ? "Working…" : confirm === "clear" ? "Clear details" : "Delete account"}
                    </Button>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </ModalShell>
  );
}

const hasDetails = (f: ProfileFields) => Boolean(f.role || f.organization || f.location || f.bio);

function Row({ label, value, note, multiline = false }: { label: string; value: string | null | undefined; note?: string; multiline?: boolean }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-3 px-4 py-2.5 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className={cn("min-w-0 text-foreground", multiline ? "whitespace-pre-line leading-6" : "truncate", !value && "text-muted")}>
        {value || "Not set"}
        {note && value ? <span className="ml-2 text-xs text-muted">· {note}</span> : null}
      </dd>
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  count,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  count?: [number, number];
  children: (id: string, describedBy: string | undefined) => ReactNode;
}) {
  const id = useId();
  const noteId = `${id}-note`;
  const note = error ?? hint;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-xs font-medium text-foreground">
          {label}
        </label>
        {count ? (
          <span className={cn("text-[11px] tabular-nums", count[0] > count[1] ? "text-danger" : "text-muted")}>
            {count[0]}/{count[1]}
          </span>
        ) : null}
      </div>
      {children(id, note ? noteId : undefined)}
      {note ? (
        <p id={noteId} className={cn("mt-1 text-xs", error ? "text-danger" : "text-muted")}>
          {note}
        </p>
      ) : null}
    </div>
  );
}

function NoticeLine({ notice }: { notice: NonNullable<Notice> }) {
  const Icon = notice.tone === "ok" ? Check : Info;
  return (
    <p
      role={notice.tone === "error" ? "alert" : "status"}
      data-testid="profile-notice"
      className={cn(
        "mx-6 mb-4 flex items-start gap-2 rounded-[10px] border px-3 py-2 text-xs leading-5",
        notice.tone === "ok" && "border-success/30 bg-success/10 text-foreground",
        notice.tone === "info" && "border-border bg-canvas text-foreground",
        notice.tone === "error" && "border-danger/30 bg-danger/10 text-danger",
      )}
    >
      <Icon className={cn("mt-0.5 size-3.5 shrink-0", notice.tone === "ok" && "text-success", notice.tone === "info" && "text-primary")} aria-hidden />
      {notice.text}
    </p>
  );
}
