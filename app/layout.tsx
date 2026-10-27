import type { Metadata } from "next";
import localFont from "next/font/local";
import { AuthBootstrap } from "@/components/auth/auth-bootstrap";
import { AppShell } from "@/components/layout/sidebar";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { ElasticScrollbars } from "@/components/ui/ElasticScrollbars";
import { LabAccountSync } from "@/components/lab/LabAccountSync";
import { LearningAccountSync } from "@/components/learning/LearningAccountSync";
import "./globals.css";

// Fonts are bundled with the app (npm @fontsource-variable/*), so a build never depends on Google Fonts.
const inter = localFont({
  variable: "--font-inter",
  display: "swap",
  src: [
    { path: "../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2", weight: "100 900", style: "normal" },
  ],
});

const jetbrains = localFont({
  variable: "--font-jetbrains",
  display: "swap",
  src: [{ path: "../node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2", weight: "100 800", style: "normal" }],
});

export const metadata: Metadata = {
  title: { default: "Kiungo", template: "%s · Kiungo" },
  applicationName: "Kiungo",
  description:
    "Kiungo, by Kiungo Labs Technologies: a hybrid hardware workspace for building, simulating and testing robotics and electronics projects, with or without the parts.",
};

const themeBootScript = `(function(){try{var k='hhip-theme';var t=localStorage.getItem(k);var ok=['light','dark','light-contrast','dark-contrast','blue','red','green'];if(ok.indexOf(t)<0)t='light';document.documentElement.dataset.theme=t;var dark=['dark','dark-contrast'];if(dark.indexOf(t)>=0)document.documentElement.classList.add('dark');else document.documentElement.classList.remove('dark');}catch(e){document.documentElement.dataset.theme='light';}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-theme="light"
      className={`${inter.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-full bg-background font-sans text-foreground">
        <ThemeProvider>
          <AuthBootstrap />
          <ElasticScrollbars />
          <LabAccountSync />
          <LearningAccountSync />
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
