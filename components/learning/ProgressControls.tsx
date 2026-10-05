"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLearningProgress } from "@/components/learning/useLearningProgress";

/** Toggle shown at the end of a tutorial to mark it complete. */
export function MarkCompleteButton({ slug }: { slug: string }) {
  const { completed, setComplete } = useLearningProgress();
  const done = completed.has(slug);

  return (
    <Button
      type="button"
      variant={done ? "secondary" : "default"}
      onClick={() => setComplete(slug, !done)}
      aria-pressed={done}
    >
      {done ? <CheckCircle2 className="size-4" aria-hidden /> : <Circle className="size-4" aria-hidden />}
      {done ? "Completed (click to undo)" : "Mark module complete"}
    </Button>
  );
}

/** Small status marker for a module in a list. */
export function ModuleStatus({ slug }: { slug: string }) {
  const { completed } = useLearningProgress();
  const done = completed.has(slug);

  return done ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--success)]">
      <CheckCircle2 className="size-4" aria-hidden />
      Completed
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs text-muted">
      <Circle className="size-4" aria-hidden />
      Not started
    </span>
  );
}

/** Overall progress bar for the guided path. */
export function PathProgress({ slugs }: { slugs: string[] }) {
  const { completed } = useLearningProgress();
  const total = slugs.length;
  const done = slugs.filter((slug) => completed.has(slug)).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">Your progress</span>
        <span className="text-muted">
          {done} of {total} modules complete
        </span>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-muted-bg"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-label="Learning path progress"
      >
        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted">Progress is saved in this browser only.</p>
    </div>
  );
}
