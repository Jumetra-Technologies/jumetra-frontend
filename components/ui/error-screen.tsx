"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { KiungoMark } from "@/components/brand/KiungoMark";
import { Button } from "@/components/ui/button";
import { recordError } from "@/lib/diagnostics/store";

/**
 * A page that broke while drawing: a short message, what to do, and a
 * reference to quote. The error itself goes to System Diagnostics.
 */
export function ErrorScreen({
  error,
  retry,
  title = "Something went wrong",
  body = "This page hit a problem and couldn't finish loading. We've logged it so the team can fix it.",
  retryLabel = "Try again",
  secondary = { href: "/", label: "Go home" },
  testId = "error-screen",
}: {
  error: Error & { digest?: string };
  retry: () => void;
  title?: string;
  body?: string;
  retryLabel?: string;
  secondary?: { href: string; label: string };
  testId?: string;
}) {
  const [reference, setReference] = useState<string | null>(null);
  useEffect(() => {
    const entry = recordError({ source: "render", message: error.message || "Render error", detail: [error.digest ? `digest ${error.digest}` : "", error.stack ?? ""].filter(Boolean).join("\n"), shown: title });
    // Logging is a side effect of showing this screen; the reference is what people quote to the team.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReference(error.digest ?? entry.id);
  }, [error, title]);

  return (
    <div role="alert" className="flex min-h-[70svh] flex-col items-center justify-center px-6 text-center" data-testid={testId}>
      <KiungoMark state="broken" className="size-16" title="Kiungo mark with its two links pulled apart" />
      <h1 className="mt-6 text-xl font-semibold tracking-tight text-foreground">{title}</h1>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted">{body}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button onClick={() => retry()}>{retryLabel}</Button>
        <Link href={secondary.href} className="inline-flex h-9 items-center rounded-[10px] border border-border bg-surface px-4 text-sm font-medium text-foreground hover:bg-muted-bg">
          {secondary.label}
        </Link>
      </div>
      {reference ? <p className="mt-6 font-mono text-[11px] text-muted">Reference {reference}</p> : null}
    </div>
  );
}
