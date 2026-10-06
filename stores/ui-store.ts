import { create } from "zustand";
import type { BottomPanelTab } from "@/lib/workspace-types";
import type { PinSelection, WiringSource } from "@/lib/hardware/types";

interface UIStore {
  leftOpen: boolean;
  rightOpen: boolean;
  bottomOpen: boolean;
  bottomHeight: number;
  activeBottomTab: BottomPanelTab;
  wireToolActive: boolean;
  snapGrid: boolean;
  breadboardMode: boolean;
  wiringSource: WiringSource | null;
  hoveredPin: PinSelection | null;
  hoveredEdgeId: string | null;
  setLeftOpen: (v: boolean) => void;
  setRightOpen: (v: boolean) => void;
  setBottomOpen: (v: boolean) => void;
  setBottomHeight: (v: number) => void;
  setActiveBottomTab: (tab: BottomPanelTab) => void;
  setWireToolActive: (v: boolean) => void;
  setSnapGrid: (v: boolean) => void;
  setBreadboardMode: (v: boolean) => void;
  setWiringSource: (v: WiringSource | null) => void;
  setHoveredPin: (v: PinSelection | null) => void;
  setHoveredEdgeId: (v: string | null) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  leftOpen: true,
  rightOpen: true,
  bottomOpen: true,
  bottomHeight: 220,
  activeBottomTab: "console",
  wireToolActive: false,
  snapGrid: true,
  breadboardMode: false,
  wiringSource: null,
  hoveredPin: null,
  hoveredEdgeId: null,
  setLeftOpen: (v) => set({ leftOpen: v }),
  setRightOpen: (v) => set({ rightOpen: v }),
  setBottomOpen: (v) => set({ bottomOpen: v }),
  setBottomHeight: (v) => set({ bottomHeight: v }),
  setActiveBottomTab: (tab) => set({ activeBottomTab: tab }),
  setWireToolActive: (v) => set((s) => ({ wireToolActive: v, wiringSource: v ? s.wiringSource : null })),
  setSnapGrid: (v) => set({ snapGrid: v }),
  setBreadboardMode: (v) => set({ breadboardMode: v }),
  setWiringSource: (v) => set({ wiringSource: v }),
  setHoveredPin: (v) => set({ hoveredPin: v }),
  setHoveredEdgeId: (v) => set({ hoveredEdgeId: v }),
}));
