/**
 * The desktop app's newest release, for the home page's download.
 *
 * Three sources, in order:
 * 1. The backend's GET /releases/latest (jumetra-backend docs/releases.md),
 *    which the release pipeline fills once its token is configured.
 * 2. The manifest (kiungo-release.json) of the GitHub release for the desktop
 *    version this site was built with (apps/desktop/package.json), fetched
 *    straight from GitHub's download CDN, which has no rate limit.
 * 3. The newest GitHub release of jumetra-frontend made by the "Release the
 *    desktop app" workflow, from the releases API (60 requests an hour per IP
 *    unauthenticated, which a shared host can exhaust; GITHUB_TOKEN lifts it),
 *    read from its manifest or, without one, from the installers' names.
 *
 * All are read on the server and kept for five minutes.
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
  /** Where it came from, and the page that lists every file with its checksum. */
  source: "backend" | "github";
  releaseUrl?: string;
}

/** Where the release workflow publishes (the GitHub organization keeps its pre-rebrand name). */
export const GITHUB_RELEASES_URL = "https://api.github.com/repos/Jumetra-Technologies/jumetra-frontend/releases?per_page=10";
const GITHUB_RELEASE_PAGE = "https://github.com/Jumetra-Technologies/jumetra-frontend/releases/tag/";
/** Where this repository's release assets live. */
const RELEASE_ASSETS = "https://github.com/Jumetra-Technologies/jumetra-frontend/releases/download/";
const MANIFEST_ASSET = "kiungo-release.json";
/** The desktop version this site was built with (next.config.ts reads apps/desktop/package.json). */
export const DESKTOP_VERSION = process.env.NEXT_PUBLIC_DESKTOP_VERSION ?? "";
const REVALIDATE_SECONDS = 300;
const TIMEOUT_MS = 6000;

type Fetch = typeof fetch;

function isFile(value: unknown): value is ReleaseFile {
  const f = value as Partial<ReleaseFile> | null;
  return Boolean(f && typeof f.url === "string" && /^https:\/\//.test(f.url) && typeof f.size === "number" && ["windows", "macos", "linux"].includes(f.platform as string) && ["x64", "arm64"].includes(f.arch as string) && typeof f.kind === "string");
}

function parseRelease(raw: unknown, source: Release["source"], releaseUrl?: string): Release | null {
  const r = raw as Partial<Release> | null;
  if (!r || typeof r.version !== "string" || !Array.isArray(r.files)) return null;
  const files = r.files.filter(isFile);
  if (!files.length) return null;
  return {
    channel: r.channel === "stable" ? "stable" : "beta",
    version: r.version,
    notes: typeof r.notes === "string" ? r.notes : "",
    published_at: typeof r.published_at === "string" ? r.published_at : new Date().toISOString(),
    files,
    source,
    ...(releaseUrl ? { releaseUrl } : {}),
  };
}

const get = (fetchImpl: Fetch, url: string, headers: Record<string, string> = {}) =>
  fetchImpl(url, {
    headers,
    ...(typeof AbortSignal !== "undefined" && "timeout" in AbortSignal ? { signal: AbortSignal.timeout(TIMEOUT_MS) } : {}),
    next: { revalidate: REVALIDATE_SECONDS },
  } as RequestInit);

/** The backend's newest release on the channel, or null. */
export async function backendRelease(channel: "stable" | "beta" = "stable", fetchImpl: Fetch = fetch): Promise<Release | null> {
  try {
    const res = await get(fetchImpl, `${API_BASE}/releases/latest?channel=${channel}`);
    if (!res.ok) return null;
    return parseRelease(await res.json(), "backend");
  } catch {
    return null;
  }
}

interface GitHubAsset {
  name: string;
  browser_download_url: string;
  size: number;
}
interface GitHubRelease {
  tag_name: string;
  name: string;
  draft: boolean;
  prerelease: boolean;
  published_at: string;
  body: string | null;
  html_url: string;
  assets: GitHubAsset[];
}

/** platform, arch and kind from an installer's name, as electron-builder.yml names them. */
export function classifyInstaller(name: string): Pick<ReleaseFile, "platform" | "arch" | "kind"> | null {
  const lower = name.toLowerCase();
  const arch: ReleaseArch = /arm64|aarch64/.test(lower) ? "arm64" : "x64";
  if (lower.endsWith(".exe")) return { platform: "windows", arch, kind: "nsis" };
  if (lower.endsWith(".dmg")) return { platform: "macos", arch, kind: "dmg" };
  if (lower.endsWith(".appimage")) return { platform: "linux", arch, kind: "appimage" };
  if (lower.endsWith(".deb")) return { platform: "linux", arch, kind: "deb" };
  if (lower.endsWith(".rpm")) return { platform: "linux", arch, kind: "rpm" };
  if (lower.endsWith(".zip")) return { platform: lower.includes("mac") || lower.includes("darwin") ? "macos" : "windows", arch, kind: "zip" };
  return null;
}

/** A GitHub release as a Release: from its manifest when it has one, else from its installers' names. */
export async function releaseFromGitHub(release: GitHubRelease, fetchImpl: Fetch = fetch): Promise<Release | null> {
  const manifest = release.assets.find((a) => a.name === MANIFEST_ASSET);
  if (manifest) {
    try {
      const res = await get(fetchImpl, manifest.browser_download_url);
      if (res.ok) {
        const parsed = parseRelease(await res.json(), "github", release.html_url);
        if (parsed) return parsed;
      }
    } catch {
      /* fall through to the installers' names */
    }
  }
  const files: ReleaseFile[] = [];
  for (const asset of release.assets) {
    const target = classifyInstaller(asset.name);
    if (target) files.push({ ...target, url: asset.browser_download_url, sha512: "", size: asset.size });
  }
  if (!files.length) return null;
  return {
    channel: release.prerelease ? "beta" : "stable",
    version: release.tag_name.replace(/^desktop-v/, "").replace(/^v/, ""),
    notes: release.body ?? "",
    published_at: release.published_at,
    files,
    source: "github",
    releaseUrl: release.html_url,
  };
}

/** The release of one desktop version, from its manifest on GitHub's download CDN; null when that version isn't published. */
export async function manifestRelease(version: string = DESKTOP_VERSION, fetchImpl: Fetch = fetch): Promise<Release | null> {
  if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version)) return null;
  try {
    const res = await get(fetchImpl, `${RELEASE_ASSETS}desktop-v${version}/${MANIFEST_ASSET}`, { "User-Agent": "kiungo-website" });
    if (!res.ok) return null;
    const parsed = parseRelease(await res.json(), "github", `${GITHUB_RELEASE_PAGE}desktop-v${version}`);
    return parsed && parsed.version === version ? parsed : null;
  } catch {
    return null;
  }
}

/** The newest desktop release on GitHub (pre-releases included), or null. */
export async function githubRelease(fetchImpl: Fetch = fetch): Promise<Release | null> {
  try {
    const token = process.env.GITHUB_TOKEN;
    const res = await get(fetchImpl, GITHUB_RELEASES_URL, { Accept: "application/vnd.github+json", "User-Agent": "kiungo-website", ...(token ? { Authorization: `Bearer ${token}` } : {}) });
    if (!res.ok) return null;
    const releases = (await res.json()) as GitHubRelease[];
    if (!Array.isArray(releases)) return null;
    for (const release of releases) {
      if (release.draft || !release.tag_name.startsWith("desktop-v")) continue;
      const parsed = await releaseFromGitHub(release, fetchImpl);
      if (parsed) return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * The release to offer: the backend's stable one, else its beta, else the
 * GitHub release of the version this site was built with, else the newest on
 * GitHub. Null when there's none yet.
 */
export async function latestRelease(fetchImpl: Fetch = fetch): Promise<Release | null> {
  return (await backendRelease("stable", fetchImpl)) ?? (await backendRelease("beta", fetchImpl)) ?? (await manifestRelease(DESKTOP_VERSION, fetchImpl)) ?? (await githubRelease(fetchImpl));
}

export const PLATFORM_NAMES: Record<ReleasePlatform, string> = { windows: "Windows", macos: "macOS", linux: "Linux" };

/** What each installer is, in words: "Windows 64-bit installer", "macOS Apple silicon disk image". */
export function fileLabel(file: Pick<ReleaseFile, "platform" | "arch" | "kind">): string {
  const arch = file.platform === "macos" ? (file.arch === "arm64" ? "Apple silicon" : "Intel") : file.arch === "arm64" ? "ARM" : "64-bit";
  const kind = { nsis: "installer", dmg: "disk image", zip: "zip", appimage: "AppImage", deb: ".deb for Ubuntu and Debian", rpm: ".rpm for Fedora" }[file.kind] ?? file.kind;
  return `${PLATFORM_NAMES[file.platform]} ${arch} ${kind}`;
}

/** The file's name, as it downloads. */
export function fileName(file: Pick<ReleaseFile, "url">): string {
  try {
    return decodeURIComponent(new URL(file.url).pathname.split("/").pop() ?? "");
  } catch {
    return "";
  }
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
  // Safari and Chrome say "Intel Mac OS X" on Apple silicon too; the disk image for Apple silicon is the safer first offer.
  if (ua.includes("mac os x") || ua.includes("macintosh")) return { platform: "macos", arch: "arm64" };
  if (ua.includes("linux")) return { platform: "linux", arch: /aarch64|arm64/.test(ua) ? "arm64" : "x64" };
  return null;
}

/** "148 MB" or "640 KB", with a no-break space so a size never splits across lines. */
export function formatSize(bytes: number): string {
  if (!bytes) return "";
  return bytes >= 1024 * 1024 ? `${Math.round(bytes / (1024 * 1024))}\u00a0MB` : `${Math.max(1, Math.round(bytes / 1024))}\u00a0KB`;
}

/**
 * How the home page downloads an installer.
 * - `page`: the page fetches the file through its own origin (`/api/desktop/download`,
 *   which passes the release asset through, since GitHub's downloads don't allow a
 *   page to read them) so it can show progress, check the file against the release's
 *   checksum, and say exactly what went wrong when something does.
 * - `browser`: a plain link to the asset; the browser downloads it and the page
 *   can't tell how it went. Set KIUNGO_DOWNLOAD_MODE=browser to use this.
 */
export type DownloadMode = "page" | "browser";

export const DOWNLOAD_ROUTE = "/api/desktop/download";

/**
 * Whether the download route may fetch this URL: only installers of this
 * project's releases, on GitHub or on the backend, plus any origins listed in
 * `extra` (KIUNGO_DOWNLOAD_ORIGINS, for a local check against a local file server).
 */
export function isReleaseFileUrl(url: string, extra: readonly string[] = []): boolean {
  if (typeof url !== "string" || url.length > 2048) return false;
  if (url.startsWith(RELEASE_ASSETS) && /^[^/?#]+\/[^/?#]+$/.test(url.slice(RELEASE_ASSETS.length))) return true;
  if (url.startsWith(`${API_BASE}/releases/`)) return true;
  return extra.some((origin) => origin && url.startsWith(origin));
}

/** The link under a download button: the pass-through for the page's own download, the asset itself otherwise. */
export function downloadHref(file: Pick<ReleaseFile, "url">, mode: DownloadMode): string {
  return mode === "page" ? `${DOWNLOAD_ROUTE}?url=${encodeURIComponent(file.url)}` : file.url;
}
