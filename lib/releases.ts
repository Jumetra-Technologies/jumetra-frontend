/**
 * The desktop app's releases, as the backend's GET /releases/latest gives
 * them (jumetra-backend docs/releases.md), for the download page.
 */
import { API_BASE } from "@/lib/api-client";

export type ReleasePlatform = "windows" | "macos" | "linux";
export type ReleaseArch = "x64" | "arm64";
export type ReleaseKind = "nsis" | "dmg" | "zip" | "appimage" | "deb" | "rpm";

export interface ReleaseFile {
  platform: ReleasePlatform;
  arch: ReleaseArch;
  kind: ReleaseKind;
  url: string;
  sha512: string;
  size: number;
}

export interface Release {
  channel: "stable" | "beta";
  version: string;
  notes: string;
  published_at: string;
  files: ReleaseFile[];
}

/** The newest stable release, or null when there's none yet or the backend can't be reached. Refreshed every 5 minutes. */
export async function latestRelease(channel: "stable" | "beta" = "stable"): Promise<Release | null> {
  try {
    const res = await fetch(`${API_BASE}/releases/latest?channel=${channel}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const data = (await res.json()) as Release;
    return Array.isArray(data?.files) && data.files.length ? data : null;
  } catch {
    return null;
  }
}

export const PLATFORM_NAMES: Record<ReleasePlatform, string> = { windows: "Windows", macos: "macOS", linux: "Linux" };

/** What each installer is, in words. */
export function fileLabel(file: Pick<ReleaseFile, "platform" | "arch" | "kind">): string {
  const arch = file.platform === "macos" ? (file.arch === "arm64" ? "Apple silicon" : "Intel") : file.arch === "arm64" ? "ARM" : "64-bit";
  const kind = { nsis: "installer", dmg: "disk image", zip: "zip", appimage: "AppImage", deb: ".deb for Ubuntu and Debian", rpm: ".rpm for Fedora" }[file.kind];
  return `${PLATFORM_NAMES[file.platform]} ${arch}, ${kind}`;
}

/** The installer to offer first on a platform: the one most people there want. */
export function primaryFile(files: ReleaseFile[], platform: ReleasePlatform, arch: ReleaseArch = "x64"): ReleaseFile | null {
  const order: ReleaseKind[] = platform === "windows" ? ["nsis", "zip"] : platform === "macos" ? ["dmg", "zip"] : ["appimage", "deb", "rpm"];
  const on = files.filter((f) => f.platform === platform);
  for (const kind of order) {
    const match = on.find((f) => f.kind === kind && f.arch === arch) ?? on.find((f) => f.kind === kind);
    if (match) return match;
  }
  return on[0] ?? null;
}

/** The platform a browser's user agent says it runs on; null for phones, tablets and anything unknown. */
export function detectPlatform(userAgent: string): { platform: ReleasePlatform; arch: ReleaseArch } | null {
  const ua = userAgent.toLowerCase();
  if (/android|iphone|ipad|ipod|mobile|cros/.test(ua)) return null;
  if (ua.includes("windows")) return { platform: "windows", arch: /arm64|aarch64/.test(ua) ? "arm64" : "x64" };
  if (ua.includes("mac os x") || ua.includes("macintosh")) return { platform: "macos", arch: "arm64" };
  if (ua.includes("linux")) return { platform: "linux", arch: /aarch64|arm64/.test(ua) ? "arm64" : "x64" };
  return null;
}

export function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${Math.round(bytes / (1024 * 1024))} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
