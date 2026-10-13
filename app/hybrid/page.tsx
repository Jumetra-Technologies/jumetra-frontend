import { HybridPanel } from "@/components/hybrid/hybrid-panel";
import { api } from "@/lib/api-client";
import type { Metadata } from "next";
import type { ComponentSearchHit, ControllerSpec } from "@/lib/types";

export const metadata: Metadata = {
  title: "Hybrid Hardware",
  description: "Run one experiment with real and virtual parts together: virtual, physical, simulator and hybrid device modes.",
};

export default async function HybridPage() {
  let controllers: ControllerSpec[] = [];
  let components: ComponentSearchHit[] = [];
  try {
    [controllers, components] = await Promise.all([
      api.getControllers(),
      api.searchComponents({}),
    ]);
  } catch {
    controllers = [];
    components = [];
  }

  return (
    <>
      <div className="mb-6 max-w-3xl">
        <h2 className="text-2xl font-bold">Hybrid Hardware</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          Run one experiment with real and virtual parts together. Use the real parts you have, let virtual ones stand in for the rest, and swap
          them over as parts arrive.
        </p>
      </div>
      <HybridPanel controllers={controllers} componentHits={components} />
    </>
  );
}
