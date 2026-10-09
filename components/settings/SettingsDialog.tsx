"use client";

import { useId, type ReactNode } from "react";
import { Palette, Server, X } from "lucide-react";
import { ProfileTile } from "@/components/account/ProfileTile";
import { ThemeSettings } from "@/components/theme/theme-settings";
import { API_BASE, wsUrl } from "@/lib/api-client";
import { closeSettings, useSettingsOpen } from "@/lib/settings-dialog";
import { ModalShell } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { APP_VERSION } from "@/lib/version";

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

/**
 * Settings as a modal over the current page: the page dims behind it and
 * the settings appear as a grid of tiles. Escape, the close button or a
 * click on the dimmed page closes it; focus stays inside while it is open
 * and returns to whatever opened it.
 */
export function SettingsDialog() {
  const open = useSettingsOpen();
  const titleId = useId();
  const descriptionId = useId();

  return (
    <ModalShell open={open} onClose={closeSettings} labelledBy={titleId} describedBy={descriptionId} className="max-w-4xl" testId="settings-dialog">
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-4">
        <div>
          <h2 id={titleId} className="text-lg font-semibold tracking-tight text-foreground">
            Settings
          </h2>
          <p id={descriptionId} className="mt-0.5 text-sm text-muted">
            Appearance, platform connection and your profile.
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
        <ProfileTile />
      </div>

      <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-6 py-3 text-xs text-muted">
        <span data-testid="app-version">Kiungo v{APP_VERSION}</span>
        <span>Kiungo Labs Technologies</span>
      </footer>
    </ModalShell>
  );
}
