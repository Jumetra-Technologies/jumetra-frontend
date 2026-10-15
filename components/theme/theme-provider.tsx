"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import {
  DEFAULT_THEME,
  DARK_SURFACE_THEMES,
  isTheme,
  type Theme,
} from "@/components/theme/theme-options";

const THEME_STORAGE_KEY = "hhip-theme";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle("dark", DARK_SURFACE_THEMES.has(theme));
}

/** The saved theme, read as an external store: the browser's copy, with a memory copy for when storage is blocked. */
let themeInMemory: Theme = DEFAULT_THEME;
const themeListeners = new Set<() => void>();
function readTheme(): Theme {
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(saved) ? saved : themeInMemory;
  } catch {
    return themeInMemory;
  }
}
function subscribeTheme(listener: () => void): () => void {
  themeListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    themeListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => DEFAULT_THEME);

  useEffect(() => applyTheme(theme), [theme]);

  const setTheme = useCallback((next: Theme) => {
    themeInMemory = next;
    applyTheme(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch (error) {
      console.error("Could not save the appearance preference.", error);
    }
    themeListeners.forEach((listener) => listener());
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [setTheme, theme]);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: DEFAULT_THEME,
      setTheme: () => undefined,
      toggleTheme: () => undefined,
    };
  }
  return ctx;
}
