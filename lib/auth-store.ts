"use client";

import { create } from "zustand";
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
  loginWithGoogleCode: (code: string) => Promise<AuthSession>;
  setLoading: (loading: boolean) => void;
  clearError: () => void;
};

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000").replace(/\/+$/, "");

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

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
  refreshSession: async () => {
    const session = getStoredAuthSession();
    if (!session?.access_token) {
      set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false, error: null });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const response = await fetch(`${API_BASE}/auth/me`, {
        headers: buildAuthHeaders(session.access_token),
      });

      if (!response.ok) {
        throw new Error("Session expired");
      }

      const user = (await response.json()) as AuthUser;
      const nextSession: AuthSession = {
        access_token: session.access_token,
        token_type: session.token_type || "bearer",
        user,
      };

      setStoredAuthSession(nextSession);
      set({
        user,
        accessToken: session.access_token,
        isAuthenticated: true,
        error: null,
        isLoading: false,
      });
    } catch {
      clearStoredAuthSession();
      set({ user: null, accessToken: null, isAuthenticated: false, error: "Your session expired. Please sign in again.", isLoading: false });
    }
  },
  loginWithGoogleCode: async (code) => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch(`${API_BASE}/auth/google/callback?code=${encodeURIComponent(code)}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(payload?.detail ?? "Google sign-in failed");
      }

      const session = (await response.json()) as AuthSession;
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

  useAuthStore.setState({ user: session.user, accessToken: session.access_token, isAuthenticated: true, isLoading: false, error: null });
}

export function useAuthSession(): AuthState {
  return useAuthStore();
}
