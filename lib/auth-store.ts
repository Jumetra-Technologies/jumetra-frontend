"use client";

import { create } from "zustand";
import { API_BASE } from "@/lib/api-client";
import { buildAuthHeaders, clearStoredAuthSession, getStoredAuthSession, setStoredAuthSession, type AuthSession, type AuthUser } from "@/lib/auth-session";
import { withDeviceProfile } from "@/lib/profile";

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
  /** `photoURL` is the Google photo from Firebase, used when the backend returns none. */
  loginWithGoogleToken: (idToken: string, photoURL?: string | null) => Promise<AuthSession>;
  /** Replace the signed-in user (after a profile save) and persist it. */
  updateUser: (user: AuthUser) => void;
  setLoading: (loading: boolean) => void;
  clearError: () => void;
};

type BackendUser = {
  id: string;
  email: string;
  name?: string;
  display_name?: string;
  photo_url?: string | null;
  picture_url?: string | null;
  google_sub?: string;
  firebase_uid?: string | null;
  role?: string | null;
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
  return withDeviceProfile({
    id: u.id,
    email: u.email,
    display_name: u.name ?? u.display_name ?? u.email,
    google_sub: u.google_sub ?? u.firebase_uid ?? undefined,
    // Keep the photo we already have if this response leaves it out.
    picture_url: u.photo_url ?? u.picture_url ?? previous?.picture_url ?? null,
    role: u.role ?? null,
    organization: u.organization ?? null,
    location: u.location ?? null,
    bio: u.bio ?? null,
  });
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

export const useAuthStore = create<AuthStore>((set) => ({
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
  refreshSession: async () => {
    const session = getStoredAuthSession();
    if (!session?.access_token) {
      set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false, error: null });
      return;
    }

    set({ isLoading: true, error: null });

    try {
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
        throw await responseError(response, "Session expired");
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
      clearStoredAuthSession();
      const message = error instanceof Error ? error.message : "Your session expired. Please sign in again.";
      set({ user: null, accessToken: null, isAuthenticated: false, error: message, isLoading: false });
    }
  },
  updateUser: (user) => {
    const session = getStoredAuthSession();
    if (session) setStoredAuthSession({ ...session, user });
    set({ user });
  },
  loginWithGoogleToken: async (idToken, photoURL) => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch(`${API_BASE}/auth/google`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ id_token: idToken }),
      });

      if (!response.ok) {
        throw await responseError(response, "Google sign-in failed");
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
      const message = error instanceof Error ? error.message : "Google sign-in failed";
      set({ user: null, accessToken: null, isAuthenticated: false, error: message, isLoading: false });
      throw error;
    }
  },
}));

export function hydrateAuthStore(): void {
  const session = getStoredAuthSession();
  if (!session) {
    useAuthStore.setState({ user: null, accessToken: null, isAuthenticated: false, isLoading: false, error: null });
    return;
  }

  useAuthStore.setState({ user: withDeviceProfile(session.user), accessToken: session.access_token, isAuthenticated: true, isLoading: false, error: null });
}

export function useAuthSession(): AuthState {
  return useAuthStore();
}
