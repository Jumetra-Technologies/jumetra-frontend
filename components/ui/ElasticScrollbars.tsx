"use client";

import { useEffect } from "react";
import { startElasticScrollbars } from "@/lib/ui/elastic-scrollbars";

/**
 * Mounted once in the root layout: gives every scrolling area in HHIP the
 * standard slim, elastic scrollbar. Nothing else needs to opt in.
 */
export function ElasticScrollbars() {
  useEffect(() => startElasticScrollbars(), []);
  return null;
}
