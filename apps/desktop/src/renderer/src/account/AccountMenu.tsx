import { useState } from "react";
import { LogIn } from "lucide-react";
import type { AuthState } from "@kiungo/api";
import { Button } from "@kiungo/ui/button";
import { Menu, type MenuEntry } from "@kiungo/ui/menu";
import { invoke } from "../ipc";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function Avatar({ name, photo }: { name: string; photo: string | null }) {
  const [broken, setBroken] = useState(false);
  if (photo && !broken) return <img src={photo} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} className="size-8 rounded-full object-cover" />;
  return <span className="flex size-8 items-center justify-center rounded-full bg-accent text-[12px] font-semibold text-primary">{initials(name)}</span>;
}

/** Who's signed in, and Sign out or Switch account (DSK-03). Signing out never touches projects on disk. */
export function AccountMenu({ state }: { state: AuthState }) {
  if (state.status !== "signed-in") {
    return (
      <Button variant="ghost" onClick={() => void invoke("auth:sign-in")} data-testid="account-sign-in">
        <LogIn className="size-4" aria-hidden />
        Sign in
      </Button>
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
    <Menu label={`Account: ${user.name}`} align="end" items={items} buttonClassName="flex size-9 items-center justify-center rounded-full hover:ring-2 hover:ring-border" title={user.email}>
      <Avatar name={user.name} photo={user.photoUrl} />
    </Menu>
  );
}
