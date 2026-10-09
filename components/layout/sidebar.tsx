"use client";

import Link from "next/link";
import { KiungoLogo, KiungoMark } from "@/components/brand/KiungoMark";
import { useEffect, useState } from "react";
import { Menu, PanelLeftClose, PanelLeftOpen, Settings, Star, User, X } from "lucide-react";
import {
  NAV_SECTIONS,
  isNavItemActive,
  type NavItem,
} from "@/components/layout/nav-items";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { Avatar } from "@/components/account/Avatar";
import { AccountDialogs } from "@/components/account/AccountDialogs";
import { openAuth, openProfile } from "@/lib/account-dialogs";
import { useAuthStore } from "@/lib/auth-store";
import { SETTINGS_QUERY_FLAG, openSettings } from "@/lib/settings-dialog";
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

/**
 * The account row at the foot of the sidebar. The avatar and name open the
 * profile (or the sign-in modal when signed out); the gear opens Settings.
 */
function AccountRow({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const signedIn = isAuthenticated && Boolean(user);
  const displayName = user?.display_name ?? "";
  const openAccount = () => {
    onNavigate?.();
    if (signedIn) openProfile();
    else openAuth("login");
  };
  const gear = (
    <button
      type="button"
      onClick={() => {
        onNavigate?.();
        openSettings();
      }}
      aria-label="Open settings"
      aria-haspopup="dialog"
      title="Settings"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md text-sidebar-muted hover:bg-[var(--sidebar-hover)] hover:text-sidebar-foreground",
        collapsed ? "size-10" : "size-7",
      )}
    >
      <Settings className={collapsed ? "size-4" : "size-3.5"} aria-hidden />
    </button>
  );
  const avatar = signedIn ? (
    <Avatar name={displayName} src={user?.picture_url} size={32} />
  ) : (
    <span
      className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[var(--sidebar-border)] bg-[var(--sidebar-hover)] text-sidebar-muted"
      aria-hidden
    >
      <User className="size-3.5" />
    </span>
  );

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={openAccount}
          title={signedIn ? `${displayName} · Profile` : "Log in"}
          aria-haspopup="dialog"
          data-testid="sidebar-account"
          className="flex size-10 items-center justify-center rounded-lg hover:bg-[var(--sidebar-hover)]"
        >
          {avatar}
          <span className="sr-only">{signedIn ? `${displayName}, open profile` : "Log in"}</span>
        </button>
        {gear}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={openAccount}
        aria-haspopup="dialog"
        data-testid="sidebar-account"
        className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-1 text-left transition-colors hover:bg-[var(--sidebar-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      >
        {avatar}
        <span className="min-w-0 flex-1">
          {signedIn ? (
            <>
              <span className="block truncate text-xs font-semibold text-sidebar-foreground">{displayName}</span>
              <span className="block truncate text-[10px] text-sidebar-muted">{user?.email}</span>
            </>
          ) : (
            <>
              <span className="block truncate text-xs font-semibold text-sidebar-foreground">Log in</span>
              <span className="block truncate text-[10px] text-sidebar-muted">Keep your work on every device</span>
            </>
          )}
        </span>
        <span className="sr-only">{signedIn ? "Open profile" : "Open sign-in"}</span>
      </button>
      {gear}
    </div>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex min-w-0 items-center rounded-md" aria-label="Kiungo, home" data-testid="brand">
      <KiungoLogo variant="full" markClassName="size-8" />
    </Link>
  );
}

const sidebarIconButton =
  "inline-flex size-8 shrink-0 items-center justify-center rounded-md text-sidebar-muted transition-colors hover:bg-[var(--sidebar-hover)] hover:text-sidebar-foreground";

export function Sidebar({
  activePath,
  collapsed = false,
  onNavigate,
  onToggleCollapse,
  onClose,
}: {
  activePath: string;
  collapsed?: boolean;
  onNavigate?: () => void;
  /** Desktop: collapse or expand the sidebar. */
  onToggleCollapse?: () => void;
  /** Mobile drawer: close it. */
  onClose?: () => void;
}) {
  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground",
        collapsed ? "w-[4.5rem]" : "w-64",
      )}
      style={{ borderColor: "var(--sidebar-border)" }}
    >
      <div className={cn("flex h-14 shrink-0 items-center", collapsed ? "justify-center px-2" : "gap-2 px-3")}>
        {onToggleCollapse ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            className={cn(sidebarIconButton, collapsed && "group/brand size-10")}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <>
                {/* Collapsed, the mark stands for the app; hovering shows what the button does. */}
                <KiungoMark className="size-7 group-hover/brand:hidden group-focus-visible/brand:hidden" />
                <PanelLeftOpen className="hidden size-[18px] group-hover/brand:block group-focus-visible/brand:block" aria-hidden />
              </>
            ) : (
              <PanelLeftClose className="size-[18px]" aria-hidden />
            )}
          </button>
        ) : null}
        {!collapsed ? <Brand /> : null}
        {onClose ? (
          <button type="button" onClick={onClose} className={cn(sidebarIconButton, "ml-auto")} aria-label="Close menu">
            <X className="size-4" aria-hidden />
          </button>
        ) : null}
      </div>
      <NavLinks activePath={activePath} collapsed={collapsed} onNavigate={onNavigate} />
      <div
        className={cn("mt-auto shrink-0 border-t", collapsed ? "p-2" : "p-3")}
        style={{ borderColor: "var(--sidebar-border)" }}
      >
        <AccountRow collapsed={collapsed} onNavigate={onNavigate} />
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
    const url = new URL(window.location.href);
    if (!url.searchParams.has(SETTINGS_QUERY_FLAG)) return;
    url.searchParams.delete(SETTINGS_QUERY_FLAG);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    openSettings();
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
    <div className="flex h-svh overflow-hidden bg-background">
      <div className="hidden h-full shrink-0 lg:flex">
        <Sidebar
          activePath={activePath}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
        />
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 flex h-full shadow-[var(--shadow-md)]">
            <Sidebar
              activePath={activePath}
              onNavigate={() => setMobileOpen(false)}
              onClose={() => setMobileOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Phones and tablets only: the sidebar is a drawer, so something has to open it. */}
        <div
          className="flex h-14 shrink-0 items-center gap-2 border-b bg-sidebar px-3 text-sidebar-foreground lg:hidden"
          style={{ borderColor: "var(--sidebar-border)" }}
        >
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className={sidebarIconButton}
            aria-label="Open navigation"
          >
            <Menu className="size-5" aria-hidden />
          </button>
          <Brand />
        </div>

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
      <SettingsDialog />
      <AccountDialogs />
    </div>
  );
}
