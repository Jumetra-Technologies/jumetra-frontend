"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { canDownloadInPage, downloadToBlob, DownloadProblem, saveBlob, saveWithBrowser, type Partial, type ProblemKind } from "@/lib/downloads";
import { downloadHref, fileName, type DownloadMode, type Release, type ReleaseFile } from "@/lib/releases";
import { DownloadNotice } from "./DownloadNotice";

/** Where the home page's download is, for every button that starts one and for the notice in the corner. */
export type DownloadState =
  | { phase: "idle" }
  | { phase: "downloading"; file: ReleaseFile; received: number; total: number | null }
  | { phase: "done"; file: ReleaseFile; bytes: number; verified: boolean }
  /** The browser is downloading the file itself; `because` is the status that made us hand it over. */
  | { phase: "browser"; file: ReleaseFile; because?: number }
  | { phase: "problem"; file: ReleaseFile; kind: ProblemKind; status?: number; received: number; total: number | null; canResume: boolean };

export interface DownloadController {
  state: DownloadState;
  mode: DownloadMode;
  release: Release | null;
  /** Starts (or, after a drop, carries on) downloading the file. Ignored while one is running. */
  start: (file: ReleaseFile) => void;
  cancel: () => void;
  /** Closes the notice. */
  dismiss: () => void;
  /** After a problem: the same file again, from where it stopped when it can. */
  retry: () => void;
  /** After a problem: let the browser fetch the file as a plain link would. */
  useBrowser: () => void;
}

const Context = createContext<DownloadController | null>(null);

const PROGRESS_EVERY_MS = 120;

/**
 * Owns the one download the page runs at a time, so the button in the hybrid
 * beat, the button in the release section and every installer link share it,
 * and the notice in the corner follows whichever started it.
 */
export function DownloadProvider({
  release,
  mode,
  downloader = downloadToBlob,
  children,
}: {
  release: Release | null;
  mode: DownloadMode;
  /** The download itself; tests hand in one that answers at once. */
  downloader?: typeof downloadToBlob;
  children: ReactNode;
}) {
  const [state, setState] = useState<DownloadState>({ phase: "idle" });
  const abort = useRef<AbortController | null>(null);
  const partial = useRef<{ file: ReleaseFile; bytes: Partial } | null>(null);
  const busy = useRef(false);

  const run = useCallback(
    async (file: ReleaseFile, resume: Partial | null) => {
      if (busy.current) return;
      busy.current = true;
      const controller = new AbortController();
      abort.current = controller;
      setState({ phase: "downloading", file, received: resume?.received ?? 0, total: resume?.total ?? (file.size || null) });
      let last = 0;
      try {
        const result = await downloader({
          url: downloadHref(file, "page"),
          size: file.size,
          sha512: file.sha512,
          signal: controller.signal,
          resume,
          onProgress: (received, total) => {
            const now = Date.now();
            if (now - last < PROGRESS_EVERY_MS && (total === null || received < total)) return;
            last = now;
            setState({ phase: "downloading", file, received, total });
          },
        });
        saveBlob(result.blob, fileName(file));
        partial.current = null;
        setState({ phase: "done", file, bytes: result.bytes, verified: result.verified });
      } catch (error) {
        if (controller.signal.aborted) {
          partial.current = null;
          setState({ phase: "idle" });
        } else if (error instanceof DownloadProblem) {
          // Nothing arrived and the download server itself failed: the browser can still fetch the asset directly.
          if (error.kind === "server" && error.received === 0 && error.status && error.status >= 500) {
            saveWithBrowser(file.url);
            setState({ phase: "browser", file, because: error.status });
          } else {
            partial.current = error.partial ? { file, bytes: error.partial } : null;
            setState({ phase: "problem", file, kind: error.kind, status: error.status, received: error.received, total: error.total, canResume: Boolean(error.partial) });
          }
        } else {
          partial.current = null;
          setState({ phase: "problem", file, kind: error instanceof RangeError ? "memory" : "unknown", received: 0, total: file.size || null, canResume: false });
        }
      } finally {
        busy.current = false;
        abort.current = null;
      }
    },
    [downloader],
  );

  const start = useCallback(
    (file: ReleaseFile) => {
      if (busy.current) return;
      if (mode === "browser" || !canDownloadInPage()) {
        saveWithBrowser(file.url);
        setState({ phase: "browser", file });
        return;
      }
      const kept = partial.current && partial.current.file.url === file.url ? partial.current.bytes : null;
      void run(file, kept);
    },
    [mode, run],
  );

  const cancel = useCallback(() => abort.current?.abort(), []);
  const dismiss = useCallback(() => setState((s) => (s.phase === "downloading" ? s : { phase: "idle" })), []);
  const retry = useCallback(() => {
    if (state.phase !== "problem") return;
    const kept = state.canResume && partial.current?.file.url === state.file.url ? partial.current.bytes : null;
    void run(state.file, kept);
  }, [run, state]);
  const useBrowser = useCallback(() => {
    if (state.phase !== "problem") return;
    partial.current = null;
    saveWithBrowser(state.file.url);
    setState({ phase: "browser", file: state.file });
  }, [state]);

  // Leaving the page would lose a download in flight.
  useEffect(() => {
    if (state.phase !== "downloading") return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Older browsers (and Safari) still want the legacy form.
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [state.phase]);

  // Escape closes a finished notice, the way it closes a dialog.
  useEffect(() => {
    if (state.phase === "idle" || state.phase === "downloading") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.phase, dismiss]);

  const value = useMemo<DownloadController>(() => ({ state, mode, release, start, cancel, dismiss, retry, useBrowser }), [state, mode, release, start, cancel, dismiss, retry, useBrowser]);

  return (
    <Context.Provider value={value}>
      {children}
      <DownloadNotice />
    </Context.Provider>
  );
}

/** The page's download, from any button on it. Outside the provider there's no download: links stay plain links. */
export function useDownload(): DownloadController | null {
  return useContext(Context);
}
