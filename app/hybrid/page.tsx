import { HybridPanel } from "@/components/hybrid/hybrid-panel";
import { api } from "@/lib/api-client";
import type { ComponentSearchHit, ControllerSpec } from "@/lib/types";

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
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Hybrid Hardware Bridge</h2>
        <p className="mt-1 text-muted">
          Combine physical ESP32 hardware, virtual simulation, and external simulators in one experiment
        </p>
      </div>
      <HybridPanel controllers={controllers} componentHits={components} />
    </>
  );
}
