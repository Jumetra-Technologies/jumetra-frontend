"use client";

import { useEffect, useRef, useState } from "react";
import { Code2, LoaderCircle } from "lucide-react";
import { GoogleLogo } from "@/components/auth/google-logo";
import { useAuthStore } from "@/lib/auth-store";
import { describeSignInError, prepareGoogleSignIn, signInWithGitHub, signInWithGoogle } from "@/lib/firebase-auth";
import { cn } from "@/lib/utils";
import { openProviderLink, openWelcome } from "@/lib/account-dialogs";

type Provider = "google" | "github";

export function SocialSignInButton({
  provider,
  disabled = false,
  label,
  onSignedIn,
  className,
}: {
  provider: Provider;
  disabled?: boolean;
  label?: string;
  onSignedIn?: () => void;
  className?: string;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loginWithFirebaseToken = useAuthStore((state) => state.loginWithFirebaseToken);
  const mounted = useRef(true);
  const providerName = provider === "github" ? "GitHub" : "Google";
  const buttonLabel = label ?? `Continue with ${providerName}`;

  useEffect(() => {
    mounted.current = true;
    void prepareGoogleSignIn().catch(() => undefined);
    return () => {
      mounted.current = false;
    };
  }, []);

  async function start() {
    setIsSubmitting(true);
    setError(null);
    try {
      const { idToken, photoURL } = provider === "github"
        ? await signInWithGitHub()
        : await signInWithGoogle();
      const session = await loginWithFirebaseToken(idToken, provider, photoURL);
      onSignedIn?.();
      if (session.user.profile_complete === false || !session.user.role || (session.user.role === "other" && !session.user.role_other)) {
        openWelcome();
      } else if ((session.user.linked_providers?.length ?? 1) < 2) {
        openProviderLink();
      }
    } catch (signInError) {
      if (mounted.current) setError(describeSignInError(signInError, providerName));
    } finally {
      if (mounted.current) setIsSubmitting(false);
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      <button
        type="button"
        onClick={start}
        disabled={disabled || isSubmitting}
        aria-busy={isSubmitting || undefined}
        data-testid={`${provider}-signin`}
        className={provider === "github" ? "kiungo-ghbtn" : "kiungo-gbtn"}
      >
        <span className="kiungo-gbtn__icon" aria-hidden>
          {isSubmitting ? (
            <LoaderCircle className="size-[18px] animate-spin" />
          ) : provider === "github" ? (
            <Code2 className="size-[18px]" />
          ) : (
            <GoogleLogo />
          )}
        </span>
        <span className="kiungo-gbtn__label">{isSubmitting ? "Signing in…" : buttonLabel}</span>
      </button>
      {error ? (
        <p role="alert" className="rounded-[10px] border border-danger/30 bg-danger/10 px-3 py-2 text-xs leading-5 text-danger">
          {error}
        </p>
      ) : null}
      {provider === "github" ? (
        <p className="text-center text-xs leading-5 text-muted">
          Opens GitHub in a secure window. If you&apos;re already signed in, just authorize Kiungo.
        </p>
      ) : null}
    </div>
  );
}
