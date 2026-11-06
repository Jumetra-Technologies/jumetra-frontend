import { shortcut } from "../ipc";
import type { WorkspaceFocus } from "./types";

export function Footer({ focus }: { focus: WorkspaceFocus }) {
  return (
    <footer className="flex h-7 shrink-0 items-center gap-4 border-t border-sidebar-border bg-sidebar px-4 text-[9px] text-sidebar-muted">
      <span className="text-success">● Kiungo 2.0</span>
      <span className="ml-auto">{focus}</span>
      <span>{shortcut("K")} · Commands</span>
    </footer>
  );
}
