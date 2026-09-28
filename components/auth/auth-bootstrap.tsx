"use client";

import { useEffect } from "react";
import { hydrateAuthStore, useAuthStore } from "@/lib/auth-store";

export function AuthBootstrap() {
  const refreshSession = useAuthStore((state) => state.refreshSession);

  useEffect(() => {
    hydrateAuthStore();
    void refreshSession();
  }, [refreshSession]);

  return null;
}
