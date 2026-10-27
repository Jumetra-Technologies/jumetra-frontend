import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "@kiungo/ui/tokens.css";
import "./app.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
