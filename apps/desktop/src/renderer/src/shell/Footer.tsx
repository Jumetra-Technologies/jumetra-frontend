import { shortcut } from "../ipc";

/** The version this is, and the way to every command now that the top bar has no search. */
export function Footer({ version }: { version: string | null }) {
  return (
    <footer className="flex h-7 shrink-0 items-center gap-4 border-t border-sidebar-border bg-sidebar px-4 text-[10px] text-sidebar-muted">
      {version ? <span data-testid="app-version">Version {version}</span> : null}
      <span className="ml-auto">
        <kbd className="font-sans">{shortcut("K")}</kbd> Commands and search
      </span>
    </footer>
  );
}
