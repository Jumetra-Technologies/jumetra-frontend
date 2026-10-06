"use client";

import { useSyncExternalStore } from "react";

/**
 * Open/closed state for the Settings modal, shared app-wide so any control
 * (the sidebar's gear, the /settings address) can open it.
 */
let open = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function openSettings(): void {
  if (open) return;
  open = true;
  emit();
}

export function closeSettings(): void {
  if (!open) return;
  open = false;
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSettingsOpen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => open,
    () => false,
  );
}

export { SETTINGS_QUERY_FLAG } from "./settings-query";
