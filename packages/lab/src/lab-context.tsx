"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Analysis } from "@kiungo/core/lab/circuit";
import type { Frame } from "@kiungo/core/lab/simulate";
import type { PowerState } from "./UsbCable";
import type { LabNode, LabSession, LabView } from "@kiungo/core/lab/types";

/** The website's link to Kiungo online: checking, connected, saving the mirror, or offline. */
export type RuntimeStatus = "checking" | "online" | "offline" | "syncing";

/**
 * What the app hosting the lab adds around it. The website links parts to the
 * Component library and lists real boards; the desktop app has neither yet.
 */
export interface LabHost {
  /** A link to a part's page, wrapped around `children`. Omit where there is no library. */
  renderPartLink?: (partId: string, children: ReactNode, className: string) => ReactNode;
  /** Go to a part's page (the canvas menu). */
  openPartPage?: (partId: string) => void;
  /** The Inspector's "Real hardware" section. Omitted: the section is hidden. */
  realHardware?: ReactNode;
}

export const LabHostContext = createContext<LabHost>({});

export function useLabHost(): LabHost {
  return useContext(LabHostContext);
}

export interface LabContextValue {
  session: LabSession;
  analysis: Analysis;
  frame: Frame;
  view: LabView;
  running: boolean;
  /** The boards' USB leads: plugged in while the sketch runs. */
  power: PowerState;
  /** Kiungo online, where the host has it; undefined in the desktop app. */
  runtime?: RuntimeStatus;
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
