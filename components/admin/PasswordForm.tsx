"use client";

import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useId, useState, type FormEvent } from "react";

import { Button } from "@kiungo/ui/button";
import { AdminError, signIn, type AdminSession } from "@/lib/admin/api";

/** The admin password, checked by the server. Used in the box the logo opens and on /admin itself. */
export function PasswordForm({ onSignedIn, notice, autoFocus = true }: { onSignedIn: (session: AdminSession) => void; notice?: string | null; autoFocus?: boolean }) {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const errorId = useId();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError(null);
    try {
      const session = await signIn(password);
      setPassword("");
      onSignedIn(session);
    } catch (e) {
      setError(e instanceof AdminError ? e.message : "Something went wrong. Try again.");
      if (e instanceof AdminError && e.kind === "wrong") setPassword("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" data-testid="admin-password-form">
      {notice && !error ? <p className="text-sm text-muted">{notice}</p> : null}
      <div>
        <label htmlFor={inputId} className="text-sm font-medium text-foreground">
          Password
        </label>
        <div className="relative mt-1.5">
          <input
            id={inputId}
            type={show ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            autoFocus={autoFocus}
            spellCheck={false}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="h-11 w-full rounded-[10px] border border-border bg-background pl-3 pr-11 text-[15px] text-foreground outline-none transition-colors focus-visible:border-[var(--ring)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]/40 aria-[invalid=true]:border-[var(--danger)]"
            data-testid="admin-password"
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "Hide password" : "Show password"}
            aria-pressed={show}
            className="absolute right-1.5 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-[8px] text-muted hover:bg-muted-bg hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          </button>
        </div>
        {error ? (
          <p id={errorId} role="alert" className="mt-2 text-sm text-[var(--danger)]" data-testid="admin-password-error">
            {error}
          </p>
        ) : null}
      </div>
      <Button type="submit" className="h-11 w-full gap-2 text-[15px]" disabled={!password || busy} data-testid="admin-open">
        <LockKeyhole className="size-4" aria-hidden />
        {busy ? "Checking…" : "Open admin portal"}
      </Button>
    </form>
  );
}
