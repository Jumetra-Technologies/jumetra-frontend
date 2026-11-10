import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppPreview } from "@/components/landing/AppPreview";
import { DesktopRelease } from "@/components/landing/DesktopRelease";
import { DownloadBlock } from "@/components/landing/DownloadBlock";
import { DESKTOP, structuredData } from "@/lib/landing/content";
import { classifyInstaller, detectPlatform, feedVersion, fileLabel, fileName, githubRelease, latestRelease, manifestRelease, primaryFile, releaseFromGitHub, type Release } from "@/lib/releases";

const files: Release["files"] = [
  { platform: "windows", arch: "x64", kind: "nsis", url: "https://github.com/Jumetra-Technologies/jumetra-frontend/releases/download/desktop-v0.11.0/Kiungo-0.11.0-win-x64.exe", sha512: "a".repeat(88), size: 98 * 1024 * 1024 },
  { platform: "macos", arch: "arm64", kind: "dmg", url: "https://github.com/x/y/releases/download/desktop-v0.11.0/Kiungo-0.11.0-mac-arm64.dmg", sha512: "b".repeat(88), size: 110 * 1024 * 1024 },
  { platform: "macos", arch: "x64", kind: "dmg", url: "https://github.com/x/y/releases/download/desktop-v0.11.0/Kiungo-0.11.0-mac-x64.dmg", sha512: "c".repeat(88), size: 112 * 1024 * 1024 },
  { platform: "linux", arch: "x64", kind: "deb", url: "https://github.com/x/y/releases/download/desktop-v0.11.0/Kiungo-0.11.0-linux-amd64.deb", sha512: "d".repeat(88), size: 90 * 1024 * 1024 },
  { platform: "linux", arch: "x64", kind: "appimage", url: "https://github.com/x/y/releases/download/desktop-v0.11.0/Kiungo-0.11.0-linux-x86_64.AppImage", sha512: "e".repeat(88), size: 120 * 1024 * 1024 },
];
const release: Release = { channel: "beta", version: "0.11.0", notes: "Import and sync.", published_at: "2026-11-02T12:00:00Z", files, source: "github", releaseUrl: "https://github.com/x/y/releases/tag/desktop-v0.11.0" };

const WINDOWS_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0 Safari/537.36";
const MAC_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Safari/605.1.15";
const PHONE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

afterEach(() => vi.restoreAllMocks());

describe("which installer to offer", () => {
  it("knows the visitor's computer from the browser, and doesn't guess for a phone", () => {
    expect(detectPlatform(WINDOWS_UA)).toEqual({ platform: "windows", arch: "x64" });
    expect(detectPlatform(MAC_UA)?.platform).toBe("macos");
    expect(detectPlatform("Mozilla/5.0 (X11; Linux x86_64)")).toEqual({ platform: "linux", arch: "x64" });
    expect(detectPlatform(PHONE_UA)).toBeNull();
  });

  it("offers the installer most people on that system want, and names it", () => {
    expect(primaryFile(files, "windows")?.kind).toBe("nsis");
    expect(primaryFile(files, "linux")?.kind).toBe("appimage");
    expect(primaryFile(files, "macos", "arm64")?.arch).toBe("arm64");
    expect(fileLabel(files[1])).toBe("macOS Apple silicon disk image");
    expect(fileName(files[0])).toBe("Kiungo-0.11.0-win-x64.exe");
  });
});

describe("where the release comes from", () => {
  const gh = {
    tag_name: "desktop-v0.11.0",
    name: "Kiungo desktop 0.11.0 (beta)",
    draft: false,
    prerelease: true,
    published_at: "2026-11-02T12:00:00Z",
    body: "notes",
    html_url: "https://github.com/x/y/releases/tag/desktop-v0.11.0",
    assets: [
      { name: "Kiungo-0.11.0-win-x64.exe", browser_download_url: files[0].url, size: files[0].size },
      { name: "Kiungo-0.11.0-mac-arm64.dmg", browser_download_url: files[1].url, size: files[1].size },
      { name: "kiungo-release.json", browser_download_url: "https://github.com/x/y/releases/download/desktop-v0.11.0/kiungo-release.json", size: 1000 },
    ],
  };

  it("the backend's release comes first; GitHub's is the fallback", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes("/releases/latest")) return json({ channel: "stable", version: "0.12.0", notes: "", published_at: "2026-12-01T00:00:00Z", files: [files[0]] });
      throw new Error(`unexpected ${url}`);
    }) as unknown as typeof fetch;
    const fromBackend = await latestRelease(fetchImpl);
    expect(fromBackend).toMatchObject({ version: "0.12.0", source: "backend" });

    // Before Kiungo's first release: no feed there, no releases there, so the newest from before the move.
    const asked: string[] = [];
    const fallback = vi.fn(async (url: string) => {
      asked.push(url);
      if (url.includes("/releases/latest")) return json({ detail: "none" }, 404);
      if (url.includes("/desktop-feed/")) return json({ detail: "none" }, 404);
      if (url === "https://api.github.com/repos/Jumetra-Technologies/kiungo/releases?per_page=10") return json([]);
      if (url === "https://api.github.com/repos/Jumetra-Technologies/jumetra-frontend/releases?per_page=10") return json([{ ...gh, draft: true }, gh]);
      if (url.endsWith("kiungo-release.json")) return json({ channel: "beta", version: "0.11.0", notes: "n", published_at: gh.published_at, files });
      throw new Error(`unexpected ${url}`);
    }) as unknown as typeof fetch;
    const fromGitHub = await latestRelease(fallback);
    expect(fromGitHub).toMatchObject({ version: "0.11.0", source: "github", releaseUrl: gh.html_url });
    expect(fromGitHub?.files).toHaveLength(5);
    expect(asked.indexOf("https://api.github.com/repos/Jumetra-Technologies/kiungo/releases?per_page=10")).toBeLessThan(asked.indexOf("https://api.github.com/repos/Jumetra-Technologies/jumetra-frontend/releases?per_page=10"));

    // Once Kiungo has a release, it's that one.
    const moved = vi.fn(async (url: string) => {
      if (url.includes("/releases/latest") || url.includes("/desktop-feed/")) return json({ detail: "none" }, 404);
      if (url === "https://api.github.com/repos/Jumetra-Technologies/kiungo/releases?per_page=10") return json([{ ...gh, tag_name: "desktop-v0.14.0", html_url: "https://github.com/Jumetra-Technologies/kiungo/releases/tag/desktop-v0.14.0", assets: gh.assets.slice(0, 2) }]);
      throw new Error(`unexpected ${url}`);
    }) as unknown as typeof fetch;
    expect(await latestRelease(moved)).toMatchObject({ version: "0.14.0", releaseUrl: "https://github.com/Jumetra-Technologies/kiungo/releases/tag/desktop-v0.14.0" });
  });

  it("the version the app's update feed offers, and its manifest, come straight from the download CDN, before the API", async () => {
    const manifest = { channel: "beta", version: "0.14.0", notes: "n", published_at: gh.published_at, files };
    const FEED = "https://github.com/Jumetra-Technologies/kiungo/releases/download/desktop-feed/";
    const fetchImpl = vi.fn(async (url: string) => {
      if (url === "https://github.com/Jumetra-Technologies/kiungo/releases/download/desktop-v0.14.0/kiungo-release.json") return json(manifest);
      if (url.endsWith("/kiungo-release.json")) return json({ detail: "none" }, 404);
      throw new Error(`unexpected ${url}`);
    }) as unknown as typeof fetch;
    expect(await manifestRelease("0.14.0", fetchImpl)).toMatchObject({ version: "0.14.0", source: "github", releaseUrl: "https://github.com/Jumetra-Technologies/kiungo/releases/tag/desktop-v0.14.0" });
    expect(await manifestRelease("0.15.0", fetchImpl)).toBeNull();
    expect(await manifestRelease("../evil", fetchImpl)).toBeNull();
    expect(await manifestRelease("", fetchImpl)).toBeNull();

    // Stable first; a beta-only feed offers its beta. Anything that isn't a version is ignored.
    const feed = (files: Record<string, string>) => vi.fn(async (url: string) => (url.startsWith(FEED) && files[url.slice(FEED.length)] ? new Response(files[url.slice(FEED.length)]) : json({ detail: "none" }, 404))) as unknown as typeof fetch;
    expect(await feedVersion(feed({ "latest.yml": "version: 0.14.1\nfiles: []\n", "beta.yml": "version: 0.15.0-beta.1\n" }))).toBe("0.14.1");
    expect(await feedVersion(feed({ "beta.yml": "version: '0.14.0'\npath: x\n" }))).toBe("0.14.0");
    expect(await feedVersion(feed({ "beta.yml": "version: ../evil\n" }))).toBeNull();
    expect(await feedVersion(feed({}))).toBeNull();

    // With the backend empty, latestRelease takes the feed's version and its manifest, and never calls the API.
    const calls: string[] = [];
    const ordered = vi.fn(async (url: string) => {
      calls.push(url);
      if (url.includes("/releases/latest")) return json({ detail: "none" }, 404);
      if (url === `${FEED}latest.yml`) return json({ detail: "none" }, 404);
      if (url === `${FEED}beta.yml`) return new Response("version: 0.14.0\n");
      if (url.endsWith("/kiungo-release.json")) return json(manifest);
      throw new Error(`unexpected ${url}`);
    }) as unknown as typeof fetch;
    expect(await latestRelease(ordered)).toMatchObject({ version: "0.14.0", source: "github" });
    expect(calls.some((u) => u.startsWith("https://api.github.com/"))).toBe(false);
  });

  it("without a manifest, the installers' names say what they are", async () => {
    const fetchImpl = vi.fn(async () => json({ detail: "gone" }, 404)) as unknown as typeof fetch;
    const parsed = await releaseFromGitHub({ ...gh, assets: gh.assets.filter((a) => a.name !== "kiungo-release.json") }, fetchImpl);
    expect(parsed?.files.map((f) => [f.platform, f.arch, f.kind])).toEqual([
      ["windows", "x64", "nsis"],
      ["macos", "arm64", "dmg"],
    ]);
    expect(parsed).toMatchObject({ version: "0.11.0", channel: "beta" });
    expect(classifyInstaller("Kiungo-0.11.0-linux-x86_64.AppImage")).toEqual({ platform: "linux", arch: "x64", kind: "appimage" });
    expect(classifyInstaller("latest.yml")).toBeNull();
  });

  it("nothing published anywhere, or the network down, means no release, never an error", async () => {
    expect(await latestRelease((async () => json([], 200)) as unknown as typeof fetch)).toBeNull();
    expect(await githubRelease((async () => { throw new TypeError("fetch failed"); }) as unknown as typeof fetch)).toBeNull();
  });

  it("the search-engine data carries the version and the Windows download", () => {
    const data = structuredData("https://kiungo.example", release) as Record<string, unknown>;
    expect(data.softwareVersion).toBe("0.11.0");
    expect(data.downloadUrl).toBe(files[0].url);
    expect(structuredData("https://kiungo.example", null)).not.toHaveProperty("downloadUrl");
  });
});

describe("the download on the home page", () => {
  it("on Windows, the button is the Windows installer, and every installer is listed under it", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(WINDOWS_UA);
    render(<DownloadBlock release={release} />);
    const main = screen.getByTestId("download-main");
    expect(main).toHaveAttribute("href", files[0].url);
    expect(main).toHaveTextContent("Download for Windows");
    expect(screen.getByTestId("download-main-file")).toHaveTextContent("Kiungo-0.11.0-win-x64.exe · 98 MB");
    expect(screen.getByTestId("desktop-download")).toHaveAttribute("data-state", "detected");
    expect(screen.getAllByTestId("download-file")).toHaveLength(5);
    expect(screen.getByText(/Version 0\.11\.0 beta, November 2, 2026/)).toBeInTheDocument();
    expect(screen.getByTestId("download-notes")).toHaveTextContent(DESKTOP.download.howToOpen);
    expect(screen.getByTestId("download-notes")).toHaveTextContent(DESKTOP.download.needsTitle);
  });

  it("on a Mac, the Apple silicon disk image comes first", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(MAC_UA);
    render(<DownloadBlock release={release} />);
    expect(screen.getByTestId("download-main")).toHaveAttribute("href", files[1].url);
    expect(screen.getByTestId("download-main")).toHaveTextContent("Download for macOS");
  });

  it("on a phone there's no button to press: the list is open, with the computers it runs on", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(PHONE_UA);
    render(<DownloadBlock release={release} />);
    expect(screen.queryByTestId("download-main")).toBeNull();
    expect(screen.getByTestId("desktop-download")).toHaveAttribute("data-state", "phone");
    expect(screen.getByText(DESKTOP.download.phones)).toBeInTheDocument();
    expect(screen.getAllByTestId("download-file")).toHaveLength(5);
  });

  it("before the first release, it says so and sends people to the lab in the browser", () => {
    render(<DesktopRelease release={null} />);
    expect(screen.getByTestId("desktop-download")).toHaveAttribute("data-state", "none");
    expect(screen.getByRole("link", { name: DESKTOP.download.noneCta.label })).toHaveAttribute("href", "/laboratory/workspace");
    expect(screen.queryByTestId("download-main")).toBeNull();
    // The preview is there regardless: the app exists, the download is what's coming.
    expect(screen.getByTestId("app-preview")).toBeInTheDocument();
  });
});

describe("the app preview", () => {
  it("shows one moment at a time, and the tabs and arrow keys move between them", () => {
    render(<AppPreview />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual(DESKTOP.moments.map((m) => m.label));
    expect(screen.getByTestId("preview-image")).toHaveAttribute("alt", DESKTOP.moments[0].caption);
    fireEvent.click(screen.getByTestId("preview-tab-world"));
    expect(screen.getByTestId("preview-caption")).toHaveTextContent(DESKTOP.moments[2].caption);
    expect(screen.getByTestId("preview-image").getAttribute("src")).toContain("robot-world");
    act(() => {
      fireEvent.keyDown(screen.getByRole("tablist"), { key: "ArrowRight" });
    });
    expect(screen.getByTestId("preview-tab-fix")).toHaveAttribute("aria-selected", "true");
    act(() => {
      fireEvent.keyDown(screen.getByRole("tablist"), { key: "ArrowRight" });
    });
    expect(screen.getByTestId("preview-tab-code")).toHaveAttribute("aria-selected", "true");
    expect(within(screen.getByRole("tabpanel")).getByRole("img")).toBeInTheDocument();
  });
});
