import { create } from "zustand";

import { makeClickCounter } from "@/lib/diagnostics/access";

/**
 * The way into the admin portal: eight quick clicks on the Kiungo logo open
 * a password box. Hiding it only keeps people from stumbling on it; the
 * server checks the password and guards the figures (lib/admin/api.ts).
 */
export const DOOR_CLICKS = 8;
/** The longest pause between two of those clicks. */
export const DOOR_GAP_MS = 1500;

type DoorState = { open: boolean; show: () => void; hide: () => void };

/** Whether the admin password box is open. */
export const useAdminDoor = create<DoorState>((set) => ({
  open: false,
  show: () => set({ open: true }),
  hide: () => set({ open: false }),
}));

let clock = 0;
const counter = makeClickCounter(DOOR_CLICKS, DOOR_GAP_MS, () => clock);

/** Call on each click of the logo. */
export function logoClicked(now = Date.now()): void {
  clock = now;
  if (counter()) useAdminDoor.getState().show();
}
