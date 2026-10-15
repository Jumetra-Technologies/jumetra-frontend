"use client";

import { cn } from "@/lib/utils";

export type UploadOutcome = "idle" | "running" | "flashed" | "simulated" | "failed";

/** The upload bar. A simulated upload says so instead of claiming the board was flashed. */
export function UploadProgress({ percent, message, outcome }: { percent: number; message?: string; outcome: UploadOutcome }) {
  const label = { idle: "Not uploaded yet", running: "Uploading…", flashed: "On the board", simulated: "Simulated", failed: "Failed" }[outcome];
  return (
    <div className="rounded-[10px] border border-border bg-surface p-2.5 text-[12px]" data-testid="upload-progress" data-outcome={outcome}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="font-medium text-foreground">Upload</span>
        <span className={cn("rounded-full px-2 py-px text-[11px] font-semibold", outcome === "flashed" ? "bg-success/12 text-success" : outcome === "simulated" ? "bg-warning/15 text-warning" : outcome === "failed" ? "bg-danger/12 text-danger" : "bg-muted-bg text-muted")}>{label}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded bg-muted-bg">
        <div
          className={cn("h-full transition-all", outcome === "failed" ? "bg-danger" : outcome === "simulated" ? "bg-warning" : outcome === "flashed" ? "bg-success" : "bg-primary")}
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
      {message ? <p className="mt-1.5 text-[11.5px] leading-4 text-muted">{message}</p> : null}
    </div>
  );
}
