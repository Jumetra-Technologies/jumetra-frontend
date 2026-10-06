"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { getHardwareWsUrl } from "@/lib/api-client";
import { openAuthenticatedWebSocket } from "@/lib/ws-client";

type Toast = { id: string; title: string; detail: string };

export function AutoDiscoveryToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let cancelled = false;
    void openAuthenticatedWebSocket(getHardwareWsUrl())
      .then((socket) => {
        if (cancelled) {
          socket.close();
          return;
        }
        ws = socket;
        socket.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          const type = msg.type || msg.event;
          const p = msg.payload || {};
          if (type === "BOARD_CONNECTED" || type === "NODE_CREATED" || type === "WORKSPACE_NODE_CREATED") {
            const id = String(p.device_id || Date.now());
            setToasts((prev) => [
              ...prev.slice(-4),
              {
                id,
                title: "Board connected",
                detail: `${p.label || p.board_type || "Hardware"} · ${p.endpoint || p.transport || ""}`,
              },
            ]);
          }
          if (type === "BOARD_DISCONNECTED" || type === "NODE_REMOVED") {
            const id = `disc-${p.device_id || Date.now()}`;
            setToasts((prev) => [
              ...prev.slice(-4),
              {
                id,
                title: "Board disconnected",
                detail: String(p.device_id || "device"),
              },
            ]);
          }
        } catch {
          /* ignore */
        }
        };
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      ws?.close();
    };
  }, []);

  useEffect(() => {
    if (!toasts.length) return;
    const t = setTimeout(() => setToasts((prev) => prev.slice(1)), 4200);
    return () => clearTimeout(t);
  }, [toasts]);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="rounded-lg border border-border bg-surface px-3 py-2 shadow-lg"
          >
            <p className="text-xs font-semibold text-foreground">{t.title}</p>
            <p className="truncate text-[11px] text-muted">{t.detail}</p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
