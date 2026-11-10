import { useState } from "react";
import { Plus } from "lucide-react";
import { getPart, getPartsByGroup } from "@kiungo/core/parts";
import { PartDetail } from "@kiungo/lab/library/PartDetail";
import { PartLibrary } from "@kiungo/lab/library/PartLibrary";
import { Button } from "@kiungo/ui/button";
import { invoke } from "../ipc";
import { PageTitle } from "../shell/widgets";

/**
 * The Component library in the desktop app: the same library as the website's,
 * with every part in 3D, 2D and Trace and the engineering data behind it.
 * Every part shown here is a real model the simulator draws from.
 */
export function ComponentsLibrary({ onAddToProject }: { onAddToProject: (partId: string) => void }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(() => getPartsByGroup()[0].parts[0].id);
  const part = getPart(selected) ?? getPartsByGroup()[0].parts[0];

  return (
    <div className="mx-auto max-w-[1280px] p-6" data-testid="components-library">
      <PageTitle title="Component library" detail="Every part Kiungo can simulate, drawn to scale, with its pins, its power and heat data and what to use it with." />
      <PartLibrary selected={part} onSelect={(item) => setSelected(item.id)} query={query} onQuery={setQuery} stickyTop="lg:top-0">
        <PartDetail
          key={part.id}
          part={part}
          onOpenPart={setSelected}
          onOpenLink={(url) => void invoke("marketplace:open-vendor-link", url)}
          actions={
            <Button size="lg" onClick={() => onAddToProject(part.id)} className="h-11 px-5" data-testid="add-to-lab">
              <Plus className="size-4" aria-hidden />
              Add to lab
            </Button>
          }
        />
      </PartLibrary>
    </div>
  );
}
