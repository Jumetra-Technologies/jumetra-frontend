import { useEffect } from "react";

/**
 * The app follows the system's light or dark mode (DSK-82), live: the shared
 * theme reads [data-theme] on <html>.
 */
export function useSystemTheme(): void {
  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme = query.matches ? "dark" : "light";
      document.documentElement.style.colorScheme = query.matches ? "dark" : "light";
    };
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);
}
