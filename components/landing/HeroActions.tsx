"use client";

import Link from "next/link";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openAuth } from "@/lib/account-dialogs";
import { useAuthStore } from "@/lib/auth-store";
import { HERO } from "@/lib/landing/content";

/**
 * The hero's two buttons. Build a robot now goes straight in: nobody has to
 * sign in to try the lab. Next to it, Log in (Continue with Google) for people
 * who want their work on every device; once signed in, that becomes the
 * learning path.
 */
export function HeroActions() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const signedIn = isAuthenticated && !isLoading;
  return (
    <div className="mt-9 flex flex-wrap items-center gap-3" data-testid="hero-actions">
      <Link href={HERO.primary.href} className="inline-flex">
        <Button size="lg" className="h-12 px-7 text-[15px]">
          {HERO.primary.label}
        </Button>
      </Link>
      {signedIn ? (
        <Link href={HERO.secondary.href} className="inline-flex">
          <Button size="lg" variant="secondary" className="h-12 px-7 text-[15px]">
            {HERO.secondary.label}
          </Button>
        </Link>
      ) : (
        <Button size="lg" variant="secondary" className="h-12 px-7 text-[15px]" onClick={() => openAuth("login")} data-testid="hero-login">
          <LogIn className="size-4" aria-hidden /> {HERO.login.label}
        </Button>
      )}
    </div>
  );
}
