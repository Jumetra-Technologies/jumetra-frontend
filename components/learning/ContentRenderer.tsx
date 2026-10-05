import Link from "next/link";
import { AlertTriangle, ArrowRight, Info, Lightbulb } from "lucide-react";
import { Inline } from "@/components/learning/Inline";
import { CopyButton } from "@/components/learning/CopyButton";
import { slugify, stripInline } from "@/lib/learning/inline";
import type { Block, CalloutTone } from "@/lib/learning/types";
import { cn } from "@/lib/utils";

const CALLOUT_STYLES: Record<
  CalloutTone,
  { icon: typeof Info; label: string; accent: string }
> = {
  tip: { icon: Lightbulb, label: "Tip", accent: "var(--success)" },
  warning: { icon: AlertTriangle, label: "Warning", accent: "var(--warning)" },
  note: { icon: Info, label: "Note", accent: "var(--primary)" },
};

/** Headings that appear in the on-page table of contents. */
export interface PageHeading {
  id: string;
  text: string;
  level: 2 | 3;
  /** Index of the heading block within the page's block list. */
  blockIndex: number;
}

export function getHeadings(blocks: Block[]): PageHeading[] {
  const seen = new Map<string, number>();
  const headings: PageHeading[] = [];
  blocks.forEach((block, blockIndex) => {
    if (block.type !== "h2" && block.type !== "h3") return;
    const base = slugify(block.text) || "section";
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    headings.push({
      id: count === 0 ? base : `${base}-${count + 1}`,
      text: block.text,
      level: block.type === "h2" ? 2 : 3,
      blockIndex,
    });
  });
  return headings;
}

export function ContentRenderer({ blocks }: { blocks: Block[] }) {
  const headingIds = new Map(getHeadings(blocks).map((heading) => [heading.blockIndex, heading.id]));

  return (
    <div className="space-y-5 text-sm leading-7 text-foreground">
      {blocks.map((block, index) => {
        switch (block.type) {
          case "h2": {
            const id = headingIds.get(index);
            return (
              <h2
                key={index}
                id={id}
                className="scroll-mt-6 border-t border-border pt-8 text-xl font-semibold tracking-tight first:mt-0 first:border-t-0 first:pt-0"
              >
                {block.text}
              </h2>
            );
          }
          case "h3": {
            const id = headingIds.get(index);
            return (
              <h3 key={index} id={id} className="scroll-mt-6 pt-2 text-base font-semibold">
                {block.text}
              </h3>
            );
          }
          case "p":
            return (
              <p key={index} className="text-muted">
                <Inline text={block.text} />
              </p>
            );
          case "ul":
            return (
              <ul key={index} className="list-disc space-y-2 pl-5 text-muted marker:text-muted">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>
                    <Inline text={item} />
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={index} className="list-decimal space-y-2 pl-5 text-muted marker:font-medium marker:text-foreground">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="pl-1">
                    <Inline text={item} />
                  </li>
                ))}
              </ol>
            );
          case "code":
            return (
              <figure key={index} className="overflow-hidden rounded-[10px] border border-border bg-muted-bg">
                <figcaption className="flex items-center justify-between gap-3 border-b border-border px-3 py-1.5">
                  <span className="truncate font-mono text-xs text-muted">
                    {block.filename ?? block.language}
                  </span>
                  <CopyButton text={block.code} />
                </figcaption>
                <pre className="overflow-x-auto p-4 text-[13px] leading-6 text-foreground">
                  <code>{block.code}</code>
                </pre>
              </figure>
            );
          case "callout": {
            const style = CALLOUT_STYLES[block.tone];
            const Icon = style.icon;
            return (
              <aside
                key={index}
                role="note"
                className="rounded-[10px] border border-border border-l-4 bg-muted-bg px-4 py-3"
                style={{ borderLeftColor: style.accent }}
              >
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Icon className="size-4 shrink-0" style={{ color: style.accent }} aria-hidden />
                  {block.title ?? style.label}
                </p>
                <p className="mt-1 text-muted">
                  <Inline text={block.text} />
                </p>
              </aside>
            );
          }
          case "table":
            return (
              <div key={index} className="overflow-x-auto rounded-[10px] border border-border">
                <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
                  {block.caption ? <caption className="sr-only">{block.caption}</caption> : null}
                  <thead className="bg-muted-bg">
                    <tr>
                      {block.head.map((cell, cellIndex) => (
                        <th key={cellIndex} scope="col" className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
                          {cell}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {block.rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="align-top">
                        {row.map((cell, cellIndex) => (
                          <td
                            key={cellIndex}
                            className={cn("px-3 py-2.5 text-muted", cellIndex === 0 && "font-medium text-foreground")}
                          >
                            <Inline text={cell} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "link-card":
            return (
              <Link
                key={index}
                href={block.href}
                className="group flex items-center justify-between gap-4 rounded-[10px] border border-border bg-surface px-4 py-3 shadow-[var(--shadow-sm)] transition-colors hover:bg-muted-bg"
              >
                <span>
                  <span className="block text-sm font-semibold">{block.title}</span>
                  <span className="mt-0.5 block text-sm text-muted">{stripInline(block.text)}</span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            );
        }
      })}
    </div>
  );
}
