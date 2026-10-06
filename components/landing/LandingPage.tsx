import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { HERO, HYBRID, LEARN, LIBRARY, SIMULATE, SIGN_UP } from "@/lib/landing/content";
import { cn } from "@/lib/utils";
import { HeroBoard } from "./HeroBoard";
import { HybridSwitch } from "./HybridSwitch";
import { LearningPathStrip } from "./LearningPathStrip";
import { LiveParts } from "./LiveParts";
import { PartsList } from "./PartsList";
import { SignUpSection } from "./SignUpSection";
import { SiteFooter } from "./SiteFooter";

const container = "mx-auto w-full max-w-[1120px] px-5 sm:px-8 lg:px-10";

function CallToAction({ href, label, primary = true }: { href: string; label: string; primary?: boolean }) {
  return (
    <Link href={href} className="inline-flex">
      <Button size="lg" variant={primary ? "default" : "secondary"} className="h-12 px-7 text-[15px]">
        {label}
      </Button>
    </Link>
  );
}

/**
 * One beat of the story. The copper trace down the left joins the beats in
 * order, with a pad at each heading, the way a PCB trace joins components.
 */
function Beat({
  id,
  heading,
  body,
  first = false,
  last = false,
  children,
}: {
  id: string;
  heading: string;
  body: string;
  first?: boolean;
  last?: boolean;
  children?: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="relative py-14 pl-9 sm:pl-12 lg:py-20">
      <span
        aria-hidden
        className={cn("absolute left-[9px] w-0.5 bg-[color-mix(in_srgb,var(--primary)_38%,var(--border))]", first ? "top-[calc(3.5rem+0.55em)]" : "top-0", last ? "bottom-[calc(100%-3.5rem-0.55em)]" : "bottom-0", "lg:top-[calc(5rem+0.55em)]", first ? "" : "lg:top-0", last ? "lg:bottom-[calc(100%-5rem-0.55em)]" : "lg:bottom-0")}
      />
      <span
        aria-hidden
        className="absolute left-0 top-[calc(3.5rem+0.2em)] flex size-5 items-center justify-center rounded-full border-2 border-primary bg-background lg:top-[calc(5rem+0.2em)]"
      >
        <span className="size-1.5 rounded-full bg-primary" />
      </span>
      <h2 id={`${id}-heading`} className="text-3xl font-bold leading-[1.08] tracking-[-0.03em] text-foreground sm:text-4xl lg:text-[2.75rem]">
        {heading.split("\n").map((line, index, lines) => (
          <span key={line} className="md:block">
            {line}
            {index < lines.length - 1 ? " " : null}
          </span>
        ))}
      </h2>
      {body ? <p className="mt-5 max-w-[56ch] text-lg leading-8 text-muted">{body}</p> : null}
      {children ? <div className={body ? "mt-10" : "mt-6"}>{children}</div> : null}
    </section>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-background" data-testid="landing">
      {/* Hero */}
      <header className={cn(container, "pt-14 pb-10 sm:pt-20 lg:pt-24 lg:pb-16")}>
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-14">
          <div>
            <h1 className="text-[2.5rem] font-extrabold leading-[1.02] tracking-[-0.035em] text-foreground sm:text-6xl lg:text-[4.4rem]">
              {HERO.headlineLines.map((line, index) => (
                <span key={line} className="block">
                  {line}
                  {index < HERO.headlineLines.length - 1 ? " " : null}
                </span>
              ))}
            </h1>
            <p className="mt-7 max-w-[50ch] text-lg leading-8 text-muted sm:text-xl sm:leading-9">{HERO.lead}</p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <CallToAction href={HERO.primary.href} label={HERO.primary.label} />
              <CallToAction href={HERO.secondary.href} label={HERO.secondary.label} primary={false} />
            </div>
            <p className="mt-7 max-w-[50ch] text-sm leading-6 text-muted">{HERO.facts}</p>
          </div>
          <div className="mx-auto w-full max-w-[460px] lg:mx-0 lg:justify-self-end">
            <HeroBoard hint={HERO.boardHint} />
          </div>
        </div>
      </header>

      {/* The story */}
      <main className={cn(container, "pb-24")}>
        <Beat id="simulate" heading={SIMULATE.heading} body={SIMULATE.body} first>
          <LiveParts />
          <p className="mt-6 max-w-[56ch] font-mono text-xs leading-5 text-muted">{SIMULATE.previewNote}</p>
          <div className="mt-8">
            <CallToAction href={SIMULATE.cta.href} label={SIMULATE.cta.label} />
          </div>
        </Beat>

        <Beat id="learn" heading={LEARN.heading} body={LEARN.body}>
          <LearningPathStrip />
          <div className="mt-8">
            <CallToAction href={LEARN.cta.href} label={LEARN.cta.label} />
          </div>
        </Beat>

        <Beat id="library" heading={LIBRARY.heading} body={LIBRARY.body}>
          <PartsList />
          <div className="mt-8">
            <CallToAction href={LIBRARY.cta.href} label={LIBRARY.cta.label} />
          </div>
        </Beat>

        <Beat id="hybrid" heading={HYBRID.heading} body={HYBRID.body}>
          <HybridSwitch />
          <div className="mt-8">
            <CallToAction href={HYBRID.cta.href} label={HYBRID.cta.label} primary={false} />
          </div>
        </Beat>

        <Beat id="account" heading={SIGN_UP.heading} body="" last>
          <SignUpSection />
        </Beat>
      </main>

      <SiteFooter />
    </div>
  );
}
