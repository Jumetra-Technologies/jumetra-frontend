"use client";

import { useRef, type KeyboardEvent } from "react";
import { VIEWS, type ViewId } from "@/lib/architecture/model";
import { cn } from "@/lib/utils";

/** Chronological stages: the Phase One plan, the code today, the Phase Two plan. */
export function ViewSwitch({ value, onChange }: { value: ViewId; onChange: (view: ViewId) => void }) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const delta = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = (index + delta + VIEWS.length) % VIEWS.length;
    onChange(VIEWS[next].id);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label="Development stage"
      className="flex w-full rounded-[12px] border border-border bg-muted-bg p-1 sm:inline-flex sm:w-auto"
    >
      {VIEWS.map((view, index) => {
        const checked = view.id === value;
        return (
          <button
            key={view.id}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(view.id)}
            onKeyDown={(event) => move(event, index)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-[9px] px-2.5 py-1.5 text-sm font-medium transition-colors sm:flex-none sm:px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]",
              checked ? "bg-surface text-foreground shadow-[var(--shadow-sm)]" : "text-muted hover:text-foreground",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "hidden size-5 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums sm:flex",
                checked ? "bg-primary text-primary-foreground" : "border border-border",
              )}
            >
              {index + 1}
            </span>
            {view.label}
          </button>
        );
      })}
    </div>
  );
}
