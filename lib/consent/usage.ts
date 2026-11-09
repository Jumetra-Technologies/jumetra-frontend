import { API_BASE } from "@/lib/api-client";

/**
 * Whether this person allowed Kiungo to count which pages they open and how
 * long they spend on the website and in the desktop app (the admin portal's
 * figures). Nothing is counted until they say yes; see the Cookie Policy.
 *
 * The answer is kept in this browser, and on the account when signed in
 * (UsageConsentSync), so it follows them to another browser and the desktop
 * app. The server drops heartbeats from accounts that haven't said yes.
 */

const KEY = "kiungo.consent.usage";
const EVENT = "kiungo-usage-consent";

export type UsageConsent = { allowed: boolean; decidedAt: string };

let cachedRaw: string | null | undefined;
let cached: UsageConsent | null = null;

function parse(raw: string | null): UsageConsent | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<UsageConsent>;
    return typeof v.allowed === "boolean" && typeof v.decidedAt === "string" ? { allowed: v.allowed, decidedAt: v.decidedAt } : null;
  } catch {
    return null;
  }
}

/** This browser's answer, or null if it hasn't been asked. Stable between calls. */
export function readUsageConsent(): UsageConsent | null {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    raw = null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = parse(raw);
  }
  return cached;
}

export function subscribeUsageConsent(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Keep an answer in this browser only (also used when the account's newer answer arrives). */
export function storeUsageConsent(answer: UsageConsent): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(answer));
  } catch {
    // Storage blocked: the answer lasts while this page is open, and nothing is counted after it closes.
    cachedRaw = JSON.stringify(answer);
    cached = answer;
  }
  window.dispatchEvent(new Event(EVENT));
}

export type Account = {
  signedIn: boolean;
  save: (answer: { usage: boolean; decided_in: string }) => Promise<unknown>;
};

/**
 * Record a new answer: in this browser, on the account when signed in, and
 * when it's no, ask the server to delete what was counted (the account's
 * rows go with the answer; a signed-out browser's go by its visitor id).
 */
export async function decideUsage(allowed: boolean, account: Account, now = new Date()): Promise<void> {
  storeUsageConsent({ allowed, decidedAt: now.toISOString() });
  if (account.signedIn) {
    await account.save({ usage: allowed, decided_in: "website" }).catch(() => undefined);
  }
  if (!allowed) forgetThisBrowser();
}

/** Tell the server to delete what was counted for this browser's visitor id, if it ever had one. */
export function forgetThisBrowser(base = API_BASE): void {
  let visitor: string | null = null;
  try {
    visitor = window.localStorage.getItem("kiungo.visitor");
  } catch {
    visitor = null;
  }
  if (!visitor) return;
  void fetch(`${base}/telemetry/forget`, { method: "POST", body: JSON.stringify({ visitor }), headers: { "Content-Type": "text/plain" }, keepalive: true }).catch(() => undefined);
}

/**
 * Which answer wins when this browser and the account disagree: whichever was
 * given last. Returns what to do so both end up the same.
 */
export function reconcile(local: UsageConsent | null, account: { usage: boolean | null; decided_at: string | null }): "push" | "pull" | "none" {
  const remote = account.usage === null ? null : { allowed: account.usage, decidedAt: account.decided_at ?? "" };
  if (!local && !remote) return "none";
  if (local && !remote) return "push";
  if (!local && remote) return "pull";
  if (local!.allowed === remote!.allowed) return "none";
  return Date.parse(local!.decidedAt) >= Date.parse(remote!.decidedAt || "0") ? "push" : "pull";
}
