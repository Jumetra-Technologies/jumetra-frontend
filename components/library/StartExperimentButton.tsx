"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FlaskConical, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import type { PartModel } from "@/lib/parts/types";
import { persistWorkspaceId } from "@/lib/workspace-snapshot";

/**
 * Creates a lab workspace with this part already on the canvas and opens the
 * Engineering Lab. A board goes in on its own; anything else gets an Arduino
 * Uno beside it, so the experiment has something to drive it.
 */
export function StartExperimentButton({ part, className }: { part: PartModel; className?: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");

  const start = async () => {
    setState("busy");
    try {
      const workspace = await api.createEngineeringWorkspace({ name: `${part.name}: ${part.experiment.title}` });
      const id = workspace.workspace_id;
      const nodes = part.group === "boards" ? [{ component_id: part.id, x: 220, y: 160 }] : [{ component_id: "arduino-uno", x: 80, y: 150 }, { component_id: part.id, x: 460, y: 180 }];
      for (const node of nodes) {
        const created = await api.addWorkspaceNode(id, { component_id: node.component_id, position: { x: node.x, y: node.y }, device_mode: "virtual" });
        try {
          await api.createComponentV2Binding({ component_id: node.component_id, instance_id: created.id || node.component_id, mode: "virtual" });
        } catch {
          /* bindings are optional; the node is already on the canvas */
        }
      }
      persistWorkspaceId(id);
      router.push("/laboratory/workspace");
    } catch {
      setState("error");
    }
  };

  return (
    <div className={className}>
      <Button size="lg" onClick={start} disabled={state === "busy"} className="h-11 px-5" data-testid="start-experiment">
        {state === "busy" ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <FlaskConical className="size-4" aria-hidden />}
        {state === "busy" ? "Setting up the lab…" : "Start an experiment"}
      </Button>
      {state === "error" ? (
        <p role="alert" className="mt-2 max-w-sm text-sm leading-6 text-muted">
          The lab needs the HHIP backend, which isn&apos;t reachable right now.{" "}
          <Link href="/docs/technical-guides/run-locally" className="text-primary underline-offset-4 hover:underline">
            How to run it locally
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}
