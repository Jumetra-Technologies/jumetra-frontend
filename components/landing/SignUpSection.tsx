"use client";

import Link from "next/link";
import { GoogleSignInButton } from "@/components/auth/google-signin-button";
import { Button } from "@/components/ui/button";
import { SIGN_UP } from "@/lib/landing/content";
import { useAuthStore } from "@/lib/auth-store";

export function SignUpSection() {
  const { user, isAuthenticated, isLoading, logout } = useAuthStore();

  if (isAuthenticated && user) {
    return (
      <div data-testid="signup" className="max-w-md">
        <p className="text-lg leading-7 text-foreground">
          Welcome back, <span className="font-semibold">{user.display_name}</span>.
        </p>
        <p className="mt-2 text-base leading-7 text-muted">{SIGN_UP.signedInBody}</p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link href={SIGN_UP.cta.href}>
            <Button size="lg">{SIGN_UP.cta.label}</Button>
          </Link>
          <button type="button" onClick={logout} className="text-sm font-medium text-muted underline-offset-4 hover:text-foreground hover:underline">
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="signup" className="max-w-md">
      <p className="text-base leading-7 text-muted">{SIGN_UP.body}</p>
      <div className="mt-6 max-w-xs">
        <GoogleSignInButton disabled={isLoading} />
      </div>
      <p className="mt-3 text-xs leading-5 text-muted">
        {SIGN_UP.fineprint}{" "}
        <Link href="/legal/privacy" className="underline underline-offset-4 hover:text-foreground">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
