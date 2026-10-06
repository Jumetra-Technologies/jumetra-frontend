"use client";

import { useEffect, useRef, useState } from "react";
import {
  Activity,
  Bot,
  Bug,
  ChevronDown,
  ChevronUp,
  Radio,
  Terminal,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSimulationStore } from "@/stores/simulation-store";
import { useUIStore } from "@/stores/ui-store";
import { applyWorkspaceSnapshot } from "@/lib/workspace-snapshot";
import type { BottomPanelTab } from "@/lib/workspace-types";
import { cn } from "@/lib/utils";

const TABS: { id: BottomPanelTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "console", label: "Terminal", icon: Terminal },
  { id: "serial", label: "Serial Monitor", icon: Radio },
  { id: "events", label: "Events", icon: Activity },
  { id: "logic", label: "Logic Analyzer", icon: Activity },
  { id: "scope", label: "Oscilloscope", icon: Activity },
  { id: "simlog", label: "Debugger", icon: Bug },
  { id: "mqtt", label: "AI Assistant", icon: Bot },
];

export function BottomDock({ workspaceId }: { workspaceId: string }) {
  const open = useUIStore((s) => s.bottomOpen);
  const height = useUIStore((s) => s.bottomHeight);
  const tab = useUIStore((s) => s.activeBottomTab);
  const setTab = useUIStore((s) => s.setActiveBottomTab);
  const setOpen = useUIStore((s) => s.setBottomOpen);
  const setBottomHeight = useUIStore((s) => s.setBottomHeight);

  const consoleLines = useSimulationStore((s) => s.console);
  const serial = useSimulationStore((s) => s.serial);
  const events = useSimulationStore((s) => s.events);
  const gpioSamples = useSimulationStore((s) => s.gpioSamples);
  const adcSamples = useSimulationStore((s) => s.adcSamples);
  const [line, setLine] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startY: number; startH: number } | null>(null);

  useEffect(() => {
    if (autoScroll && typeof endRef.current?.scrollIntoView === "function") {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [serial, consoleLines, autoScroll]);

  function onResizeStart(e: React.MouseEvent) {
    dragRef.current = { startY: e.clientY, startH: height };
    function onMove(ev: MouseEvent) {
      if (!dragRef.current) return;
      const next = Math.min(420, Math.max(140, dragRef.current.startH + (dragRef.current.startY - ev.clientY)));
      setBottomHeight(next);
    }
    function onUp() {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  if (!open) {
    return (
      <button
        type="button"
        className="flex items-center gap-2 border-t border-border bg-surface px-4 py-2 text-xs font-medium text-muted hover:text-foreground"
        onClick={() => setOpen(true)}
      >
        <ChevronUp className="h-3.5 w-3.5" />
        Show Terminal · Serial · Events · Logic · Scope
      </button>
    );
  }

  const gpioData = gpioSamples.slice(-80).map((s) => ({ t: Number(s.t), value: Number(s.value) }));
  const adcData = adcSamples.slice(-120).map((s) => ({ t: Number(s.t), value: Number(s.value) }));

  return (
    <div className="flex flex-col border-t border-border bg-surface" style={{ height }}>
      <div
        className="h-1.5 cursor-row-resize bg-border/60 hover:bg-primary/40"
        onMouseDown={onResizeStart}
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize bottom dock"
      />
      <div className="flex items-center gap-0.5 overflow-x-auto border-b border-border px-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-xs font-medium transition-colors",
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
        <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setOpen(false)}>
          <ChevronDown className="h-3.5 w-3.5" />
          Hide
        </Button>
      </div>

      <div className="min-h-0 flex-1">
        {tab === "console" || tab === "simlog" ? (
          <div className="hhip-scroll h-full overflow-y-auto bg-[#0B1220] p-3 font-mono text-xs text-slate-200">
            {consoleLines.length === 0 ? (
              <p className="text-slate-500">Terminal output will appear here.</p>
            ) : (
              consoleLines.map((l, i) => (
                <div key={i}>
                  <span className="text-slate-500">[{String(l.sim_time_ms ?? l.timestamp_ms)}]</span>{" "}
                  {String(l.message)}
                </div>
              ))
            )}
          </div>
        ) : null}

        {tab === "serial" ? (
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-2 border-b border-border px-3 py-1.5 text-xs">
              <span className="font-medium">Serial Monitor</span>
              <label className="ml-auto flex items-center gap-1.5 text-muted">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                />
                Auto Scroll
              </label>
            </div>
            <div className="hhip-scroll flex-1 overflow-y-auto bg-[#0B1220] p-3 font-mono text-xs text-emerald-400">
              {serial.map((s, i) => (
                <div key={i}>
                  [{String(s.sim_time_ms ?? s.timestamp_ms)}] {String(s.message)}
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <form
              className="flex gap-2 border-t border-border p-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!line.trim()) return;
                await api.sendWorkspaceSerial(workspaceId, line);
                setLine("");
                applyWorkspaceSnapshot(await api.getEngineeringWorkspaceState(workspaceId));
              }}
            >
              <Input
                value={line}
                onChange={(e) => setLine(e.target.value)}
                placeholder="Transmit…"
                className="font-mono"
              />
              <Button type="submit" size="sm">
                Send
              </Button>
            </form>
          </div>
        ) : null}

        {tab === "events" ? (
          <div className="hhip-scroll h-full overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-canvas">
                <tr className="text-muted">
                  <th className="px-3 py-2 font-medium">Time</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Source</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Payload</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-1.5 font-mono">{String(e.sim_time_ms ?? e.timestamp_ms)}</td>
                    <td className="px-3 py-1.5">{String(e.type)}</td>
                    <td className="px-3 py-1.5">{String(e.source)}</td>
                    <td className="px-3 py-1.5">{String(e.status)}</td>
                    <td className="max-w-xs truncate px-3 py-1.5 font-mono text-muted">
                      {JSON.stringify(e.payload)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {tab === "logic" ? (
          <div className="h-full p-3">
            {gpioData.length === 0 ? (
              <p className="text-xs text-muted">Run simulation to capture digital transitions.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={gpioData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="t" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 1]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="stepAfter" dataKey="value" stroke="#2563EB" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        ) : null}

        {tab === "scope" ? (
          <div className="h-full p-3">
            {adcData.length === 0 ? (
              <p className="text-xs text-muted">Run simulation with analog sensors to capture waveforms.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={adcData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="t" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        ) : null}

        {tab === "mqtt" ? (
          <div className="flex h-full flex-col gap-2 p-4 text-sm">
            <p className="font-medium text-foreground">AI Assistant</p>
            <p className="text-xs text-muted">
              Ask for wiring help, pin mapping, or simulation tips. Full agent integration is an
              extension point — workspace context is ready.
            </p>
            <Input placeholder="Ask HHIP AI…" disabled className="mt-2" aria-label="AI assistant" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
