"use client";

import { ErrorNotice } from "@/components/ui/error-notice";
import { describeError } from "@/lib/errors";
import { FormEvent, useState } from "react";
import { CircuitCanvas } from "@/components/laboratory/circuit-canvas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { api } from "@/lib/api-client";
import type { ComponentSearchHit, ControllerSpec, LaboratorySession } from "@/lib/types";
import { cn } from "@/lib/utils";

export function LaboratoryPanel({
  controllers,
  componentHits,
}: {
  controllers: ControllerSpec[];
  componentHits: ComponentSearchHit[];
}) {
  const [name, setName] = useState("My Virtual Lab");
  const [controllerId, setControllerId] = useState(controllers[0]?.controller_id ?? "esp32");
  const [selected, setSelected] = useState<string[]>(["dht11", "led"]);
  const [lab, setLab] = useState<LaboratorySession | null>(null);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  function toggleComponent(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await api.createLaboratory({
        name,
        controller_id: controllerId,
        component_ids: selected,
        description: "Virtual laboratory created from dashboard",
      });
      setLab(result);
      setStatus("created");
    } catch (err) {
      setError(describeError(err, "The laboratory wasn't created"));
    } finally {
      setLoading(false);
    }
  }

  async function onStart() {
    if (!lab) return;
    setLoading(true);
    setError("");
    try {
      const result = await api.startLaboratory(lab.laboratory_id);
      setLab(result.laboratory);
      setStatus(result.status);
    } catch (err) {
      setError(describeError(err, "The simulation didn't start"));
    } finally {
      setLoading(false);
    }
  }

  const circuit = lab?.session?.circuit;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <h3 className="mb-4 text-sm font-semibold text-foreground">Create Virtual Laboratory</h3>
        <form onSubmit={onCreate} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted">Laboratory name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted">Microcontroller</label>
            <Select
              value={controllerId}
              onChange={(e) => setControllerId(e.target.value)}
              className="mt-1.5"
            >
              {controllers.map((c) => (
                <option key={c.controller_id} value={c.controller_id}>
                  {c.name} ({c.family})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted">Components</label>
            <div className="mt-2 max-h-48 space-y-2 overflow-y-auto">
              {componentHits.map((hit) => (
                <label
                  key={hit.component.component_id}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-[10px] border px-3 py-2 text-sm transition-colors",
                    selected.includes(hit.component.component_id)
                      ? "border-primary bg-accent"
                      : "border-border bg-canvas hover:border-primary/40",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(hit.component.component_id)}
                    onChange={() => toggleComponent(hit.component.component_id)}
                    className="accent-[var(--primary)]"
                  />
                  <span className="flex-1 font-medium">{hit.component.name}</span>
                  <Badge>{hit.component.category}</Badge>
                </label>
              ))}
            </div>
          </div>
          <Button type="submit" disabled={loading || selected.length === 0}>
            Create Laboratory
          </Button>
        </form>
        {lab ? (
          <div className="mt-4 space-y-2 text-sm">
            <p>
              <span className="text-muted">Lab ID:</span>{" "}
              <span className="font-mono">{lab.laboratory_id}</span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={onStart}
                disabled={loading || status === "running"}
              >
                Start Simulation
              </Button>
              {status ? (
                <Badge variant={status === "running" ? "success" : "info"}>{status}</Badge>
              ) : null}
            </div>
            <a
              href={`/laboratory/${lab.laboratory_id}/simulation`}
              className="block text-sm font-medium text-primary underline-offset-2 hover:underline"
            >
              Open Simulation Dashboard →
            </a>
          </div>
        ) : null}
        {error ? <ErrorNotice message={error} className="mt-3" /> : null}
      </Card>

      <div>
        <h3 className="mb-4 text-sm font-semibold text-foreground">Circuit Visualization</h3>
        <CircuitCanvas nodes={circuit?.nodes ?? []} edges={circuit?.edges ?? []} />
      </div>
    </div>
  );
}
