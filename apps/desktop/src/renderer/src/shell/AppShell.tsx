import type { ReactNode } from "react";
import type { Appearance, AuthState, Role } from "@kiungo/api";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import type { View, WorkspaceFocus } from "./types";

/** The persistent shell every module (Dashboard, Projects, Simulation, …) opens inside. */
export function AppShell({
  view,
  onView,
  roles,
  focus,
  onFocus,
  auth,
  appearance,
  onAppearance,
  onSettings,
  onPalette,
  children,
}: {
  view: View;
  onView: (view: View) => void;
  roles: Role[];
  focus: WorkspaceFocus;
  onFocus: (focus: WorkspaceFocus) => void;
  auth: AuthState;
  appearance: Appearance;
  onAppearance: (next: Appearance) => void;
  onSettings: () => void;
  onPalette: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-background text-foreground">
      <Sidebar view={view} onView={onView} roles={roles} focus={focus} onFocus={onFocus} auth={auth} onSettings={onSettings} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header view={view} appearance={appearance} onAppearance={onAppearance} onPalette={onPalette} />
        <main className="min-h-0 flex-1 overflow-y-auto" data-testid={`view-${view}`}>
          {children}
        </main>
        <Footer focus={focus} />
      </div>
    </div>
  );
}
