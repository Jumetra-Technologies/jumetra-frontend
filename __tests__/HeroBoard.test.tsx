import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HeroBoard } from "@/components/landing/HeroBoard";
import { TIMING } from "@/components/landing/blink-scene";

// The real scene needs WebGL, which jsdom lacks: a stand-in records what the page asks of it.
const calls: string[] = [];
let lastPhase: ((phase: string) => void) | undefined;
vi.mock("@/components/landing/blink-scene", async (original) => {
  const actual = await original<typeof import("@/components/landing/blink-scene")>();
  class BlinkScene {
    phase = "still";
    set onPhase(fn: (phase: string) => void) {
      lastPhase = fn;
    }
    get animating() {
      return this.phase !== "still";
    }
    resize() {}
    frame() {}
    dispose() {
      calls.push("dispose");
    }
    play(_now: number, reduce: boolean) {
      calls.push(`play${reduce ? " reduced" : ""}`);
      this.phase = "plugging";
      lastPhase?.("plugging");
    }
    stop() {
      calls.push("stop");
      this.phase = "leaving";
      lastPhase?.("leaving");
    }
  }
  return { ...actual, BlinkScene };
});

describe("Home page board", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    calls.length = 0;
  });

  it("without WebGL, shows the real Uno's still view and no play button", () => {
    const { container } = render(<HeroBoard />);
    expect(screen.getByTestId("part-3d")).toHaveAccessibleName(/Arduino Uno/);
    expect(screen.queryByTestId("hero-play")).toBeNull();
    expect(container.textContent).not.toMatch(/Kiungo|DEV BOARD/);
  });

  describe("with WebGL", () => {
    beforeEach(() => {
      calls.length = 0;
      vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(((kind: string) => (kind.startsWith("webgl") ? ({} as WebGL2RenderingContext) : null)) as typeof HTMLCanvasElement.prototype.getContext);
      vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 1);
    });

    it("plays the Blink scene from one big button, then stops it", async () => {
      render(<HeroBoard />);
      const button = await screen.findByRole("button", { name: "Play the Blink test" });
      await waitFor(() => expect(button).toBeEnabled());
      expect(button).toHaveAttribute("aria-pressed", "false");
      expect(button).toHaveClass("bg-[#077a7d]");

      fireEvent.click(button);
      expect(calls).toEqual(["play"]);
      expect(button).toHaveAccessibleName("Stop the Blink test");
      expect(button).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByTestId("hero-board")).toHaveAttribute("data-phase", "plugging");

      act(() => lastPhase?.("blinking"));
      expect(screen.getByText(/the LED on pin 13 turns on and off every half second/)).toBeInTheDocument();
      expect(screen.getByRole("img", { name: /Blink is running/ })).toBeInTheDocument();

      fireEvent.click(button);
      expect(calls).toEqual(["play", "stop"]);
      act(() => lastPhase?.("still"));
      expect(button).toHaveAccessibleName("Play the Blink test");
    });

    it("tells the scene when the visitor prefers reduced motion", async () => {
      vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("reduce"), media: query, addEventListener() {}, removeEventListener() {} }));
      render(<HeroBoard />);
      const button = await screen.findByRole("button", { name: "Play the Blink test" });
      await waitFor(() => expect(button).toBeEnabled());
      fireEvent.click(button);
      expect(calls).toEqual(["play reduced"]);
    });
  });
});

describe("The Blink scene's timeline", () => {
  it("plugs in the USB lead, then the resistor, then the LED, uploads, and blinks", () => {
    expect(TIMING.usb[1]).toBeLessThan(TIMING.resistor[0]);
    expect(TIMING.resistor[1]).toBeLessThan(TIMING.led[0]);
    expect(TIMING.led[1]).toBeLessThan(TIMING.upload[0]);
    expect(TIMING.blink).toBe(TIMING.upload[1]);
  });
});
