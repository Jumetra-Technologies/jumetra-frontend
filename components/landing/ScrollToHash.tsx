"use client";

import { useEffect } from "react";

/**
 * Links like /#desktop from other pages land while Home's loading view is
 * up, before the section exists, so the router's own scroll finds nothing.
 * Once the page is here, scroll to whatever the address names.
 */
export function ScrollToHash() {
  useEffect(() => {
    const go = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (id) document.getElementById(id)?.scrollIntoView({ block: "start" });
    };
    go();
    window.addEventListener("hashchange", go);
    return () => window.removeEventListener("hashchange", go);
  }, []);
  return null;
}
