"use client";

export function ProjectExplorer({
  tree,
  activePath,
  onOpen,
}: {
  tree: Record<string, string[]>;
  activePath?: string | null;
  onOpen: (path: string) => void;
}) {
  return (
    <div className="h-full overflow-auto text-[11px]">
      <p className="border-b border-border px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
        Files
      </p>
      {Object.keys(tree).length === 0 && (
        <p className="p-2 text-muted">Open a project to see its files.</p>
      )}
      {Object.entries(tree).map(([group, files]) => (
        <div key={group} className="border-b border-border/60 py-1">
          <p className="px-2 py-0.5 font-semibold text-muted">{group}</p>
          <ul>
            {files.map((f) => (
              <li key={f}>
                <button
                  type="button"
                  className={`block w-full truncate px-3 py-0.5 text-left font-mono hover:bg-muted-bg ${
                    activePath === f ? "bg-accent text-primary" : ""
                  }`}
                  onClick={() => onOpen(f)}
                >
                  {f}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
