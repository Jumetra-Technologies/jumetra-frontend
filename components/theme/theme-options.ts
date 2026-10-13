export const THEMES = [
  "light",
  "dark",
  "light-contrast",
  "dark-contrast",
  "blue",
  "red",
  "green",
] as const;

export type Theme = (typeof THEMES)[number];

export type ThemeOption = {
  id: Theme;
  label: string;
  description: string;
  /** [sidebar, canvas, accent] preview chips */
  swatch: [string, string, string];
};

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: "light",
    label: "Light",
    description: "Soft grey chrome, white canvas",
    swatch: ["#f2f2f2", "#ffffff", "#525252"],
  },
  {
    id: "dark",
    label: "Dark",
    description: "Soft charcoal chrome, deep canvas",
    swatch: ["#1c1c1c", "#0a0a0a", "#a3a3a3"],
  },
  {
    id: "light-contrast",
    label: "Light contrast",
    description: "Pale chrome, white canvas, max contrast",
    swatch: ["#f5f5f5", "#ffffff", "#000000"],
  },
  {
    id: "dark-contrast",
    label: "Dark contrast",
    description: "Soft black chrome, pure black canvas",
    swatch: ["#141414", "#000000", "#ffffff"],
  },
  {
    id: "blue",
    label: "Blue",
    description: "Deep blue sidebar, crisp white pages",
    swatch: ["#0f2557", "#f4f7fc", "#2563eb"],
  },
  {
    id: "red",
    label: "Red",
    description: "Deep crimson sidebar, warm white pages",
    swatch: ["#4c0f1b", "#fcf6f7", "#be123c"],
  },
  {
    id: "green",
    label: "Green",
    description: "Deep forest sidebar, fresh white pages",
    swatch: ["#0b3b2a", "#f4f9f6", "#047857"],
  },
];

/** Themes that use Tailwind `dark:` helper styles. */
export const DARK_SURFACE_THEMES: ReadonlySet<Theme> = new Set([
  "dark",
  "dark-contrast",
]);

export function isTheme(value: string | null | undefined): value is Theme {
  return THEMES.includes(value as Theme);
}

export const DEFAULT_THEME: Theme = "light";
