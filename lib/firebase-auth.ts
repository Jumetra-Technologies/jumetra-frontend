"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, type Auth } from "firebase/auth";
import { API_BASE } from "@/lib/api-client";

type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
};

export type GoogleSignInResult = {
  idToken: string;
  /** The Google account photo, used when the backend doesn't return one. */
  photoURL: string | null;
};

let authPromise: Promise<Auth> | undefined;

function getFirebaseAuth(): Promise<Auth> {
  authPromise ??= initializeFirebaseAuth().catch((error: unknown) => {
    authPromise = undefined;
    throw error;
  });
  return authPromise;
}

async function initializeFirebaseAuth(): Promise<Auth> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/auth/config`, {
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new Error("Couldn't reach the Kiungo server to start Google sign-in. Check your connection and try again.");
  }
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(payload?.detail ?? "Google sign-in isn't available right now. Try again in a moment.");
  }

  const config = (await response.json()) as FirebaseWebConfig;
  const app = getApps().length ? getApp() : initializeApp(config);
  return getAuth(app);
}

export async function prepareGoogleSignIn(): Promise<void> {
  await getFirebaseAuth();
}

export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  const auth = await getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const result = await signInWithPopup(auth, provider);
  return { idToken: await result.user.getIdToken(), photoURL: result.user.photoURL ?? null };
}

/** Firebase error codes, in words a user can act on. Null means "say nothing" (they closed the popup). */
export function describeSignInError(error: unknown): string | null {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : "";
  switch (code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
    case "auth/user-cancelled":
      return null;
    case "auth/popup-blocked":
      return "Your browser blocked the Google window. Allow pop-ups for this site and try again.";
    case "auth/unauthorized-domain":
      return "Google sign-in isn't enabled for this web address yet. Ask the Kiungo team to add it in Firebase.";
    case "auth/network-request-failed":
      return "The network dropped during sign-in. Check your connection and try again.";
    case "auth/account-exists-with-different-credential":
      return "That email is already linked to a different sign-in method.";
    default:
      return error instanceof Error && error.message ? error.message : "Google sign-in failed. Try again.";
  }
}
