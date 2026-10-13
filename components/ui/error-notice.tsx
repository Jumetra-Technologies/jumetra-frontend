import { AlertCircle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A short, plain error for people: what didn't happen and what to do next
 * (from describeError in lib/errors.ts). The details are logged for System
 * Diagnostics, never shown here.
 */
export function ErrorNotice({ message, onRetry, size = "md", className }: { message: string; onRetry?: () => void; size?: "sm" | "md"; className?: string }) {
  return (
    <div role="alert" className={cn("flex items-start gap-2 rounded-[10px] border border-danger/25 bg-danger/8 text-danger", size === "sm" ? "px-2.5 py-1.5 text-[12px] leading-5" : "px-3 py-2 text-sm leading-6", className)} data-testid="error-notice">
      <AlertCircle className={cn("shrink-0", size === "sm" ? "mt-0.5 size-3.5" : "mt-1 size-4")} aria-hidden />
      <p className="min-w-0 flex-1 text-foreground/90">{message}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="inline-flex shrink-0 items-center gap-1 self-center rounded-md px-1.5 py-0.5 text-xs font-medium text-danger hover:bg-danger/10">
          <RotateCcw className="size-3" aria-hidden /> Try again
        </button>
      ) : null}
    </div>
  );
}
