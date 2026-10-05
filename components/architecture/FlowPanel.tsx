"use client";

import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import { Inline } from "@/components/learning/Inline";
import { DATA_FLOWS, getFlow, getView } from "@/lib/architecture/model";
import { cn } from "@/lib/utils";

interface FlowPanelProps {
  flowId: string;
  stepIndex: number;
  playing: boolean;
  onFlowChange: (id: string) => void;
  onStepChange: (index: number) => void;
  onTogglePlay: () => void;
}

const controlClass =
  "inline-flex items-center gap-1.5 rounded-[9px] border border-border bg-surface px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted-bg disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]";

export function FlowPanel({ flowId, stepIndex, playing, onFlowChange, onStepChange, onTogglePlay }: FlowPanelProps) {
  const flow = getFlow(flowId) ?? DATA_FLOWS[0];
  const last = flow.steps.length - 1;
  const atEnd = stepIndex >= last;

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Pick a journey</legend>
        <div className="grid grid-cols-2 gap-1.5">
          {DATA_FLOWS.map((item) => {
            const active = item.id === flow.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                onClick={() => onFlowChange(item.id)}
                className={cn(
                  "rounded-[10px] border px-3 py-2 text-left text-sm font-medium leading-5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]",
                  active ? "border-primary bg-accent text-foreground" : "border-border text-muted hover:bg-muted-bg hover:text-foreground",
                )}
              >
                {item.title}
                {item.view !== "now" ? (
                  <span className="mt-0.5 block text-xs font-normal text-muted">{getView(item.view).label} plan</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </fieldset>

      <section aria-labelledby="flow-steps-heading">
        <div className="mb-3">
          <div className="flex items-center justify-between gap-2">
            <h4 id="flow-steps-heading" className="text-sm font-semibold">
              {flow.title}
            </h4>
            <p className="text-xs tabular-nums text-muted" aria-live="polite">
              Step {stepIndex + 1} of {flow.steps.length}
            </p>
          </div>
          <p className="mt-0.5 text-xs leading-5 text-muted">{flow.summary}</p>
        </div>

        <ol className="relative space-y-1">
          {flow.steps.map((step, index) => {
            const current = index === stepIndex;
            const done = index < stepIndex;
            return (
              <li key={index} className="relative">
                {index < last ? (
                  <span
                    aria-hidden
                    className={cn("absolute left-[19px] top-9 bottom-[-6px] w-0.5", done || current ? "bg-primary" : "bg-border")}
                  />
                ) : null}
                <button
                  type="button"
                  aria-current={current ? "step" : undefined}
                  onClick={() => onStepChange(index)}
                  className={cn(
                    "flex w-full gap-3 rounded-[10px] px-2 py-2 text-left text-sm leading-6 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]",
                    current ? "bg-accent" : "hover:bg-muted-bg",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "relative z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                      current
                        ? "bg-primary text-primary-foreground"
                        : done
                          ? "border-2 border-primary bg-surface text-primary"
                          : "border border-border bg-surface text-muted",
                    )}
                  >
                    {index + 1}
                  </span>
                  <span className={cn(current ? "text-foreground" : "text-muted")}>
                    <Inline text={step.text} />
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" className={controlClass} onClick={() => onStepChange(stepIndex - 1)} disabled={stepIndex === 0}>
            <ChevronLeft className="size-4" aria-hidden />
            Back
          </button>
          <button type="button" className={controlClass} onClick={onTogglePlay}>
            {playing ? (
              <>
                <Pause className="size-4" aria-hidden /> Pause
              </>
            ) : atEnd ? (
              <>
                <RotateCcw className="size-4" aria-hidden /> Replay
              </>
            ) : (
              <>
                <Play className="size-4" aria-hidden /> Play
              </>
            )}
          </button>
          <button type="button" className={controlClass} onClick={() => onStepChange(stepIndex + 1)} disabled={atEnd}>
            Next
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
      </section>
    </div>
  );
}
