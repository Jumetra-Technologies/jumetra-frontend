"use client";

import { CloseButton } from "@kiungo/ui/close-button";
import { useId } from "react";
import { ShieldCheck } from "lucide-react";
import { ProviderConnections } from "@/components/account/ProviderConnections";
import { ModalShell } from "@/components/ui/modal";
import { closeAccountDialog } from "@/lib/account-dialogs";

export function ProviderLinkDialog({ open }: { open: boolean }) {
  const titleId = useId();

  return (
    <ModalShell
      open={open}
      onClose={closeAccountDialog}
      labelledBy={titleId}
      className="max-w-[440px]"
      testId="provider-link-dialog"
    >
      <CloseButton onClose={closeAccountDialog} className="absolute right-3 top-3" />
      <div className="px-6 pb-6 pt-8">
        <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ShieldCheck className="size-5" aria-hidden />
        </span>
        <h2 id={titleId} className="mt-4 text-xl font-semibold tracking-tight text-foreground">
          Keep your account connected
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          We recommend connecting Google and GitHub to one account so you can use either sign-in and keep your projects together. This is optional, and you can do it later in your profile.
        </p>
        <div className="mt-5">
          <ProviderConnections onConnected={closeAccountDialog} />
        </div>
        <button
          type="button"
          onClick={closeAccountDialog}
          className="mt-4 w-full rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-muted-bg hover:text-foreground"
        >
          Not now
        </button>
      </div>
    </ModalShell>
  );
}
