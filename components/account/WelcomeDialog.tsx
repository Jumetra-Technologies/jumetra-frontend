"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import { LoaderCircle, MapPin, X } from "lucide-react";
import { ProviderConnections } from "@/components/account/ProviderConnections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModalShell } from "@/components/ui/modal";
import { closeAccountDialog } from "@/lib/account-dialogs";
import { useAuthStore } from "@/lib/auth-store";
import { fieldsOf, LIMITS, saveProfile, validateFields, type ProfileFields } from "@/lib/profile";
import { describeError } from "@/lib/errors";

const ROLE_CHOICES = [
  { id: "student", label: "Student" },
  { id: "researcher", label: "Researcher" },
  { id: "instructor", label: "Instructor" },
  { id: "other", label: "Other" },
] as const;

export function WelcomeDialog({ open }: { open: boolean }) {
  const titleId = useId();
  const { user, accessToken, updateUser } = useAuthStore();
  const [form, setForm] = useState<ProfileFields | null>(() => user ? fieldsOf(user) : null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);

  if (!user || !form) return null;
  const currentUser = user;
  const currentForm = form;
  const set = <K extends keyof ProfileFields>(key: K, value: ProfileFields[K]) =>
    setForm((previous) => previous ? { ...previous, [key]: value } : previous);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setMessage("Location access is not available in this browser. You can enter a location instead.");
      return;
    }
    setLocating(true);
    setMessage(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        set("location", `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`);
        setLocating(false);
      },
      () => {
        setMessage("We couldn't get your location. Check your browser permission or enter it yourself.");
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 0 },
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateFields(currentForm);
    if (!currentForm.role) found.role = "Choose the option that best describes you.";
    setErrors(found);
    setMessage(null);
    if (Object.keys(found).length) return;
    if (!accessToken) {
      setMessage("Your session has expired. Please sign in again.");
      return;
    }
    setBusy(true);
    try {
      const saved = await saveProfile(currentUser, accessToken, currentForm);
      updateUser(saved.user);
      closeAccountDialog();
    } catch (error) {
      setMessage(describeError(error, "Your details weren't saved. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell open={open} onClose={closeAccountDialog} labelledBy={titleId} className="max-w-[520px]" testId="welcome-dialog">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
        <h2 id={titleId} className="text-lg font-semibold tracking-tight text-foreground">Welcome to Kiungo Labs</h2>
        <button type="button" onClick={closeAccountDialog} aria-label="Close" className="inline-flex size-8 items-center justify-center rounded-md text-muted hover:bg-muted-bg hover:text-foreground">
          <X className="size-4" aria-hidden />
        </button>
      </header>

      <form onSubmit={submit} className="space-y-5 overflow-y-auto px-6 py-5">
        <p className="text-sm leading-6 text-muted">Tell us a little about yourself to personalize your workspace. Your role is for your profile and does not change your account permissions.</p>

        <ProviderConnections />

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-foreground">Which best describes you?</legend>
          <div role="radiogroup" aria-label="Your role" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {ROLE_CHOICES.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={form.role === id}
                onClick={() => {
                  set("role", id);
                  if (id !== "other") set("role_other", null);
                  setErrors((previous) => ({ ...previous, role: "", role_other: "" }));
                }}
                className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${form.role === id ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface text-foreground hover:bg-muted-bg"}`}
                data-testid={`welcome-role-${id}`}
              >
                {label}
              </button>
            ))}
          </div>
          {errors.role ? <p className="mt-1 text-xs text-danger">{errors.role}</p> : null}
        </fieldset>

        {form.role === "other" ? (
          <Field label="Your role" error={errors.role_other}>
            {(id) => <Input id={id} maxLength={LIMITS.role_other} value={form.role_other ?? ""} onChange={(event) => set("role_other", event.target.value)} placeholder="e.g. Maker" />}
          </Field>
        ) : null}

        <Field label="Organisation (optional)" error={errors.organization}>
          {(id) => <Input id={id} maxLength={LIMITS.organization} value={form.organization ?? ""} onChange={(event) => set("organization", event.target.value)} placeholder="School, lab, or organisation" autoComplete="organization" />}
        </Field>

        <Field label="Location (optional)" error={errors.location}>
          {(id) => (
            <>
              <Input id={id} maxLength={LIMITS.location} value={form.location ?? ""} onChange={(event) => set("location", event.target.value)} placeholder="City, region, or coordinates" autoComplete="address-level2" />
              <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={useMyLocation} disabled={locating || busy}>
                {locating ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <MapPin className="size-4" aria-hidden />}
                {locating ? "Getting location…" : "Use my location"}
              </Button>
              <p className="mt-1 text-xs leading-5 text-muted">Your location is only accessed after you press this button and approve the browser prompt. If approved, coordinates are saved to your profile and can be edited here.</p>
            </>
          )}
        </Field>

        {message ? <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{message}</p> : null}

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="secondary" onClick={closeAccountDialog} disabled={busy}>Not now</Button>
          <Button type="submit" disabled={busy} data-testid="welcome-save">{busy ? "Saving…" : "Save and continue"}</Button>
        </div>
      </form>
    </ModalShell>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-foreground">{label}</label>
      {children(id)}
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </div>
  );
}
