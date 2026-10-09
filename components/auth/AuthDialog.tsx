"use client";

import Link from "next/link";
import { useId } from "react";
import { X } from "lucide-react";
import { KiungoMark } from "@/components/brand/KiungoMark";
import { GoogleSignInButton } from "@/components/auth/google-signin-button";
import { ModalShell } from "@/components/ui/modal";
import { closeAccountDialog, openAuth, type AuthMode } from "@/lib/account-dialogs";
import { closeSettings } from "@/lib/settings-dialog";

const COPY: Record<AuthMode, { title: string; body: string; button: string; switchText: string; switchAction: string; other: AuthMode }> = {
  login: {
    title: "Log in to Kiungo",
    body: "Pick up your projects and lab sessions on any device.",
    button: "Continue with Google",
    switchText: "New to Kiungo?",
    switchAction: "Sign up",
    other: "signup",
  },
  signup: {
    title: "Create your Kiungo account",
    body: "Free for students, instructors, clubs and schools. Your Google account is all you need.",
    button: "Sign up with Google",
    switchText: "Already have an account?",
    switchAction: "Log in",
    other: "login",
  },
};

/** Log in or sign up. Both use Google; the account is created on first sign-in. */
export function AuthDialog({ open, mode }: { open: boolean; mode: AuthMode }) {
  const titleId = useId();
  const bodyId = useId();
  const copy = COPY[mode];

  return (
    <ModalShell open={open} onClose={closeAccountDialog} labelledBy={titleId} describedBy={bodyId} className="max-w-[400px]" testId="auth-dialog" initialFocus="[data-testid=google-signin]">
      <button
        type="button"
        onClick={closeAccountDialog}
        aria-label="Close"
        className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-muted-bg hover:text-foreground"
      >
        <X className="size-4" aria-hidden />
      </button>

      <div className="flex flex-col items-center px-7 pb-6 pt-9 text-center sm:px-9">
        <KiungoMark className="size-12" />
        <h2 id={titleId} className="mt-5 text-xl font-semibold tracking-tight text-foreground">
          {copy.title}
        </h2>
        <p id={bodyId} className="mt-2 text-sm leading-6 text-muted">
          {copy.body}
        </p>

        <GoogleSignInButton key={mode} label={copy.button} onSignedIn={closeAccountDialog} className="mt-7 w-full" />

        <p className="mt-5 text-sm text-muted">
          {copy.switchText}{" "}
          <button
            type="button"
            onClick={() => openAuth(copy.other)}
            className="font-medium text-primary underline-offset-4 hover:underline"
            data-testid="auth-switch"
          >
            {copy.switchAction}
          </button>
        </p>
      </div>

      <p className="border-t border-border bg-canvas px-7 py-3.5 text-center text-xs leading-5 text-muted sm:px-9">
        We keep your name, email and photo from Google so your work stays yours.{" "}
        <Link
          href="/legal/privacy"
          onClick={() => {
            closeAccountDialog();
            closeSettings();
          }}
          className="underline underline-offset-4 hover:text-foreground"
        >
          Privacy Policy
        </Link>
        .
      </p>
    </ModalShell>
  );
}
