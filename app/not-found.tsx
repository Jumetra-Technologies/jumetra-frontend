import Link from "next/link";
import { KiungoMark } from "@/components/brand/KiungoMark";
import { DashboardShell } from "@/components/layout/sidebar";

/** A broken link, drawn with the mark: the two links of the K come apart. */
export default function NotFound() {
  return (
    <DashboardShell activePath="">
      <div className="mx-auto flex min-h-[70svh] max-w-lg flex-col items-center justify-center text-center" data-testid="not-found">
        <KiungoMark state="broken" className="size-32" title="The Kiungo mark, its two links pulled apart" />
        <p className="mt-8 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-muted">404</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">This link is broken</h1>
        <p className="mt-3 text-[15px] leading-7 text-muted">
          The page you followed doesn&apos;t exist, or it moved when HHIP became Kiungo. Everything you saved is still here.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <Link href="/" className="inline-flex h-10 items-center rounded-[10px] bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">
            Go home
          </Link>
          <Link href="/laboratory/workspace" className="inline-flex h-10 items-center rounded-[10px] border border-border bg-surface px-4 text-sm font-medium hover:bg-muted-bg">
            Open the Engineering Lab
          </Link>
          <Link href="/docs" className="inline-flex h-10 items-center rounded-[10px] border border-border bg-surface px-4 text-sm font-medium hover:bg-muted-bg">
            Search the docs
          </Link>
        </div>
      </div>
    </DashboardShell>
  );
}
