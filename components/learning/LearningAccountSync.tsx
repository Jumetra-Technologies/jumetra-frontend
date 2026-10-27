"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { api } from "@/lib/api-client";
import {
  parseProgress,
  readProgressRaw,
  replaceProgress,
  serializeProgress,
  setProgressOwner,
  setProgressSyncState,
  subscribeProgress,
} from "@/lib/learning/progress";

export function LearningAccountSync() {
  const accountId = useAuthStore((state) => state.user?.id ?? null);

  useEffect(() => {
    setProgressOwner(accountId);
    if (!accountId) return;

    let active = true;
    let loaded = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastSaved = "";

    const save = async (completed: string[]) => {
      if (!active) return;
      setProgressSyncState("syncing");
      try {
        await api.saveMyLearningProgress(completed);
        if (!active) return;
        lastSaved = serializeProgress(completed);
        setProgressSyncState("saved");
      } catch (error) {
        if (!active) return;
        console.error("Could not sync learning progress to the account.", error);
        setProgressSyncState("error");
      }
    };

    const unsubscribe = subscribeProgress(() => {
      if (!active || !loaded) return;
      const current = serializeProgress(parseProgress(readProgressRaw()));
      if (current === lastSaved) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        void save(parseProgress(readProgressRaw()));
      }, 400);
    });

    setProgressSyncState("syncing");
    void api.getMyLearningProgress().then(
      async ({ completed: remote }) => {
        if (!active) return;
        const local = parseProgress(readProgressRaw());
        const merged = Array.from(new Set([...remote, ...local]));
        const savedLocally = replaceProgress(merged);
        if (!savedLocally) {
          setProgressSyncState("error");
          return;
        }
        loaded = true;
        lastSaved = serializeProgress(remote);
        if (lastSaved !== serializeProgress(merged)) {
          await save(merged);
        } else {
          setProgressSyncState("saved");
        }
      },
      (error: unknown) => {
        if (!active) return;
        console.error("Could not load learning progress from the account.", error);
        setProgressSyncState("error");
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
