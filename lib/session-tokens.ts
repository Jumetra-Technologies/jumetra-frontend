const ACCESS_KEY = "hhip_access_token";
const REFRESH_KEY = "hhip_refresh_token";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getAccessToken(): string | null {
  if (!canUseStorage()) return null;
  return window.localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (!canUseStorage()) return null;
  return window.localStorage.getItem(REFRESH_KEY);
}

export function storeSessionTokens(access?: string | null, refresh?: string | null): void {
  if (!canUseStorage()) return;
  if (access) window.localStorage.setItem(ACCESS_KEY, access);
  if (refresh) window.localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearSessionTokens(): void {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
}

export function authHeaders(extra?: HeadersInit): HeadersInit {
  const headers: Record<string, string> = {};
  const access = getAccessToken();
  const refresh = getRefreshToken();
  if (access) headers.Authorization = `Bearer ${access}`;
  if (refresh) headers["X-Refresh-Token"] = refresh;
  return { ...headers, ...(extra ?? {}) };
}
