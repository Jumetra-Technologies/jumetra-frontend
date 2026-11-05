"use client";

import { downloadPercent } from "@/lib/downloads";
import { useId, useState, useSyncExternalStore, type ReactNode } from "react";
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

/** Buttons on the blue: a quiet one, and a solid white one for the main action. */
const noticeButton = "border border-white/30 bg-white/10 text-white shadow-none hover:bg-white/20 focus-visible:ring-white/70";
const noticeButtonStrong = "bg-white text-[var(--kiungo-navy)] shadow-none hover:bg-white/90 focus-visible:ring-white/70";

/**
 * The notice in the corner: what the download is doing, that it's done and
 * what to do next, or what went wrong and how to fix it. One at a time, since
 * the page runs one download at a time.
 */
export function DownloadNotice() {
  const dl = useDownload();
  const mounted = useMounted();
  // Hidden while this file downloads; it comes back when the download ends, so the result isn't missed.
  const [hiddenFor, setHiddenFor] = useState<string | null>(null);
  if (!dl || !mounted || dl.state.phase === "idle") return null;
  const downloading = dl.state.phase === "downloading";
  if (downloading && hiddenFor === dl.state.file.url) return null;
  const onClose = downloading ? () => setHiddenFor(dl.state.phase === "downloading" ? dl.state.file.url : null) : dl.dismiss;
  return createPortal(<Notice state={dl.state} releaseUrl={dl.release?.releaseUrl} beta={dl.release?.channel === "beta"} onCancel={dl.cancel} onClose={onClose} onRetry={dl.retry} onBrowser={dl.useBrowser} />, document.body);
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

  let icon = <Download className="size-[18px] text-[var(--notice-accent)]" aria-hidden />;
  let title = "";
  let body: string[] = [];
  let actions: ReactNode = null;
  let bar: ReactNode = null;

  if (state.phase === "downloading") {
    const pct = downloadPercent(state.received, state.total);
    title = state.total || state.received ? STATUS.downloading(platform) : STATUS.starting;
    bar = (
      <div className="mt-3">
        <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--notice-track)]" role="progressbar" aria-label={title} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct ?? undefined}>
          <div className={cn("h-full rounded-full bg-[var(--notice-accent)]", pct === null && "hhip-notice-indeterminate w-1/3")} style={pct === null ? undefined : { width: `${pct}%` }} />
        </div>
        {/* The percent is on the download button; the notice says how much has arrived. */}
        <p className="mt-2 font-mono text-[11.5px] leading-4 text-[var(--notice-muted)]" data-testid="download-progress">
          {state.total ? STATUS.progress(formatSize(state.received) || "0 MB", formatSize(state.total)) : formatSize(state.received) || "0 MB"}
        </p>
      </div>
    );
    body = [STATUS.keepOpen];
    actions = (
      <Button size="sm" className={noticeButton} onClick={onCancel} data-testid="download-stop">
        {STATUS.stop}
      </Button>
    );
  } else if (state.phase === "done") {
    icon = <CircleCheck className="size-[18px] text-[var(--notice-accent)]" aria-hidden />;
    title = STATUS.done.title();
    const size = formatSize(state.bytes) || formatSize(state.file.size);
    body = [state.verified ? STATUS.done.verified(name, size) : STATUS.done.saved(name, size), STATUS.done.next[state.file.platform] ?? ""];
    const step = beta ? DESKTOP.download.steps.find(([system]) => system === platform) : undefined;
    if (step) body.push(`${step[0]}: ${step[1]}`);
  } else if (state.phase === "browser") {
    title = STATUS.browser.title(name);
    body = [...(state.because ? [STATUS.browser.because(state.because)] : []), STATUS.browser.body];
  } else {
    icon = <TriangleAlert className="size-[18px] text-[var(--warning)]" aria-hidden />;
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
          <Button size="sm" className={noticeButtonStrong} onClick={onRetry} data-testid="download-retry">
            {STATUS.tryAgain}
          </Button>
        ) : (
          <Button size="sm" className={noticeButtonStrong} onClick={() => window.location.reload()} data-testid="download-reload">
            {STATUS.reload}
          </Button>
        )}
        {state.kind === "memory" || state.kind === "unknown" || state.kind === "dropped" ? (
          <Button size="sm" className={noticeButton} onClick={onBrowser} data-testid="download-browser">
            {STATUS.useBrowser}
          </Button>
        ) : null}
        {(state.kind === "refused" || state.kind === "server") && releaseUrl ? (
          <a href={releaseUrl} target="_blank" rel="noopener noreferrer" className="inline-flex">
            <Button size="sm" className={noticeButton}>
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
      className="hhip-notice hhip-notice-in fixed inset-x-4 bottom-[5.5rem] z-[60] rounded-[12px] p-4 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[400px]"
      data-testid="download-notice"
      data-phase={state.phase}
      {...(problem ? { "data-kind": state.kind } : {})}
    >
      <div className="flex items-start gap-3">
        <span className="mt-[3px] shrink-0">{icon}</span>
        <div className="min-w-0 flex-1">
          <h3 id={titleId} className="text-[15px] font-semibold leading-6" data-testid="download-notice-title">
            {title}
          </h3>
          {bar}
          {body.filter(Boolean).map((line) => (
            <p key={line} className="mt-1.5 text-[13.5px] leading-5 text-[var(--notice-muted)]">
              {line}
            </p>
          ))}
          {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={state.phase === "downloading" ? STATUS.hide : STATUS.done.close}
          title={state.phase === "downloading" ? STATUS.hideHint : undefined}
          className="-mr-1 -mt-1 rounded-[8px] p-1 text-[var(--notice-muted)] hover:bg-white/10 hover:text-white active:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          data-testid="download-close"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </section>
  );
}
