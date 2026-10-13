export type AuthUser = {
  id: string;
  email: string;
  display_name: string;
  google_sub?: string;
  picture_url?: string | null;
  /** What the person says they are (student, instructor…), from their profile. Not a permission. */
  role?: string | null;
  /**
   * The platform permission the server grants (ADMIN, RESEARCHER, TEACHER, STUDENT, VIEWER).
   * Only the server sets it; the profile can't change it. System Diagnostics needs ADMIN.
   */
  platform_role?: string | null;
  organization?: string | null;
  location?: string | null;
  bio?: string | null;
};

export type AuthSession = {
  access_token: string;
  token_type: string;
  refresh_token?: string;
  user: AuthUser;
};

export const AUTH_STORAGE_KEY = "hhip-auth-session";

export function getStoredAuthSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    if (!parsed.access_token || !parsed.user) {
      return null;
    }

    return parsed as AuthSession;
  } catch {
    return null;
  }
}

export function setStoredAuthSession(session: AuthSession | null): void {
  if (typeof window === "undefined") {
    return;
  }

  if (!session) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredAuthSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function getStoredAccessToken(): string | null {
  return getStoredAuthSession()?.access_token ?? null;
}

export function buildAuthHeaders(accessToken?: string | null): Record<string, string> {
  if (!accessToken) {
    return {};
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  };
}
