"use client";

/**
 * Where the Kiungo desktop app sends people to sign in (DSK-02). The app
 * opens /desktop/sign-in?code_id=…; here the person signs in as on the rest
 * of the website, checks it's their computer asking, and approves. The
 * browser then hands a one-time code back to the app through kiungo://signin.
 * The code is useless without a secret only the app holds (PKCE).
 */

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, Laptop, Loader2 } from "lucide-react";
import { Button } from "@kiungo/ui/button";
import { KiungoMark } from "@kiungo/ui/KiungoMark";
import { Skeleton, SkeletonRegion } from "@kiungo/ui/skeleton";
import { openAuth } from "@/lib/account-dialogs";
import { ApiError, api, type DesktopSignInDetails } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { describeError } from "@/lib/errors";

const PLATFORM: Record<DesktopSignInDetails["device"]["platform"], string> = { windows: "Windows", linux: "Linux", macos: "macOS" };

type Step = { kind: "loading" } | { kind: "ask"; details: DesktopSignInDetails } | { kind: "working"; details: DesktopSignInDetails } | { kind: "approved"; details: DesktopSignInDetails; link: string } | { kind: "denied"; details: DesktopSignInDetails } | { kind: "problem"; message: string };

/** The backend's own sentences for these are already written for people ("Start again from the app"). */
/** A link that opens the Kiungo desktop app (kiungo://), and nothing else. */
export function isAppLink(link: string): boolean {
  try {
    return new URL(link).protocol === "kiungo:";
  } catch {
    return false;
  }
}

function explain(err: unknown, whatFailed: string): string {
  if (err instanceof ApiError && (err.status === 404 || err.status === 409) && err.detail) return err.detail;
  return describeError(err, whatFailed);
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6 py-12" data-testid="desktop-sign-in">
      <div className="w-full max-w-[420px] rounded-[20px] border border-border bg-surface p-8 text-center shadow-[var(--shadow-sm)]">{children}</div>
    </main>
  );
}

/** The question's shape while it loads: icon, heading, two lines, two buttons. */
export function DesktopSignInSkeleton() {
  return (
    <Frame>
      <SkeletonRegion label="Loading the sign-in" className="flex flex-col items-center">
        <Skeleton className="size-12 rounded-full" />
        <Skeleton className="mt-5 h-6 w-64" />
        <Skeleton className="mt-3 h-4 w-72" />
        <Skeleton className="mt-2 h-4 w-56" />
        <Skeleton className="mt-6 h-9 w-full rounded-[12px]" />
        <Skeleton className="mt-2 h-9 w-full rounded-[12px]" />
      </SkeletonRegion>
    </Frame>
  );
}

export function DesktopSignIn({ codeId }: { codeId: string | null }) {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const logout = useAuthStore((s) => s.logout);
  const [step, setStep] = useState<Step>({ kind: "loading" });

  const load = useCallback(async () => {
    if (!codeId) return;
    try {
      const details = await api.getDesktopSignIn(codeId);
      if (details.status === "pending") setStep({ kind: "ask", details });
      else if (details.status === "expired") setStep({ kind: "problem", message: "This sign-in link has expired. Choose Sign in in Kiungo on your computer to get a new one." });
      else setStep({ kind: "problem", message: "This sign-in has already been answered. If Kiungo on your computer isn't signed in, choose Sign in there again." });
    } catch (err) {
      setStep({ kind: "problem", message: explain(err, "Couldn't load this sign-in.") });
    }
  }, [codeId]);

  useEffect(() => {
    if (!user || !codeId) return;
    // On the next tick, so the first paint isn't redone.
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [user, codeId, load]);

  const approve = async (details: DesktopSignInDetails) => {
    setStep({ kind: "working", details });
    try {
      const { redirect_url } = await api.approveDesktopSignIn(details.code_id);
      // Only ever hand the browser to the app: a server answer naming any other address
      // (https://, javascript:) is refused (audit WEB-007).
      if (!isAppLink(redirect_url)) throw new Error("The sign-in answer didn't point back to the Kiungo app.");
      setStep({ kind: "approved", details, link: redirect_url });
      // Hand the code to the app. If the browser asks first, the button below does the same.
      window.location.href = redirect_url;
    } catch (err) {
      setStep({ kind: "problem", message: explain(err, "Couldn't sign Kiungo in on your computer.") });
    }
  };

  const deny = async (details: DesktopSignInDetails) => {
    setStep({ kind: "working", details });
    try {
      await api.denyDesktopSignIn(details.code_id);
      setStep({ kind: "denied", details });
    } catch (err) {
      setStep({ kind: "problem", message: explain(err, "Couldn't cancel the sign-in.") });
    }
  };

  if (!codeId) {
    return (
      <Frame>
        <KiungoMark className="mx-auto size-12" />
        <h1 className="mt-5 text-xl font-semibold">Sign in from the Kiungo app</h1>
        <p className="mt-2 text-sm leading-6 text-muted">Open Kiungo on your computer and choose Sign in. It brings you to this page with everything it needs.</p>
      </Frame>
    );
  }

  if (isLoading) return <DesktopSignInSkeleton />;

  if (!user) {
    return (
      <Frame>
        <KiungoMark className="mx-auto size-12" />
        <h1 className="mt-5 text-xl font-semibold">Sign in to Kiungo on your computer</h1>
        <p className="mt-2 text-sm leading-6 text-muted">Sign in with Google or GitHub here. Then you&apos;ll confirm it&apos;s your computer asking, and Kiungo opens signed in.</p>
        <Button className="mt-6" onClick={() => openAuth("login")} data-testid="desktop-sign-in-login">
          Sign in
        </Button>
      </Frame>
    );
  }

  const who = (
    <p className="mt-6 text-[12.5px] text-muted">
      Signed in as {user.email}.{" "}
      <button
        type="button"
        className="font-medium text-primary hover:underline"
        onClick={() => {
          logout();
          openAuth("login");
        }}
      >
        Use another account
      </button>
    </p>
  );

  if (step.kind === "loading") return <DesktopSignInSkeleton />;

  if (step.kind === "problem") {
    return (
      <Frame>
        <AlertTriangle className="mx-auto size-8 text-warning" aria-hidden />
        <h1 className="mt-4 text-lg font-semibold">This sign-in didn&apos;t work</h1>
        <p role="alert" className="mt-2 text-sm leading-6 text-muted">
          {step.message}
        </p>
      </Frame>
    );
  }

  const { details } = step;
  const computer = `${details.device.name} (${PLATFORM[details.device.platform] ?? details.device.platform})`;

  if (step.kind === "approved") {
    return (
      <Frame>
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-success">
          <Check className="size-6" aria-hidden />
        </span>
        <h1 className="mt-5 text-xl font-semibold">You&apos;re signed in on {details.device.name}</h1>
        <p className="mt-2 text-sm leading-6 text-muted">Go back to Kiungo; it carries on by itself. You can close this tab.</p>
        <Button variant="secondary" className="mt-6" onClick={() => {
          if (isAppLink(step.link)) window.location.href = step.link;
        }} data-testid="desktop-sign-in-open-app">
          Open Kiungo
        </Button>
      </Frame>
    );
  }

  if (step.kind === "denied") {
    return (
      <Frame>
        <h1 className="text-xl font-semibold">Cancelled</h1>
        <p className="mt-2 text-sm leading-6 text-muted">Kiungo on {computer} isn&apos;t signed in. You can close this tab.</p>
      </Frame>
    );
  }

  const working = step.kind === "working";
  return (
    <Frame>
      <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent text-primary">
        <Laptop className="size-6" aria-hidden />
      </span>
      <h1 className="mt-5 text-xl font-semibold">Sign in to Kiungo on {details.device.name}?</h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        Kiungo {details.device.app_version ? `${details.device.app_version} ` : ""}on {computer} is asking to use your account. Only continue if you just chose Sign in in Kiungo on that computer.
      </p>
      <div className="mt-6 flex flex-col gap-2">
        <Button onClick={() => void approve(details)} disabled={working} data-testid="desktop-sign-in-approve">
          {working ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Yes, sign in
        </Button>
        <Button variant="ghost" onClick={() => void deny(details)} disabled={working} data-testid="desktop-sign-in-deny">
          It wasn&apos;t me
        </Button>
      </div>
      {who}
    </Frame>
  );
}
