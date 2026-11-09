"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { SegmentedControl } from "@kiungo/ui/segmented-control";

import { useDecideUsage, useUsageConsent } from "./UsageConsent";

/** Settings, Privacy: the same question as the banner, changeable any time. */
export function PrivacyTile() {
  const answer = useUsageConsent();
  const decide = useDecideUsage();
  const value = answer?.allowed === true ? "allow" : answer?.allowed === false ? "decline" : "";
  return (
    <section className="rounded-[12px] border border-border bg-canvas p-5 md:col-span-2" data-testid="privacy-tile">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <ShieldCheck className="size-4 shrink-0 text-muted" aria-hidden />
        Privacy
      </h3>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <p className="max-w-[60ch] text-xs leading-5 text-muted">
          Count which pages I open and how long I spend on the website and in the desktop app, so Kiungo&apos;s team can see what helps. Nothing I type or build is recorded. Saying no deletes what was counted for me.{" "}
          <Link href="/legal/cookies" className="text-foreground underline underline-offset-2 hover:no-underline">
            Cookie Policy
          </Link>
        </p>
        <SegmentedControl
          label="Count my usage"
          size="sm"
          value={value}
          options={[
            { id: "decline", label: "Don't allow" },
            { id: "allow", label: "Allow" },
          ]}
          onChange={(v) => void decide(v === "allow")}
        />
      </div>
      <p className="mt-2 text-xs text-muted" data-testid="privacy-status">
        {answer === undefined ? "" : answer === null ? "You haven't chosen yet, so nothing is counted." : answer.allowed ? "Allowed. Signed in, this applies to your account everywhere, including the desktop app." : "Not allowed. Nothing is counted."}
      </p>
    </section>
  );
}
