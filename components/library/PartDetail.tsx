"use client";

import Link from "next/link";
import { PartDetail as SharedPartDetail } from "@kiungo/lab/library/PartDetail";
import type { PartModel } from "@kiungo/core/parts/types";
import { StartExperimentButton } from "./StartExperimentButton";

export { VIEW_OPTIONS, type ViewId } from "@kiungo/lab/library/PartDetail";

/** A part's page on the website: the shared detail, with the lab button and the link to its reference article. */
export function PartDetail({ part, compatible, onOpenPart }: { part: PartModel; compatible?: string[]; onOpenPart?: (id: string) => void }) {
  return (
    <SharedPartDetail
      part={part}
      compatible={compatible}
      onOpenPart={onOpenPart}
      actions={<StartExperimentButton part={part} />}
      reference={
        part.docs ? (
          <Link href={part.docs} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            Reference page
          </Link>
        ) : null
      }
    />
  );
}
