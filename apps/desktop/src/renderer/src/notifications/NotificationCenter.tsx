import { useEffect, useId, useRef, useState } from "react";
import { Bell, BellOff, Download, Info, RefreshCw, TriangleAlert, X } from "lucide-react";
import { cn } from "@kiungo/ui/cn";
import type { Notice } from "./useNotifications";

const TONE_ICON = {
  update: RefreshCw,
  warning: TriangleAlert,
  info: Info,
} as const;

/** The bell in the top bar: a glass button with how many things need attention, and the list behind it. */
export function NotificationCenter({ notices, onDismiss }: { notices: Notice[]; onDismiss: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const count = notices.length;

  // Close on a click outside or Escape.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const label = count === 0 ? "Notifications: nothing new" : `Notifications: ${count} new`;
  return (
    <div ref={root} className="relative no-drag">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label={label} title={label} aria-expanded={open} aria-controls={panelId} data-testid="notifications-button" className="k-glass-bell">
        <Bell className="relative z-[1] size-[17px]" strokeWidth={1.9} aria-hidden />
        {count > 0 ? (
          <span className="k-glass-badge" data-testid="notifications-count">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </button>
      {open ? (
        <section id={panelId} aria-label="Notifications" className="k-notice-panel absolute right-0 top-[calc(100%+10px)] z-40 w-[380px] overflow-hidden rounded-[16px]" data-testid="notifications-panel">
          <header className="flex items-baseline justify-between px-4 pb-2 pt-3.5">
            <h2 className="text-[13px] font-semibold text-foreground">Notifications</h2>
            {count > 0 ? <span className="text-[11px] text-muted">{count === 1 ? "1 needs your attention" : `${count} need your attention`}</span> : null}
          </header>
          {count === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 pb-7 pt-5 text-center">
              <BellOff className="size-5 text-muted" aria-hidden />
              <p className="text-[12.5px] font-medium text-foreground">You&rsquo;re all caught up</p>
              <p className="text-[11.5px] leading-[17px] text-muted">Updates and anything that needs your attention will show up here.</p>
            </div>
          ) : (
            <ul className="max-h-[min(70vh,520px)] overflow-y-auto px-2 pb-2">
              {notices.map((n) => (
                <NoticeRow key={n.id} notice={n} onDismiss={onDismiss} onDone={() => setOpen(false)} />
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}

function NoticeRow({ notice, onDismiss, onDone }: { notice: Notice; onDismiss: (id: string) => void; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const Icon = notice.progress !== undefined ? Download : TONE_ICON[notice.tone];
  const action = (a: NonNullable<Notice["action"]>, primary: boolean) => {
    const cls = primary
      ? "inline-flex h-7 items-center rounded-[8px] bg-primary px-3 text-[11.5px] font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-60"
      : "inline-flex h-7 items-center rounded-[8px] px-2.5 text-[11.5px] font-medium text-[var(--kiungo-teal-text)] hover:bg-muted-bg";
    if (a.href)
      return (
        <a key={a.label} href={a.href} target="_blank" rel="noreferrer" className={cls} onClick={onDone}>
          {a.label}
        </a>
      );
    return (
      <button
        key={a.label}
        type="button"
        disabled={busy}
        className={cls}
        onClick={() => {
          setBusy(true);
          void Promise.resolve(a.run()).finally(() => setBusy(false));
        }}
      >
        {busy && primary ? "Working…" : a.label}
      </button>
    );
  };
  return (
    <li className="group relative mt-1 flex gap-3 rounded-[12px] px-2.5 py-3 hover:bg-muted-bg/60" data-testid={`notice-${notice.id}`}>
      <span
        className={cn(
          "mt-0.5 grid size-8 shrink-0 place-items-center rounded-full",
          notice.tone === "update" && "bg-[color-mix(in_srgb,var(--kiungo-teal)_14%,transparent)] text-[var(--kiungo-teal-text)]",
          notice.tone === "warning" && "bg-[color-mix(in_srgb,var(--warning)_16%,transparent)] text-warning",
          notice.tone === "info" && "bg-muted-bg text-muted",
        )}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 pr-5">
        <p className="text-[12.5px] font-semibold leading-[18px] text-foreground">{notice.title}</p>
        <p className="mt-0.5 text-[11.5px] leading-[17px] text-muted">{notice.detail}</p>
        {notice.progress !== undefined ? (
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted-bg" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={notice.progress} aria-label={notice.title}>
            <div className="h-full rounded-full bg-[var(--kiungo-teal)] transition-[width]" style={{ width: `${notice.progress}%` }} />
          </div>
        ) : null}
        {notice.action || notice.secondary ? (
          <div className="mt-2.5 flex items-center gap-1.5">
            {notice.action ? action(notice.action, true) : null}
            {notice.secondary ? action(notice.secondary, false) : null}
          </div>
        ) : null}
      </div>
      {notice.dismissible ? (
        <button
          type="button"
          onClick={() => onDismiss(notice.id)}
          aria-label={`Dismiss: ${notice.title}`}
          className="absolute right-2 top-2.5 grid size-6 place-items-center rounded-full text-muted opacity-60 hover:bg-muted-bg hover:opacity-100 focus-visible:opacity-100"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      ) : null}
    </li>
  );
}
