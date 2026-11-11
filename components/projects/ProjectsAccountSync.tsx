"use client";

import { useEffect } from "react";
import { useLab } from "@kiungo/lab/store";
import { useAuthStore } from "@/lib/auth-store";
import { isUnsavedProject, setProjectsAccount } from "@/lib/projects/workspace";
import { readRoboticsData } from "@/lib/robotics-data";

/**
 * True when closing or reloading the page would throw work away: a project or
 * experiment record that isn't on an account, or, signed out, a lab session
 * with parts on it. Signed in, lab sessions are kept for the account in this
 * browser and synced, so they don't count.
 */
export function hasUnsavedWork(signedIn: boolean): boolean {
  const data = readRoboticsData();
  if (data.experiments.length > 0 || data.projects.some((project) => isUnsavedProject(project.id))) return true;
  return !signedIn && useLab.getState().sessions.some((session) => session.nodes.length > 0);
}

/**
 * Keeps projects with the signed-in account. Mounted once for the whole app,
 * so signing in on any page saves what was made signed out.
 *
 * Signed out, projects and lab sessions live in this tab's memory. Before the
 * tab is closed or reloaded with unsaved work in it, the browser asks first.
 */
export function ProjectsAccountSync() {
  const account = useAuthStore((state) => state.user?.id ?? null);
  useEffect(() => setProjectsAccount(account), [account]);

  useEffect(() => {
    const ask = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedWork(account !== null)) return;
      event.preventDefault();
      // Older browsers ask only when this is set.
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", ask);
    return () => window.removeEventListener("beforeunload", ask);
  }, [account]);

  return null;
}
