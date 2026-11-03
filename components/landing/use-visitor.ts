"use client";

import { useSyncExternalStore } from "react";
import { detectPlatform, type ReleaseArch, type ReleasePlatform } from "@/lib/releases";

const subscribe = () => () => undefined;

/** The visitor's browser, read after hydration so the first paint matches the server's. */
export function useUserAgent(): string {
  return useSyncExternalStore(
    subscribe,
    () => navigator.userAgent,
    () => "",
  );
}

/**
 * What the visitor is on: a platform the app runs on, a phone or tablet
 * (`phone`), or nothing yet (before hydration, both are false and `visitor` is null).
 */
export function useVisitor(): { visitor: { platform: ReleasePlatform; arch: ReleaseArch } | null; phone: boolean; known: boolean } {
  const ua = useUserAgent();
  const visitor = ua ? detectPlatform(ua) : null;
  return { visitor, phone: Boolean(ua) && !visitor, known: Boolean(ua) };
}
