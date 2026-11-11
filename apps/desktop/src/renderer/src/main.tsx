import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "@kiungo/ui/tokens.css";
import "./styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

// macOS keeps its window buttons at the top left, inside the sidebar: the shell leaves room for them.
document.documentElement.dataset.platform = /Mac/.test(navigator.userAgent) ? "mac" : "other";

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
