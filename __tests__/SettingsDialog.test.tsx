import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { CLOSE_CONFIRM_MS } from "@kiungo/ui/close-button";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { closeSettings, openSettings } from "@/lib/settings-dialog";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

function renderDialog() {
  return render(
    <ThemeProvider>
      <button type="button">Opener</button>
      <SettingsDialog />
    </ThemeProvider>,
  );
}

afterEach(() => {
  act(() => closeSettings());
  window.localStorage.clear();
});

describe("SettingsDialog", () => {
  it("stays hidden until opened", () => {
    renderDialog();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens as a modal with appearance and profile tiles, and no technical details", () => {
    renderDialog();
    act(() => openSettings());
    const dialog = screen.getByRole("dialog", { name: "Settings" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    for (const name of ["Appearance", "Profile"]) {
      expect(within(dialog).getByRole("heading", { name })).toBeInTheDocument();
    }
    expect(within(dialog).queryByRole("heading", { name: "Platform" })).toBeNull();
    expect(dialog.textContent).not.toMatch(/API|WebSocket|https?:\/\/|wss?:\/\/|cloudfunctions|run\.app/);
    expect(within(dialog).getByText("Not signed in")).toBeInTheDocument();
    expect(within(dialog).getByTestId("app-version")).toHaveTextContent(/^Kiungo v/);
    expect(within(dialog).getAllByRole("radio").length).toBeGreaterThanOrEqual(7);
  });

  it("applies a theme straight away", () => {
    renderDialog();
    act(() => openSettings());
    const radios = screen.getAllByRole("radio");
    const target = radios.find((radio) => radio.getAttribute("aria-checked") === "false")!;
    fireEvent.click(target);
    expect(target).toHaveAttribute("aria-checked", "true");
    expect(window.localStorage.getItem("hhip-theme")).toBeTruthy();
  });

  it("closes with Escape, the close button, or a click on the dimmed page", () => {
    const { container } = renderDialog();
    act(() => openSettings());
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // The X shows its pressed box for a moment, then closes.
    vi.useFakeTimers();
    act(() => openSettings());
    const close = screen.getByRole("button", { name: "Close settings" });
    fireEvent.click(close);
    expect(close).toHaveAttribute("data-pressed", "true");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(CLOSE_CONFIRM_MS));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    vi.useRealTimers();

    act(() => openSettings());
    fireEvent.click(container.ownerDocument.querySelector(".hhip-dialog-backdrop")!);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("moves focus inside, keeps Tab inside, and returns focus on close", () => {
    renderDialog();
    const opener = screen.getByRole("button", { name: "Opener" });
    opener.focus();
    act(() => openSettings());
    const dialog = screen.getByRole("dialog");
    expect(dialog.contains(document.activeElement)).toBe(true);

    const focusables = dialog.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
    const last = focusables[focusables.length - 1];
    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(focusables[0]);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.activeElement).toBe(opener);
  });
});
