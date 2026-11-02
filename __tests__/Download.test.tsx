import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DownloadPicker } from "@/components/download/DownloadPicker";
import { detectPlatform, fileLabel, primaryFile, type Release } from "@/lib/releases";

const release: Release = {
  channel: "stable",
  version: "0.11.0",
  notes: "Import and sync.",
  published_at: "2026-11-02T00:00:00Z",
  files: [
    { platform: "windows", arch: "x64", kind: "nsis", url: "https://dl.test/Kiungo-0.11.0-setup.exe", sha512: "a".repeat(88), size: 98 * 1024 * 1024 },
    { platform: "macos", arch: "arm64", kind: "dmg", url: "https://dl.test/Kiungo-0.11.0-arm64.dmg", sha512: "b".repeat(88), size: 110 * 1024 * 1024 },
    { platform: "macos", arch: "x64", kind: "dmg", url: "https://dl.test/Kiungo-0.11.0-x64.dmg", sha512: "c".repeat(88), size: 112 * 1024 * 1024 },
    { platform: "linux", arch: "x64", kind: "deb", url: "https://dl.test/kiungo_0.11.0_amd64.deb", sha512: "d".repeat(88), size: 90 * 1024 * 1024 },
    { platform: "linux", arch: "x64", kind: "appimage", url: "https://dl.test/Kiungo-0.11.0-x86_64.AppImage", sha512: "e".repeat(88), size: 120 * 1024 * 1024 },
  ],
};

const WINDOWS_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0 Safari/537.36";
const MAC_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Safari/605.1.15";
const PHONE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148";

afterEach(() => vi.restoreAllMocks());

describe("the download page (sprint 11)", () => {
  it("knows the visitor's computer from the browser, and doesn't guess for a phone", () => {
    expect(detectPlatform(WINDOWS_UA)).toEqual({ platform: "windows", arch: "x64" });
    expect(detectPlatform(MAC_UA)?.platform).toBe("macos");
    expect(detectPlatform("Mozilla/5.0 (X11; Linux x86_64)")).toEqual({ platform: "linux", arch: "x64" });
    expect(detectPlatform(PHONE_UA)).toBeNull();
  });

  it("offers the installer most people on that system want", () => {
    expect(primaryFile(release.files, "windows")?.kind).toBe("nsis");
    expect(primaryFile(release.files, "linux")?.kind).toBe("appimage");
    expect(primaryFile(release.files, "macos", "arm64")?.arch).toBe("arm64");
    expect(fileLabel(release.files[1])).toBe("macOS Apple silicon, disk image");
  });

  it("on Windows, the main button downloads the Windows installer, and every installer is listed", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(WINDOWS_UA);
    render(<DownloadPicker release={release} />);
    const main = screen.getByTestId("download-main");
    expect(main.getAttribute("href")).toBe("https://dl.test/Kiungo-0.11.0-setup.exe");
    expect(main.textContent).toContain("Download for Windows");
    expect(screen.getAllByTestId("download-file")).toHaveLength(5);
  });

  it("on a phone, there's no main button: the list says which computers it runs on", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(PHONE_UA);
    render(<DownloadPicker release={release} />);
    expect(screen.queryByTestId("download-main")).toBeNull();
    expect(document.body.textContent).toContain("Windows, macOS and Linux");
  });
});
