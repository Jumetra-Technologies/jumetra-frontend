"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { SYSTEM_ROUTE, makeClickCounter, unlock } from "@/lib/diagnostics/access";
import { cn } from "@/lib/utils";

/**
 * A small Arduino turning slowly beside the version number. It looks like
 * decoration. Seven quick clicks open System Diagnostics (administrators know).
 */
export function SpinningBoard({ onOpen, className }: { onOpen?: () => void; className?: string }) {
  const router = useRouter();
  const count = useRef(makeClickCounter());
  return (
    <button
      type="button"
      onClick={() => {
        if (!count.current()) return;
        unlock();
        onOpen?.();
        router.push(SYSTEM_ROUTE);
      }}
      aria-label="Kiungo board"
      className={cn("group inline-flex size-6 items-center justify-center rounded-md [perspective:120px] focus-visible:outline-2 focus-visible:outline-primary", className)}
      data-testid="spinning-board"
    >
      <svg viewBox="0 0 34 24" className="h-4 w-[22px] motion-safe:animate-[kiungo-board-spin_6s_linear_infinite] [transform-style:preserve-3d]" aria-hidden>
        <rect x="0.5" y="0.5" width="33" height="23" rx="2.5" fill="#0e7a74" stroke="#0a5a55" />
        <rect x="2" y="8" width="7" height="8" rx="0.8" fill="#c7cdd4" />
        <rect x="13" y="9" width="13" height="5" rx="0.6" fill="#1d2026" />
        <rect x="11" y="2" width="20" height="2" rx="0.5" fill="#1d2026" />
        <rect x="14" y="20" width="16" height="2" rx="0.5" fill="#1d2026" />
        <circle cx="30" cy="12" r="1" fill="#7dffa6" />
      </svg>
    </button>
  );
}
