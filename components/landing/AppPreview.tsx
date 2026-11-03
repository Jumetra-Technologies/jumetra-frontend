"use client";

import Image from "next/image";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { DESKTOP, type DesktopMoment } from "@/lib/landing/content";

/**
 * The desktop app, one moment at a time: four screenshots of the real app
 * behind a row of tabs, each with the sentence that explains it. Arrow keys
 * move between tabs, the way the app's own tabs work.
 */
export function AppPreview({ moments = DESKTOP.moments }: { moments?: readonly DesktopMoment[] }) {
  const [active, setActive] = useState(0);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const baseId = useId();
  const current = moments[active];

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : e.key === "Home" ? -active : e.key === "End" ? moments.length - 1 - active : 0;
    if (!step) return;
    e.preventDefault();
    const next = (active + step + moments.length) % moments.length;
    setActive(next);
    tabs.current[next]?.focus();
  };

  return (
    <div className="rounded-[22px] bg-background p-2.5 sm:p-4" data-testid="app-preview">
      <div role="tablist" aria-label="What the desktop app does" onKeyDown={onKey} className="-mb-px flex flex-wrap gap-x-1 gap-y-0.5 px-1 pb-2 sm:gap-x-2">
        {moments.map((moment, index) => {
          const selected = index === active;
          return (
            <button
              key={moment.id}
              ref={(el) => {
                tabs.current[index] = el;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${moment.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(index)}
              className={cn(
                "shrink-0 whitespace-nowrap border-b-2 px-2.5 py-2 text-[13.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-t-[6px]",
                selected ? "border-primary text-foreground" : "border-transparent text-muted hover:text-foreground",
              )}
              data-testid={`preview-tab-${moment.id}`}
            >
              {moment.label}
            </button>
          );
        })}
      </div>
      <div id={`${baseId}-panel`} role="tabpanel" aria-labelledby={`${baseId}-tab-${current.id}`} className="mt-2">
        {/* The window: the app at 1280 × 820, drawn at the width it has here. Remounted per tab, so each image fades in once. */}
        <div key={current.id} className="hhip-preview-swap overflow-hidden rounded-[12px] border border-border bg-surface shadow-[var(--shadow-md)]">
          <Image
            src={current.src}
            alt={current.caption}
            width={2560}
            height={1640}
            sizes="(min-width: 1180px) 1040px, calc(100vw - 56px)"
            placeholder="blur"
            blurDataURL={current.blur}
            className="block h-auto w-full"
            data-testid="preview-image"
          />
        </div>
        <p className="mt-3 max-w-[64ch] px-1 text-[14px] leading-6 text-muted" data-testid="preview-caption">
          {current.caption}
        </p>
      </div>
    </div>
  );
}
