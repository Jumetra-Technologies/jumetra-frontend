"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { api } from "@/lib/api-client";
import { setLabOwner, useLab } from "@/lib/lab/store";
import type { LabSession } from "@kiungo/core/lab/types";

function snapshot(sessions: LabSession[]): Map<string, string> {
  return new Map(sessions.map((session) => [session.id, JSON.stringify(session)]));
}

function newerSession(a: LabSession, b: LabSession): LabSession {
  return Date.parse(a.updatedAt) >= Date.parse(b.updatedAt) ? a : b;
}

/**
 * Loads and synchronizes the signed-in account's lab sessions. Mounted once
 * for the whole app so the lab, Projects and "open in the lab" share state.
 */
export function LabAccountSync() {
  const accountId = useAuthStore((s) => s.user?.id ?? null);
  useEffect(() => {
    setLabOwner(accountId);
    if (!accountId) return;

    let active = true;
    let ready = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let knownRemoteIds = new Set<string>();
    let lastSaved = new Map<string, string>();
    let writeQueue = Promise.resolve();
    let writeFailed = false;

    const reportSave = (error?: unknown) => {
      if (!active) return;
      if (error) {
        writeFailed = true;
        console.error("Could not sync lab sessions to the account.", error);
      }
      useLab.setState({ cloudSaveState: writeFailed ? "error" : "saved" });
    };

    const enqueueSave = (session: LabSession) => {
      writeQueue = writeQueue
        .then(async () => {
          if (!active) return;
          const saved = await api.saveMyLabSession(session);
          knownRemoteIds.add(session.id);
          if (Date.parse(saved.updatedAt) > Date.parse(session.updatedAt)) {
            lastSaved.set(session.id, JSON.stringify(saved));
            const current = useLab.getState().sessions.find((candidate) => candidate.id === session.id);
            if (current && Date.parse(current.updatedAt) <= Date.parse(session.updatedAt)) {
              useLab.setState((state) => ({
                sessions: state.sessions.map((candidate) => candidate.id === session.id ? saved : candidate),
              }));
            }
          }
        })
        .then(() => reportSave(), reportSave);
    };

    const enqueueDelete = (id: string) => {
      writeQueue = writeQueue
        .then(async () => {
          if (!active) return;
          await api.deleteMyLabSession(id);
          knownRemoteIds.delete(id);
        })
        .then(() => reportSave(), reportSave);
    };

    const unsubscribe = useLab.subscribe((state) => {
      if (!active || !ready) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        const current = state.sessions;
        const currentSnapshot = snapshot(current);
        const changed: LabSession[] = [];
        const deleted: string[] = [];
        for (const [id, value] of currentSnapshot) {
          if (lastSaved.get(id) !== value) {
            const session = current.find((candidate) => candidate.id === id);
            if (session) changed.push(session);
          }
        }
        for (const id of lastSaved.keys()) {
          if (!currentSnapshot.has(id) && knownRemoteIds.has(id)) deleted.push(id);
        }
        lastSaved = currentSnapshot;
        if (changed.length || deleted.length) {
          writeFailed = false;
          useLab.setState({ cloudSaveState: "syncing" });
          changed.forEach(enqueueSave);
          deleted.forEach(enqueueDelete);
        }
      }, 400);
    });

    useLab.setState({ cloudSaveState: "syncing" });
    void api.getMyLabSessions().then(
      (remoteSessions) => {
        if (!active) return;
        knownRemoteIds = new Set(remoteSessions.map((session) => session.id));
        const localSessions = useLab.getState().sessions;
        const merged = new Map(remoteSessions.map((session) => [session.id, session]));
        for (const local of localSessions) {
          const remote = merged.get(local.id);
          merged.set(local.id, remote ? newerSession(local, remote) : local);
        }
        const sessions = Array.from(merged.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        lastSaved = snapshot(sessions);
        ready = true;
        const activeId = useLab.getState().activeId;
        useLab.setState({
          sessions,
          activeId: activeId && merged.has(activeId) ? activeId : (sessions[0]?.id ?? null),
        });
        const remoteById = new Map(remoteSessions.map((session) => [session.id, JSON.stringify(session)]));
        const localById = new Map(localSessions.map((session) => [session.id, session]));
        const pending = sessions.filter((session) => {
          const local = localById.get(session.id);
          return !!local && JSON.stringify(session) !== remoteById.get(session.id);
        });
        if (pending.length) {
          writeFailed = false;
          useLab.setState({ cloudSaveState: "syncing" });
          pending.forEach(enqueueSave);
        } else {
          reportSave();
        }
      },
      (error: unknown) => {
        if (!active) return;
        reportSave(error);
      },
    );

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [accountId]);
  return null;
}
