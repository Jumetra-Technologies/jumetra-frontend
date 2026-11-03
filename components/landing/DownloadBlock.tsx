"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ChevronRight, Download } from "lucide-react";
import { Button } from "@kiungo/ui/button";
import { DESKTOP } from "@/lib/landing/content";
import { detectPlatform, fileLabel, fileName, formatSize, PLATFORM_NAMES, primaryFile, type Release, type ReleaseFile, type ReleasePlatform } from "@/lib/releases";

const subscribe = () => () => undefined;
/** The visitor's browser, read after hydration so the first paint matches the server's. */
const useUserAgent = () =>
  useSyncExternalStore(
    subscribe,
    () => navigator.userAgent,
    () => "",
  );

const ORDER: ReleasePlatform[] = ["windows", "macos", "linux"];

/**
 * The download: one button for this computer, every installer under it, and
 * what to expect from a beta build. On a phone there's no button to press,
 * only the list, since the app runs on computers.
 */
export function DownloadBlock({ release }: { release: Release | null }) {
  const ua = useUserAgent();
  const visitor = ua ? detectPlatform(ua) : null;
  const phone = Boolean(ua) && !visitor;

  if (!release) {
    return (
      <div className="max-w-[56ch]" data-testid="desktop-download" data-state="none">
        <p className="text-[15px] leading-7 text-muted">{DESKTOP.download.none}</p>
        <Link href={DESKTOP.download.noneCta.href} className="mt-4 inline-flex">
          <Button size="lg" variant="secondary" className="h-12 px-6 text-[15px]">
            {DESKTOP.download.noneCta.label}
          </Button>
        </Link>
      </div>
    );
  }

  // Before the browser says, and for anyone who never runs the script: the Windows installer, which most students need.
  const main = visitor ? primaryFile(release.files, visitor.platform, visitor.arch) : primaryFile(release.files, "windows") ?? release.files[0];
  const label = visitor && main ? DESKTOP.download.label(PLATFORM_NAMES[main.platform]) : DESKTOP.download.generic;
  const beta = release.channel === "beta";
  const platforms = ORDER.filter((p) => release.files.some((f) => f.platform === p));

  return (
    <div data-testid="desktop-download" data-state={phone ? "phone" : visitor ? "detected" : "pending"}>
      {phone ? (
        <p className="max-w-[52ch] text-[15px] leading-7 text-muted">{DESKTOP.download.phones}</p>
      ) : main ? (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <a href={main.url} className="inline-flex" data-testid="download-main">
            <Button size="lg" className="h-12 min-w-[15.5rem] px-7 text-[15px]">
              <Download className="size-4" aria-hidden />
              {label}
            </Button>
          </a>
          <span className="font-mono text-xs leading-5 text-muted" data-testid="download-main-file">
            {fileName(main)}
            {main.size ? ` · ${formatSize(main.size)}` : ""}
          </span>
        </div>
      ) : null}

      <p className="mt-4 text-[14px] leading-6 text-muted">
        Version {release.version}
        {beta ? " beta" : ""}
        {release.published_at ? `, ${new Date(release.published_at).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}` : ""}. For Windows, macOS and Linux.
      </p>

      <details className="group mt-3" data-testid="download-all">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-[8px] text-[14px] font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] [&::-webkit-details-marker]:hidden">
          <ChevronRight aria-hidden className="size-4 transition-transform group-open:rotate-90" />
          {DESKTOP.download.all} ({release.files.length})
        </summary>
        <div className="mt-3 grid gap-x-8 gap-y-5 sm:grid-cols-3">
          {platforms.map((platform) => (
            <div key={platform}>
              <h3 className="text-[13px] font-semibold text-foreground">{PLATFORM_NAMES[platform]}</h3>
              <ul className="mt-1.5 space-y-1.5">
                {release.files
                  .filter((f) => f.platform === platform)
                  .map((f) => (
                    <FileLink key={f.url} file={f} />
                  ))}
              </ul>
            </div>
          ))}
        </div>
        {release.releaseUrl ? (
          <p className="mt-3 text-[12.5px] text-muted">
            Checksums and release notes are on{" "}
            <a href={release.releaseUrl} className="text-foreground underline underline-offset-4" target="_blank" rel="noopener noreferrer">
              the release page
            </a>
            .
          </p>
        ) : null}
      </details>

      <div className="mt-5 max-w-[60ch] text-[13.5px] leading-6 text-muted" data-testid="download-notes">
        {beta ? <p data-testid="download-beta">{DESKTOP.download.beta}</p> : null}
        <div className="mt-1.5 flex flex-wrap gap-x-6 gap-y-1">
          {beta ? <Disclosure title={DESKTOP.download.howToOpen} items={DESKTOP.download.steps.map(([system, step]) => ({ lead: system, text: step }))} /> : null}
          <Disclosure title={DESKTOP.download.needsTitle} items={DESKTOP.download.needs.map((text) => ({ text }))} />
        </div>
      </div>
    </div>
  );
}

/** A short list behind one line, so the block stays small until someone wants the detail. */
function Disclosure({ title, items }: { title: string; items: Array<{ lead?: string; text: string }> }) {
  return (
    <details className="group/d min-w-0 basis-full">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] [&::-webkit-details-marker]:hidden">
        <ChevronRight aria-hidden className="size-3.5 transition-transform group-open/d:rotate-90" />
        {title}
      </summary>
      <ul className="mt-1.5 space-y-1 pl-4.5">
        {items.map((item) => (
          <li key={item.text}>
            {item.lead ? <span className="font-medium text-foreground">{item.lead}: </span> : null}
            {item.text}
          </li>
        ))}
      </ul>
    </details>
  );
}

function FileLink({ file }: { file: ReleaseFile }) {
  return (
    <li>
      <a href={file.url} className="group/file block rounded-[6px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]" data-testid="download-file">
        <span className="text-[13.5px] text-foreground underline-offset-4 group-hover/file:underline">{fileLabel(file)}</span>
        {file.size ? <span className="ml-1.5 font-mono text-[11.5px] text-muted">{formatSize(file.size)}</span> : null}
      </a>
    </li>
  );
}
