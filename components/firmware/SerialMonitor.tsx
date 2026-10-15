"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plug, Unplug } from "lucide-react";
import { api } from "@/lib/api-client";
import { BAUD_RATES, connectBoard, webSerialSupported, type BoardConnection } from "@/lib/firmware/web-serial";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Line = { timestamp_ms: number; text: string; direction?: string };
type Source = "usb" | "server";

const MAX_LINES = 500;

/**
 * What a board prints with Serial.println. Two places it can come from:
 *  - My board (USB): a board plugged into this computer, read by the browser
 *    itself (Web Serial, Chrome and Edge). Real output from real hardware.
 *  - Kiungo server: the serial log the server keeps for boards attached to it.
 */
export function SerialMonitorPanel() {
  const usbOk = webSerialSupported();
  const [source, setSource] = useState<Source>(usbOk ? "usb" : "server");
  return (
    <div className="flex h-full flex-col bg-[#0B1220] text-[11px] text-slate-200" data-testid="serial-monitor">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-800 px-2 py-1">
        <div role="radiogroup" aria-label="Serial source" className="flex rounded-[6px] bg-slate-900 p-0.5">
          {(
            [
              ["usb", "My board (USB)"],
              ["server", "Kiungo server"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={source === id}
              onClick={() => setSource(id)}
              className={cn("rounded-[4px] px-2 py-0.5 text-[11px]", source === id ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {source === "usb" ? <UsbSerial supported={usbOk} /> : <ServerSerial />}
    </div>
  );
}

function LineList({ lines, empty }: { lines: Line[]; empty: string }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "end" });
  }, [lines]);
  return (
    <div className="hhip-scroll min-h-0 flex-1 overflow-auto p-2 font-mono" data-testid="serial-lines">
      {lines.length === 0 ? <p className="font-sans text-slate-500">{empty}</p> : null}
      {lines.map((l, i) => (
        <div key={i} className={l.direction === "tx" ? "text-cyan-400" : ""}>
          <span className="text-slate-500">{new Date(l.timestamp_ms).toLocaleTimeString([], { hour12: false })}</span> {l.text}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}

function SendBar({ onSend, disabled, hint }: { onSend: (text: string) => Promise<void>; disabled?: boolean; hint: string }) {
  const [tx, setTx] = useState("");
  return (
    <form
      className="flex gap-1 border-t border-slate-800 p-1"
      onSubmit={(e) => {
        e.preventDefault();
        if (!tx.trim() || disabled) return;
        void onSend(tx).then(() => setTx(""));
      }}
    >
      <Input value={tx} onChange={(e) => setTx(e.target.value)} placeholder={hint} disabled={disabled} className="h-7 border-slate-700 bg-slate-900 font-mono text-[11px] text-slate-100" aria-label="Text to send to the board" />
      <Button size="sm" className="h-7 text-[11px]" type="submit" disabled={disabled}>
        Send
      </Button>
    </form>
  );
}

function UsbSerial({ supported }: { supported: boolean }) {
  const [baud, setBaud] = useState<number>(9600);
  const [conn, setConn] = useState<BoardConnection | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [note, setNote] = useState("");
  const connRef = useRef<BoardConnection | null>(null);

  const push = useCallback((text: string, direction?: string) => setLines((prev) => [...prev.slice(-(MAX_LINES - 1)), { timestamp_ms: Date.now(), text, direction }]), []);

  useEffect(() => () => void connRef.current?.close(), []);

  if (!supported) {
    return (
      <div className="p-3 font-sans text-[12px] leading-5 text-slate-300" data-testid="usb-unsupported">
        Reading a board over USB works in <strong>Chrome</strong> or <strong>Edge</strong> on a computer. This browser can&apos;t open serial ports from a web page. Switch to Kiungo server, or open this page in Chrome.
      </div>
    );
  }

  const connect = async () => {
    setNote("");
    try {
      const c = await connectBoard(
        baud,
        (line) => push(line),
        (reason) => {
          connRef.current = null;
          setConn(null);
          setNote(reason ?? "Disconnected.");
        },
      );
      connRef.current = c;
      setConn(c);
      setNote(`Connected to ${c.name} at ${baud} baud. Lines the board prints appear below.`);
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      setNote(name === "NotFoundError" ? "No port chosen." : name === "NetworkError" || name === "InvalidStateError" ? "That port is busy. Close the Arduino IDE's Serial Monitor (or any other app using it) and try again." : "The board couldn't be opened. Check the USB cable and try again.");
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-800 px-2 py-1 font-sans">
        {conn ? (
          <Button size="sm" variant="ghost" className="h-6 gap-1 text-[11px] text-slate-200" onClick={() => void conn.close()}>
            <Unplug className="size-3" aria-hidden /> Disconnect
          </Button>
        ) : (
          <Button size="sm" className="h-6 gap-1 text-[11px]" onClick={() => void connect()} data-testid="usb-connect">
            <Plug className="size-3" aria-hidden /> Connect a board
          </Button>
        )}
        <label className="flex items-center gap-1 text-slate-400">
          Speed
          <select value={baud} disabled={!!conn} onChange={(e) => setBaud(Number(e.target.value))} className="h-6 rounded border border-slate-700 bg-slate-900 px-1 text-[11px] text-slate-200" aria-label="Baud rate">
            {BAUD_RATES.map((b) => (
              <option key={b} value={b}>
                {b} baud
              </option>
            ))}
          </select>
        </label>
        <Button size="sm" variant="ghost" className="ml-auto h-6 text-[11px] text-slate-300" onClick={() => setLines([])}>
          Clear
        </Button>
        {note ? <p className="w-full text-[11px] text-slate-400" role="status" data-testid="usb-note">{note}</p> : null}
      </div>
      <LineList lines={lines} empty="Plug your board into this computer with a USB cable, press Connect a board and pick its port. Set Speed to the number in your sketch's Serial.begin()." />
      <SendBar
        disabled={!conn}
        hint={conn ? "Send a line to the board" : "Connect a board to send"}
        onSend={async (text) => {
          await conn?.write(text);
          push(text, "tx");
        }}
      />
    </>
  );
}

function ServerSerial() {
  const [lines, setLines] = useState<Line[]>([]);
  const [query, setQuery] = useState("");
  const [paused, setPaused] = useState(false);
  const [offline, setOffline] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await api.getFirmwareSerial({ limit: 400, query });
      setLines((res.lines as Line[]) || []);
      setPaused(Boolean(res.paused));
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }, [query]);

  useEffect(() => {
    // First poll on the next tick, then every 1.5 s, only while this tab is open.
    const first = window.setTimeout(() => void refresh(), 0);
    const t = window.setInterval(() => void refresh(), 1500);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(t);
    };
  }, [refresh]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-800 px-2 py-1 font-sans">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter…" className="h-6 w-32 border-slate-700 bg-slate-900 text-[11px]" aria-label="Filter lines" />
        <Button size="sm" variant="ghost" className="h-6 text-[11px] text-slate-300" onClick={() => void api.postFirmwareSerial({ action: paused ? "resume" : "pause" }).then(refresh, () => undefined)}>
          {paused ? "Resume" : "Pause"}
        </Button>
        <Button size="sm" variant="ghost" className="h-6 text-[11px] text-slate-300" onClick={() => void api.postFirmwareSerial({ action: "clear" }).then(refresh, () => undefined)}>
          Clear
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 text-[11px] text-slate-300"
          onClick={async () => {
            try {
              const res = await api.postFirmwareSerial({ action: "export", query });
              const blob = new Blob([String(res.export || "")], { type: "text/plain" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "kiungo-serial.log";
              a.click();
              URL.revokeObjectURL(url);
            } catch {
              setOffline(true);
            }
          }}
        >
          Export
        </Button>
        {offline ? <span className="ml-auto text-[11px] text-amber-300">Can&apos;t reach the server right now.</span> : null}
      </div>
      <LineList lines={lines} empty="Output from boards attached to the Kiungo server shows here. For a board on your own computer, choose My board (USB)." />
      <SendBar hint="Send a line through the server" onSend={async (line) => void (await api.postFirmwareSerial({ action: "write", line }).then(refresh, () => setOffline(true)))} />
    </>
  );
}
