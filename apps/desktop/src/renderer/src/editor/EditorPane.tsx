import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, FilePlus2, Loader2, MoreHorizontal, Play, Search, Square, Upload, X } from "lucide-react";
import type { SketchFile } from "@kiungo/api";
import { cn } from "@kiungo/ui/cn";
import { Menu } from "@kiungo/ui/menu";
import { invoke, shortcut } from "../ipc";
import { languageFor, monaco } from "./monaco";

type SaveState = { state: "saved" | "saving" | "error"; message?: string };

/** One open file. Monaco's model lives outside React; what the screen shows is in `status`. */
interface OpenFile {
  name: string;
  model: monaco.editor.ITextModel;
  view: monaco.editor.ICodeEditorViewState | null;
  /** The text last written to disk. */
  saved: string;
  timer?: ReturnType<typeof setTimeout>;
  writing: boolean;
}

/** Saves follow typing by this much (EDT-04); switching file, leaving the editor or closing saves at once. */
const SAVE_DELAY_MS = 400;

/** Write a file's text if it changed, then again if more was typed meanwhile. */
async function writeFile(projectPath: string, file: OpenFile, report: (name: string, s: SaveState) => void): Promise<void> {
  if (file.timer) clearTimeout(file.timer);
  file.timer = undefined;
  if (file.writing) {
    file.timer = setTimeout(() => void writeFile(projectPath, file, report), SAVE_DELAY_MS);
    return;
  }
  const text = file.model.isDisposed() ? file.saved : file.model.getValue();
  if (text === file.saved) {
    report(file.name, { state: "saved" });
    return;
  }
  file.writing = true;
  report(file.name, { state: "saving" });
  const result = await invoke("sketch:write", projectPath, file.name, text).catch(() => ({ ok: false as const, message: `Couldn't save ${file.name}.` }));
  file.writing = false;
  if (!result.ok) {
    report(file.name, { state: "error", message: result.message });
    return;
  }
  file.saved = text;
  if (!file.model.isDisposed() && file.model.getValue() !== text) await writeFile(projectPath, file, report);
  else report(file.name, { state: "saved" });
}

interface EditorPaneProps {
  projectPath: string;
  running: boolean;
  onRun: () => void;
  onStop: () => void;
  onClose: () => void;
}

/** Code beside the circuit (DSK-30, EDT-01 to EDT-03, EDT-06): the sketch's files in tabs, saved as you type. */
export function EditorPane({ projectPath, running, onRun, onStop, onClose }: EditorPaneProps) {
  const host = useRef<HTMLDivElement>(null);
  const editor = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const files = useRef(new Map<string, OpenFile>());
  // The editor's Ctrl+Enter command is made once; it reads the current Run or Stop through this.
  const runRef = useRef<() => void>(() => undefined);
  useEffect(() => {
    runRef.current = running ? onStop : onRun;
  }, [running, onRun, onStop]);
  const [list, setList] = useState<SketchFile[]>([]);
  const [tabs, setTabs] = useState<string[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [status, setStatus] = useState<Record<string, SaveState>>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [naming, setNaming] = useState<{ mode: "new" } | { mode: "rename"; from: string } | null>(null);

  const report = useCallback((name: string, s: SaveState) => setStatus((all) => (all[name]?.state === s.state && all[name]?.message === s.message ? all : { ...all, [name]: s })), []);
  const save = useCallback((file: OpenFile) => writeFile(projectPath, file, report), [projectPath, report]);
  const saveAll = useCallback(() => {
    for (const file of files.current.values()) if (file.timer || (!file.model.isDisposed() && file.model.getValue() !== file.saved)) void save(file);
  }, [save]);

  const track = useCallback(
    (file: OpenFile) => {
      file.model.onDidChangeContent(() => {
        if (file.timer) clearTimeout(file.timer);
        file.timer = setTimeout(() => void save(file), SAVE_DELAY_MS);
        report(file.name, { state: "saving" });
      });
    },
    [save, report],
  );

  const open = useCallback(
    async (name: string) => {
      setProblem(null);
      if (!files.current.has(name)) {
        const read = await invoke("sketch:read", projectPath, name);
        if (!read.ok) {
          setProblem(read.message);
          return;
        }
        if (!files.current.has(name)) {
          const file: OpenFile = { name, model: monaco.editor.createModel(read.content, languageFor(name), monaco.Uri.file(`/${name}`)), view: null, saved: read.content, writing: false };
          track(file);
          files.current.set(name, file);
        }
      }
      setTabs((t) => (t.includes(name) ? t : [...t, name]));
      setActive(name);
    },
    [projectPath, track],
  );

  const reloadList = useCallback(async () => {
    const next = await invoke("sketch:list", projectPath);
    setList(next);
    return next;
  }, [projectPath]);

  // The editor itself, made once per project.
  useEffect(() => {
    if (!host.current) return;
    const dark = () => document.documentElement.dataset.theme === "dark";
    const instance = monaco.editor.create(host.current, {
      model: null,
      theme: dark() ? "kiungo-dark" : "kiungo-light",
      automaticLayout: true,
      fontFamily: '"JetBrains Mono Variable", Consolas, monospace',
      fontSize: 13.5,
      lineHeight: 21,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      tabSize: 2,
      padding: { top: 10 },
      smoothScrolling: true,
      fixedOverflowWidgets: true,
    });
    editor.current = instance;
    // The editor follows the app's light or dark mode.
    const observer = new MutationObserver(() => monaco.editor.setTheme(dark() ? "kiungo-dark" : "kiungo-light"));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const blur = instance.onDidBlurEditorText(() => saveAll());
    // Ctrl+Enter (⌘↵) runs from the editor, as it does from the lab.
    instance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => runRef.current());
    const opened = files.current;
    return () => {
      observer.disconnect();
      blur.dispose();
      for (const file of opened.values()) {
        if (file.timer) clearTimeout(file.timer);
        // Last words: send anything unsaved before the models go.
        if (file.model.getValue() !== file.saved) void invoke("sketch:write", projectPath, file.name, file.model.getValue());
        file.model.dispose();
      }
      opened.clear();
      instance.dispose();
      editor.current = null;
    };
  }, [projectPath, saveAll]);

  // Open the main sketch file first (on the next tick, so the first render isn't redone).
  useEffect(() => {
    const id = window.setTimeout(() => {
      void reloadList().then((names) => {
        const main = names.find((f) => f.main) ?? names[0];
        if (main) void open(main.name);
      });
    }, 0);
    return () => window.clearTimeout(id);
  }, [reloadList, open]);

  // Show the active file, keeping each file's cursor and scroll.
  useEffect(() => {
    const instance = editor.current;
    if (!instance) return;
    const shown = instance.getModel();
    const leaving = shown ? [...files.current.values()].find((f) => f.model === shown) : undefined;
    if (leaving) {
      leaving.view = instance.saveViewState();
      void save(leaving);
    }
    const file = active ? files.current.get(active) : undefined;
    instance.setModel(file?.model ?? null);
    if (file?.view) instance.restoreViewState(file.view);
    if (file) instance.focus();
  }, [active, save]);

  useEffect(() => {
    window.addEventListener("beforeunload", saveAll);
    return () => window.removeEventListener("beforeunload", saveAll);
  }, [saveAll]);

  // ----- tabs and files -----------------------------------------------------------------
  const closeTab = (name: string) => {
    const file = files.current.get(name);
    if (file) {
      files.current.delete(name);
      void save(file).finally(() => file.model.dispose());
    }
    const next = tabs.filter((x) => x !== name);
    setTabs(next);
    if (active === name) setActive(next[Math.max(0, tabs.indexOf(name) - 1)] ?? null);
  };

  const submitName = async (value: string) => {
    if (!naming) return;
    const name = value.trim();
    if (naming.mode === "new") {
      const result = await invoke("sketch:create", projectPath, name);
      if (!result.ok) return setProblem(result.message);
      setNaming(null);
      await reloadList();
      await open(name);
    } else {
      const from = naming.from;
      const file = files.current.get(from);
      if (file) await save(file);
      const result = await invoke("sketch:rename", projectPath, from, name);
      if (!result.ok) return setProblem(result.message);
      setNaming(null);
      if (file) {
        // Same text, same undo history; only the name (and how it's highlighted) changes.
        file.name = name;
        files.current.delete(from);
        files.current.set(name, file);
        monaco.editor.setModelLanguage(file.model, languageFor(name));
      }
      setStatus((all) => {
        const { [from]: moved, ...rest } = all;
        return moved ? { ...rest, [name]: moved } : rest;
      });
      setTabs((t) => t.map((x) => (x === from ? name : x)));
      if (active === from) setActive(name);
      await reloadList();
    }
    setProblem(null);
  };

  const remove = async (name: string) => {
    if (!window.confirm(`Move ${name} to the trash? You can get it back from there.`)) return;
    const result = await invoke("sketch:delete", projectPath, name);
    if (!result.ok) return setProblem(result.message);
    const file = files.current.get(name);
    if (file) {
      if (file.timer) clearTimeout(file.timer);
      file.saved = file.model.getValue(); // nothing left to save
      files.current.delete(name);
      file.model.dispose();
    }
    setTabs((t) => t.filter((x) => x !== name));
    if (active === name) setActive(list.find((f) => f.main)?.name ?? null);
    await reloadList();
  };

  const find = () => {
    editor.current?.focus();
    void editor.current?.getAction("actions.find")?.run();
  };

  const shown = active ? (status[active] ?? { state: "saved" as const }) : { state: "saved" as const };
  const others = list.filter((f) => !tabs.includes(f.name));

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col border-l border-border bg-surface" aria-label="Code" data-testid="editor-pane" data-own-keys>
      {/* Run, upload, stop (EDT-06); find; files */}
      <div className="flex h-12 shrink-0 items-center gap-1 border-b border-border px-2">
        <button type="button" onClick={onRun} disabled={running} title={`Run (${shortcut("↵")}). The lab runs each board's built-in behavior; running your own code arrives in a later update.`} className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-primary px-2.5 text-[12.5px] font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40" data-testid="editor-run">
          <Play className="size-3.5" aria-hidden />
          Run
        </button>
        <button type="button" disabled title="Uploading to a plugged-in board arrives with USB board support in a later update." className="inline-flex h-8 items-center gap-1.5 rounded-[8px] px-2.5 text-[12.5px] font-medium text-muted disabled:opacity-50" data-testid="editor-upload">
          <Upload className="size-3.5" aria-hidden />
          Upload
        </button>
        <button type="button" onClick={onStop} disabled={!running} className="inline-flex h-8 items-center gap-1.5 rounded-[8px] px-2.5 text-[12.5px] font-medium text-foreground hover:bg-muted-bg disabled:opacity-40" data-testid="editor-stop">
          <Square className="size-3.5" aria-hidden />
          Stop
        </button>
        <span className="flex-1" />
        <span className={cn("inline-flex items-center gap-1 px-1.5 text-[11.5px]", shown.state === "error" ? "text-danger" : "text-muted")} title={shown.message} aria-live="polite" data-testid="editor-save">
          {shown.state === "saving" ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : shown.state === "error" ? <AlertTriangle className="size-3.5" aria-hidden /> : <Check className="size-3.5 text-success" aria-hidden />}
          {shown.state === "saving" ? "Saving" : shown.state === "error" ? "Not saved" : "Saved"}
        </span>
        <button type="button" onClick={find} title={`Find (${shortcut("F")})`} aria-label="Find" className="flex size-8 items-center justify-center rounded-[8px] text-muted hover:bg-muted-bg hover:text-foreground">
          <Search className="size-4" />
        </button>
        <button type="button" onClick={() => setNaming({ mode: "new" })} title="New file" aria-label="New file" className="flex size-8 items-center justify-center rounded-[8px] text-muted hover:bg-muted-bg hover:text-foreground" data-testid="editor-new-file">
          <FilePlus2 className="size-4" />
        </button>
        <button type="button" onClick={onClose} title={`Hide the code (${shortcut("E")})`} aria-label="Hide the code" className="flex size-8 items-center justify-center rounded-[8px] text-muted hover:bg-muted-bg hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>

      {/* Open files (EDT-01) */}
      <div className="flex h-9 shrink-0 items-stretch overflow-x-auto border-b border-border bg-background" role="tablist" aria-label="Open files">
        {tabs.map((name) => {
          const meta = list.find((f) => f.name === name);
          const state = status[name]?.state ?? "saved";
          const selected = name === active;
          return (
            <div key={name} className={cn("group flex shrink-0 items-center border-r border-border", selected ? "bg-surface" : "hover:bg-muted-bg")}>
              <button type="button" role="tab" aria-selected={selected} onClick={() => setActive(name)} className={cn("h-full pl-3 pr-1 font-mono text-[12px]", selected ? "text-foreground" : "text-muted")} data-testid={`tab-${name}`}>
                {name}
                {state !== "saved" ? <span className={cn("ml-1.5 inline-block size-1.5 rounded-full align-middle", state === "error" ? "bg-danger" : "bg-muted")} aria-label={state === "error" ? "not saved" : "saving"} /> : null}
              </button>
              <Menu
                label={`More for ${name}`}
                items={[
                  ...(!meta?.main ? [{ id: "rename", label: "Rename", onSelect: () => setNaming({ mode: "rename", from: name }) }, { id: "delete", label: "Move to trash", danger: true, onSelect: () => void remove(name) }] : []),
                  ...(tabs.length > 1 ? [{ id: "close", label: "Close tab", onSelect: () => closeTab(name) }] : []),
                ]}
                buttonClassName="flex size-6 items-center justify-center rounded-[6px] text-muted opacity-0 hover:bg-muted-bg group-hover:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100"
              >
                <MoreHorizontal className="size-3.5" />
              </Menu>
            </div>
          );
        })}
        {others.length ? (
          <Menu label="Other files" items={others.map((f) => ({ id: f.name, label: f.name, onSelect: () => void open(f.name) }))} buttonClassName="flex h-full items-center px-3 text-[12px] font-medium text-primary hover:bg-muted-bg">
            {others.length} more
          </Menu>
        ) : null}
      </div>

      {naming ? (
        <form
          className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2"
          onSubmit={(e) => {
            e.preventDefault();
            void submitName(String(new FormData(e.currentTarget).get("name") ?? ""));
          }}
        >
          <label className="text-[12.5px] text-muted" htmlFor="sketch-file-name">
            {naming.mode === "new" ? "New file" : `Rename ${naming.from}`}
          </label>
          <input id="sketch-file-name" name="name" autoFocus defaultValue={naming.mode === "rename" ? naming.from : ""} placeholder="motor.h" className="h-8 min-w-0 flex-1 rounded-[8px] border border-border bg-background px-2 font-mono text-[12.5px] outline-none focus-visible:border-primary focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_22%,transparent)]" onKeyDown={(e) => e.key === "Escape" && setNaming(null)} data-testid="file-name-input" />
          <button type="submit" className="h-8 rounded-[8px] bg-primary px-3 text-[12.5px] font-medium text-primary-foreground">
            {naming.mode === "new" ? "Create" : "Rename"}
          </button>
          <button type="button" onClick={() => setNaming(null)} className="h-8 rounded-[8px] px-2 text-[12.5px] text-muted hover:bg-muted-bg">
            Cancel
          </button>
        </form>
      ) : null}

      {problem ? (
        <p role="alert" className="flex shrink-0 items-start gap-2 border-b border-border bg-[color-mix(in_srgb,var(--danger)_8%,var(--surface))] px-3 py-2 text-[12.5px] text-danger">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span className="flex-1">{problem}</span>
          <button type="button" onClick={() => setProblem(null)} aria-label="Dismiss" className="text-muted">
            <X className="size-3.5" />
          </button>
        </p>
      ) : null}

      <div ref={host} className="min-h-0 flex-1" data-native-scrollbar data-testid="code-editor" />
    </section>
  );
}
