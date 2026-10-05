import Link from "next/link";
import {
  CODE_STATUS_LABELS,
  relationshipsFor,
  type CodeStatus,
  type Layer,
  type LayerId,
} from "@/lib/architecture/model";
import { cn } from "@/lib/utils";
import { LAYER_ICONS } from "./SystemBoard";

const STATUS_TONE: Record<CodeStatus, string> = {
  live: "var(--success)",
  prototype: "var(--warning)",
  experimental: "var(--warning)",
  "not-started": "var(--muted)",
};

export function StatusPill({ status, className }: { status: CodeStatus; className?: string }) {
  const tone = STATUS_TONE[status];
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold", className)}
      style={{
        color: tone,
        borderColor: `color-mix(in srgb, ${tone} 35%, transparent)`,
        background: `color-mix(in srgb, ${tone} 12%, transparent)`,
      }}
    >
      <span aria-hidden className="size-1.5 rounded-full" style={{ background: tone }} />
      {CODE_STATUS_LABELS[status]}
    </span>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h4 className="mb-2 text-sm font-semibold text-foreground">{children}</h4>;
}

export function LayerPanel({ layer, onSelect }: { layer: Layer; onSelect: (id: LayerId) => void }) {
  const Icon = LAYER_ICONS[layer.id];
  const connections = relationshipsFor(layer.id);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-border bg-muted-bg text-primary">
            <Icon className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold leading-tight">{layer.name}</h3>
            <p className="mt-0.5 text-sm text-muted">{layer.role}</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6">{layer.summary}</p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-[10px] border border-border px-3 py-2">
            <dt className="text-xs text-muted">In the code now</dt>
            <dd className="mt-1">
              <StatusPill status={layer.code.status} />
            </dd>
          </div>
          <div className="rounded-[10px] border border-border px-3 py-2">
            <dt className="text-xs text-muted">Planned for</dt>
            <dd className="mt-1 font-semibold">{layer.phase === 1 ? "Phase One" : "Phase Two"}</dd>
          </div>
        </dl>
      </div>

      <section>
        <SectionHeading>What it does</SectionHeading>
        <ul className="space-y-1.5 text-sm leading-6">
          {layer.responsibilities.map((item) => (
            <li key={item} className="flex gap-2.5">
              <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-[2px] bg-primary" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SectionHeading>In the code now</SectionHeading>
        <p className="text-sm leading-6 text-muted">{layer.code.text}</p>
        {layer.code.endpoints?.length ? (
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Example endpoints">
            {layer.code.endpoints.map((endpoint) => (
              <li key={endpoint}>
                <code className="rounded-md border border-border bg-muted-bg px-1.5 py-0.5 font-mono text-xs">{endpoint}</code>
              </li>
            ))}
          </ul>
        ) : null}
        {layer.code.links?.length ? (
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {layer.code.links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="font-medium text-primary underline-offset-4 hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section>
        <SectionHeading>Connected to</SectionHeading>
        <ul className="space-y-2">
          {connections.map(({ relationship, other }) => {
            const OtherIcon = LAYER_ICONS[other.id];
            return (
              <li key={relationship.id}>
                <button
                  type="button"
                  onClick={() => onSelect(other.id)}
                  className="group w-full rounded-[10px] border border-border px-3 py-2.5 text-left transition-colors hover:bg-muted-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <OtherIcon className="size-4 text-primary" aria-hidden />
                      {other.name}
                    </span>
                    <span className="text-xs font-medium text-muted">{relationship.label}</span>
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-muted">
                    {relationship.code ? null : <span className="font-medium text-foreground">Not built yet. </span>}
                    {relationship.carries}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
