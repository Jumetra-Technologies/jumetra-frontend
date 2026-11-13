"use client";

/**
 * The website lab's code pane (WP-D3): the session's sketch beside the
 * circuit, like the desktop app's editor. A file tab bar, the editor (the
 * Firmware page's Monaco `CodeEditor`), and the build's output and problems in
 * the footer. Ctrl/Cmd+Enter runs, like the lab's own shortcut.
 *
 * A session without code keeps each board's built-in behavior; the pane offers
 * to start a sketch rather than planting one, so older sessions run as before.
 */

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { FilePlus2, Play, Plus, X } from "lucide-react";
import type { BuildResult } from "@kiungo/api";
import { codeFileNameProblem, defaultCode, type SessionCode } from "@kiungo/core/lab/code";
import { cn } from "@kiungo/ui/cn";
import { BuildOutput } from "@/components/firmware/BuildOutput";
import { CodeEditor } from "@/components/firmware/CodeEditor";

export interface CodeBuildState {
  busy: boolean;
  result: BuildResult | null;
  /** The compile service refused the sketch before building it. */
  refused?: string;
  /** No build happened (the compiler couldn't be reached): why. */
  unavailable?: string;
}

export function CodePane({
  code,
  onChange,
  build,
  onRun,
  onClose,
  className,
}: {
  code: SessionCode | undefined;
  onChange: (code: SessionCode) => void;
  build: CodeBuildState;
  onRun: () => void;
  onClose?: () => void;
  className?: string;
}) {
  const [footer, setFooter] = useState<"output" | "problems">("output");
  const [adding, setAdding] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const runKey = (e: KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      e.stopPropagation();
      onRun();
    }
  };

  const problems = build.result?.diagnostics ?? [];
  const errors = problems.filter((d) => d.severity === "error").length;

  if (!code) {
    return (
      <section className={cn("flex h-full min-h-0 flex-col bg-surface", className)} aria-label="Code" data-testid="code-pane">
        <PaneHeader onClose={onClose} />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="max-w-[22rem] text-sm text-muted">
            This session runs each board&apos;s built-in behavior. Write a sketch to run your own code on the Arduino Uno instead.
          </p>
          <button type="button" onClick={() => onChange(defaultCode())} className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-[color-mix(in_srgb,var(--primary)_86%,black)]" data-testid="code-start">
            <FilePlus2 className="size-4" aria-hidden /> Start with Blink
          </button>
        </div>
      </section>
    );
  }

  const active = code.files.find((f) => f.path === code.active) ?? code.files[0];
  const problem = adding !== null && adding.trim() ? codeFileNameProblem(adding.trim(), code.files) : null;

  const addFile = (e: FormEvent) => {
    e.preventDefault();
    const name = (adding ?? "").trim();
    if (!name || codeFileNameProblem(name, code.files)) return;
    onChange({ files: [...code.files, { path: name, content: name.endsWith(".h") || name.endsWith(".hpp") ? "#pragma once\n\n" : "" }], active: name });
    setAdding(null);
  };

  const removeFile = (path: string) => {
    if (confirmDelete !== path) {
      setConfirmDelete(path);
      return;
    }
    const files = code.files.filter((f) => f.path !== path);
    onChange({ files, active: code.active === path ? files[0].path : code.active });
    setConfirmDelete(null);
  };

  return (
    <section className={cn("flex h-full min-h-0 flex-col bg-surface", className)} aria-label="Code" data-testid="code-pane" onKeyDownCapture={runKey}>
      <PaneHeader onClose={onClose} onRun={onRun} />
      <div className="flex h-9 shrink-0 items-stretch gap-0.5 overflow-x-auto border-b border-border px-1.5" role="tablist" aria-label="Sketch files">
        {code.files.map((f) => (
          <div key={f.path} className={cn("group flex items-center border-b-2", f.path === active.path ? "border-primary" : "border-transparent")}>
            <button type="button" role="tab" aria-selected={f.path === active.path} onClick={() => onChange({ ...code, active: f.path })} className={cn("px-2.5 font-mono text-[12px]", f.path === active.path ? "text-foreground" : "text-muted hover:text-foreground")} data-testid={`code-tab-${f.path}`}>
              {f.path}
            </button>
            {!f.path.endsWith(".ino") ? (
              <button type="button" onClick={() => removeFile(f.path)} onBlur={() => setConfirmDelete(null)} aria-label={confirmDelete === f.path ? `Click again to delete ${f.path}` : `Delete ${f.path}`} title={confirmDelete === f.path ? "Click again to delete" : `Delete ${f.path}`} className={cn("mr-1 flex size-5 items-center justify-center rounded text-muted hover:bg-muted-bg hover:text-foreground", confirmDelete === f.path && "bg-danger/15 text-danger")}>
                <X className="size-3" aria-hidden />
              </button>
            ) : null}
          </div>
        ))}
        {adding === null ? (
          <button type="button" onClick={() => setAdding("")} aria-label="Add a file" title="Add a .h or .cpp file" className="my-1.5 flex w-7 shrink-0 items-center justify-center rounded-[6px] text-muted hover:bg-muted-bg hover:text-foreground" data-testid="code-add">
            <Plus className="size-3.5" aria-hidden />
          </button>
        ) : (
          <form onSubmit={addFile} className="flex items-center gap-1 py-1">
            <input
              autoFocus
              value={adding}
              onChange={(e) => setAdding(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setAdding(null)}
              placeholder="motor.h"
              aria-label="New file name"
              aria-invalid={!!problem}
              aria-describedby={problem ? "code-add-problem" : undefined}
              className="h-7 w-32 rounded-[6px] border border-border bg-background px-2 font-mono text-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            />
            <button type="submit" disabled={!adding.trim() || !!problem} className="h-7 rounded-[6px] px-2 text-[12px] font-medium text-primary disabled:opacity-40">
              Add
            </button>
          </form>
        )}
      </div>
      {problem ? (
        <p id="code-add-problem" role="alert" className="shrink-0 border-b border-border px-3 py-1 text-[11.5px] text-danger">
          {problem}
        </p>
      ) : null}
      <div className="min-h-0 flex-1" data-testid="code-editor">
        <CodeEditor path={active.path} value={active.content} onChange={(content) => onChange({ ...code, files: code.files.map((f) => (f.path === active.path ? { ...f, content } : f)) })} />
      </div>
      <div className="flex h-[34%] min-h-[7.5rem] shrink-0 flex-col border-t border-border">
        <div className="flex h-8 shrink-0 items-stretch gap-1 border-b border-border bg-background px-2" role="tablist" aria-label="Build">
          {(["output", "problems"] as const).map((id) => (
            <button key={id} type="button" role="tab" aria-selected={footer === id} onClick={() => setFooter(id)} className={cn("border-b-2 px-2 text-[12px] font-medium", footer === id ? "border-primary text-foreground" : "border-transparent text-muted hover:text-foreground")} data-testid={`code-footer-${id}`}>
              {id === "output" ? "Output" : `Problems${problems.length ? ` (${problems.length})` : ""}`}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1">
          {footer === "output" ? (
            build.unavailable || build.refused ? (
              <p role="status" className="p-3 text-[12.5px] text-muted" data-testid="code-build-note">
                {build.refused ?? build.unavailable}
              </p>
            ) : (
              <BuildOutput
                logs={build.result?.log ? build.result.log.split(/\r?\n/) : []}
                success={build.busy ? undefined : build.result ? build.result.ok : undefined}
                buildTimeMs={build.result?.durationMs}
                busy={build.busy}
              />
            )
          ) : (
            <ul className="hhip-scroll h-full overflow-auto p-1.5 text-[12px]" data-testid="code-problems">
              {problems.length === 0 ? <li className="p-1.5 text-muted">{build.result ? "No problems in the last build." : "Problems from the build show up here."}</li> : null}
              {problems.map((d, i) => (
                <li key={i} className="flex gap-2 rounded-[6px] p-1.5 hover:bg-muted-bg">
                  <span className={cn("shrink-0 font-semibold", d.severity === "error" ? "text-danger" : "text-warning")}>{d.severity === "error" ? "Error" : "Warning"}</span>
                  <span className="min-w-0">
                    <span className="font-mono text-muted">
                      {d.file ?? d.path}:{d.line}:{d.column}
                    </span>{" "}
                    {d.message}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {errors ? <span className="sr-only" role="status">{`${errors} ${errors === 1 ? "problem" : "problems"} in your code`}</span> : null}
      </div>
    </section>
  );
}

function PaneHeader({ onClose, onRun }: { onClose?: () => void; onRun?: () => void }) {
  return (
    <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3">
      <h2 className="text-[13px] font-semibold">Code</h2>
      <span className="truncate text-[11.5px] text-muted">Runs on the Arduino Uno</span>
      <span className="ml-auto" />
      {onRun ? (
        <button type="button" onClick={onRun} className="hidden h-7 items-center gap-1.5 rounded-[8px] px-2 text-[12px] text-muted hover:bg-muted-bg hover:text-foreground sm:inline-flex" title="Run (Ctrl/⌘ + Enter)" data-testid="code-run">
          <Play className="size-3.5" aria-hidden /> Run <kbd className="font-sans text-[11px] opacity-70">⌘↵</kbd>
        </button>
      ) : null}
      {onClose ? (
        <button type="button" onClick={onClose} aria-label="Close the code" title="Close the code" className="flex size-7 items-center justify-center rounded-[8px] text-muted hover:bg-muted-bg hover:text-foreground" data-testid="code-close">
          <X className="size-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
