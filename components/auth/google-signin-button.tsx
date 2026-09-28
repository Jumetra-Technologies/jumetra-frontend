"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth-store";

declare global {
  interface Window {
    google?: {
      accounts: {
        id?: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (element: Element | null, options: Record<string, unknown>) => void;
          prompt: (callback?: (notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void;
        };
        oauth2?: {
          initCodeClient: (config: Record<string, unknown>) => {
            requestCode: () => void;
          };
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

export function GoogleSignInButton({ disabled = false }: { disabled?: boolean }) {
  const [isGoogleReady, setIsGoogleReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeClientRef = useRef<{ requestCode: () => void } | null>(null);
  const { loginWithGoogleCode, clearError } = useAuthStore();

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      setError("Google client ID is not configured for the frontend.");
      return;
    }

    const existingScript = document.getElementById("google-identity-script");
    if (existingScript) {
      if (window.google?.accounts?.oauth2) {
        setIsGoogleReady(true);
      }
      return;
    }

    const script = document.createElement("script");
    script.id = "google-identity-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (!window.google?.accounts?.oauth2) {
        setError("Google OAuth did not load correctly.");
        return;
      }

      const client = window.google.accounts.oauth2.initCodeClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: "openid email profile",
        ux_mode: "popup",
        callback: async (response: { code?: string }) => {
          if (!response.code) {
            setError("Missing Google auth code.");
            return;
          }

          setIsSubmitting(true);
          setError(null);
          clearError();

          try {
            await loginWithGoogleCode(response.code);
          } catch (loginError) {
            const message = loginError instanceof Error ? loginError.message : "Google sign-in failed";
            setError(message);
          } finally {
            setIsSubmitting(false);
          }
        },
      });

      codeClientRef.current = client;
      setIsGoogleReady(true);
    };
    script.onerror = () => setError("Unable to load Google Sign-In.");
    document.body.appendChild(script);
  }, [clearError, loginWithGoogleCode]);

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
        onClick={() => {
          if (!codeClientRef.current) {
            setError("Google sign-in is still loading. Please try again.");
            return;
          }
          codeClientRef.current.requestCode();
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
