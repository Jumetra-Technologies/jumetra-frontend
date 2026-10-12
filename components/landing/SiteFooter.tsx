import Link from "next/link";
import { KiungoLogo } from "@/components/brand/KiungoMark";
import { FOOTER } from "@/lib/landing/content";

function FooterLink({ href, label }: { href: string; label: string }) {
  const external = /^https?:\/\//.test(href);
  const className = "text-sm leading-7 text-muted transition-colors hover:text-foreground";
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

export function SiteFooter() {
  return (
    <footer className="border-t border-border" data-testid="site-footer">
      <div className="mx-auto w-full max-w-[1120px] px-5 py-14 sm:px-8 lg:px-10">
        {/*
          The brand and what Kiungo is, as one band across the top. It uses the
          same four-column grid as the links, so the text starts on the Learn
          column and runs to the edge of About.
        */}
        <div className="grid gap-5 border-b border-border pb-10 md:grid-cols-4 md:gap-x-8" data-testid="footer-about">
          <KiungoLogo variant="full" markClassName="size-9" className="self-start" />
          <p className="text-sm leading-7 text-muted md:col-span-3">{FOOTER.about}</p>
        </div>
        {/* Links underneath, four even columns (two on phones). */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 pt-10 md:grid-cols-4" data-testid="footer-links">
          {FOOTER.columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <p className="text-sm font-semibold text-foreground">{column.title}</p>
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
        <div className="mt-12 border-t border-border pt-6">
          <p className="text-xs leading-5 text-muted">{FOOTER.trademarks}</p>
          <p className="mt-3 text-xs leading-5 text-muted">{FOOTER.copyright}</p>
        </div>
      </div>
    </footer>
  );
}
