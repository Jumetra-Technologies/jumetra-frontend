import { create } from "zustand";

import { closeSettings } from "@/lib/settings-dialog";

/**
 * The way into the admin portal: two quick clicks on the settings icon (the
 * gear in the sidebar) open a password box instead of Settings. Hiding it only
 * keeps people from stumbling on it; the server checks the password and guards
 * the figures (lib/admin/api.ts). /admin asks for the password too.
 *
 * The first click opens Settings at once, as always, and Settings then covers
 * the gear. So the second click is caught wherever it lands: if it's on the
 * gear's spot within DOOR_GAP_MS, Settings closes and the password box opens.
 */
export const DOOR_GAP_MS = 450;

type DoorState = { open: boolean; show: () => void; hide: () => void };

/** Whether the admin password box is open. */
export const useAdminDoor = create<DoorState>((set) => ({
  open: false,
  show: () => set({ open: true }),
  hide: () => set({ open: false }),
}));

type Spot = { left: number; top: number; right: number; bottom: number };

let armed: { spot: Spot; until: number } | null = null;
let stopWatching: (() => void) | null = null;

const inside = (spot: Spot, x: number, y: number) => x >= spot.left - 4 && x <= spot.right + 4 && y >= spot.top - 4 && y <= spot.bottom + 4;

/** True when a click at (x, y) and time `now` is the second quick one on the gear. */
export function isSecondClick(x: number, y: number, now: number): boolean {
  return armed !== null && now <= armed.until && inside(armed.spot, x, y);
}

/** Forgets a pending first click (used between tests). */
export function disarm(): void {
  armed = null;
  stopWatching?.();
}

function openDoor() {
  disarm();
  closeSettings();
  useAdminDoor.getState().show();
}

/**
 * Call on each click of the settings icon, with the icon's box. Returns true
 * when this click is the second quick one (the caller then skips opening Settings).
 */
export function settingsIconClicked(spot: Spot, now = Date.now()): boolean {
  if (armed && now <= armed.until) {
    openDoor();
    return true;
  }
  armed = { spot, until: now + DOOR_GAP_MS };
  stopWatching?.();
  if (typeof window === "undefined") return false;
  // The second click lands on whatever Settings put over the gear: catch it first, and swallow its click too.
  let swallowClick = false;
  const onPointerDown = (e: PointerEvent) => {
    if (!isSecondClick(e.clientX, e.clientY, Date.now())) return;
    e.preventDefault();
    e.stopPropagation();
    swallowClick = true;
    openDoor();
  };
  const onClick = (e: MouseEvent) => {
    if (!swallowClick) return;
    swallowClick = false;
    e.preventDefault();
    e.stopPropagation();
    cleanup();
  };
  const timer = window.setTimeout(() => {
    if (!swallowClick) cleanup();
  }, DOOR_GAP_MS + 50);
  function cleanup() {
    window.clearTimeout(timer);
    window.removeEventListener("pointerdown", onPointerDown, true);
    window.removeEventListener("click", onClick, true);
    if (stopWatching === cleanup) stopWatching = null;
  }
  // Clicks after the door opened still need their own click swallowed, so cleanup waits for it.
  stopWatching = () => {
    if (!swallowClick) cleanup();
  };
  window.addEventListener("pointerdown", onPointerDown, true);
  window.addEventListener("click", onClick, true);
  return false;
}
