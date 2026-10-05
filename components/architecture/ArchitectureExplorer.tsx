"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DATA_FLOWS,
  findRelationship,
  getFlow,
  getLayer,
  getView,
  relationshipsFor,
  stepLayers,
  type LayerId,
  type ViewId,
} from "@/lib/architecture/model";
import { cn } from "@/lib/utils";
import { FlowPanel } from "./FlowPanel";
import { LayerPanel } from "./LayerPanel";
import { SystemBoard, type BoardFocus } from "./SystemBoard";
import { ViewSwitch } from "./ViewSwitch";

type PanelMode = "layers" | "flows";

const STEP_MS = 2800;

function Legend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted" aria-label="Legend">
      <li className="flex items-center gap-1.5">
        <span aria-hidden className="h-3 w-5 rounded-[4px] border-[1.5px] border-border bg-surface" />
        Built
      </li>
      <li className="flex items-center gap-1.5">
        <span
          aria-hidden
          className="h-3 w-5 rounded-[4px] border-[1.5px] bg-surface"
          style={{ borderColor: "color-mix(in srgb, var(--warning) 50%, var(--border))" }}
        />
        Prototype
      </li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden className="h-3 w-5 rounded-[4px] border-[1.5px] border-dashed border-muted" />
        Planned
      </li>
    </ul>
  );
}

export function ArchitectureExplorer() {
  const [view, setView] = useState<ViewId>("now");
  const [selected, setSelected] = useState<LayerId>("web");
  const [mode, setMode] = useState<PanelMode>("layers");
  const [flowId, setFlowId] = useState(DATA_FLOWS[0].id);
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const flow = getFlow(flowId) ?? DATA_FLOWS[0];
  const last = flow.steps.length - 1;
  // Playback stops by itself on the last step.
  const isPlaying = playing && mode === "flows" && stepIndex < last;

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      setStepIndex((index) => Math.min(index + 1, last));
    }, STEP_MS);
    return () => window.clearInterval(timer);
  }, [isPlaying, last]);

  const focus: BoardFocus = useMemo(() => {
    if (mode === "flows") {
      const step = flow.steps[Math.min(stepIndex, last)];
      if (step.kind === "node") {
        return { layers: stepLayers(step), relationships: [], dimOthers: true };
      }
      const match = findRelationship(step.from, step.to);
      return {
        layers: stepLayers(step),
        relationships: match ? [match.relationship.id] : [],
        signal: match ? { id: match.relationship.id, reversed: match.reversed } : undefined,
        dimOthers: true,
      };
    }
    return {
      layers: [],
      relationships: relationshipsFor(selected).map(({ relationship }) => relationship.id),
    };
  }, [mode, flow, stepIndex, last, selected]);

  const selectLayer = (id: LayerId) => {
    setSelected(id);
    setMode("layers");
    setPlaying(false);
  };

  const chooseFlow = (id: string) => {
    const next = getFlow(id);
    if (!next) return;
    setFlowId(id);
    setStepIndex(0);
    setPlaying(false);
    setView(next.view);
  };

  const goToStep = (index: number) => {
    setStepIndex(Math.max(0, Math.min(index, last)));
    setPlaying(false);
  };

  const togglePlay = () => {
    if (isPlaying) {
      setPlaying(false);
      return;
    }
    if (stepIndex >= last) setStepIndex(0);
    setPlaying(true);
  };

  const openFlows = () => {
    setMode("flows");
    setView(flow.view);
  };

  const boardSelected = mode === "layers" ? selected : null;
  const currentView = getView(view);

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section aria-label="System diagram" className="min-w-0 xl:sticky xl:top-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <ViewSwitch value={view} onChange={setView} />
          <Legend />
        </div>

        <div className="overflow-hidden rounded-[var(--radius)] border border-border bg-canvas shadow-[var(--shadow-sm)]">
          <SystemBoard
            layout="wide"
            view={view}
            selected={boardSelected}
            focus={focus}
            onSelect={selectLayer}
            className="hidden p-3 md:block lg:p-5"
          />
          <SystemBoard
            layout="narrow"
            view={view}
            selected={boardSelected}
            focus={focus}
            onSelect={selectLayer}
            className="p-2 md:hidden"
          />
        </div>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted" aria-live="polite">
          <span className="font-semibold text-foreground">{currentView.label}.</span> {currentView.description}
        </p>
      </section>

      <aside
        aria-label="Details"
        className="rounded-[var(--radius)] border border-border bg-surface shadow-[var(--shadow-sm)]"
      >
        <div role="tablist" aria-label="Explore by" className="flex border-b border-border p-1.5">
          {(
            [
              { id: "layers", label: "Layers", onSelect: () => setMode("layers") },
              { id: "flows", label: "Data flows", onSelect: openFlows },
            ] as const
          ).map((tab) => {
            const active = mode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`arch-tab-${tab.id}`}
                aria-selected={active}
                aria-controls={`arch-panel-${tab.id}`}
                onClick={tab.onSelect}
                className={cn(
                  "flex-1 rounded-[9px] px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]",
                  active ? "bg-muted-bg text-foreground" : "text-muted hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div
          role="tabpanel"
          id={`arch-panel-${mode}`}
          aria-labelledby={`arch-tab-${mode}`}
          className="p-5"
        >
          {mode === "layers" ? (
            <LayerPanel layer={getLayer(selected)} onSelect={selectLayer} />
          ) : (
            <FlowPanel
              flowId={flow.id}
              stepIndex={stepIndex}
              playing={isPlaying}
              onFlowChange={chooseFlow}
              onStepChange={goToStep}
              onTogglePlay={togglePlay}
            />
          )}
        </div>
      </aside>
    </div>
  );
}
