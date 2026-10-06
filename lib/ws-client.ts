"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DashboardEvent } from "@/lib/types";
import { API_BASE, getWsUrl } from "@/lib/api-client";
import { authHeaders } from "@/lib/session-tokens";

export async function openAuthenticatedWebSocket(url: string): Promise<WebSocket> {
  const response = await fetch(`${API_BASE}/auth/ws-ticket`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
  });
  if (!response.ok) {
    throw new Error(`WebSocket authorization failed: ${response.status}`);
  }
  const body = (await response.json()) as { ticket: string };
  const socketUrl = new URL(url);
  socketUrl.searchParams.set("ticket", body.ticket);
  return new WebSocket(socketUrl.toString());
}

export function useEventStream(maxEvents = 50) {
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let cancelled = false;
    let ws: WebSocket | null = null;
    void openAuthenticatedWebSocket(getWsUrl())
      .then((socket) => {
        if (cancelled) {
          socket.close();
          return;
        }
        ws = socket;
        wsRef.current = socket;
        socket.onopen = () => setConnected(true);
        socket.onclose = () => setConnected(false);
        socket.onerror = () => setConnected(false);
        socket.onmessage = (msg) => {
          try {
            const event = JSON.parse(msg.data as string) as DashboardEvent;
            setEvents((prev) => [event, ...prev].slice(0, maxEvents));
          } catch {
            // ignore malformed messages
          }
        };
      })
      .catch(() => setConnected(false));

    return () => {
      cancelled = true;
      ws?.close();
      wsRef.current = null;
    };
  }, [maxEvents]);

  const clear = useCallback(() => setEvents([]), []);

  return { events, connected, clear };
}
