import { useCallback, useEffect, useMemo, useState } from "react";
import type { AuthState, ToolchainStatus } from "@kiungo/api";
import { invoke } from "../ipc";
import type { UpdateControls } from "../update/useUpdate";

/** One thing the person should know about, with what they can do about it right there. */
export interface Notice {
  id: string;
  tone: "update" | "warning" | "info";
  title: string;
  detail: string;
  /** 0–100 while something is under way (an update downloading). */
  progress?: number;
  /** The main thing to do, and an optional second one. */
  action?: NoticeAction;
  secondary?: NoticeAction;
  /** Can be put away with ✕. Notices that go away by themselves (a download) can't. */
  dismissible: boolean;
}

export interface NoticeAction {
  label: string;
  run: () => void | Promise<unknown>;
  /** Opens a page in the browser instead of running something. */
  href?: string;
}

const SEEN_KEY = "kiungo.lastSeenVersion";
const RELEASES = "https://github.com/Jumetra-Technologies/jumetra-frontend/releases/tag/desktop-v";

function readSeen(): string | null {
  try {
    return localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

function writeSeen(version: string) {
  try {
    localStorage.setItem(SEEN_KEY, version);
  } catch {
    // Private storage unavailable: the notice just comes back next time.
  }
}

/**
 * What Kiungo tells the person, from what is actually true right now:
 * its own update (downloading, ready to install, or failed), a missing
 * toolchain (so compiling and uploading won't work), being offline, and
 * what's new after an update. Nothing is made up and nothing is shown twice.
 */
export function useNotifications({ update, auth, onToolchain }: { update: UpdateControls; auth: AuthState | null; onToolchain: () => void }) {
  const [toolchain, setToolchain] = useState<ToolchainStatus | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const [seen, setSeen] = useState<string | null>(readSeen);

  useEffect(() => {
    let live = true;
    void invoke("toolchain:status").then(
      (s) => live && setToolchain(s),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, []);

  const current = update.info?.currentVersion ?? null;
  // First run on this computer: remember the version (nothing to announce: `seen` stays null until next start).
  useEffect(() => {
    if (current && seen === null) writeSeen(current);
  }, [current, seen]);

  const dismiss = useCallback(
    (id: string) => {
      if (id === "whats-new" && current) {
        writeSeen(current);
        setSeen(current);
      }
      setDismissed((d) => new Set(d).add(id));
    },
    [current],
  );

  const notices = useMemo(() => {
    const list: Notice[] = [];
    const state = update.info?.state;
    if (state?.status === "ready") {
      list.push({
        id: `update-ready-${state.version}`,
        tone: "update",
        title: `Kiungo ${state.version} is ready to install`,
        detail: update.refused ?? "Your projects are saved first, then Kiungo restarts on the new version. It takes a few seconds.",
        action: { label: "Update now", run: () => update.install() },
        secondary: {
          label: "What's new",
          run: () => undefined,
          href: RELEASES + state.version,
        },
        dismissible: true,
      });
    } else if (state?.status === "downloading") {
      list.push({
        id: "update-downloading",
        tone: "update",
        title: `Downloading Kiungo ${state.version}`,
        detail: "Keep working. You'll be able to install it when it's done.",
        progress: state.percent,
        dismissible: false,
      });
    } else if (state?.status === "error" && !state.quiet) {
      list.push({
        id: "update-error",
        tone: "warning",
        title: "Kiungo couldn't check for updates",
        detail: state.message,
        action: { label: "Try again", run: () => update.check() },
        dismissible: true,
      });
    }

    if (toolchain && !toolchain.cli.found) {
      list.push({
        id: "toolchain-missing",
        tone: "warning",
        title: "Firmware can't be compiled yet",
        detail: "The Arduino toolchain wasn't found on this computer. Simulation still works; compiling and uploading to a board need it.",
        action: { label: "Set it up", run: onToolchain },
        dismissible: true,
      });
    }

    if (auth?.status === "signed-in" && auth.offline) {
      list.push({
        id: "offline",
        tone: "info",
        title: "You're offline",
        detail: "Your projects are safe on this computer. Account features and sync come back when you're online.",
        dismissible: true,
      });
    }

    if (current && seen && seen !== current) {
      list.push({
        id: "whats-new",
        tone: "info",
        title: `Updated to Kiungo ${current}`,
        detail: "See what changed in this version.",
        action: {
          label: "What's new",
          run: () => undefined,
          href: RELEASES + current,
        },
        dismissible: true,
      });
    }
    return list.filter((n) => !dismissed.has(n.id));
  }, [update, toolchain, auth, current, seen, dismissed, onToolchain]);

  return { notices, dismiss };
}
