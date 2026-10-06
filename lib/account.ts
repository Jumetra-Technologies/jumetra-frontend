"use client";

import { useEffect, useState } from "react";
import { getMe, type AuthUser } from "@/lib/auth";

export type AccountProfile = {
  name: string;
  email?: string;
};

export function useAccount(): AccountProfile | null {
  const [account, setAccount] = useState<AccountProfile | null>(null);

  useEffect(() => {
    getMe()
      .then((user: AuthUser) => {
        setAccount({ name: user.name, email: user.email });
      })
      .catch(() => setAccount(null));
  }, []);

  return account;
}

export function accountInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}
