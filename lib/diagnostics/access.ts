/**
 * Getting into System Diagnostics.
 *
 * The way in is hidden (seven clicks on the spinning board in Settings) so
 * that people who aren't administrators don't stumble on it. Hiding is not
 * security: anyone can read the app's code. What protects the data is the
 * server, which must only answer the admin endpoints for an ADMIN
 * (docs/system-diagnostics.md). The page also checks the signed-in user's
 * platform role, as the server reports it.
 */

import type { AuthUser } from "@/lib/auth-session";

export const UNLOCK_KEY = "kiungo-system-unlocked";
export const SYSTEM_ROUTE = "/system";
export const UNLOCK_CLICKS = 7;
/** The clicks must come in a run: a gap longer than this starts the count again. */
export const UNLOCK_GAP_MS = 1500;

export function isUnlocked(): boolean {
  try {
    return window.sessionStorage.getItem(UNLOCK_KEY) === "1";
  } catch {
    return false;
  }
}

export function unlock(): void {
  try {
    window.sessionStorage.setItem(UNLOCK_KEY, "1");
  } catch {
    /* Private mode: the page still opens for this navigation. */
  }
}

export function lock(): void {
  try {
    window.sessionStorage.removeItem(UNLOCK_KEY);
  } catch {
    /* ignore */
  }
}

export type AdminAccess = "admin" | "denied" | "signed-out" | "unknown";

/**
 * Whether the signed-in user is an administrator, by the role the server reports.
 * "unknown": signed in, but the server doesn't report platform roles yet.
 */
export function adminAccess(user: AuthUser | null | undefined): AdminAccess {
  if (!user) return "signed-out";
  if (user.platform_role === undefined || user.platform_role === null) return "unknown";
  return user.platform_role.toUpperCase() === "ADMIN" ? "admin" : "denied";
}

/** Counts clicks in a run; true on the click that completes it. */
export function makeClickCounter(clicks = UNLOCK_CLICKS, gap = UNLOCK_GAP_MS, now: () => number = Date.now) {
  let count = 0;
  let last = 0;
  return () => {
    const t = now();
    count = t - last > gap ? 1 : count + 1;
    last = t;
    if (count >= clicks) {
      count = 0;
      return true;
    }
    return false;
  };
}
