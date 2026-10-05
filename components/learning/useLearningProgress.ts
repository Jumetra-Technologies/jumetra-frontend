"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  parseProgress,
  readProgressRaw,
  setModuleComplete,
  subscribeProgress,
} from "@/lib/learning/progress";

const getServerSnapshot = () => "";

/**
 * Reads learning progress from local storage as an external store, so the UI stays
 * in sync across components and browser tabs without effects or hydration mismatches.
 */
export function useLearningProgress() {
  const raw = useSyncExternalStore(subscribeProgress, readProgressRaw, getServerSnapshot);
  const completed = useMemo(() => new Set(parseProgress(raw)), [raw]);
  const setComplete = useCallback((slug: string, complete: boolean) => {
    setModuleComplete(slug, complete);
  }, []);

  return { completed, setComplete };
}
