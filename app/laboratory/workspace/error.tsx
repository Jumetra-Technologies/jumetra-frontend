"use client";

import { ErrorScreen } from "@/components/ui/error-screen";

/**
 * If something in the lab throws, show this instead of the browser's blank
 * "page couldn't load". Sessions are saved in this browser as you work, so
 * reopening the lab brings the work back. The error is logged for System Diagnostics.
 */
export default function LabError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <ErrorScreen
      error={error}
      retry={retry}
      title="The lab hit a snag"
      body="Something went wrong while drawing the canvas. We've logged it. Your session is saved in this browser, so reopening the lab brings it back."
      retryLabel="Reopen the lab"
      secondary={{ href: "/workspace", label: "Go to Projects" }}
      testId="lab-error"
    />
  );
}
