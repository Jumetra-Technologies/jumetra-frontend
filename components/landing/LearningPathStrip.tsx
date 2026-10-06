import Link from "next/link";
import { getModulesByTopic, moduleHref } from "@/lib/learning";

/** The guided path as a row of stages, each linking to its first module. */
export function LearningPathStrip() {
  const groups = getModulesByTopic();
  return (
    <ol className="flex flex-wrap items-stretch gap-x-2 gap-y-3" aria-label="Learning path stages">
      {groups.map((group, index) => {
        const first = group.modules[0];
        const count = group.modules.length;
        return (
          <li key={group.topic} className="flex items-center gap-2">
            <Link
              href={moduleHref(first)}
              className="group rounded-[12px] border border-border bg-surface px-4 py-3 transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            >
              <span className="block text-sm font-semibold text-foreground">{group.label}</span>
              <span className="mt-0.5 block font-mono text-xs text-muted">
                {count} {count === 1 ? "module" : "modules"}
              </span>
            </Link>
            {index < groups.length - 1 ? (
              <span aria-hidden className="hidden h-0.5 w-5 shrink-0 bg-border sm:block" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
