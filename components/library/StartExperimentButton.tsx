"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FlaskConical, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { planAutoWire, placeNode } from "@/lib/lab/autowire";
import { getPinout } from "@/lib/lab/pinout";
import { flushLab, useLab } from "@/lib/lab/store";
import type { PartModel } from "@/lib/parts/types";

/**
 * Opens the Engineering Lab with this part already on the canvas, in a new
 * lab session saved in the browser. A board goes in on its own; anything
 * else gets an Arduino Uno beside it, wired up, so pressing Run shows it
 * working. No backend needed.
 */
export function StartExperimentButton({ part, className }: { part: PartModel; className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const start = () => {
    setBusy(true);
    const lab = useLab.getState();
    if (!lab.hydrated) lab.hydrate();
    const session = useLab.getState().createSession({ name: `${part.name}: ${part.experiment.title}` });
    const store = useLab.getState();
    if (getPinout(part.id).controller) {
      store.addNode(part.id, { x: 80, y: 80 });
    } else {
      const board = store.addNode("arduino-uno", { x: 80, y: 80 });
      const current = () => useLab.getState().sessions.find((s) => s.id === session.id)!;
      const node = useLab.getState().addNode(part.id, placeNode(part.id, current().nodes, board));
      if (node) {
        const plan = planAutoWire(node, current().nodes, current().wires);
        if (plan.board && plan.wires.length) useLab.getState().addWires(plan.wires, `Auto-wired ${node.label} to ${plan.board.label}`);
      }
    }
    useLab.getState().log("note", `Started from the Component library: ${part.experiment.idea}`);
    flushLab();
    router.push(`/laboratory/workspace?session=${encodeURIComponent(session.id)}`);
  };

  return (
    <div className={className}>
      <Button size="lg" onClick={start} disabled={busy} className="h-11 px-5" data-testid="start-experiment">
        {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <FlaskConical className="size-4" aria-hidden />}
        {busy ? "Opening the lab…" : "Start an experiment"}
      </Button>
    </div>
  );
}
