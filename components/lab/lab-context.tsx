"use client";

import { createContext, useContext } from "react";
import type { Analysis } from "@/lib/lab/circuit";
import type { Frame } from "@/lib/lab/simulate";
import type { RuntimeStatus } from "@/lib/lab/runtime";
import type { LabNode, LabSession, LabView } from "@/lib/lab/types";

export interface LabContextValue {
  session: LabSession;
  analysis: Analysis;
  frame: Frame;
  view: LabView;
  running: boolean;
  runtime: RuntimeStatus;
  selectedNodes: string[];
  selectedWire: string | null;
  /** Nodes to flash briefly (after clicking a fault). */
  flash: string[];
  select: (nodes: string[], wire?: string | null) => void;
  focusNode: (id: string) => void;
  addPart: (partId: string, opts?: { at?: { x: number; y: number }; autowire?: boolean; near?: string }) => LabNode | null;
  autowireNode: (id: string) => number;
  openContextMenu: (at: { x: number; y: number }, target: { node?: string; wire?: string; flow?: { x: number; y: number } }) => void;
}

export const LabContext = createContext<LabContextValue | null>(null);

export function useLabContext(): LabContextValue {
  const ctx = useContext(LabContext);
  if (!ctx) throw new Error("useLabContext must be used inside the Engineering Lab");
  return ctx;
}
