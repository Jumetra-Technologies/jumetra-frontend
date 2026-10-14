export type AuthUser = {
  id: string;
  email: string;
  email_verified?: boolean;
  display_name: string;
  google_sub?: string;
  firebase_uid?: string | null;
  auth_provider?: "google" | "github" | null;
  linked_providers?: Array<"google" | "github">;
  picture_url?: string | null;
  /** What the person says they are (student, instructor…), from their profile. Not a permission. */
  role?: string | null;
  role_other?: string | null;
  profile_complete?: boolean;
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
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    const session: unknown = JSON.parse(raw);
    if (
      typeof session === "object" &&
      session !== null &&
      "access_token" in session &&
      typeof session.access_token === "string" &&
      "user" in session &&
      typeof session.user === "object" &&
      session.user !== null &&
      "id" in session.user &&
      typeof session.user.id === "string"
    ) {
      return session as AuthSession;
    }
  } catch (error) {
    console.error("Could not read the saved sign-in session.", error);
    throw error;
  }
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  return null;
}

export function setStoredAuthSession(session: AuthSession | null): void {
  if (typeof window === "undefined") return;
  if (session) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  } else {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

export function clearStoredAuthSession(): void {
  setStoredAuthSession(null);
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
