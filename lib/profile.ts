"use client";

/**
 * The editable profile: what it holds, how it's checked, and how it's saved.
 *
 * Saves go to PATCH /auth/me and deletes to DELETE /auth/me (contract in
 * docs/accounts-and-profile.md). Profile edits are stored by the backend.
 */

import { API_BASE } from "@/lib/api-client";
import type { AuthUser } from "@/lib/auth-session";
import { buildAuthHeaders } from "@/lib/auth-session";

export const ROLES = [
  { id: "student", label: "Student" },
  { id: "researcher", label: "Researcher" },
  { id: "technician", label: "Technician" },
  { id: "instructor", label: "Instructor" },
  { id: "club_lead", label: "Club lead" },
  { id: "school_admin", label: "School admin" },
  { id: "hobbyist", label: "Hobbyist" },
  { id: "other", label: "Other" },
] as const;

export type RoleId = (typeof ROLES)[number]["id"];

export type ProfileFields = {
  display_name: string;
  role: RoleId | null;
  role_other: string | null;
  organization: string | null;
  location: string | null;
  bio: string | null;
};

export const LIMITS = { display_name: 80, role_other: 80, organization: 120, location: 80, bio: 280 } as const;

export type FieldErrors = Partial<Record<keyof ProfileFields, string>>;

export function roleLabel(role: string | null | undefined): string | null {
  if (role === "other") return "Other";
  return ROLES.find((r) => r.id === role)?.label ?? role ?? null;
}

const isRole = (value: unknown): value is RoleId => ROLES.some((r) => r.id === value);

const clean = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
};

/** The editable part of a user. */
export function fieldsOf(user: AuthUser): ProfileFields {
  return {
    display_name: user.display_name ?? "",
    role: isRole(user.role) ? user.role : null,
    role_other: clean(user.role_other),
    organization: clean(user.organization),
    location: clean(user.location),
    bio: clean(user.bio),
  };
}

export function normalizeFields(input: ProfileFields): ProfileFields {
  return {
    display_name: input.display_name.trim().replace(/\s+/g, " "),
    role: isRole(input.role) ? input.role : null,
    role_other: clean(input.role_other),
    organization: clean(input.organization),
    location: clean(input.location),
    bio: clean(input.bio),
  };
}

export function validateFields(input: ProfileFields): FieldErrors {
  const f = normalizeFields(input);
  const errors: FieldErrors = {};
  if (!f.display_name) errors.display_name = "Enter your name.";
  else if (f.display_name.length > LIMITS.display_name) errors.display_name = `Keep it under ${LIMITS.display_name} characters.`;
  if ((f.organization?.length ?? 0) > LIMITS.organization) errors.organization = `Keep it under ${LIMITS.organization} characters.`;
  if ((f.role_other?.length ?? 0) > LIMITS.role_other) errors.role_other = `Keep it under ${LIMITS.role_other} characters.`;
  if (f.role === "other" && !f.role_other) errors.role_other = "Enter your role.";
  if ((f.location?.length ?? 0) > LIMITS.location) errors.location = `Keep it under ${LIMITS.location} characters.`;
  if ((f.bio?.length ?? 0) > LIMITS.bio) errors.bio = `Keep it under ${LIMITS.bio} characters.`;
  return errors;
}

/** Only the fields that changed, so the PATCH body is minimal. */
export function changedFields(before: ProfileFields, after: ProfileFields): Partial<ProfileFields> {
  const a = normalizeFields(before);
  const b = normalizeFields(after);
  const diff: Partial<ProfileFields> = {};
  for (const key of Object.keys(b) as (keyof ProfileFields)[]) {
    if (a[key] !== b[key]) (diff as Record<string, unknown>)[key] = b[key];
  }
  return diff;
}

export const EMPTY_DETAILS: Omit<ProfileFields, "display_name"> = { role: null, role_other: null, organization: null, location: null, bio: null };

/* ----- Backend calls ----- */

export type SaveResult = { user: AuthUser; savedTo: "server" };

/** Statuses that mean "this route doesn't exist on the backend yet". */
const UNSUPPORTED = new Set([404, 405, 501]);

async function detail(response: Response, fallback: string): Promise<string> {
  const payload = (await response.json().catch(() => null)) as { detail?: unknown } | null;
  if (typeof payload?.detail === "string") return payload.detail;
  // FastAPI validation errors are a list.
  if (Array.isArray(payload?.detail) && payload.detail[0]?.msg) return String(payload.detail[0].msg);
  return fallback;
}

export async function saveProfile(user: AuthUser, token: string, next: ProfileFields): Promise<SaveResult> {
  const fields = normalizeFields(next);
  // Send every editable field: the stored user may carry edits that were only
  // ever saved on this device, so a diff against it could miss them.
  const body = fields;

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/auth/me`, {
      method: "PATCH",
      headers: { Accept: "application/json", "Content-Type": "application/json", ...buildAuthHeaders(token) },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Your changes weren't saved. Check your connection and try again.");
  }

  if (!response.ok) throw new Error(await detail(response, "Your changes weren't saved. Try again."));

  const saved = (await response.json().catch(() => null)) as Partial<AuthUser> & { name?: string } | null;
  return {
    user: {
      ...user,
      ...fields,
      ...(saved ?? {}),
      display_name: saved?.display_name ?? saved?.name ?? fields.display_name,
      role: saved?.role ?? fields.role,
      role_other: saved?.role_other ?? fields.role_other,
      // The identity provider owns these; keep them if the response leaves them out.
      email: saved?.email ?? user.email,
      picture_url: saved?.picture_url ?? user.picture_url,
    },
    savedTo: "server",
  };
}

export type DeleteResult = { deleted: true } | { deleted: false; reason: string };

export async function deleteAccount(user: AuthUser, token: string): Promise<DeleteResult> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/auth/me`, { method: "DELETE", headers: { Accept: "application/json", ...buildAuthHeaders(token) } });
  } catch {
    return { deleted: false, reason: "Nothing was deleted. Check your connection and try again." };
  }
  if (UNSUPPORTED.has(response.status)) {
    return { deleted: false, reason: "Deleting accounts isn't available yet. Nothing was deleted; you can still clear your details." };
  }
  if (!response.ok) return { deleted: false, reason: await detail(response, "Your account wasn't deleted. Try again.") };
  return { deleted: true };
}

/** Google photos come at 96px; ask for the size we draw at (x2 for sharp screens). */
export function sizedPhoto(url: string | null | undefined, px: number): string | null {
  if (!url) return null;
  if (/googleusercontent\.com/.test(url)) {
    const size = Math.min(Math.max(Math.round(px * 2), 32), 512);
    if (/=s\d+(-c)?$/.test(url)) return url.replace(/=s\d+(-c)?$/, `=s${size}-c`);
    if (!url.includes("=")) return `${url}=s${size}-c`;
  }
  return url;
}

export function initialsOf(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}
