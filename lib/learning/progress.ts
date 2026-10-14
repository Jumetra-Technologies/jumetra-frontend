const PROGRESS_STORAGE_KEY = "hhip-learning-progress:v1";
const listeners = new Set<() => void>();

export function readProgressRaw(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(PROGRESS_STORAGE_KEY) ?? "";
}

export function parseProgress(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === "string");
  } catch (error) {
    console.error("Could not parse saved learning progress.", error);
    return [];
  }
}

export function subscribeProgress(listener: () => void): () => void {
  listeners.add(listener);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", listener);
  }
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", listener);
    }
  };
}

export function setModuleComplete(slug: string, complete: boolean): void {
  const completed = new Set(parseProgress(readProgressRaw()));
  if (complete) completed.add(slug);
  else completed.delete(slug);
  window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify([...completed]));
  listeners.forEach((listener) => listener());
}
