"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

type Props = {
  value: string;
  language?: string;
  path?: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
};

const Monaco = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-[#1e1e1e] text-xs text-slate-400">
      Loading editor…
    </div>
  ),
});

function langFromPath(path?: string, fallback = "cpp"): string {
  if (!path) return fallback;
  if (path.endsWith(".py")) return "python";
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".md")) return "markdown";
  if (path.endsWith(".ini")) return "ini";
  if (path.endsWith(".c") || path.endsWith(".h")) return "c";
  if (path.endsWith(".ino") || path.endsWith(".cpp") || path.endsWith(".hpp")) return "cpp";
  return fallback;
}

/** Monaco-backed code editor with textarea fallback. */
export function CodeEditor({ value, language, path, onChange, readOnly }: Props) {
  const [useFallback, setUseFallback] = useState(false);
  const lang = language || langFromPath(path);

  useEffect(() => {
    // If monaco package missing at runtime, fall back
    let cancelled = false;
    import("@monaco-editor/react").catch(() => {
      if (!cancelled) setUseFallback(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (useFallback) {
    return (
      <textarea
        className="h-full w-full resize-none bg-[#1e1e1e] p-3 font-mono text-xs leading-5 text-slate-100 outline-none"
        value={value}
        readOnly={readOnly}
        spellCheck={false}
        onChange={(e) => onChange?.(e.target.value)}
      />
    );
  }

  return (
    <Monaco
      height="100%"
      language={lang}
      theme="vs-dark"
      value={value}
      path={path}
      options={{
        readOnly: !!readOnly,
        minimap: { enabled: true },
        fontSize: 13,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        automaticLayout: true,
        folding: true,
        tabSize: 2,
        scrollBeyondLastLine: false,
        wordWrap: "on",
      }}
      onChange={(v) => onChange?.(v ?? "")}
      loading={<div className="p-3 text-xs text-slate-400">Loading Monaco…</div>}
    />
  );
}
