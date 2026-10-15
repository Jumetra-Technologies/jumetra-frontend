import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HeroBoard } from "@/components/landing/HeroBoard";

afterEach(() => vi.useRealTimers());

describe("Home page board", () => {
  it("draws the real Arduino Uno R3 model, with no Kiungo branding", () => {
    const { container } = render(<HeroBoard hint="hint" />);
    expect(screen.getByRole("group", { name: /Arduino Uno/ })).toBeInTheDocument();
    expect(container.querySelector('[data-solid="pcb"]')).not.toBeNull();
    expect(container.textContent).not.toMatch(/Kiungo|DEV BOARD/);
  });

  it("runs Blink: the L LED goes on and off every half second until stopped", () => {
    vi.useFakeTimers();
    const { container } = render(<HeroBoard hint="hint" />);
    const led = () => container.querySelector('[data-solid="led-l"]')!;
    const lit = () => /lit/.test(led().className);
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
