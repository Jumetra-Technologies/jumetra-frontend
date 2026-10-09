"use client";

import { ChevronRight, UserRound } from "lucide-react";
import { Avatar } from "@/components/account/Avatar";
import { Button } from "@/components/ui/button";
import { openAuth, openProfile } from "@/lib/account-dialogs";
import { useAuthStore } from "@/lib/auth-store";
import { fieldsOf, roleLabel } from "@/lib/profile";

const tile = "rounded-[12px] border border-border bg-canvas p-5";

/**
 * The Profile tile in Settings. Signed in, the whole tile previews the
 * profile and opens it; signed out, it offers Log in (primary) and Sign up.
 */
export function ProfileTile() {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !user) {
    return (
      <section className={tile} data-testid="profile-tile">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <UserRound className="size-4 shrink-0 text-muted" aria-hidden />
          Profile
        </h3>
        <p className="mt-4 text-sm font-medium text-foreground">Not signed in</p>
        <p className="mt-1 text-sm leading-6 text-muted">Projects and experiment records are saved in this browser. Sign in to keep them with you on any device.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => openAuth("login")} data-testid="settings-login">
            Log in
          </Button>
          <Button variant="secondary" onClick={() => openAuth("signup")} data-testid="settings-signup">
            Sign up
          </Button>
        </div>
      </section>
    );
  }

  const f = fieldsOf(user);
  const line = [roleLabel(f.role), f.organization].filter(Boolean).join(" · ");

  return (
    <button
      type="button"
      onClick={openProfile}
      aria-haspopup="dialog"
      data-testid="profile-tile"
      className={`${tile} group flex h-full w-full flex-col items-stretch justify-start text-left transition-colors hover:border-[color-mix(in_srgb,var(--primary)_40%,var(--border))] hover:bg-muted-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]`}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <UserRound className="size-4 shrink-0 text-muted" aria-hidden />
          Profile
        </span>
        <span className="inline-flex items-center gap-0.5 text-xs font-medium text-primary">
          View
          <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </span>
      <span className="mt-4 flex items-center gap-3">
        <Avatar name={user.display_name} src={user.picture_url} size={44} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-foreground">{user.display_name}</span>
          <span className="block truncate text-xs text-muted">{user.email}</span>
        </span>
      </span>
      <span className="mt-3 block truncate text-xs text-muted">{line || "Add your role and school so classmates and instructors can find you."}</span>
    </button>
  );
}
