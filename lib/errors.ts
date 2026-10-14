/**
 * What people see when something goes wrong, and what gets logged.
 *
 * Users get one short sentence: what didn't happen, then what to do or the
 * assurance that it's logged. Never a status code, a URL, "API", "server
 * error 502" or a stack trace. The technical details go to System
 * Diagnostics (lib/diagnostics/store.ts) with the sentence the user saw.
 */

import { ApiError } from "@/lib/api-client";
import { annotateError, recordError, type ErrorSource } from "@/lib/diagnostics/store";

export type ErrorKind = "offline" | "timeout" | "sign-in" | "not-found" | "too-big" | "busy" | "fault";

/** The next step for each kind of failure, in plain words. */
export const NEXT_STEP: Record<ErrorKind, string> = {
  offline: "Check your internet connection and try again.",
  timeout: "This is taking longer than usual. Try again in a moment.",
  "sign-in": "Sign in and try again.",
  "not-found": "It may have been moved or deleted.",
  "too-big": "It's too large. Try something smaller.",
  busy: "Kiungo is busy right now. Try again in a minute.",
  fault: "Something unexpected happened. Please try again in a moment.",
};

export function errorKind(err: unknown): ErrorKind {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return "offline";
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) return "sign-in";
    if (err.status === 404) return "not-found";
    if (err.status === 413) return "too-big";
    if (err.status === 429 || err.status === 503) return "busy";
    if (err.status === 408 || err.status === 504) return "timeout";
    return "fault";
  }
  const message = err instanceof Error ? err.message : String(err ?? "");
  if (/timed out|timeout/i.test(message)) return "timeout";
  if (err instanceof TypeError || /network|failed to fetch|load failed|cannot reach|offline/i.test(message)) return "offline";
  return "fault";
}

/** The id of the diagnostics entry the request layer already wrote for this error, if any. */
const LOGGED = Symbol.for("kiungo.diagnostics.id");

/**
 * Log an error for System Diagnostics and return the sentence to show:
 * `whatFailed` ("Your project wasn't saved") followed by the next step.
 */
export function describeError(err: unknown, whatFailed: string, source: ErrorSource = "action"): string {
  const shown = `${whatFailed.replace(/[.\s]+$/, "")}. ${NEXT_STEP[errorKind(err)]}`;
  const logged = err && typeof err === "object" ? (err as Record<symbol, string>)[LOGGED] : undefined;
  if (logged) annotateError(logged, shown);
  else if (errorKind(err) !== "sign-in") {
    recordError({ source, message: err instanceof Error ? err.message : String(err), detail: err instanceof Error ? err.stack : undefined, shown });
  }
  return shown;
}

/** Browser storage refused a write (private mode, full, blocked): log it and say what to do. */
export function storageError(whatFailed: string): string {
  const shown = `${whatFailed.replace(/[.\s]+$/, "")}. This browser isn't letting Kiungo save data: check its privacy or storage settings, then try again.`;
  recordError({ source: "action", message: `Browser storage write failed: ${whatFailed}`, shown });
  return shown;
}
