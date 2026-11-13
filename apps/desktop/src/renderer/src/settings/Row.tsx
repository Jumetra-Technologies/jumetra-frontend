import type { ReactNode } from "react";

/** One setting: what it is on the left, its control on the right. */
export function Row({ title, detail, children, testId }: { title: string; detail?: string; children?: ReactNode; testId?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-border py-3.5 first:border-0" data-testid={testId}>
      <div className="min-w-0">
        <p className="text-[13.5px] font-medium text-foreground">{title}</p>
        {detail ? <p className="mt-0.5 text-[12.5px] text-muted">{detail}</p> : null}
      </div>
      {children ? <div className="flex shrink-0 items-center">{children}</div> : null}
    </div>
  );
}
