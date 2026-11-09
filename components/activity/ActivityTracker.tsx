"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { BEAT_MS, IDLE_MS, counted, mayTrack, sendHeartbeat } from "@/lib/activity/heartbeat";
import { useUsageConsent } from "@/components/consent/UsageConsent";
import { useAuthStore } from "@/lib/auth-store";

/** Tells the server which page is open and that someone is using it. Renders nothing. */
export function ActivityTracker() {
  const pathname = usePathname() ?? "/";
  const signedIn = useAuthStore((s) => s.isAuthenticated);
  const authLoading = useAuthStore((s) => s.isLoading);
  const lastInput = useRef(0);
  const path = useRef(pathname);
  const signed = useRef(signedIn);
  // Nothing is sent without a yes (lib/consent/usage.ts).
  const allowed = mayTrack(useUsageConsent());
  const allowedRef = useRef(allowed);
  const off = process.env.NEXT_PUBLIC_ACTIVITY === "off";

  useEffect(() => {
    signed.current = signedIn;
    allowedRef.current = allowed;
  }, [signedIn, allowed]);

  // A view for each page, once sign-in has settled, so it counts for the right person.
  useEffect(() => {
    const previous = path.current;
    path.current = pathname;
    if (off || authLoading || !allowed) return;
    // Going into the admin portal ends the visit there, so the admin doesn't show up as someone online.
    if (!counted(pathname)) {
      if (counted(previous) && previous !== pathname) sendHeartbeat("leave", previous, signedIn);
      return;
    }
    lastInput.current = Date.now();
    sendHeartbeat("view", pathname, signedIn);
  }, [pathname, signedIn, authLoading, off, allowed]);

  useEffect(() => {
    if (off) return;
    const touch = () => {
      lastInput.current = Date.now();
    };
    const events = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "scroll"] as const;
    for (const e of events) window.addEventListener(e, touch, { passive: true, capture: true });

    const live = () => counted(path.current) && allowedRef.current;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible" || Date.now() - lastInput.current > IDLE_MS || !live()) return;
      sendHeartbeat("beat", path.current, signed.current);
    }, BEAT_MS);

    const onVisibility = () => {
      if (!live()) return;
      if (document.visibilityState === "hidden") sendHeartbeat("leave", path.current, signed.current);
      else {
        lastInput.current = Date.now();
        sendHeartbeat("beat", path.current, signed.current);
      }
    };
    const onLeave = () => live() && sendHeartbeat("leave", path.current, signed.current);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onLeave);
    return () => {
      for (const e of events) window.removeEventListener(e, touch, { capture: true });
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onLeave);
    };
  }, [off]);

  return null;
}
