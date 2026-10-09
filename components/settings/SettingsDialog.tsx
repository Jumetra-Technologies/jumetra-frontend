"use client";

import Link from "next/link";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { LogOut, Palette, Server, UserRound, X } from "lucide-react";
import { ThemeSettings } from "@/components/theme/theme-settings";
import { API_BASE, wsUrl } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { closeSettings, useSettingsOpen } from "@/lib/settings-dialog";
import { cn } from "@/lib/utils";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function Tile({
  icon: Icon,
  title,
  description,
  className,
  children,
}: {
  icon: typeof Palette;
  title: string;
  description?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("rounded-[12px] border border-border bg-canvas p-5", className)}>
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="size-4 shrink-0 text-muted" aria-hidden />
        {title}
      </h3>
      {description ? <p className="mt-1 text-xs leading-5 text-muted">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function PlatformDetails() {
  const ws = wsUrl("/").replace(/\/$/, "");
  return (
    <dl className="space-y-3 text-sm">
      <div>
        <dt className="text-xs text-muted">API URL</dt>
        <dd className="mt-0.5 break-all font-mono text-[13px] text-foreground">{API_BASE}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted">Live updates (WebSocket)</dt>
        <dd className="mt-0.5 break-all font-mono text-[13px] text-foreground">{ws}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted">Workspace product</dt>
        <dd className="mt-0.5 text-foreground">Kiungo Engineering Laboratory</dd>
      </div>
    </dl>
  );
}

function AccountDetails() {
  const { user, isAuthenticated, logout } = useAuthStore();

  if (!isAuthenticated || !user) {
    return (
      <div className="text-sm">
        <p className="font-medium text-foreground">Not signed in</p>
        <p className="mt-1 leading-6 text-muted">
          Projects and experiment records are saved in this browser. Sign in with Google from Home to restore your workspace
          session on other devices.
        </p>
        <Link
          href="/"
          onClick={closeSettings}
          className="mt-3 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Go to Home to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="text-sm">
      <div className="flex items-center gap-3">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
          aria-hidden
        >
          {user.display_name.trim().charAt(0).toUpperCase() || "?"}
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{user.display_name}</p>
          <p className="truncate text-xs text-muted">{user.email}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={logout}
        className="mt-4 inline-flex items-center gap-1.5 rounded-[9px] border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted-bg"
      >
        <LogOut className="size-4" aria-hidden />
        Sign out
      </button>
    </div>
  );
}

/**
 * Settings as a modal over the current page: the page dims behind it and
 * the settings appear as a grid of tiles. Escape, the close button or a
 * click on the dimmed page closes it; focus stays inside while it is open
 * and returns to whatever opened it.
 */
export function SettingsDialog() {
  const open = useSettingsOpen();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusables = () => Array.from(panel?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    (focusables()[0] ?? panel)?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeSettings();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <div
        className="hhip-dialog-backdrop absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={closeSettings}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="hhip-dialog-panel relative flex max-h-[min(88svh,760px)] w-full max-w-4xl flex-col overflow-hidden rounded-[16px] border border-border bg-surface shadow-[var(--shadow-md)] outline-none"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold tracking-tight text-foreground">
              Settings
            </h2>
            <p id={descriptionId} className="mt-0.5 text-sm text-muted">
              Appearance, platform connection and your account.
            </p>
          </div>
          <button
            type="button"
            onClick={closeSettings}
            aria-label="Close settings"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-muted-bg hover:text-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>
        </header>

        <div className="grid min-h-0 gap-4 overflow-y-auto p-4 sm:p-6 md:grid-cols-2">
          <Tile
            icon={Palette}
            title="Appearance"
            description="Light is the default. Choose a palette for the whole platform; it applies straight away."
            className="md:col-span-2"
          >
            <ThemeSettings className="sm:grid-cols-2 lg:grid-cols-4" />
          </Tile>
          <Tile icon={Server} title="Platform" description="Where this app sends requests and listens for live updates.">
            <PlatformDetails />
          </Tile>
          <Tile icon={UserRound} title="Account">
            <AccountDetails />
          </Tile>
        </div>
      </div>
    </div>
  );
}
