"use client";

import { useId, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CircleCheck, Download, TriangleAlert, X } from "lucide-react";
import { Button } from "@kiungo/ui/button";
import { DESKTOP } from "@/lib/landing/content";
import { fileName, formatSize, PLATFORM_NAMES } from "@/lib/releases";
import { cn } from "@/lib/utils";
import { useDownload, type DownloadState } from "./DownloadProvider";

const subscribe = () => () => undefined;
const useMounted = () => useSyncExternalStore(subscribe, () => true, () => false);

const STATUS = DESKTOP.download.status;

/**
 * The notice in the corner: what the download is doing, that it's done and
 * what to do next, or what went wrong and how to fix it. One at a time, since
 * the page runs one download at a time.
 */
export function DownloadNotice() {
  const dl = useDownload();
  const mounted = useMounted();
  if (!dl || !mounted || dl.state.phase === "idle") return null;
  return createPortal(<Notice state={dl.state} releaseUrl={dl.release?.releaseUrl} beta={dl.release?.channel === "beta"} onCancel={dl.cancel} onClose={dl.dismiss} onRetry={dl.retry} onBrowser={dl.useBrowser} />, document.body);
}

function Notice({
  state,
  releaseUrl,
  beta,
  onCancel,
  onClose,
  onRetry,
  onBrowser,
}: {
  state: Exclude<DownloadState, { phase: "idle" }>;
  releaseUrl?: string;
  beta: boolean;
  onCancel: () => void;
  onClose: () => void;
  onRetry: () => void;
  onBrowser: () => void;
}) {
  const titleId = useId();
  const platform = PLATFORM_NAMES[state.file.platform];
  const name = fileName(state.file);
  const problem = state.phase === "problem";

  let icon = <Download className="size-[18px] text-primary" aria-hidden />;
  let title = "";
  let body: string[] = [];
  let actions: ReactNode = null;
  let bar: ReactNode = null;

  if (state.phase === "downloading") {
    const pct = state.total ? Math.min(100, Math.floor((state.received / state.total) * 100)) : null;
    title = state.total || state.received ? STATUS.downloading(platform) : STATUS.starting;
    bar = (
      <div className="mt-3">
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted-bg" role="progressbar" aria-label={title} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct ?? undefined}>
          <div className={cn("h-full rounded-full bg-primary", pct === null && "hhip-notice-indeterminate w-1/3")} style={pct === null ? undefined : { width: `${pct}%` }} />
        </div>
        <div className="mt-2 flex items-baseline justify-between gap-4 font-mono text-[11.5px] leading-4 text-muted" data-testid="download-progress">
          <span>{state.total ? STATUS.progress(formatSize(state.received) || "0 MB", formatSize(state.total)) : formatSize(state.received) || "0 MB"}</span>
          {pct === null ? null : <span>{pct}%</span>}
        </div>
      </div>
    );
    body = [STATUS.keepOpen];
    actions = (
      <Button size="sm" variant="secondary" onClick={onCancel} data-testid="download-cancel">
        {STATUS.cancel}
      </Button>
    );
  } else if (state.phase === "done") {
    icon = <CircleCheck className="size-[18px] text-success" aria-hidden />;
    title = STATUS.done.title(platform);
    const size = formatSize(state.bytes) || formatSize(state.file.size);
    body = [state.verified ? STATUS.done.verified(name, size) : STATUS.done.saved(name, size), STATUS.done.next[state.file.platform] ?? ""];
    const step = beta ? DESKTOP.download.steps.find(([system]) => system === platform) : undefined;
    if (step) body.push(`${step[0]}: ${step[1]}`);
  } else if (state.phase === "browser") {
    title = STATUS.browser.title(name);
    body = [...(state.because ? [STATUS.browser.because(state.because)] : []), STATUS.browser.body];
  } else {
    icon = <TriangleAlert className="size-[18px] text-danger" aria-hidden />;
    const p = STATUS.problems;
    const words =
      state.kind === "offline"
        ? p.offline
        : state.kind === "missing"
          ? p.missing(state.status ?? 404)
          : state.kind === "refused"
            ? p.refused(state.status ?? 403)
            : state.kind === "busy"
              ? p.busy
              : state.kind === "server"
                ? p.server(state.status ?? 502)
                : state.kind === "dropped"
                  ? p.dropped(formatSize(state.received) || "0 MB", state.total ? formatSize(state.total) : "the file")
                  : state.kind === "damaged"
                    ? p.damaged
                    : state.kind === "memory"
                      ? p.memory(formatSize(state.file.size) || "the file")
                      : p.unknown;
    title = words.title;
    body = [words.fix];
    const again = state.kind !== "missing";
    actions = (
      <>
        {again ? (
          <Button size="sm" onClick={onRetry} data-testid="download-retry">
            {STATUS.tryAgain}
          </Button>
        ) : (
          <Button size="sm" onClick={() => window.location.reload()} data-testid="download-reload">
            {STATUS.reload}
          </Button>
        )}
        {state.kind === "memory" || state.kind === "unknown" || state.kind === "dropped" ? (
          <Button size="sm" variant="secondary" onClick={onBrowser} data-testid="download-browser">
            {STATUS.useBrowser}
          </Button>
        ) : null}
        {(state.kind === "refused" || state.kind === "server") && releaseUrl ? (
          <a href={releaseUrl} target="_blank" rel="noopener noreferrer" className="inline-flex">
            <Button size="sm" variant="secondary">
              {STATUS.releasePage}
            </Button>
          </a>
        ) : null}
      </>
    );
  }

  // On a phone it sits above the account button in the bottom-left corner; on anything wider, in the bottom-right.
  return (
    <section
      role={problem ? "alert" : "status"}
      aria-live={problem ? "assertive" : "polite"}
      aria-labelledby={titleId}
      className="hhip-notice-in fixed inset-x-4 bottom-[5.5rem] z-[60] rounded-[12px] border border-border bg-surface p-4 shadow-[var(--shadow-md)] sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[400px]"
      data-testid="download-notice"
      data-phase={state.phase}
      {...(problem ? { "data-kind": state.kind } : {})}
    >
      <div className="flex items-start gap-3">
        <span className="mt-[3px] shrink-0">{icon}</span>
        <div className="min-w-0 flex-1">
          <h3 id={titleId} className="text-[15px] font-semibold leading-6 text-foreground" data-testid="download-notice-title">
            {title}
          </h3>
          {bar}
          {body.filter(Boolean).map((line) => (
            <p key={line} className="mt-1.5 text-[13.5px] leading-5 text-muted">
              {line}
            </p>
          ))}
          {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
        </div>
        {state.phase === "downloading" ? null : (
          <button type="button" onClick={onClose} aria-label={STATUS.done.close} className="-mr-1 -mt-1 rounded-[8px] p-1 text-muted hover:bg-muted-bg hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]" data-testid="download-close">
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>
    </section>
  );
}
