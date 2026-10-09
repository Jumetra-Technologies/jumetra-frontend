"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Line = { timestamp_ms: number; text: string; direction?: string };

export function SerialMonitorPanel() {
  const [lines, setLines] = useState<Line[]>([]);
  const [query, setQuery] = useState("");
  const [tx, setTx] = useState("");
  const [paused, setPaused] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function refresh() {
    const res = await api.getFirmwareSerial({ limit: 400, query: query });
    setLines((res.lines as Line[]) || []);
    setPaused(Boolean(res.paused));
  }

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 1200);
    return () => clearInterval(t);
  }, [query]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  return (
    <div className="flex h-full flex-col bg-[#0B1220] text-[11px] text-slate-200">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-800 px-2 py-1">
        <span className="font-semibold text-slate-300">Serial Monitor</span>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter…"
          className="h-6 w-32 border-slate-700 bg-slate-900 text-[10px]"
        />
        <Button
          size="sm"
          variant="ghost"
          className="h-6 text-[10px]"
          onClick={() => void api.postFirmwareSerial({ action: paused ? "resume" : "pause" }).then(refresh)}
        >
          {paused ? "Resume" : "Pause"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 text-[10px]"
          onClick={() => void api.postFirmwareSerial({ action: "clear" }).then(refresh)}
        >
          Clear
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 text-[10px]"
          onClick={async () => {
            const res = await api.postFirmwareSerial({ action: "export", query });
            const blob = new Blob([String(res.export || "")], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "kiungo-serial.log";
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Export
        </Button>
      </div>
      <div className="hhip-scroll flex-1 overflow-auto p-2 font-mono">
        {lines.map((l, i) => (
          <div key={i} className={l.direction === "tx" ? "text-cyan-400" : ""}>
            <span className="text-slate-500">[{l.timestamp_ms}]</span> {l.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form
        className="flex gap-1 border-t border-slate-800 p-1"
        onSubmit={(e) => {
          e.preventDefault();
          if (!tx.trim()) return;
          void api.postFirmwareSerial({ action: "write", line: tx }).then(() => {
            setTx("");
            void refresh();
          });
        }}
      >
        <Input
          value={tx}
          onChange={(e) => setTx(e.target.value)}
          placeholder="Send line @ 115200+"
          className="h-7 border-slate-700 bg-slate-900 font-mono text-[11px]"
        />
        <Button size="sm" className="h-7 text-[10px]" type="submit">
          Send
        </Button>
      </form>
    </div>
  );
}
