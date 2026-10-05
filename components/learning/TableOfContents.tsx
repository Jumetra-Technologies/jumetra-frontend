import { getHeadings } from "@/components/learning/ContentRenderer";
import type { Block } from "@/lib/learning/types";
import { cn } from "@/lib/utils";

/** "On this page" list built from a page's headings. Renders nothing for pages without sections. */
export function TableOfContents({ blocks }: { blocks: Block[] }) {
  const headings = getHeadings(blocks);
  if (headings.length < 2) return null;

  return (
    <nav aria-label="On this page" className="text-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">On this page</p>
      <ul className="mt-3 space-y-2 border-l border-border">
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              className={cn(
                "-ml-px block border-l border-transparent py-0.5 text-muted transition-colors hover:border-primary hover:text-foreground",
                heading.level === 2 ? "pl-3" : "pl-6 text-[13px]",
              )}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
