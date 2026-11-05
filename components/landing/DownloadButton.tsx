"use client";

import { CircleCheck, Download } from "lucide-react";

import { Button } from "@kiungo/ui/button";
import { DESKTOP } from "@/lib/landing/content";
import { cn } from "@/lib/utils";

/**
 * The download button in its three states. While downloading it fills with
 * the brand teal from left to right as the file arrives, over a light gray
 * track: at 1% it's almost all gray, at 50% half and half, at 99% all teal.
 * The label is drawn twice, dark on the track and white on the fill, and
 * clipped at the fill's edge, so it reads the same wherever the edge is.
 */
export function DownloadButton({
  state,
  percent,
  label,
  className,
}: {
  state: "ready" | "downloading" | "downloaded";
  /** 1 to 99 while downloading, or null when the size isn't known yet. */
  percent: number | null;
  label: string;
  className?: string;
}) {
  if (state !== "downloading") {
    return (
      <Button size="lg" variant={state === "downloaded" ? "success" : "default"} className={className} tabIndex={-1} data-state={state}>
        {state === "downloaded" ? <CircleCheck className="size-4" aria-hidden /> : <Download className="size-4" aria-hidden />}
        {state === "downloaded" ? DESKTOP.download.status.downloaded : label}
      </Button>
    );
  }

  const text = DESKTOP.download.status.button(percent);
  const fill = percent ?? 0;
  const content = (
    <>
      <Download className="size-4" aria-hidden />
      {text}
    </>
  );
  return (
    <Button
      size="lg"
      className={cn(
        "relative overflow-hidden border border-[color-mix(in_srgb,var(--foreground)_14%,transparent)] bg-[color-mix(in_srgb,var(--foreground)_6%,var(--surface))] text-foreground shadow-none hover:bg-[color-mix(in_srgb,var(--foreground)_6%,var(--surface))]",
        className,
      )}
      tabIndex={-1}
      aria-busy
      data-state="downloading"
      data-percent={percent ?? undefined}
    >
      {/* The fill, growing left to right. */}
      <span
        aria-hidden
        data-testid="download-fill"
        className="hhip-download-fill absolute inset-y-0 left-0 transition-[width] duration-300 ease-out motion-reduce:transition-none"
        style={{ width: `${fill}%` }}
      />
      {/* The dark label for the gray part. */}
      <span className="relative inline-flex items-center gap-2">{content}</span>
      {/* The same label in white, shown only over the fill. */}
      <span
        aria-hidden
        className="hhip-download-fill-text absolute inset-0 inline-flex items-center justify-center gap-2 transition-[clip-path] duration-300 ease-out motion-reduce:transition-none"
        style={{ clipPath: `inset(0 ${100 - fill}% 0 0)` }}
      >
        {content}
      </span>
    </Button>
  );
}
