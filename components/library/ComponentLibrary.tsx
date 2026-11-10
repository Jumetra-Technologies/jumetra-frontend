"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getPart, getPartsByGroup } from "@kiungo/core/parts";
import { PartLibrary } from "@kiungo/lab/library/PartLibrary";
import { PartDetail } from "./PartDetail";

/** The website's Component library: the shared two-column library, with the chosen part and the search kept in the address so a part can be linked to. */
export function ComponentLibrary({ initialPart, initialQuery = "", compatibility = {} }: { initialPart?: string; initialQuery?: string; compatibility?: Record<string, string[]> }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [selected, setSelected] = useState<string>(() => (initialPart && getPart(initialPart) ? initialPart : getPartsByGroup()[0].parts[0].id));
  const part = getPart(selected) ?? getPartsByGroup()[0].parts[0];

  // Keep the address in step so a part can be linked to.
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("part", selected);
    if (query.trim()) params.set("q", query.trim());
    router.replace(`/components?${params.toString()}`, { scroll: false });
  }, [selected, query, router]);

  return (
    <PartLibrary selected={part} onSelect={(item) => setSelected(item.id)} query={query} onQuery={setQuery}>
      <PartDetail key={part.id} part={part} compatible={compatibility[part.id]} onOpenPart={setSelected} />
    </PartLibrary>
  );
}
