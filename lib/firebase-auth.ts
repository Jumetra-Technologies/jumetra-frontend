"use client";

import { describeError } from "@/lib/errors";
import { API_BASE } from "@/lib/api-client";
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  GithubAuthProvider,
  GoogleAuthProvider,
  getAuth,
  linkWithPopup,
  signInWithPopup,
  type Auth,
} from "firebase/auth";

type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
};

export async function firebaseWebConfig(): Promise<FirebaseWebConfig> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
  if (process.env.NODE_ENV !== "production" && apiKey && projectId && appId) {
    return {
      apiKey,
      projectId,
      appId,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
    };
  }

  const response = await fetch(`${API_BASE}/auth/config`, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`Couldn't load sign-in configuration from the backend (HTTP ${response.status}).`);
  }
  const config: unknown = await response.json();
  if (
    typeof config !== "object" ||
    config === null ||
    !("apiKey" in config) ||
    typeof config.apiKey !== "string" ||
    !("projectId" in config) ||
    typeof config.projectId !== "string" ||
    !("appId" in config) ||
    typeof config.appId !== "string"
  ) {
    throw new Error("The backend returned an invalid sign-in configuration.");
  }
  const authDomain = "authDomain" in config && typeof config.authDomain === "string"
    ? config.authDomain
    : `${config.projectId}.firebaseapp.com`;
  return { apiKey: config.apiKey, projectId: config.projectId, appId: config.appId, authDomain };
}

export type GoogleSignInResult = {
  idToken: string;
  /** The provider account photo, used when the backend doesn't return one. */
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
  const config = await firebaseWebConfig();
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

export async function signInWithGitHub(): Promise<GoogleSignInResult> {
  const auth = await getFirebaseAuth();
  const provider = new GithubAuthProvider();
  provider.addScope("user:email");
  const result = await signInWithPopup(auth, provider);
  return { idToken: await result.user.getIdToken(), photoURL: result.user.photoURL ?? null };
}

export async function linkFirebaseProvider(
  providerId: "google" | "github",
  expectedFirebaseUid: string,
): Promise<GoogleSignInResult> {
  const auth = await getFirebaseAuth();
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.uid !== expectedFirebaseUid) {
    throw new Error("Your provider session isn't available. Sign in again before connecting another provider.");
  }

  const provider = providerId === "google"
    ? new GoogleAuthProvider()
    : new GithubAuthProvider();
  if (providerId === "google") {
    provider.setCustomParameters({ prompt: "select_account" });
  } else {
    provider.addScope("user:email");
  }

  const result = await linkWithPopup(currentUser, provider);
  return { idToken: await result.user.getIdToken(true), photoURL: result.user.photoURL ?? null };
}

/** Convert provider errors to a short message; return null when the user closes the popup. */
export function describeSignInError(error: unknown, providerName = "Google"): string | null {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : "";
  switch (code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
    case "auth/user-cancelled":
      return null;
    case "auth/popup-blocked":
      return `Your browser blocked the ${providerName} window. Allow pop-ups for this site and try again.`;
    case "auth/argument-error":
      return `The ${providerName} sign-in window couldn't start. Reload the page and try again.`;
    case "auth/unauthorized-domain":
      return describeError(error, "Sign-in isn't available for this website yet");
    case "auth/network-request-failed":
      return "The network dropped during sign-in. Check your connection and try again.";
    case "auth/account-exists-with-different-credential":
    case "auth/credential-already-in-use":
    case "auth/email-already-in-use":
      return "That provider is connected to another Firebase account. Sign in to that account first; we won't merge accounts without verifying both providers.";
    case "auth/provider-already-linked":
      return `${providerName} is already connected to this account.`;
    case "auth/operation-not-allowed":
      return `${providerName} sign-in isn't enabled yet. Please contact the site administrator.`;
    default:
      return describeError(error, "You weren't signed in");
  }
}
