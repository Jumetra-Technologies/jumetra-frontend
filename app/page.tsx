"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { continueWithGoogle } from "@/lib/auth";

const PILLARS = [
  ["Workspace", "Place controllers, sensors, and virtual parts on a shared canvas."],
  ["Laboratory", "Run live hardware next to simulated nodes in one session."],
  ["Hybrid runtime", "Map virtual pins to physical boards and keep them in sync."],
  ["Firmware studio", "Edit, build, and upload firmware beside the circuit."],
  ["Experiments", "Record runs, latency, and sync metrics for research."],
  ["Devices", "Discover connected boards, inspect pins, and watch health."],
];

export default function LandingPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onGoogle() {
    setBusy(true);
    setError(null);
    try {
      await continueWithGoogle();
      router.replace("/workspace");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b border-border bg-header px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
            H
          </span>
          <div>
            <p className="text-sm font-semibold text-header-foreground">HHIP</p>
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted">
              Hybrid Hardware Integration Platform
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-12 px-6 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">
            Design, simulate, and run physical hardware in one workspace.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
            HHIP is a research operations platform for hybrid systems. You wire real boards to
            virtual components, flash firmware, run laboratory sessions, and measure how well
            hardware and simulation stay synchronized. Sign in with Google via Firebase; the
            backend issues Bearer tokens for API access.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {PILLARS.map(([title, body]) => (
              <Card key={title} className="p-4">
                <h2 className="text-sm font-semibold text-foreground">{title}</h2>
                <p className="mt-1 text-xs leading-relaxed text-muted">{body}</p>
              </Card>
            ))}
          </div>
        </div>

        <Card className="p-8">
          <h2 className="text-lg font-semibold text-foreground">Continue to HHIP</h2>
          <p className="mt-2 text-sm text-muted">
            SIGN IN
          </p>
          <Button className="mt-6 w-full" size="lg" type="button" disabled={busy} onClick={onGoogle}>
            {busy ? "Signing in" : "Continue with Google"}
          </Button>
          {error ? <p className="mt-3 text-center text-xs text-danger">{error}</p> : null}
        </Card>
      </main>
    </div>
  );
}
