"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { GoogleAuthProvider, getAuth, signInWithPopup, signOut } from "firebase/auth";
import { API_BASE } from "@/lib/api-client";
import {
  authHeaders,
  clearSessionTokens,
  getRefreshToken,
  storeSessionTokens,
} from "@/lib/session-tokens";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  photo_url?: string | null;
  role?: string;
  firebase_uid?: string | null;
};

export type AuthSession = AuthUser & {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
};

export type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
};

function stripUser(session: AuthSession): AuthUser {
  return {
    id: session.id,
    email: session.email,
    name: session.name,
    photo_url: session.photo_url,
    role: session.role,
    firebase_uid: session.firebase_uid,
  };
}

function remember(session: AuthSession): AuthUser {
  storeSessionTokens(session.access_token, session.refresh_token);
  return stripUser(session);
}

async function authFetch<T>(path: string, init?: RequestInit, retry = true): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.method && init.method !== "GET" ? { "Content-Type": "application/json" } : {}),
      ...authHeaders(init?.headers),
    },
  });

  if (res.status === 401 && retry && path !== "/auth/refresh" && path !== "/auth/google") {
    try {
      await refreshSession();
      return authFetch<T>(path, init, false);
    } catch {
      clearSessionTokens();
    }
  }

  if (!res.ok) {
    let detail = `AUTH ${path} ${res.status}`;
    try {
      const body = await res.json();
      if (body?.detail) detail = String(body.detail);
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export function getAuthConfig() {
  return authFetch<FirebaseWebConfig>("/auth/config");
}

export async function getMe() {
  return authFetch<AuthUser>("/auth/me");
}

export async function refreshSession() {
  const refresh = getRefreshToken();
  const session = await authFetch<AuthSession>(
    "/auth/refresh",
    {
      method: "POST",
      body: JSON.stringify({ refresh_token: refresh }),
    },
    false,
  );
  return remember(session);
}

export async function loginWithGoogle(idToken: string) {
  const session = await authFetch<AuthSession>(
    "/auth/google",
    {
      method: "POST",
      body: JSON.stringify({ id_token: idToken }),
    },
    false,
  );
  return remember(session);
}

export async function continueWithGoogle() {
  const config = await getAuthConfig();
  const app = getApps().length ? getApp() : initializeApp(config);
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const result = await signInWithPopup(auth, provider);
  const idToken = await result.user.getIdToken();
  await signOut(auth);
  return loginWithGoogle(idToken);
}

export async function logout() {
  const refresh = getRefreshToken();
  try {
    await authFetch<{ status: string }>(
      "/auth/logout",
      {
        method: "POST",
        body: JSON.stringify({ refresh_token: refresh }),
      },
      false,
    );
  } finally {
    clearSessionTokens();
  }
  return { status: "ok" as const };
}
