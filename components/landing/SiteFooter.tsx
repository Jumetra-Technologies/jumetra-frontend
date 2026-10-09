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
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.3fr)_repeat(4,minmax(0,1fr))]">
          <div>
            <KiungoLogo variant="full" markClassName="size-9" />
            <p className="mt-4 max-w-sm text-sm leading-6 text-muted">{FOOTER.about}</p>
          </div>
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
