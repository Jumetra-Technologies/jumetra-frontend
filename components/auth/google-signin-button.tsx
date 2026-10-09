"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { GoogleLogo } from "@/components/auth/google-logo";
import { useAuthStore } from "@/lib/auth-store";
import { describeSignInError, prepareGoogleSignIn, signInWithGoogle } from "@/lib/firebase-auth";
import { cn } from "@/lib/utils";

/**
 * "Continue with Google", drawn to Google's branding rules (neutral pill,
 * four-colour G) so it reads clearly on every theme.
 *
 * Firebase is set up ahead of time so the Google window opens straight from
 * the click (browsers block pop-ups opened later). The button stays at full
 * strength while that happens; a click before it's ready simply waits.
 */
export function GoogleSignInButton({
  disabled = false,
  label = "Continue with Google",
  onSignedIn,
  className,
}: {
  disabled?: boolean;
  label?: string;
  onSignedIn?: () => void;
  className?: string;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loginWithGoogleToken = useAuthStore((state) => state.loginWithGoogleToken);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    // Warm up quietly; a failure here is reported only if they click.
    void prepareGoogleSignIn().catch(() => undefined);
    return () => {
      mounted.current = false;
    };
  }, []);

  async function start() {
    setIsSubmitting(true);
    setError(null);
    try {
      const { idToken, photoURL } = await signInWithGoogle();
      await loginWithGoogleToken(idToken, photoURL);
      onSignedIn?.();
    } catch (signInError) {
      if (mounted.current) setError(describeSignInError(signInError));
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
        data-testid="google-signin"
        className="kiungo-gbtn"
      >
        <span className="kiungo-gbtn__icon" aria-hidden>
          {isSubmitting ? <LoaderCircle className="size-[18px] animate-spin text-[#5f6368]" /> : <GoogleLogo />}
        </span>
        <span className="kiungo-gbtn__label">{isSubmitting ? "Signing in…" : label}</span>
      </button>
      {error ? (
        <p role="alert" className="rounded-[10px] border border-danger/30 bg-danger/10 px-3 py-2 text-xs leading-5 text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
