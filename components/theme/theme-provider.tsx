"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
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

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => {
    try {
      const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (isTheme(savedTheme)) setThemeState(savedTheme);
    } catch (error) {
      console.error("Could not read the saved appearance preference.", error);
    }
  }, []);

  useEffect(() => applyTheme(theme), [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch (error) {
      console.error("Could not save the appearance preference.", error);
    }
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
      setTheme: (_: Theme) => undefined,
      toggleTheme: () => undefined,
    };
  }
  return ctx;
}
