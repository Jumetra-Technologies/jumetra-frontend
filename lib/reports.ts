import { formatExperimentReport } from "@/lib/robotics-data";

/** Save text as a Markdown file in the browser. */
export function downloadMarkdown(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function safeFilename(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "kiungo-report";
}

type Record = Parameters<typeof formatExperimentReport>[0];
type Project = NonNullable<Parameters<typeof formatExperimentReport>[1]>;

/** One experiment record as a Markdown file. */
export function exportExperiment(record: Record, project?: Project) {
  downloadMarkdown(`${safeFilename(record.title)}.md`, formatExperimentReport(record, project));
}
