"use client";

import { describeError } from "@/lib/errors";
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

export function firebaseWebConfig(): FirebaseWebConfig {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
  if (!apiKey || !projectId || !appId) {
    throw new Error("Sign-in isn't available right now. Please try again later.");
  }
  return {
    apiKey,
    projectId,
    appId,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
  };
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
  const app = getApps().length ? getApp() : initializeApp(firebaseWebConfig());
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
