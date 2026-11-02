"use client";

import { useSyncExternalStore } from "react";
import { Download } from "lucide-react";
import { Button } from "@kiungo/ui/button";
import { detectPlatform, fileLabel, formatSize, PLATFORM_NAMES, primaryFile, type Release, type ReleaseFile, type ReleasePlatform } from "@/lib/releases";

const subscribe = () => () => undefined;
/** The visitor's computer, read after hydration so the server's page matches the first render. */
function useVisitorPlatform() {
  return useSyncExternalStore(
    subscribe,
    () => navigator.userAgent,
    () => "",
  );
}

/**
 * The download for this computer first, then every installer. A phone or an
 * unknown system sees the full list only, with no guess.
 */
export function DownloadPicker({ release }: { release: Release }) {
  const ua = useVisitorPlatform();
  const visitor = ua ? detectPlatform(ua) : null;
  const main = visitor ? primaryFile(release.files, visitor.platform, visitor.arch) : null;
  const platforms = (["windows", "macos", "linux"] as ReleasePlatform[]).filter((p) => release.files.some((f) => f.platform === p));

  return (
    <div data-testid="download-picker">
      {main ? (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <a href={main.url} className="inline-flex" data-testid="download-main">
            <Button size="lg" className="h-12 px-7 text-[15px]">
              <Download className="size-4" aria-hidden />
              Download for {PLATFORM_NAMES[main.platform]}
            </Button>
          </a>
          <span className="text-sm text-muted">
            {fileLabel(main)} · {formatSize(main.size)}
          </span>
        </div>
      ) : (
        <p className="max-w-[56ch] text-[15px] leading-7 text-muted">{ua ? "Kiungo runs on Windows, macOS and Linux computers. Pick the one you'll use below." : "Pick your computer below."}</p>
      )}

      <div className="mt-12 grid gap-8 sm:grid-cols-3">
        {platforms.map((platform) => (
          <section key={platform} aria-labelledby={`dl-${platform}`}>
            <h2 id={`dl-${platform}`} className="text-lg font-semibold text-foreground">
              {PLATFORM_NAMES[platform]}
            </h2>
            <ul className="mt-3 space-y-2">
              {release.files
                .filter((f) => f.platform === platform)
                .map((f) => (
                  <FileRow key={`${f.arch}-${f.kind}`} file={f} />
                ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function FileRow({ file }: { file: ReleaseFile }) {
  return (
    <li>
      <a href={file.url} className="group block rounded-[10px] border border-border px-3.5 py-2.5 transition-colors hover:border-primary" data-testid="download-file">
        <span className="block text-[14px] font-medium text-foreground group-hover:text-primary">{fileLabel(file)}</span>
        <span className="block text-[12.5px] text-muted">{formatSize(file.size)}</span>
      </a>
      <details className="mt-1 px-1">
        <summary className="cursor-pointer text-[12px] text-muted hover:text-foreground">Checksum</summary>
        <p className="mt-1 break-all font-mono text-[11px] leading-4 text-muted">SHA-512 (base64): {file.sha512}</p>
      </details>
    </li>
  );
}
