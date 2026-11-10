/**
 * The desktop app's newest release, for the home page's download.
 *
 * The app and its releases live in github.com/Jumetra-Technologies/kiungo (from desktop
 * 0.14.0, Nov 2026); every release up to 0.13 is on this repository. Three
 * sources, in order:
 * 1. The backend's GET /releases/latest (jumetra-backend docs/releases.md),
 *    which the release pipeline fills once its token is configured.
 * 2. The version the app's own update feed offers (kiungo's desktop-feed
 *    latest.yml, else beta.yml), then that release's manifest
 *    (kiungo-release.json). Both come straight from GitHub's download CDN,
 *    which has no rate limit.
 * 3. The newest "Release the desktop app" release on GitHub, kiungo first and
 *    then this repository, from the releases API (60 requests an hour per IP
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

/** Where the release workflow publishes: the desktop app's repository (the GitHub organization keeps its pre-rebrand name). */
export const DESKTOP_REPOSITORY = "https://github.com/Jumetra-Technologies/kiungo";
/** Where releases up to desktop 0.13 were published, before the app moved. */
export const LEGACY_REPOSITORY = "https://github.com/Jumetra-Technologies/jumetra-frontend";
export const githubReleasesUrl = (repository: string) => `${repository.replace("https://github.com/", "https://api.github.com/repos/")}/releases?per_page=10`;
const releasePage = (repository: string) => `${repository}/releases/tag/`;
const releaseAssets = (repository: string) => `${repository}/releases/download/`;
const MANIFEST_ASSET = "kiungo-release.json";
const VERSION = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;
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
export async function manifestRelease(version: string, fetchImpl: Fetch = fetch, repository: string = DESKTOP_REPOSITORY): Promise<Release | null> {
  if (!VERSION.test(version)) return null;
  try {
    const res = await get(fetchImpl, `${releaseAssets(repository)}desktop-v${version}/${MANIFEST_ASSET}`, { "User-Agent": "kiungo-website" });
    if (!res.ok) return null;
    const parsed = parseRelease(await res.json(), "github", `${releasePage(repository)}desktop-v${version}`);
    return parsed && parsed.version === version ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * The version the app's update feed offers (stable first, then beta), from the
 * download CDN; null when the feed has none. Read with a line match: the feed
 * is electron-updater's YAML, and only its top-level version is needed.
 */
export async function feedVersion(fetchImpl: Fetch = fetch, repository: string = DESKTOP_REPOSITORY): Promise<string | null> {
  for (const file of ["latest.yml", "beta.yml"]) {
    try {
      const res = await get(fetchImpl, `${releaseAssets(repository)}desktop-feed/${file}`, { "User-Agent": "kiungo-website" });
      if (!res.ok) continue;
      const version = /^version:\s*['"]?([^'"\s]+)['"]?\s*$/m.exec(await res.text())?.[1];
      if (version && VERSION.test(version)) return version;
    } catch {
      /* the next file, or none */
    }
  }
  return null;
}

/** The newest desktop release on one repository's GitHub releases (pre-releases included), or null. */
export async function githubRelease(fetchImpl: Fetch = fetch, repository: string = DESKTOP_REPOSITORY): Promise<Release | null> {
  try {
    const token = process.env.GITHUB_TOKEN;
    const res = await get(fetchImpl, githubReleasesUrl(repository), { Accept: "application/vnd.github+json", "User-Agent": "kiungo-website", ...(token ? { Authorization: `Bearer ${token}` } : {}) });
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
 * release the app's update feed offers, else the newest on GitHub (the app's
 * repository, then the releases from before it moved). Null when there's none yet.
 */
export async function latestRelease(fetchImpl: Fetch = fetch): Promise<Release | null> {
  const fromBackend = (await backendRelease("stable", fetchImpl)) ?? (await backendRelease("beta", fetchImpl));
  if (fromBackend) return fromBackend;
  const offered = await feedVersion(fetchImpl);
  return (offered ? await manifestRelease(offered, fetchImpl) : null) ?? (await githubRelease(fetchImpl)) ?? (await githubRelease(fetchImpl, LEGACY_REPOSITORY));
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

/** One path segment of a release file's address: never "." or "..", and nothing that decodes to a separator or a dot. */
const SAFE_SEGMENT = /^(?!\.{1,2}$)[A-Za-z0-9._~+-]+$|^(?!.*%(?:2e|2f|5c|00))(?!\.{1,2}$)[A-Za-z0-9._~+%-]+$/i;
const DESKTOP_REPOSITORIES = [DESKTOP_REPOSITORY, LEGACY_REPOSITORY].map((r) => new URL(r).pathname);

/**
 * Whether the download route may fetch this URL: only installers of the
 * desktop app's releases (kiungo's, and this repository's from before the
 * move), on GitHub or on the backend, plus any origins listed in
 * `extra` (KIUNGO_DOWNLOAD_ORIGINS, for a local check against a local file server).
 *
 * The address is parsed and its parts checked, never matched as text: a URL
 * that would resolve somewhere else ("..", "\", "%2e", a user name, a port) is
 * refused, and so is any URL that isn't already in the form the route will
 * fetch, so what's checked is exactly what's fetched.
 */
export function isReleaseFileUrl(url: string, extra: readonly string[] = []): boolean {
  if (typeof url !== "string" || url.length > 2048 || /[\\\s]/.test(url)) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.href !== url || parsed.username || parsed.password || parsed.hash) return false;
  const segments = parsed.pathname.split("/").slice(1);
  if (!segments.every((segment) => SAFE_SEGMENT.test(segment))) return false;

  // GitHub: /<org>/<repo>/releases/download/<tag>/<file>, on one of the desktop app's repositories.
  if (parsed.protocol === "https:" && parsed.host === "github.com" && !parsed.search) {
    const repository = `/${segments.slice(0, 2).join("/")}`;
    return segments.length === 6 && DESKTOP_REPOSITORIES.includes(repository) && segments[2] === "releases" && segments[3] === "download";
  }

  // The backend's releases, or a listed origin: same origin, and under it.
  const under = (base: string, path: string) => {
    try {
      const b = new URL(base);
      if (b.origin !== parsed.origin) return false;
      const prefix = `${b.pathname.replace(/\/+$/, "")}${path}`;
      return parsed.pathname.startsWith(prefix) && parsed.pathname.length > prefix.length;
    } catch {
      return false;
    }
  };
  return under(API_BASE, "/releases/") || extra.some((origin) => origin && under(origin, "/"));
}

/** The link under a download button: the pass-through for the page's own download, the asset itself otherwise. */
export function downloadHref(file: Pick<ReleaseFile, "url">, mode: DownloadMode): string {
  return mode === "page" ? `${DOWNLOAD_ROUTE}?url=${encodeURIComponent(file.url)}` : file.url;
}
