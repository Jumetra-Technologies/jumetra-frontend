/**
 * Learning progress: module completion is cached in browser storage and
 * synchronized to the signed-in account. Pure helpers here; the React hook is
 * components/learning/useLearningProgress.ts.
 */

export const PROGRESS_STORAGE_KEY = "hhip-learning-progress:v1";
const ACCOUNT_PROGRESS_PREFIX = "kiungo.learning-progress:v2:";
const listeners = new Set<() => void>();
let progressOwner: string | null = null;
let syncState: "idle" | "syncing" | "saved" | "error" = "idle";

function storageKey(): string {
  return progressOwner ? `${ACCOUNT_PROGRESS_PREFIX}${progressOwner}` : PROGRESS_STORAGE_KEY;
}

function notify(): void {
  listeners.forEach((listener) => listener());
}

export function setProgressOwner(accountId: string | null): void {
  if (accountId === progressOwner) return;
  progressOwner = accountId;
  syncState = accountId ? "syncing" : "idle";
  notify();
}

export function getProgressSyncState(): typeof syncState {
  return syncState;
}

export function setProgressSyncState(state: typeof syncState): void {
  if (syncState === state) return;
  syncState = state;
  notify();
}

/** Modules renamed in the Kiungo rebrand, so progress saved under the old slug still counts. */
const RENAMED: Record<string, string> = { "getting-started-with-hhip": "getting-started-with-kiungo" };

/** The stored string, or "" when there is none or storage is blocked. A string keeps the snapshot stable. */
export function readProgressRaw(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(storageKey()) ?? "";
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
    if (event.key === null || event.key === storageKey()) listener();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

export function replaceProgress(slugs: Iterable<string>): boolean {
  let ok = true;
  try {
    window.localStorage.setItem(storageKey(), serializeProgress(slugs));
  } catch {
    ok = false;
  }
  notify();
  return ok;
}

/** Mark a module done or not done. Returns false when the browser refused to store it. */
export function setModuleComplete(slug: string, complete: boolean): boolean {
  const completed = new Set(parseProgress(readProgressRaw()));
  if (complete) completed.add(slug);
  else completed.delete(slug);
  let ok = true;
  try {
    window.localStorage.setItem(storageKey(), serializeProgress(completed));
  } catch {
    ok = false;
  }
  notify();
  return ok;
}
