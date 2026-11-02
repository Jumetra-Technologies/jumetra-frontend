export { cn } from "@kiungo/ui/cn";

export function formatPercent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatMs(value: number, digits = 2): string {
  return `${value.toFixed(digits)} ms`;
}
