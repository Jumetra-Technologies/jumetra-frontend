"use client";

import type { ReactNode } from "react";
import { CloudOff, LockKeyhole } from "lucide-react";
import { openAuth } from "@/lib/account-dialogs";
import { Button } from "@kiungo/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Kiungo's pages work without an account. Two things tell a signed-out
 * visitor where an account matters, and each has one button to sign in.
 *
 * SignInNotice is a quiet band across a page that is fully usable: it says
 * what isn't being saved. SignInPrompt stands in for the few things that
 * only exist on an account, like a project saved to one.
 */
export function SignInNotice({ children, action = "Sign in to save", className, testId = "sign-in-notice" }: { children: ReactNode; action?: string; className?: string; testId?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-border bg-[var(--accent)] px-4 py-3 text-sm text-foreground", className)} data-testid={testId}>
      <p className="flex min-w-0 flex-1 items-start gap-2">
        <CloudOff className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
        <span className="min-w-0">{children}</span>
      </p>
      <Button size="sm" onClick={() => openAuth("login")}>
        {action}
      </Button>
    </div>
  );
}

export function SignInPrompt({ title, children, action = "Sign in", footer }: { title: string; children: ReactNode; action?: string; footer?: ReactNode }) {
  return (
    <div data-testid="sign-in-prompt">
      <Card className="mx-auto my-12 max-w-lg p-8 text-center">
        <LockKeyhole className="mx-auto size-8 text-primary" aria-hidden />
        <h1 className="mt-4 text-xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted">{children}</p>
        <Button className="mt-5" onClick={() => openAuth("login")}>
          {action}
        </Button>
        {footer ? <div className="mt-4 text-sm">{footer}</div> : null}
      </Card>
    </div>
  );
}
