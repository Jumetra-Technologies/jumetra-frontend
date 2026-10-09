"use client";

import { useSyncExternalStore } from "react";

/**
 * Which account modal is open, shared app-wide (same pattern as the
 * Settings modal) so the sidebar, Settings and the landing page can all open
 * them. The profile can sit on top of Settings; sign-in and profile never
 * show together.
 */
export type AuthMode = "login" | "signup";
export type AccountDialog = { kind: "auth"; mode: AuthMode } | { kind: "profile" } | null;

let current: AccountDialog = null;
const listeners = new Set<() => void>();

function set(next: AccountDialog) {
  current = next;
  for (const listener of listeners) listener();
}

export const openAuth = (mode: AuthMode = "login") => set({ kind: "auth", mode });
export const openProfile = () => set({ kind: "profile" });
export const closeAccountDialog = () => {
  if (current) set(null);
};

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAccountDialog(): AccountDialog {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
}
