"use client";

import type { ReactNode } from "react";
import { LockKeyhole } from "lucide-react";
import { openAuth } from "@/lib/account-dialogs";
import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function SignInRequired({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);

  if (isLoading) {
    return <p role="status" className="py-12 text-center text-sm text-muted">Checking your sign-in…</p>;
  }
  if (!isAuthenticated) {
    return (
      <Card className="mx-auto my-12 max-w-lg p-8 text-center">
        <LockKeyhole className="mx-auto size-8 text-primary" aria-hidden />
        <h1 className="mt-4 text-xl font-semibold">Sign in to continue</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Sign in to create and access projects saved to your account.
        </p>
        <Button className="mt-5" onClick={() => openAuth("login")}>Sign in</Button>
      </Card>
    );
  }

  return children;
}
