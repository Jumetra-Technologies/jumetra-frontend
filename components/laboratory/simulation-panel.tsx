"use client";

import { ErrorNotice } from "@/components/ui/error-notice";
import { describeError } from "@/lib/errors";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AnimatedCircuitCanvas } from "@/components/laboratory/animated-circuit-canvas";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api-client";
import type { LaboratorySession, SimulationState } from "@/lib/types";

type SensorPoint = { tick: number; value: number; label: string };

export function SimulationPanel({
  laboratoryId,
  initialLab,
}: {
  laboratoryId: string;
  initialLab?: LaboratorySession | null;
}) {
  const [lab] = useState(initialLab ?? null);
  const [state, setState] = useState<SimulationState | null>(null);
  const [status, setStatus] = useState("created");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sensorSeries, setSensorSeries] = useState<SensorPoint[]>([]);
  const [activeNodes, setActiveNodes] = useState<string[]>([]);

  const circuit = useMemo(() => {
    const reactFlow = state?.circuit?.react_flow;
    if (reactFlow?.nodes?.length) {
      return reactFlow;
    }
    return lab?.session?.circuit ?? { nodes: [], edges: [] };
  }, [state, lab]);

  const refreshState = useCallback(async () => {
    const data = await api.getSimulation(laboratoryId);
    setState(data);
    setStatus(String(data.state ?? "created"));
  }, [laboratoryId]);

  useEffect(() => {
    const t = window.setTimeout(() => void refreshState().catch(() => undefined), 0);
    return () => window.clearTimeout(t);
  }, [refreshState]);

  async function runAction(action: () => Promise<{ status?: string; state?: SimulationState }>) {
    setLoading(true);
    setError("");
    try {
      const result = await action();
      if (result.state) {
        setState(result.state);
      }
      if (result.status) {
        setStatus(result.status);
      }
      await refreshState();
    } catch (err) {
      setError(describeError(err, "That didn't work"));
    } finally {
      setLoading(false);
    }
  }

  async function onStart() {
    await runAction(async () => {
      const result = await api.startLaboratory(laboratoryId);
      return { status: result.status, state: result.state };
    });
  }

  async function onPause() {
    await runAction(() => api.pauseSimulation(laboratoryId));
  }

  async function onStop() {
    await runAction(() => api.stopSimulation(laboratoryId));
  }

  async function onAdvance() {
    setLoading(true);
    setError("");
    try {
      const result = await api.advanceSimulation(laboratoryId, 100);
      if (result.state) {
        setState(result.state);
      }
      setStatus(result.status);

      const points: SensorPoint[] = [];
      const active: string[] = [];
      for (const behavior of result.state?.behaviors ?? []) {
        active.push(String(behavior.instance_id));
        const reading = (behavior.state as Record<string, unknown>)?.last_reading as
          | Record<string, unknown>
          | undefined;
        if (reading?.temperature_c != null) {
          points.push({
            tick: result.step?.tick ?? 0,
            value: Number(reading.temperature_c),
            label: String(behavior.component_id),
          });
        } else if (reading?.moisture_pct != null) {
          points.push({
            tick: result.step?.tick ?? 0,
            value: Number(reading.moisture_pct),
            label: String(behavior.component_id),
          });
        } else if (reading?.distance_cm != null) {
          points.push({
            tick: result.step?.tick ?? 0,
            value: Number(reading.distance_cm),
            label: String(behavior.component_id),
          });
        }
      }
      if (points.length) {
        setSensorSeries((prev) => [...prev.slice(-40), ...points]);
      }
      setActiveNodes(active);
    } catch (err) {
      setError(describeError(err, "The simulation didn't move forward"));
    } finally {
      setLoading(false);
    }
  }

  async function onToggleLed(instanceId: string) {
    setLoading(true);
    try {
      await api.sendActuatorCommand(laboratoryId, instanceId, "toggle");
      await refreshState();
    } catch (err) {
      setError(describeError(err, "The command wasn't sent"));
    } finally {
      setLoading(false);
    }
  }

  const behaviors = state?.behaviors ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/laboratory" className="text-sm text-muted hover:underline">
            ← Back to Laboratory
          </Link>
          <h2 className="mt-2 text-2xl font-bold">{lab?.name ?? "Simulation"}</h2>
          <p className="text-sm text-muted">{laboratoryId}</p>
        </div>
        <Badge variant={status === "running" ? "success" : "info"}>{status}</Badge>
      </div>

      <Card>
        <h3 className="mb-4 font-medium">Simulation Controls</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={loading || status === "running"}
            onClick={onStart}
            className="rounded-[10px] bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50 "
          >
            Start
          </button>
          <button
            type="button"
            disabled={loading || status !== "running"}
            onClick={onPause}
            className="rounded-[10px] border border-border px-4 py-2 text-sm disabled:opacity-50"
          >
            Pause
          </button>
          <button
            type="button"
            disabled={loading || status === "stopped"}
            onClick={onStop}
            className="rounded-[10px] border border-border px-4 py-2 text-sm disabled:opacity-50"
          >
            Stop
          </button>
          <button
            type="button"
            disabled={loading || status !== "running"}
            onClick={onAdvance}
            className="rounded-[10px] border border-blue-300 bg-blue-50 px-4 py-2 text-sm text-blue-900 disabled:opacity-50"
          >
            Advance +100ms
          </button>
        </div>
        {error ? <ErrorNotice message={error} className="mt-3" /> : null}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-medium">Live Component State</h3>
          <div className="max-h-80 space-y-3 overflow-y-auto text-sm">
            {behaviors.length === 0 ? (
              <p className="text-muted">Start simulation to see live component state.</p>
            ) : (
              behaviors.map((b) => (
                <div
                  key={String(b.instance_id)}
                  className="rounded-[10px] border border-border p-3 "
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{String(b.component_id)}</span>
                    <span className="text-xs text-muted">{String(b.instance_id)}</span>
                  </div>
                  <pre className="mt-2 overflow-x-auto text-xs text-muted">
                    {JSON.stringify(b.state, null, 2)}
                  </pre>
                  {b.component_id === "led" ? (
                    <button
                      type="button"
                      className="mt-2 text-xs text-primary underline"
                      onClick={() => onToggleLed(String(b.instance_id))}
                    >
                      Toggle LED
                    </button>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 font-medium">Sensor Charts</h3>
          {sensorSeries.length === 0 ? (
            <p className="text-sm text-muted">Advance simulation to collect sensor readings.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={sensorSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="tick" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <div>
        <h3 className="mb-4 font-medium">Animated Circuit</h3>
        <AnimatedCircuitCanvas
          nodes={circuit.nodes ?? []}
          edges={circuit.edges ?? []}
          activeNodeIds={activeNodes}
        />
      </div>
    </div>
  );
}
