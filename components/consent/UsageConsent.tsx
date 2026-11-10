"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useSyncExternalStore } from "react";

import { Button } from "@kiungo/ui/button";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { decideUsage, readUsageConsent, reconcile, storeUsageConsent, subscribeUsageConsent, type UsageConsent } from "@/lib/consent/usage";

const subscribeNothing = () => () => undefined;

/** This browser's answer about usage counting: undefined before the page has loaded in the browser, null if not asked. */
export function useUsageConsent(): UsageConsent | null | undefined {
  const mounted = useSyncExternalStore(subscribeNothing, () => true, () => false);
  const answer = useSyncExternalStore(subscribeUsageConsent, readUsageConsent, () => null);
  return mounted ? answer : undefined;
}

/** Answer the question, keeping the account in step when signed in. */
export function useDecideUsage(): (allowed: boolean) => Promise<void> {
  // The answer stays in this browser: accounts live on Kiungo's main server, which doesn't keep it,
  // and usage is counted by the browser's id on the admin portal's server (lib/activity/heartbeat.ts).
  return (allowed) => decideUsage(allowed, { signedIn: false, save: api.saveMyConsents });
}

/** Keeps this browser's answer and the account's the same once someone is signed in: the newer one wins. */
export function UsageConsentSync() {
  const userId = useAuthStore((s) => (s.isAuthenticated ? (s.user?.id ?? null) : null));
  useEffect(() => {
    if (!userId) return;
    let live = true;
    api
      .getMyConsents()
      .then((account) => {
        if (!live) return;
        const local = readUsageConsent();
        const step = reconcile(local, account);
        if (step === "push" && local) void api.saveMyConsents({ usage: local.allowed, decided_in: "website" }).catch(() => undefined);
        if (step === "pull" && account.usage !== null) storeUsageConsent({ allowed: account.usage, decidedAt: account.decided_at ?? new Date().toISOString() });
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [userId]);
  return null;
}

/** Pages where the banner stays out of the way: the policy it links to, and the admin portal. */
const QUIET = [/^\/legal\/cookies/, /^\/admin(\/|$)/];

/**
 * The question, asked once: may Kiungo count which pages you open and how
 * long you spend here and in the desktop app? Yes and No are the same size
 * and weight, nothing happens until one is chosen, and the answer can be
 * changed any time in Settings, Privacy.
 */
export function UsageConsentBanner() {
  const answer = useUsageConsent();
  const decide = useDecideUsage();
  const pathname = usePathname() ?? "/";
  const titleId = useId();
  if (answer !== null || QUIET.some((r) => r.test(pathname))) return null;
  return (
    <section
      role="region"
      aria-labelledby={titleId}
      className="hhip-notice hhip-notice-in fixed inset-x-4 bottom-4 z-[55] rounded-[12px] p-4 sm:inset-x-auto sm:left-1/2 sm:w-[min(640px,calc(100vw-3rem))] sm:-translate-x-1/2"
      data-testid="usage-consent-banner"
    >
      <h2 id={titleId} className="text-[15px] font-semibold leading-6">
        Can Kiungo count how you use it?
      </h2>
      <p className="mt-1 text-[13.5px] leading-5 text-[var(--notice-muted)]">
        With your OK, Kiungo records which pages you open and how long you spend here, without your name, so our team can see what helps. It never records what you type or build. You can change your mind any time in Settings.{" "}
        <Link href="/legal/cookies" className="font-medium text-white underline underline-offset-2 hover:no-underline">
          Cookie Policy
        </Link>
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
        <Button size="sm" className="bg-white text-[var(--kiungo-navy)] shadow-none hover:bg-white/90 focus-visible:ring-white/70 sm:min-w-[9.5rem]" onClick={() => void decide(false)} data-testid="usage-decline">
          Don&apos;t allow
        </Button>
        <Button size="sm" className="bg-white text-[var(--kiungo-navy)] shadow-none hover:bg-white/90 focus-visible:ring-white/70 sm:min-w-[9.5rem]" onClick={() => void decide(true)} data-testid="usage-allow">
          Allow
        </Button>
      </div>
    </section>
  );
}
