import type { CSSProperties } from "react";
import Link from "next/link";
import { KiungoLogo } from "@kiungo/ui/KiungoMark";
import { FOOTER } from "@/lib/landing/content";
import { cn } from "@/lib/utils";

function FooterLink({ href, label }: { href: string; label: string }) {
  const external = /^https?:\/\//.test(href);
  const className = "text-sm leading-7 text-[var(--footer-soft)] transition-colors hover:text-white hover:underline underline-offset-4";
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {label}
    </a>
  ) : (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}

/** The page color directly above the footer, which its gradient starts from. */
export type FooterFrom = "background" | "surface" | "canvas";

/**
 * The site footer: the page above melts into light blue, deepening to dark
 * blue at the bottom, under a static grain (.kiungo-footer in the theme).
 * Shown on Home, the Learning Center and Documentation.
 */
export function SiteFooter({ className, from = "background" }: { className?: string; from?: FooterFrom }) {
  return (
    <footer
      className={cn("kiungo-footer", className)}
      style={{ "--footer-from": `var(--${from})` } as CSSProperties}
      data-testid="site-footer"
    >
      <div className="mx-auto w-full max-w-[1120px] px-5 pb-14 pt-6 sm:px-8 lg:px-10">
        {/*
          The brand and what Kiungo is, as one band across the top. It uses the
          same four-column grid as the links, so the text starts on the Learn
          column and runs to the edge of About.
        */}
        <div className="grid gap-5 border-b border-white/15 pb-10 md:grid-cols-4 md:gap-x-8" data-testid="footer-about">
          <KiungoLogo variant="full" markClassName="size-9" className="self-start" />
          <p className="text-[15px] leading-7 text-[var(--footer-soft)] md:col-span-3">{FOOTER.about}</p>
        </div>
        {/* Links underneath, four even columns (two on phones). */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 pt-10 md:grid-cols-4" data-testid="footer-links">
          {FOOTER.columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white">{column.title}</p>
              <ul className="mt-3">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <FooterLink href={link.href} label={link.label} />
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-12 border-t border-white/15 pt-6">
          <p className="text-xs leading-5 text-[var(--footer-soft)]">{FOOTER.trademarks}</p>
          <p className="mt-3 text-xs leading-5 text-[var(--footer-soft)]">{FOOTER.copyright}</p>
        </div>
      </div>
    </footer>
  );
}
