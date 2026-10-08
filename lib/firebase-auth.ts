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

let authPromise: Promise<Auth> | undefined;

function getFirebaseAuth(): Promise<Auth> {
  authPromise ??= initializeFirebaseAuth().catch((error: unknown) => {
    authPromise = undefined;
    throw error;
  });
  return authPromise;
}

async function initializeFirebaseAuth(): Promise<Auth> {
  const response = await fetch(`${API_BASE}/auth/config`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(payload?.detail ?? "Unable to load Google sign-in configuration.");
  }

  const config = (await response.json()) as FirebaseWebConfig;
  const app = getApps().length ? getApp() : initializeApp(config);
  return getAuth(app);
}

export async function prepareGoogleSignIn(): Promise<void> {
  await getFirebaseAuth();
}

export async function signInWithGoogle(): Promise<string> {
  const auth = await getFirebaseAuth();
  const result = await signInWithPopup(auth, new GoogleAuthProvider());
  return result.user.getIdToken();
}
