"use client";

import "./globals.css";
import { ErrorScreen } from "@/components/ui/error-screen";

/** If the app frame itself fails, this replaces the whole page. */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground">
        <ErrorScreen error={error} retry={retry} title="Kiungo couldn't load" body="Something went wrong while starting the app. We've logged it. Reload to try again; your work saved in this browser is safe." retryLabel="Reload" />
      </body>
    </html>
  );
}
