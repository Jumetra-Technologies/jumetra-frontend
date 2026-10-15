/**
 * Learning progress: which modules a learner has marked complete, kept in
 * this browser. Pure helpers here; the React hook is
 * components/learning/useLearningProgress.ts.
 */

export const PROGRESS_STORAGE_KEY = "hhip-learning-progress:v1";
const listeners = new Set<() => void>();

/** Modules renamed in the Kiungo rebrand, so progress saved under the old slug still counts. */
const RENAMED: Record<string, string> = { "getting-started-with-hhip": "getting-started-with-kiungo" };

/** The stored string, or "" when there is none or storage is blocked. A string keeps the snapshot stable. */
export function readProgressRaw(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(PROGRESS_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

/** Parses defensively: anything unexpected is an empty list. Renamed modules map to their new slug, and repeats are dropped. */
export function parseProgress(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return Array.from(new Set(parsed.filter((value): value is string => typeof value === "string").map((slug) => RENAMED[slug] ?? slug)));
  } catch {
    return [];
  }
}

export function serializeProgress(slugs: Iterable<string>): string {
  return JSON.stringify(Array.from(new Set(slugs)));
}

export function subscribeProgress(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === PROGRESS_STORAGE_KEY) listener();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

/** Mark a module done or not done. Returns false when the browser refused to store it. */
export function setModuleComplete(slug: string, complete: boolean): boolean {
  const completed = new Set(parseProgress(readProgressRaw()));
  if (complete) completed.add(slug);
  else completed.delete(slug);
  let ok = true;
  try {
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, serializeProgress(completed));
  } catch {
    ok = false;
  }
  listeners.forEach((listener) => listener());
  return ok;
}
