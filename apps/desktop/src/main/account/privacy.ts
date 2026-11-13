import type { PrivacyChoices } from "@kiungo/api";
import type { AccountClient } from "./client";

/**
 * The account's privacy choices, as Settings, Privacy shows them. The answer
 * lives on the account (GET/PUT /auth/me/consents), the same one the
 * website's banner asks, so it follows the person between the website and
 * every computer they sign in on.
 */

interface AccountConsents {
  usage?: boolean | null;
  decided_at?: string | null;
}

const fromAccount = (raw: unknown): PrivacyChoices => {
  const c = (raw ?? {}) as AccountConsents;
  return { usage: typeof c.usage === "boolean" ? c.usage : null, decidedAt: typeof c.decided_at === "string" ? c.decided_at : null };
};

export async function readPrivacy(account: Pick<AccountClient, "request">): Promise<PrivacyChoices> {
  return fromAccount((await account.request("/auth/me/consents")).data);
}

/** Allow or stop usage counting. The server deletes what was counted when it's stopped. */
export async function setUsageCounting(account: Pick<AccountClient, "request">, allowed: unknown): Promise<PrivacyChoices> {
  if (typeof allowed !== "boolean") throw new Error("Refused: usage counting is on or off.");
  return fromAccount((await account.request("/auth/me/consents", { method: "PUT", body: { usage: allowed, decided_in: "desktop" } })).data);
}
