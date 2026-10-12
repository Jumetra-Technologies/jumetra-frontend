"use client";

import { isAuthError } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";

/**
 * What a page should do when the server answers 401: ask the user to sign in,
 * or tell them their session ran out. `reason` picks the wording.
 */
export class SignInNeeded extends Error {
  constructor(public readonly reason: "signed-out" | "expired", action: string) {
    super(reason === "expired" ? `Your session has expired. Log in again to ${action}.` : `Sign in to ${action}.`);
    this.name = "SignInNeeded";
  }
}

/**
 * Run an API call that may need a signed-in user.
 *
 * On 401 with a stored session, the session is refreshed once and the call
 * retried; if the server still refuses, the stale session is cleared and the
 * caller gets a SignInNeeded("expired"). With no session, SignInNeeded
 * ("signed-out") is thrown straight away, so the page can offer Log in
 * instead of showing "API … failed: 401".
 */
export async function withSignIn<T>(action: string, call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    if (!isAuthError(error)) throw error;
    const auth = useAuthStore.getState();
    if (!auth.isAuthenticated) throw new SignInNeeded("signed-out", action);
    await auth.refreshSession();
    if (!useAuthStore.getState().isAuthenticated) throw new SignInNeeded("expired", action);
    try {
      return await call();
    } catch (again) {
      if (!isAuthError(again)) throw again;
      useAuthStore.getState().logout();
      throw new SignInNeeded("expired", action);
    }
  }
}
