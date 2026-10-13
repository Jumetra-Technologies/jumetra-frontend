"use client";

import { create } from "zustand";
import { API_BASE } from "@/lib/api-client";
import { buildAuthHeaders, clearStoredAuthSession, getStoredAuthSession, setStoredAuthSession, type AuthSession, type AuthUser } from "@/lib/auth-session";

export type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
};

type AuthStore = AuthState & {
  setSession: (session: AuthSession | null) => void;
  logout: () => void;
  refreshSession: () => Promise<void>;
  /** Exchange a Firebase ID token for a Kiungo session using the selected provider. */
  loginWithFirebaseToken: (idToken: string, provider: "google" | "github", photoURL?: string | null) => Promise<AuthSession>;
  /** Persist an additional provider after Firebase has linked it to the active account. */
  linkProviderToken: (idToken: string, provider: "google" | "github") => Promise<AuthUser>;
  /** `photoURL` is the provider profile photo, used when the API returns none. */
  loginWithGoogleToken: (idToken: string, photoURL?: string | null) => Promise<AuthSession>;
  /** Replace the signed-in user (after a profile save) and persist it. */
  updateUser: (user: AuthUser) => void;
  setLoading: (loading: boolean) => void;
  clearError: () => void;
};

type BackendUser = {
  id: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  display_name?: string;
  photo_url?: string | null;
  picture_url?: string | null;
  google_sub?: string;
  firebase_uid?: string | null;
  auth_provider?: "google" | "github" | null;
  linked_providers?: Array<"google" | "github">;
  role?: string | null;
  role_other?: string | null;
  profile_complete?: boolean;
  platform_role?: string | null;
  organization?: string | null;
  location?: string | null;
  bio?: string | null;
};

type BackendSession = {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
} & BackendUser;

async function responseError(response: Response, fallback: string): Promise<Error> {
  const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
  return new Error(payload?.detail ?? fallback);
}

function normalizeUser(payload: BackendUser | (BackendSession & { user?: BackendUser }), previous?: AuthUser | null): AuthUser {
  // Some backends nest the user under `user`, others flatten it into the session.
  const u: BackendUser = "user" in payload && payload.user ? payload.user : payload;
  return {
    id: u.id,
    email: u.email,
    email_verified: u.email_verified ?? previous?.email_verified ?? false,
    display_name: u.name ?? u.display_name ?? u.email,
    google_sub: u.google_sub ?? u.firebase_uid ?? undefined,
    firebase_uid: u.firebase_uid ?? previous?.firebase_uid ?? null,
    auth_provider: u.auth_provider ?? previous?.auth_provider ?? null,
    linked_providers: u.linked_providers ?? previous?.linked_providers ?? (u.auth_provider ? [u.auth_provider] : []),
    // Keep the photo we already have if this response leaves it out.
    picture_url: u.photo_url ?? u.picture_url ?? previous?.picture_url ?? null,
    role: u.role ?? null,
    role_other: u.role_other ?? null,
    profile_complete: u.profile_complete,
    ...(u.platform_role !== undefined ? { platform_role: u.platform_role } : {}),
    organization: u.organization ?? null,
    location: u.location ?? null,
    bio: u.bio ?? null,
  };
}

function normalizeSession(payload: BackendSession & { user?: BackendUser }, previous?: AuthUser | null): AuthSession {
  return {
    access_token: payload.access_token,
    token_type: payload.token_type ?? "Bearer",
    ...(payload.refresh_token ? { refresh_token: payload.refresh_token } : {}),
    user: normalizeUser(payload, previous),
  };
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

let refreshInFlight: Promise<void> | null = null;

export const useAuthStore = create<AuthStore>((set, get) => ({
  ...initialState,
  setSession: (session) => {
    if (!session) {
      clearStoredAuthSession();
      set({ user: null, accessToken: null, isAuthenticated: false, error: null });
      return;
    }

    setStoredAuthSession(session);
    set({
      user: session.user,
      accessToken: session.access_token,
      isAuthenticated: true,
      error: null,
      isLoading: false,
    });
  },
  logout: () => {
    clearStoredAuthSession();
    set({ user: null, accessToken: null, isAuthenticated: false, error: null, isLoading: false });
  },
  setLoading: (loading) => set({ isLoading: loading }),
  clearError: () => set({ error: null }),
  refreshSession: () => {
    if (refreshInFlight) return refreshInFlight;

    refreshInFlight = (async () => {
      let session: AuthSession | null = null;
      set({ isLoading: true, error: null });

      try {
        session = getStoredAuthSession();
        if (!session?.access_token) {
          set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false, error: null });
          return;
        }

        const response = session.refresh_token
          ? await fetch(`${API_BASE}/auth/refresh`, {
              method: "POST",
              headers: { Accept: "application/json", "Content-Type": "application/json" },
              body: JSON.stringify({ refresh_token: session.refresh_token }),
            })
          : await fetch(`${API_BASE}/auth/me`, {
              headers: buildAuthHeaders(session.access_token),
            });

        if (!response.ok) {
          const error = await responseError(response, "Couldn't verify your sign-in");
          if (response.status === 401) {
            clearStoredAuthSession();
            set({ user: null, accessToken: null, isAuthenticated: false, error: error.message, isLoading: false });
            return;
          }
          throw error;
        }

        const payload = (await response.json()) as BackendSession | BackendUser;
        const nextSession = "access_token" in payload
          ? normalizeSession(payload, session.user)
          : { ...session, user: normalizeUser(payload, session.user) };

        setStoredAuthSession(nextSession);
        set({
          user: nextSession.user,
          accessToken: nextSession.access_token,
          isAuthenticated: true,
          error: null,
          isLoading: false,
        });
      } catch (error) {
        const message = error instanceof Error
          ? error.message
          : "Couldn't verify your sign-in. Check your connection and try again.";
        set({
          ...(session ? { user: session.user, accessToken: session.access_token, isAuthenticated: true } : {}),
          error: message,
          isLoading: false,
        });
      }
    })().finally(() => {
      refreshInFlight = null;
    });

    return refreshInFlight;
  },
  updateUser: (user) => {
    const session = getStoredAuthSession();
    if (session) setStoredAuthSession({ ...session, user });
    set({ user });
  },
  loginWithFirebaseToken: async (idToken, provider, photoURL) => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch(`${API_BASE}/auth/${provider}`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ id_token: idToken }),
      });

      if (!response.ok) {
        throw await responseError(response, `${provider === "github" ? "GitHub" : "Google"} sign-in failed`);
      }

      const session = normalizeSession((await response.json()) as BackendSession, photoURL ? ({ picture_url: photoURL } as AuthUser) : null);
      setStoredAuthSession(session);
      set({
        user: session.user,
        accessToken: session.access_token,
        isAuthenticated: true,
        error: null,
        isLoading: false,
      });

      return session;
    } catch (error) {
      const message = error instanceof Error ? error.message : `${provider === "github" ? "GitHub" : "Google"} sign-in failed`;
      set({ user: null, accessToken: null, isAuthenticated: false, error: message, isLoading: false });
      throw error;
    }
  },
  linkProviderToken: async (idToken, provider) => {
    const { accessToken, user } = get();
    if (!accessToken || !user) {
      throw new Error("Sign in before connecting another provider.");
    }

    const response = await fetch(`${API_BASE}/auth/link-provider`, {
      method: "POST",
      headers: {
        ...buildAuthHeaders(accessToken),
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id_token: idToken, provider }),
    });
    if (!response.ok) {
      throw await responseError(response, `Couldn't connect ${provider === "github" ? "GitHub" : "Google"}`);
    }

    const updatedUser = normalizeUser((await response.json()) as BackendUser, user);
    get().updateUser(updatedUser);
    return updatedUser;
  },
  loginWithGoogleToken: (idToken, photoURL) => get().loginWithFirebaseToken(idToken, "google", photoURL),
}));

export function hydrateAuthStore(): void {
  const session = getStoredAuthSession();
  if (!session) {
    useAuthStore.setState({ user: null, accessToken: null, isAuthenticated: false, isLoading: false, error: null });
    return;
  }

  useAuthStore.setState({ user: session.user, accessToken: session.access_token, isAuthenticated: true, isLoading: false, error: null });
}

export function useAuthSession(): AuthState {
  return useAuthStore();
}
