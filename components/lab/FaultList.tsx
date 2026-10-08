"use client";

import { AlertOctagon, AlertTriangle, CheckCircle2, Lightbulb } from "lucide-react";
import type { Fault, Severity } from "@/lib/lab/circuit";
import { cn } from "@/lib/utils";
import { useLabContext } from "./lab-context";

export const SEVERITY_ICON: Record<Severity, typeof AlertOctagon> = { error: AlertOctagon, warning: AlertTriangle, tip: Lightbulb };
export const SEVERITY_TEXT: Record<Severity, string> = { error: "text-danger", warning: "text-warning", tip: "text-primary" };

/** Problems the analysis found, each a button that jumps to the part. */
export function FaultList({ faults, compact = false, empty }: { faults: Fault[]; compact?: boolean; empty?: string }) {
  const { session, focusNode, select } = useLabContext();
  if (!faults.length) {
    return (
      <p className="flex items-center gap-2 rounded-[10px] bg-success/10 px-3 py-2.5 text-[13px] text-success" data-testid="no-faults">
        <CheckCircle2 className="size-4 shrink-0" aria-hidden />
        {empty ?? (session.nodes.length ? "No problems found. Every wired part checks out." : "Add parts to check the circuit.")}
      </p>
    );
  }
  return (
    <ul className="space-y-1.5" data-testid="fault-list">
      {faults.map((f) => {
        const Icon = SEVERITY_ICON[f.severity];
        const names = f.nodes.map((id) => session.nodes.find((n) => n.id === id)?.label).filter(Boolean);
        return (
          <li key={f.id}>
            <button
              type="button"
              onClick={() => {
                if (f.nodes[0]) {
                  focusNode(f.nodes[0]);
                  select([f.nodes[0]], null);
                }
              }}
              className={cn(
                "w-full rounded-[10px] border px-3 py-2 text-left transition-colors hover:bg-muted-bg",
                f.severity === "error" ? "border-danger/30" : f.severity === "warning" ? "border-warning/30" : "border-border",
              )}
              data-severity={f.severity}
            >
              <span className="flex items-start gap-2">
                <Icon className={cn("mt-0.5 size-4 shrink-0", SEVERITY_TEXT[f.severity])} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium leading-5 text-foreground">{f.title}</span>
                  {!compact ? <span className="mt-0.5 block text-[12px] leading-[1.45] text-muted">{f.detail}</span> : null}
                  {names.length ? <span className="mt-1 block truncate text-[11px] font-medium text-muted">{names.join(" · ")}</span> : null}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
