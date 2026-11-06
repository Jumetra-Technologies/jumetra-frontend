import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HeroBoard } from "@/components/landing/HeroBoard";

afterEach(() => vi.useRealTimers());

describe("Home page board", () => {
  it("draws the real Arduino Uno R3 model, with no Kiungo branding", () => {
    const { container } = render(<HeroBoard hint="hint" />);
    expect(screen.getByRole("group", { name: /Arduino Uno/ })).toBeInTheDocument();
    // The board itself is drawn by WebGL; jsdom has none, so the top view stands in for it.
    expect(screen.getByTestId("part-3d")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/Kiungo|DEV BOARD/);
  });

  it("runs Blink: the L LED goes on and off every half second until stopped", () => {
    vi.useFakeTimers();
    const { container } = render(<HeroBoard hint="hint" />);
    // Which LEDs the 3D view lights, as it tells the renderer.
    const lit = () => (container.querySelector('[data-testid="part-3d"]')!.getAttribute("data-lit") ?? "").split(" ").includes("led-l");
    expect(lit()).toBe(false);
    fireEvent.click(screen.getByRole("switch", { name: "Run Blink on pin 13" }));
    act(() => vi.advanceTimersByTime(500));
    expect(lit()).toBe(true);
    act(() => vi.advanceTimersByTime(500));
    expect(lit()).toBe(false);
    expect(screen.getByText(/Learn it in 20 minutes/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("switch"));
    act(() => vi.advanceTimersByTime(1500));
    expect(lit()).toBe(false);
    expect(screen.getByText("hint")).toBeInTheDocument();
  });
});
