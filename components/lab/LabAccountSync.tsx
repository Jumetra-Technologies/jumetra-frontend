"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { setLabOwner } from "@/lib/lab/store";

/**
 * Opens the signed-in account's lab sessions, and closes them on sign-out.
 * Mounted once for the whole app, so the lab, Projects and every "open in the
 * lab" button see the same account's sessions.
 */
export function LabAccountSync() {
  const accountId = useAuthStore((s) => s.user?.id ?? null);
  useEffect(() => {
    setLabOwner(accountId);
  }, [accountId]);
  return null;
}
