import type { Metadata } from "next";

import { AdvancedAnalytics } from "@/components/analytics/AdvancedAnalytics";

export const metadata: Metadata = {
  title: "Advanced Analytics",
  description: "What you've built, tested and learned in Kiungo, and what the Kiungo community is building.",
};

export default function AnalyticsPage() {
  return <AdvancedAnalytics />;
}
