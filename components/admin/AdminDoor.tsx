"use client";

import { useRouter } from "next/navigation";
import { useId } from "react";

import { CloseButton } from "@kiungo/ui/close-button";
import { ModalShell } from "@/components/ui/modal";
import { useAdminDoor } from "@/lib/admin/door";

import { PasswordForm } from "./PasswordForm";

/** The password box two quick clicks on the settings icon open (lib/admin/door.ts). */
export function AdminDoor() {
  const open = useAdminDoor((s) => s.open);
  const hide = useAdminDoor((s) => s.hide);
  const router = useRouter();
  const titleId = useId();
  const textId = useId();
  return (
    <ModalShell open={open} onClose={hide} labelledBy={titleId} describedBy={textId} className="max-w-[400px]" initialFocus="input" testId="admin-door">
      <div className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-lg font-semibold tracking-tight text-foreground">
              Admin portal
            </h2>
            <p id={textId} className="mt-1 text-sm text-muted">
              Enter the admin password.
            </p>
          </div>
          <CloseButton onClose={hide} />
        </div>
        <div className="mt-5">
          <PasswordForm
            autoFocus={false}
            onSignedIn={() => {
              hide();
              router.push("/admin");
            }}
          />
        </div>
      </div>
    </ModalShell>
  );
}
