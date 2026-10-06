"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, PanelLeftClose, PanelLeftOpen, Settings, Star, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  NAV_SECTIONS,
  isNavItemActive,
  type NavItem,
} from "@/components/layout/nav-items";
import { accountInitials, useAccount } from "@/lib/account";
import { cn } from "@/lib/utils";

const COLLAPSE_KEY = "hhip-sidebar-collapsed";

function NavLink({
  item,
  activePath,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  activePath: string;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const active = isNavItemActive(activePath, item.href);

  if (collapsed) {
    return (
      <Link
        href={item.href}
        title={item.label}
        onClick={onNavigate}
        className={cn(
          "relative flex size-10 items-center justify-center rounded-lg transition-colors",
          active
            ? "bg-primary text-primary-foreground"
            : "text-sidebar-muted hover:bg-[var(--sidebar-hover)] hover:text-sidebar-foreground",
        )}
      >
        <Icon className="size-4" aria-hidden />
        <span className="sr-only">{item.label}</span>
        {item.primary && !active ? (
          <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary" aria-hidden />
        ) : null}
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-[var(--shadow-sm)]"
          : "text-sidebar-muted hover:bg-[var(--sidebar-hover)] hover:text-sidebar-foreground",
      )}
    >
      <Icon className="size-4 shrink-0 opacity-90" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.primary ? (
        <span
          className={cn(
            "inline-flex size-5 shrink-0 items-center justify-center rounded-full",
            active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-[var(--sidebar-hover)] text-sidebar-foreground",
          )}
          title="Primary workspace"
        >
          <Star className="size-2.5 fill-current" aria-hidden />
        </span>
      ) : null}
    </Link>
  );
}

function NavLinks({
  activePath,
  onNavigate,
  collapsed = false,
}: {
  activePath: string;
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  return (
    <nav
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-y-auto",
        collapsed ? "items-center gap-4 px-2 py-4" : "gap-5 px-3 py-4",
      )}
      aria-label="Primary"
    >
      {NAV_SECTIONS.map((section) => (
        <div
          key={section.id}
          className={cn("flex flex-col", collapsed ? "items-center gap-1" : "gap-1")}
        >
          {collapsed ? (
            <span className="sr-only">{section.label}</span>
          ) : (
            <p className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-muted/70">
              {section.label}
            </p>
          )}
          {section.items.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              activePath={activePath}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ))}
    </nav>
  );
}

function AccountPlaceholder({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const account = useAccount();
  const signedIn = Boolean(account?.name);

  if (collapsed) {
    return (
      <Link
        href="/settings"
        onClick={onNavigate}
        title={signedIn ? account!.name : "Account"}
        className="flex size-10 items-center justify-center rounded-lg hover:bg-[var(--sidebar-hover)]"
      >
        {signedIn ? (
          <span
            className="flex size-8 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground"
            aria-hidden
          >
            {accountInitials(account!.name)}
          </span>
        ) : (
          <span
            className="flex size-8 items-center justify-center rounded-full border border-[var(--sidebar-border)] bg-[var(--sidebar-hover)] text-sidebar-muted"
            aria-hidden
          >
            <User className="size-3.5" />
          </span>
        )}
        <span className="sr-only">{signedIn ? account!.name : "Account — sign up to personalize"}</span>
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg px-1 py-1">
      {signedIn ? (
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground"
          aria-hidden
        >
          {accountInitials(account!.name)}
        </span>
      ) : (
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[var(--sidebar-border)] bg-[var(--sidebar-hover)] text-sidebar-muted"
          aria-hidden
        >
          <User className="size-3.5" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        {signedIn ? (
          <>
            <p className="truncate text-xs font-semibold text-sidebar-foreground">{account!.name}</p>
            {account!.email ? (
              <p className="truncate text-[10px] text-sidebar-muted">{account!.email}</p>
            ) : (
              <p className="truncate text-[10px] text-sidebar-muted">Signed in</p>
            )}
          </>
        ) : (
          <>
            <p className="truncate text-xs font-semibold text-sidebar-foreground">Account</p>
            <p className="truncate text-[10px] text-sidebar-muted">Sign up to personalize</p>
          </>
        )}
      </div>
      <Link
        href="/settings"
        onClick={onNavigate}
        aria-label="Open settings"
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-sidebar-muted hover:bg-[var(--sidebar-hover)] hover:text-sidebar-foreground"
      >
        <Settings className="size-3.5" aria-hidden />
      </Link>
    </div>
  );
}

export function Sidebar({
  activePath,
  collapsed = false,
  onNavigate,
}: {
  activePath: string;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground",
        collapsed ? "w-[4.5rem]" : "w-60",
      )}
      style={{ borderColor: "var(--sidebar-border)" }}
    >
      <div
        className={cn(
          "flex shrink-0 items-center border-b",
          collapsed ? "justify-center px-2 py-4" : "gap-3 px-4 py-4",
        )}
        style={{ borderColor: "var(--sidebar-border)" }}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-[var(--shadow-sm)]">
          H
        </span>
        {!collapsed ? (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-sidebar-foreground">HHIP</p>
            <p className="truncate text-[10px] font-medium uppercase tracking-[0.12em] text-sidebar-muted">
              Engineering Platform
            </p>
          </div>
        ) : null}
      </div>
      <NavLinks activePath={activePath} collapsed={collapsed} onNavigate={onNavigate} />
      <div
        className={cn("mt-auto shrink-0 border-t", collapsed ? "p-2" : "p-3")}
        style={{ borderColor: "var(--sidebar-border)" }}
      >
        <AccountPlaceholder collapsed={collapsed} onNavigate={onNavigate} />
      </div>
    </aside>
  );
}

export function DashboardShell({
  activePath,
  children,
  fullBleed = false,
}: {
  activePath: string;
  children: React.ReactNode;
  fullBleed?: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [collapsed, ready]);

  return (
    <div className="flex h-svh flex-col overflow-hidden bg-background">
      <header
        className="flex h-16 shrink-0 items-center gap-3 border-b bg-header px-4 text-header-foreground shadow-[var(--shadow-sm)] sm:px-6"
        style={{ borderColor: "var(--sidebar-border)" }}
      >
        <Button
          size="icon"
          variant="ghost"
          className="text-header-foreground hover:bg-[var(--sidebar-hover)] hover:text-header-foreground lg:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
        >
          <Menu className="size-5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="hidden text-header-foreground hover:bg-[var(--sidebar-hover)] hover:text-header-foreground lg:inline-flex"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
        </Button>
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            HHIP
          </span>
          <span className="hidden truncate text-sm font-semibold text-header-foreground sm:inline">
            Engineering Platform
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {!fullBleed ? (
            <Link href="/laboratory/workspace">
              <Button size="sm">Open Laboratory</Button>
            </Link>
          ) : null}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="hidden h-full shrink-0 lg:flex">
          <Sidebar activePath={activePath} collapsed={collapsed} />
        </div>

        {mobileOpen ? (
          <div className="fixed inset-0 z-40 flex lg:hidden" role="dialog" aria-modal="true">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              aria-label="Close navigation"
              onClick={() => setMobileOpen(false)}
            />
            <div className="relative z-10 flex h-full shadow-[var(--shadow-md)]">
              <div className="absolute right-2 top-2 z-20">
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-sidebar-foreground hover:bg-[var(--sidebar-hover)]"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                >
                  <X className="size-4" />
                </Button>
              </div>
              <Sidebar activePath={activePath} onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        ) : null}

        <main
          className={cn(
            "min-h-0 min-w-0 flex-1 bg-canvas",
            fullBleed ? "flex flex-col overflow-hidden" : "overflow-y-auto",
          )}
        >
          {fullBleed ? (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
          ) : (
            <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">{children}</div>
          )}
        </main>
      </div>
    </div>
  );
}
