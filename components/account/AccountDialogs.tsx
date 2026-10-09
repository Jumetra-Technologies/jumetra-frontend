"use client";

import { ProfileDialog } from "@/components/account/ProfileDialog";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { useAccountDialog } from "@/lib/account-dialogs";

/** Mounts the sign-in and profile modals once for the whole app. */
export function AccountDialogs() {
  const dialog = useAccountDialog();
  return (
    <>
      <AuthDialog open={dialog?.kind === "auth"} mode={dialog?.kind === "auth" ? dialog.mode : "login"} />
      {dialog?.kind === "profile" ? <ProfileDialog open /> : null}
    </>
  );
}
