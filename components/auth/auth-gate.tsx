"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getMe, type AuthUser } from "@/lib/auth";

const PUBLIC_PATHS = new Set(["/"]);

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    if (!ready) return;
    const isPublic = PUBLIC_PATHS.has(pathname);
    if (user && isPublic) {
      router.replace("/workspace");
      return;
    }
    if (!user && !isPublic) {
      router.replace("/");
    }
  }, [ready, user, pathname, router]);

  if (!ready) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-sm text-muted">
        Loading
      </div>
    );
  }

  const isPublic = PUBLIC_PATHS.has(pathname);
  if (!user && !isPublic) return null;
  if (user && isPublic) return null;
  return children;
}
