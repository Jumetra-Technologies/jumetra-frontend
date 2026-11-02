import { DESKTOP } from "@/lib/landing/content";
import type { Release } from "@/lib/releases";
import { cn } from "@/lib/utils";
import { AppPreview } from "./AppPreview";
import { DownloadBlock } from "./DownloadBlock";

/**
 * The end of the story: the desktop app, with its download and the app
 * itself in screenshots (sprint 11). A band of its own between the beats and
 * the footer, on the surface color so it reads as the release, not another
 * beat. `release` is the newest one the server found, or null before the
 * first is published.
 */
export function DesktopRelease({ release, className }: { release: Release | null; className?: string }) {
  return (
    <section id="desktop" aria-labelledby="desktop-heading" className={cn("scroll-mt-6 border-y border-border bg-surface", className)} data-testid="desktop-release">
      <div className="mx-auto grid w-full max-w-[1120px] gap-10 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:gap-x-14 lg:gap-y-16 lg:px-10 lg:py-24">
        <div>
          <h2 id="desktop-heading" className="text-3xl font-bold leading-[1.08] tracking-[-0.03em] text-foreground sm:text-4xl lg:text-[2.75rem]">
            {DESKTOP.heading.split("\n").map((line, index, lines) => (
              <span key={line} className="md:block">
                {line}
                {index < lines.length - 1 ? " " : null}
              </span>
            ))}
          </h2>
          <p className="mt-5 max-w-[52ch] text-lg leading-8 text-muted">{DESKTOP.lead}</p>
        </div>
        {/* On a phone the app comes before the download: there's nothing to install there, and the preview is the point. */}
        <div className="order-last lg:order-none lg:pt-2">
          <DownloadBlock release={release} />
        </div>
        <div className="lg:col-span-2">
          <AppPreview />
        </div>
      </div>
    </section>
  );
}
