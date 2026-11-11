import type { Notice } from "../notifications/useNotifications";
import { NotificationCenter } from "../notifications/NotificationCenter";

/**
 * The top bar, which is also the window's title bar: drag it to move the
 * window. On Windows and Linux the window buttons are drawn over its right
 * end, so its content stops where they start (the titlebar-area env values).
 */
export function Header({ notices, onDismiss }: { notices: Notice[]; onDismiss: (id: string) => void }) {
  return (
    <header className="k-titlebar drag-region relative flex h-12 shrink-0 items-center border-b border-sidebar-border bg-header px-4 text-header-foreground" data-testid="app-header">
      <div className="ml-auto flex items-center gap-2">
        <NotificationCenter notices={notices} onDismiss={onDismiss} />
      </div>
    </header>
  );
}
