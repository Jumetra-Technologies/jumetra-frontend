"use client";

function kb(bytes?: number): string {
  if (bytes == null) return "—";
  return bytes >= 1024 ? `${(bytes / 1024).toFixed(bytes >= 10240 ? 0 : 1)} KB` : `${bytes} B`;
}

/** How much of the chip the program takes: flash holds the program, RAM its variables while it runs. */
export function MemoryUsagePanel({
  memory,
  binarySize,
  simulated,
}: {
  memory?: {
    flash_used?: number;
    flash_total?: number;
    ram_used?: number;
    ram_total?: number;
    flash_percent?: number;
    ram_percent?: number;
  } | null;
  binarySize?: number;
  simulated?: boolean;
}) {
  if (!memory) {
    return <div className="p-3 text-[12px] text-muted">After you compile, this shows how much of the board&apos;s memory your program uses.</div>;
  }
  const rows = [
    { label: "Program storage (flash)", used: memory.flash_used, total: memory.flash_total, pct: memory.flash_percent ?? 0, bar: "bg-sky-500", hint: "Where the program itself is kept." },
    { label: "Working memory (RAM)", used: memory.ram_used, total: memory.ram_total, pct: memory.ram_percent ?? 0, bar: "bg-violet-500", hint: "Variables while it runs. Above about 75 % a sketch can crash." },
  ];
  return (
    <div className="space-y-3 p-3 text-[12px]" data-testid="memory-panel">
      {simulated ? <p className="rounded-[8px] bg-warning/12 px-2 py-1 text-[11.5px] text-warning">Estimates: the build was simulated, so these aren&apos;t measured.</p> : null}
      {rows.map((r) => (
        <div key={r.label}>
          <div className="mb-1 flex justify-between gap-2">
            <span className="font-medium text-foreground">{r.label}</span>
            <span className="font-mono text-muted">
              {kb(r.used)} of {kb(r.total)} · {r.pct}%
            </span>
          </div>
          <div className="h-1.5 rounded bg-muted-bg">
            <div className={`h-full rounded ${r.pct > 75 ? "bg-warning" : r.bar}`} style={{ width: `${Math.min(r.pct, 100)}%` }} />
          </div>
          <p className="mt-0.5 text-[11px] text-muted">{r.hint}</p>
        </div>
      ))}
      {binarySize != null && <p className="text-muted">Program file: {kb(binarySize)}</p>}
    </div>
  );
}
