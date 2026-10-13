"use client";

import { ErrorScreen } from "@/components/ui/error-screen";

/** Any page that throws while drawing shows this inside the app frame, instead of the browser's blank error. */
export default function RouteError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorScreen error={error} retry={retry} />;
}
