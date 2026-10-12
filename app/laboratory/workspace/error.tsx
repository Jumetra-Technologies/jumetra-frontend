"use client";

import Link from "next/link";
import { useEffect } from "react";
import { KiungoMark } from "@/components/brand/KiungoMark";
import { Button } from "@/components/ui/button";

/**
 * If something in the lab throws, show this instead of the browser's blank
 * "page couldn't load". Sessions are saved in this browser as you work, so
 * reopening the lab brings the work back.
 */
export default function LabError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error("Engineering Lab crashed:", error);
  }, [error]);

  return (
    <div role="alert" className="flex min-h-[70svh] flex-col items-center justify-center px-6 text-center" data-testid="lab-error">
      <KiungoMark state="broken" className="size-16" title="Kiungo mark with its two links pulled apart" />
      <h1 className="mt-6 text-xl font-semibold tracking-tight text-foreground">The lab hit a snag</h1>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted">
        Something went wrong while drawing the canvas. Your session is saved in this browser, so reopening the lab brings it back.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button onClick={() => retry()}>Reopen the lab</Button>
        <Link href="/workspace" className="inline-flex h-9 items-center rounded-[10px] border border-border bg-surface px-4 text-sm font-medium text-foreground hover:bg-muted-bg">
          Go to Projects
        </Link>
      </div>
      {error.digest ? <p className="mt-6 font-mono text-[11px] text-muted">Reference {error.digest}</p> : null}
    </div>
  );
}
