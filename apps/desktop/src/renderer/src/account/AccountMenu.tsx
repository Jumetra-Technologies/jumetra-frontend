import { useState } from "react";
import { ChevronsUpDown, LogIn } from "lucide-react";
import type { AuthState } from "@kiungo/api";
import { Menu, type MenuEntry } from "@kiungo/ui/menu";
import { invoke } from "../ipc";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/** Shared with the Settings dialog, so the same face shows there. */
export function Avatar({ name, photo, className = "size-8" }: { name: string; photo: string | null; className?: string }) {
  const [broken, setBroken] = useState(false);
  if (photo && !broken) return <img src={photo} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} className={`${className} rounded-full object-cover`} />;
  return <span className={`${className} flex items-center justify-center rounded-full bg-accent text-[12px] font-semibold text-primary`}>{initials(name)}</span>;
}

/**
 * Who's signed in, at the foot of the sidebar, with Sign out or Switch account (DSK-03).
 * Settings has its own row just above, so it isn't repeated here. Signing out never touches projects on disk.
 */
export function AccountMenu({ state }: { state: AuthState }) {
  const row = "flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-xs text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground";
  if (state.status !== "signed-in") {
    return (
      <button type="button" onClick={() => void invoke("auth:sign-in")} className={row} data-testid="account-sign-in">
        <LogIn className="size-4" aria-hidden />
        Sign in
      </button>
    );
  }
  const { user, deviceName, offline, secureStorage } = state;
  const items: MenuEntry[] = [
    { id: "who", label: user.name, hint: user.email, disabled: true },
    ...(offline ? [{ id: "offline", label: "Offline: checked when you're back online", disabled: true }] : []),
    ...(!secureStorage ? [{ id: "keychain", label: "No keychain: you'll sign in each time", disabled: true }] : []),
    { type: "separator", id: "s1" },
    {
      id: "switch",
      label: "Switch account",
      hint: "Your projects stay",
      onSelect: () => void invoke("auth:sign-out").then(() => invoke("auth:sign-in")),
    },
    { id: "out", label: "Sign out", hint: `Of Kiungo on ${deviceName}`, onSelect: () => void invoke("auth:sign-out") },
  ];
  return (
    <Menu label={`Account: ${user.name}`} items={items} buttonClassName={`${row} !py-2`} title={user.email}>
      <Avatar name={user.name} photo={user.photoUrl} className="size-6" />
      <span className="min-w-0 flex-1 truncate font-medium text-sidebar-foreground">{user.name}</span>
      <ChevronsUpDown className="size-3.5 shrink-0" aria-hidden />
    </Menu>
  );
}
