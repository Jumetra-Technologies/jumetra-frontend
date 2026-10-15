"use client";

import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

/**
 * What the compiler said. When the Kiungo server has no compiler for the
 * board it does a "dry run": it checks the project's files but never compiles
 * the code. That is said plainly, above the log, so nobody reads a dry run as
 * "my code compiles".
 */
export function BuildOutput({
  logs,
  warnings,
  errors,
  buildTimeMs,
  success,
  simulated,
}: {
  logs: string[];
  warnings?: string[];
  errors?: string[];
  buildTimeMs?: number;
  success?: boolean;
  simulated?: boolean;
}) {
  const finished = success !== undefined;
  return (
    <div className="flex h-full flex-col bg-[#0B1220] font-mono text-[11px] text-slate-200" data-testid="build-output">
      <div className="flex items-center gap-2 border-b border-slate-800 px-2 py-1 font-sans text-[11px] text-slate-400">
        <span>Compiler messages</span>
        {finished ? (
          simulated ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-px font-semibold text-amber-300" data-testid="build-status">
              <Info className="size-3" aria-hidden /> Simulated
            </span>
          ) : success ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-px font-semibold text-emerald-300" data-testid="build-status">
              <CheckCircle2 className="size-3" aria-hidden /> Compiled
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-400/15 px-2 py-px font-semibold text-red-300" data-testid="build-status">
              <XCircle className="size-3" aria-hidden /> Failed
            </span>
          )
        ) : null}
        {buildTimeMs != null && <span className="ml-auto font-mono">{Math.round(buildTimeMs)} ms</span>}
      </div>
      {finished && simulated ? (
        <p className="flex gap-2 border-b border-amber-400/20 bg-amber-400/10 px-2 py-1.5 font-sans text-[11.5px] leading-4 text-amber-200" data-testid="simulated-build-note">
          <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden />
          <span>
            <strong>Your code wasn&apos;t compiled.</strong> Kiungo can&apos;t compile for this board yet, so it only checked the project&apos;s files. Mistakes in your code won&apos;t show up here, and the memory figures are estimates.
          </span>
        </p>
      ) : null}
      <div className="hhip-scroll flex-1 overflow-auto p-2">
        {logs.length === 0 && !errors?.length && <p className="font-sans text-slate-500">Press Compile to turn your code into a program the board can run. Errors and warnings show up here.</p>}
        {logs.map((l, i) => (
          <div key={i} className={/error/i.test(l) ? "text-red-400" : /warning/i.test(l) ? "text-amber-300" : ""}>
            {l.replace(/^\[HHIP\]\s*/, "")}
          </div>
        ))}
        {(warnings || []).map((w, i) => (
          <div key={`w-${i}`} className="text-amber-300">
            Warning: {w}
          </div>
        ))}
        {(errors || []).map((e, i) => (
          <div key={`e-${i}`} className="text-red-400">
            Error: {e}
          </div>
        ))}
      </div>
    </div>
  );
}
