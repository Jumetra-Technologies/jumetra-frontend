import { useEffect, useState, type ReactNode } from "react";
import { CircleAlert, CircleCheck, Download, Loader2, RefreshCw, X } from "lucide-react";
import { Button } from "@kiungo/ui/button";
import type { UpdateControls } from "./useUpdate";

/**
 * A small card in the corner for Kiungo's own update: shown when one is ready
 * to install, and while a check the person asked for runs and ends. Checks
 * nobody asked for stay out of sight.
 */
export function UpdateBanner({ update }: { update: UpdateControls }) {
  const { info, asked, refused, later, install, dismiss, putOff } = update;
  const [restarting, setRestarting] = useState(false);
  const state = info?.state;

  // "You're up to date" goes by itself.
  useEffect(() => {
    if (!asked || state?.status !== "up-to-date") return;
    const t = setTimeout(dismiss, 4000);
    return () => clearTimeout(t);
  }, [asked, state?.status, dismiss]);

  if (!info || !state) return null;
  let body: { icon: ReactNode; title: string; detail?: string; actions?: ReactNode } | null = null;
  // Buttons on the blue: a quiet one, and a solid white one for the main action.
  const quiet = "border border-white/30 bg-white/10 text-white shadow-none hover:bg-white/20 focus-visible:ring-white/70";
  const strong = "bg-white text-[var(--kiungo-navy)] shadow-none hover:bg-white/90 focus-visible:ring-white/70";
  const close = (
    <Button size="sm" className={quiet} onClick={dismiss} aria-label="Close">
      <X className="size-3.5" aria-hidden />
    </Button>
  );

  if (state.status === "ready" && later !== state.version) {
    body = {
      icon: <Download className="size-4 text-[var(--notice-accent)]" aria-hidden />,
      title: `Kiungo ${state.version} is ready`,
      detail: refused ?? "Restart to update. Your projects are saved first, and it installs anyway the next time Kiungo quits.",
      actions: (
        <>
          <Button size="sm" className={quiet} onClick={() => putOff(state.version)}>
            Later
          </Button>
          <Button
            size="sm"
            className={strong}
            disabled={restarting}
            data-testid="update-restart"
            onClick={() => {
              setRestarting(true);
              void install().then((r) => {
                if (!r.ok) setRestarting(false);
              });
            }}
          >
            {restarting ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <RefreshCw className="size-3.5" aria-hidden />}
            Restart to update
          </Button>
        </>
      ),
    };
  } else if (state.status === "error" && (!state.quiet || asked)) {
    body = { icon: <CircleAlert className="size-4 text-[var(--warning)]" aria-hidden />, title: "Update didn't work", detail: state.message, actions: close };
  } else if (asked) {
    if (state.status === "checking" || state.status === "idle") body = { icon: <Loader2 className="size-4 animate-spin text-[var(--notice-muted)]" aria-hidden />, title: "Checking for updates…" };
    else if (state.status === "downloading") body = { icon: <Loader2 className="size-4 animate-spin text-[var(--notice-accent)]" aria-hidden />, title: `Downloading Kiungo ${state.version}… ${state.percent}%`, detail: "Keep working; you'll be asked to restart when it's ready.", actions: close };
    else if (state.status === "up-to-date") body = { icon: <CircleCheck className="size-4 text-[var(--notice-accent)]" aria-hidden />, title: `Kiungo ${info.currentVersion} is the newest version`, actions: close };
    else if (state.status === "unsupported")
      body = {
        icon: <CircleAlert className="size-4 text-[var(--notice-muted)]" aria-hidden />,
        title: "Kiungo can't update itself here",
        detail: state.message,
        actions: (
          <>
            {close}
            {state.reason === "platform" ? (
              <a href={state.downloadUrl} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center rounded-[10px] bg-white px-3 text-xs font-medium text-[var(--kiungo-navy)] hover:bg-white/90">
                Open the download page
              </a>
            ) : null}
          </>
        ),
      };
  }
  if (!body) return null;

  return (
    <div role="status" aria-live="polite" data-testid="update-banner" className="hhip-notice hhip-notice-in fixed bottom-4 right-4 z-50 flex w-[340px] max-w-[calc(100vw-2rem)] gap-3 rounded-[12px] p-3.5">
      <span className="mt-0.5 shrink-0">{body.icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium leading-5">{body.title}</p>
        {body.detail ? <p className="mt-0.5 text-[12px] leading-[18px] text-[var(--notice-muted)]">{body.detail}</p> : null}
        {body.actions ? <div className="mt-2.5 flex items-center justify-end gap-1.5">{body.actions}</div> : null}
      </div>
    </div>
  );
}
