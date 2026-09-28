"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth-store";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (element: Element | null, options: Record<string, unknown>) => void;
          prompt: (callback?: (notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void;
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
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const { loginWithGoogleCredential, clearError } = useAuthStore();

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      setError("Google client ID is not configured for the frontend.");
      return;
    }

    const existingScript = document.getElementById("google-identity-script");
    if (existingScript) {
      if (window.google?.accounts?.id) {
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
      if (!window.google?.accounts?.id) {
        setError("Google Identity Services did not load correctly.");
        return;
      }
      setIsGoogleReady(true);
    };
    script.onerror = () => setError("Unable to load Google Sign-In.");
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!isGoogleReady || !window.google?.accounts?.id || !buttonRef.current) {
      return;
    }

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (response: { credential?: string }) => {
        if (!response.credential) {
          setError("No Google credential returned.");
          return;
        }

        setIsSubmitting(true);
        setError(null);
        clearError();

        try {
          await loginWithGoogleCredential(response.credential);
        } catch (loginError) {
          const message = loginError instanceof Error ? loginError.message : "Google sign-in failed";
          setError(message);
        } finally {
          setIsSubmitting(false);
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    window.google.accounts.id.renderButton(buttonRef.current, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "pill",
      logo_alignment: "left",
    });
  }, [clearError, isGoogleReady, loginWithGoogleCredential]);

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      ) : null}
      <div ref={buttonRef} className={disabled || isSubmitting ? "pointer-events-none opacity-60" : ""} />
      {isSubmitting ? (
        <div className="flex items-center justify-center gap-2 text-xs text-muted">
          <LoaderCircle className="size-4 animate-spin" />
          Connecting to HHIP…
        </div>
      ) : null}
    </div>
  );
}
