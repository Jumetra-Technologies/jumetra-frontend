import { Book, Cpu, FlaskConical, Folder, LayoutDashboard, Monitor, Settings, Sparkles, Store, Users } from "lucide-react";
import type { AuthState, Role } from "@kiungo/api";
import { cn } from "@kiungo/ui/cn";
import { KiungoLogo } from "@kiungo/ui/KiungoMark";
import { AccountMenu } from "../account/AccountMenu";
import { NAV_ITEMS, WORKSPACE_FOCUSES, type View, type WorkspaceFocus } from "./types";

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
  roles,
  focus,
  onFocus,
  auth,
  onSettings,
}: {
  view: View;
  onView: (view: View) => void;
  roles: Role[];
  focus: WorkspaceFocus;
  onFocus: (focus: WorkspaceFocus) => void;
  auth: AuthState;
  onSettings: () => void;
}) {
  const items = NAV_ITEMS.filter((item) => !item.roles || item.roles.some((r) => roles.includes(r)));
  return (
    <aside className="flex w-[232px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground" data-sidebar data-testid="app-sidebar">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border px-3.5">
        <KiungoLogo className="h-6" />
        <span className="rounded-[6px] bg-[color-mix(in_srgb,var(--kiungo-teal)_22%,transparent)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--kiungo-teal-text)]">2.0</span>
      </div>

      <div className="border-b border-sidebar-border p-3">
        <label className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.12em] text-sidebar-muted" htmlFor="workspace-focus">
          Current workspace
        </label>
        <select
          id="workspace-focus"
          value={focus}
          onChange={(e) => onFocus(e.target.value as WorkspaceFocus)}
          className="w-full rounded-[10px] border border-sidebar-border bg-[color-mix(in_srgb,var(--sidebar-foreground)_6%,transparent)] px-2.5 py-2 text-xs text-sidebar-foreground outline-none focus-visible:border-primary"
        >
          {WORKSPACE_FOCUSES.map((x) => (
            <option key={x} value={x} className="bg-sidebar text-sidebar-foreground">
              {x}
            </option>
          ))}
        </select>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Platform">
        <div className="mb-2 px-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-sidebar-muted">Platform</div>
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
        <div className="mt-2 flex items-center rounded-[10px] bg-[color-mix(in_srgb,var(--sidebar-foreground)_4%,transparent)] px-1 py-1">
          <AccountMenu state={auth} onSettings={onSettings} />
        </div>
      </div>
    </aside>
  );
}
