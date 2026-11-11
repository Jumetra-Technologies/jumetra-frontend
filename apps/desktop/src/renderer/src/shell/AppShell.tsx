import type { ReactNode } from "react";
import type { AuthState, Role } from "@kiungo/api";
import type { Notice } from "../notifications/useNotifications";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import type { View } from "./types";

/**
 * The persistent shell every module (Dashboard, Projects, Simulation, …) opens inside.
 * The sidebar runs the full height of the window; the top bar is the window's title bar.
 */
export function AppShell({
  view,
  onView,
  roles,
  auth,
  onSettings,
  notices,
  onDismiss,
  version,
  children,
}: {
  view: View;
  onView: (view: View) => void;
  roles: Role[];
  auth: AuthState;
  onSettings: () => void;
  notices: Notice[];
  onDismiss: (id: string) => void;
  version: string | null;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-background text-foreground">
      <Sidebar view={view} onView={onView} roles={roles} auth={auth} onSettings={onSettings} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header notices={notices} onDismiss={onDismiss} />
        <main className="min-h-0 flex-1 overflow-y-auto" data-testid={`view-${view}`}>
          {children}
        </main>
        <Footer version={version} />
      </div>
    </div>
  );
}
