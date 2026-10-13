"use client";

import { useState } from "react";
import { Check, Code2, LoaderCircle, Link2 } from "lucide-react";
import { GoogleLogo } from "@/components/auth/google-logo";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth-store";
import { describeSignInError, linkFirebaseProvider } from "@/lib/firebase-auth";

const PROVIDERS = [
  { id: "google", name: "Google" },
  { id: "github", name: "GitHub" },
] as const;

export function ProviderConnections({ onConnected }: { onConnected?: () => void }) {
  const user = useAuthStore((state) => state.user);
  const linkProviderToken = useAuthStore((state) => state.linkProviderToken);
  const [busyProvider, setBusyProvider] = useState<"google" | "github" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;
  const currentUser = user;
  const connected = new Set(currentUser.linked_providers ?? (currentUser.auth_provider ? [currentUser.auth_provider] : []));

  async function connect(provider: "google" | "github") {
    setBusyProvider(provider);
    setError(null);
    try {
      const firebaseUid = currentUser.firebase_uid;
      if (!firebaseUid) {
        throw new Error("Sign out and sign in again before connecting another provider.");
      }
      const { idToken } = await linkFirebaseProvider(provider, firebaseUid);
      await linkProviderToken(idToken, provider);
      onConnected?.();
    } catch (linkError) {
      setError(describeSignInError(linkError, provider === "github" ? "GitHub" : "Google"));
    } finally {
      setBusyProvider(null);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-canvas p-4" aria-label="Sign-in methods">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Link2 className="size-4" aria-hidden />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Sign-in methods</h3>
          <p className="mt-1 text-xs leading-5 text-muted">
            Optional, but recommended: connect another provider to access this same Kiungo account. We verify both sign-ins before linking.
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {PROVIDERS.map(({ id, name }) => {
          const isConnected = connected.has(id);
          const isBusy = busyProvider === id;
          return (
            <div key={id} className="flex min-h-10 items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                {id === "google" ? <GoogleLogo className="size-4" /> : <Code2 className="size-4" aria-hidden />}
                {name}
              </span>
              {isConnected ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                  <Check className="size-3.5" aria-hidden /> Connected
                </span>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={busyProvider !== null}
                  aria-busy={isBusy || undefined}
                  onClick={() => void connect(id)}
                >
                  {isBusy ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> : null}
                  Connect
                </Button>
              )}
            </div>
          );
        })}
      </div>
      {error ? <p role="alert" className="mt-3 text-xs leading-5 text-danger">{error}</p> : null}
    </section>
  );
}
