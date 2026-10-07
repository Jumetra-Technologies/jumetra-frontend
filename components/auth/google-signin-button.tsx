"use client";

import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth-store";
import { prepareGoogleSignIn, signInWithGoogle } from "@/lib/firebase-auth";

export function GoogleSignInButton({ disabled = false }: { disabled?: boolean }) {
  const [isGoogleReady, setIsGoogleReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loginWithGoogleToken = useAuthStore((state) => state.loginWithGoogleToken);

  useEffect(() => {
    let isMounted = true;
    void prepareGoogleSignIn()
      .then(() => {
        if (isMounted) setIsGoogleReady(true);
      })
      .catch((loadError: unknown) => {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load Google sign-in.");
          setIsGoogleReady(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      ) : null}
      <Button
        type="button"
        variant="outline"
        className="w-full justify-center gap-2 rounded-full border border-blue-500 text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/40"
        disabled={disabled || isSubmitting || !isGoogleReady}
        onClick={async () => {
          setIsSubmitting(true);
          setError(null);
          try {
            const idToken = await signInWithGoogle();
            await loginWithGoogleToken(idToken);
          } catch (loginError) {
            const message = loginError instanceof Error ? loginError.message : "Google sign-in failed";
            setError(message);
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        <span className="flex size-5 items-center justify-center rounded-full bg-white text-sm font-bold text-blue-600">G</span>
        {isSubmitting ? "Connecting to HHIP…" : "Continue with Google"}
      </Button>
      {isSubmitting ? (
        <div className="flex items-center justify-center gap-2 text-xs text-muted">
          <LoaderCircle className="size-4 animate-spin" />
          Connecting to HHIP…
        </div>
      ) : null}
    </div>
  );
}
