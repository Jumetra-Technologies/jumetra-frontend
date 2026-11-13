import { Book, Cpu, FlaskConical, Folder, LayoutDashboard, Monitor, Settings, Sparkles, Store, Users } from "lucide-react";
import type { AuthState } from "@kiungo/api";
import { cn } from "@kiungo/ui/cn";
import { AccountMenu } from "../account/AccountMenu";
import { NAV_ITEMS, type View } from "./types";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  folder: Folder,
  monitor: Monitor,
  cpu: Cpu,
  flask: FlaskConical,
  book: Book,
  users: Users,
  store: Store,
  spark: Sparkles,
};

export function Sidebar({
  view,
  onView,
  auth,
  onSettings,
}: {
  view: View;
  onView: (view: View) => void;
  auth: AuthState;
  onSettings: () => void;
}) {
  const items = NAV_ITEMS;
  return (
    <aside className="flex w-[232px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground" data-sidebar data-testid="app-sidebar">
      {/* The app's one name. Also the window's handle: drag here to move it (macOS's buttons sit at its left). */}
      <div className="k-sidebar-top drag-region flex h-12 shrink-0 items-center border-b border-sidebar-border px-5">
        <span className="text-[17px] font-semibold tracking-[-0.02em] text-sidebar-foreground" data-testid="app-name">
          Kiungo
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Modules">
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          const active = view === item.view;
          return (
            <button
              key={item.view}
              type="button"
              onClick={() => onView(item.view)}
              aria-current={active ? "page" : undefined}
              data-testid={`nav-${item.view}`}
              className={cn(
                "mb-1 flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-xs transition-colors",
                active ? "bg-[color-mix(in_srgb,var(--kiungo-teal)_16%,transparent)] font-semibold text-[var(--kiungo-teal-text)]" : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-2">
        <button
          type="button"
          onClick={onSettings}
          aria-current={view === "settings" ? "page" : undefined}
          data-testid="nav-settings"
          className={cn("flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-xs", view === "settings" ? "bg-[color-mix(in_srgb,var(--sidebar-foreground)_10%,transparent)] text-sidebar-foreground" : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground")}
        >
          <Settings className="size-4" aria-hidden />
          Settings
        </button>
        <div className="mt-1">
          <AccountMenu state={auth} />
        </div>
      </div>
    </aside>
  );
}
