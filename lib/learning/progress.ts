/**
 * Learning progress: which modules a learner has marked complete.
 * Stored in the browser only (local storage), consistent with how projects are
 * stored today. Pure functions here; the React hook lives in
 * components/learning/useLearningProgress.ts.
 */

export const PROGRESS_STORAGE_KEY = "hhip-learning-progress:v1";
export const PROGRESS_CHANGE_EVENT = "hhip-learning-progress-change";

/** Modules renamed in the Kiungo rebrand, so progress saved under the old slug still counts. */
const RENAMED: Record<string, string> = { "getting-started-with-hhip": "getting-started-with-kiungo" };

/** Parses the stored value defensively; anything unexpected yields an empty list. */
export function parseProgress(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return Array.from(new Set(parsed.filter((item): item is string => typeof item === "string").map((slug) => RENAMED[slug] ?? slug)));
  } catch {
    return [];
  }
}

export function serializeProgress(slugs: Iterable<string>): string {
  return JSON.stringify(Array.from(new Set(slugs)));
}

/** Raw stored string, or "" when unavailable. A string keeps the snapshot referentially stable. */
export function readProgressRaw(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(PROGRESS_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function subscribeProgress(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === PROGRESS_STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(PROGRESS_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(PROGRESS_CHANGE_EVENT, onChange);
  };
}

export function setModuleComplete(slug: string, complete: boolean): void {
  if (typeof window === "undefined") return;
  const current = new Set(parseProgress(readProgressRaw()));
  if (complete) current.add(slug);
  else current.delete(slug);
  try {
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, serializeProgress(current));
  } catch {
    /* storage unavailable (private mode, quota): progress simply is not saved */
  }
  window.dispatchEvent(new Event(PROGRESS_CHANGE_EVENT));
}
