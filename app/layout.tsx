import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AuthBootstrap } from "@/components/auth/auth-bootstrap";
import { ThemeProvider } from "@/components/theme/theme-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "HHIP Robotics Workspace",
  description:
    "Universal Hybrid Hardware Simulation System — a robotics workspace for planning, simulation, and reproducible experiments",
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
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
