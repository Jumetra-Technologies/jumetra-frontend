"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/auth";

export function SignOutButton() {
  const router = useRouter();
  return (
    <Button
      variant="secondary"
      type="button"
      onClick={async () => {
        await logout().catch(() => undefined);
        router.replace("/");
        router.refresh();
      }}
    >
      Sign out
    </Button>
  );
}
