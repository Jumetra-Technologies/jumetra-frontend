"use client";

import { THEME_OPTIONS } from "@/components/theme/theme-options";
import { useTheme } from "@/components/theme/theme-provider";
import { cn } from "@/lib/utils";

export function ThemeSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Appearance theme">
      {THEME_OPTIONS.map((option) => {
        const selected = theme === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setTheme(option.id)}
            className={cn(
              "flex flex-col gap-2 rounded-[12px] border px-3 py-3 text-left transition-colors",
              selected
                ? "border-primary bg-accent shadow-[var(--shadow-sm)]"
                : "border-border bg-canvas hover:border-muted",
            )}
          >
            <div className="flex items-center gap-2">
              <span className="flex gap-1" aria-hidden>
                {option.swatch.map((color) => (
                  <span
                    key={color}
                    className="size-3.5 rounded-full border border-black/10"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </span>
              <span className="text-sm font-semibold text-foreground">{option.label}</span>
            </div>
            <span className="text-[11px] text-muted">{option.description}</span>
          </button>
        );
      })}
    </div>
  );
}
