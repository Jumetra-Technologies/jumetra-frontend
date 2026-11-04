"use client";

import Link from "next/link";
import { CircleCheck, Download } from "lucide-react";
import { Button } from "@kiungo/ui/button";
import { DESKTOP, HYBRID } from "@/lib/landing/content";
import { PLATFORM_NAMES, primaryFile, type Release } from "@/lib/releases";
import { FileAnchor } from "./DownloadBlock";
import { useDownload } from "./DownloadProvider";
import { useVisitor } from "./use-visitor";

/**
 * The hybrid beat's call to action. With a release out and a computer the
 * app runs on, it downloads the installer right here; otherwise it goes to
 * the release section, which says what's what.
 */
export function DesktopCta({ release }: { release: Release | null }) {
  const { visitor } = useVisitor();
  const dl = useDownload();
  const file = release && visitor ? primaryFile(release.files, visitor.platform, visitor.arch) : null;
  const state = dl?.state;
  const running = state?.phase === "downloading";
  const pct = running && state.total ? Math.min(100, Math.floor((state.received / state.total) * 100)) : null;
  const downloaded = Boolean(file) && dl?.downloaded?.url === file?.url;

  if (!file) {
    return (
      <Link href={HYBRID.cta.href} className="inline-flex" data-testid="hybrid-cta">
        <Button size="lg" className="h-12 px-7 text-[15px]">
          {HYBRID.cta.label}
        </Button>
      </Link>
    );
  }
  return (
    <FileAnchor file={file} className="inline-flex" testId="hybrid-cta">
      <Button size="lg" variant={downloaded ? "success" : "default"} className="h-12 px-7 text-[15px]" aria-busy={running} tabIndex={-1} data-state={downloaded ? "downloaded" : running ? "downloading" : "ready"}>
        {downloaded ? <CircleCheck className="size-4" aria-hidden /> : <Download className="size-4" aria-hidden />}
        {downloaded ? DESKTOP.download.status.downloaded : running ? DESKTOP.download.status.button(pct) : DESKTOP.download.label(PLATFORM_NAMES[file.platform])}
      </Button>
    </FileAnchor>
  );
}
