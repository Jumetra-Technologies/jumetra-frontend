import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ElasticScrollArea } from "@/components/ui/elastic-scroll-area";
import { ELASTIC, rubberBand, squash, thumbMetrics, wheelDeltaPx } from "@/lib/ui/elastic-scroll";

describe("elastic scroll maths", () => {
  it("resists more the further you pull, never reaching 1", () => {
    expect(rubberBand(0)).toBe(0);
    expect(rubberBand(-20)).toBe(0);
    expect(rubberBand(ELASTIC.resistance)).toBeCloseTo(0.5);
    const a = rubberBand(100);
    const b = rubberBand(200);
    const c = rubberBand(300);
    expect(b).toBeGreaterThan(a);
    expect(b - a).toBeGreaterThan(c - b);
    expect(rubberBand(1e6)).toBeLessThan(1);
  });

  it("squashes the thumb shorter and wider, within limits", () => {
    expect(squash(0)).toEqual({ scaleX: 1, scaleY: 1 });
    const full = squash(1);
    expect(full.scaleY).toBeCloseTo(1 - ELASTIC.maxSquash);
    expect(full.scaleX).toBeCloseTo(1 + ELASTIC.maxBulge);
    expect(squash(5)).toEqual(full);
  });

  it("sizes and places the thumb from the scroll position", () => {
    expect(thumbMetrics(500, 500, 0, 480).scrollable).toBe(false);
    const top = thumbMetrics(500, 1000, 0, 480);
    expect(top).toMatchObject({ scrollable: true, size: 240, offset: 0 });
    const bottom = thumbMetrics(500, 1000, 500, 480);
    expect(bottom.offset).toBe(240);
    expect(bottom.ratio).toBeCloseTo(500 / 240);
    expect(thumbMetrics(100, 100_000, 0, 480).size).toBe(ELASTIC.minThumb);
  });

  it("normalises wheel deltas to pixels", () => {
    expect(wheelDeltaPx({ deltaY: 3, deltaMode: 1 }, 600)).toBe(48);
    expect(wheelDeltaPx({ deltaY: 1, deltaMode: 2 }, 600)).toBe(600);
    expect(wheelDeltaPx({ deltaY: -40, deltaMode: 0 }, 600)).toBe(-40);
  });
});

describe("ElasticScrollArea", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 1;
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function setup() {
    const { container } = render(
      <ElasticScrollArea>
        <div>content</div>
      </ElasticScrollArea>,
    );
    const viewport = container.querySelector(".hhip-scroll-viewport") as HTMLDivElement;
    const rail = container.querySelector(".hhip-elastic-rail") as HTMLDivElement;
    const track = container.querySelector(".hhip-elastic-track") as HTMLDivElement;
    const size = (el: Element, prop: string, value: number) =>
      Object.defineProperty(el, prop, { configurable: true, get: () => value });
    size(viewport, "clientHeight", 500);
    size(viewport, "scrollHeight", 1000);
    size(rail, "clientHeight", 480);
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    return { viewport, track, thumb: screen.getByTestId("elastic-thumb") };
  }

  const stretchOf = (thumb: HTMLElement) => Number(thumb.dataset.stretch);

  it("shows the bar only when the content scrolls", () => {
    const { track, thumb } = setup();
    expect(track).toHaveAttribute("data-scrollable", "true");
    expect(thumb.style.height).toBe("240px");
  });

  it("squashes against the top when scrolling up past the start, then springs back", () => {
    const { viewport, thumb } = setup();
    for (let i = 0; i < 4; i++) fireEvent.wheel(viewport, { deltaY: -100 });
    expect(stretchOf(thumb)).toBeGreaterThan(0.5);
    expect(thumb.style.transformOrigin).toBe("50% 0%");
    expect(thumb.style.transform).toMatch(/scale\(1\.\d+, 0\.\d+\)/);

    act(() => {
      vi.advanceTimersByTime(ELASTIC.releaseDelay + 10);
    });
    expect(stretchOf(thumb)).toBe(0);
    expect(thumb).toHaveAttribute("data-releasing");
    act(() => {
      vi.advanceTimersByTime(ELASTIC.springMs + 100);
    });
    expect(thumb).not.toHaveAttribute("data-releasing");
  });

  it("squashes against the bottom when scrolling down past the end", () => {
    const { viewport, thumb } = setup();
    viewport.scrollTop = 500;
    fireEvent.scroll(viewport);
    fireEvent.wheel(viewport, { deltaY: 150 });
    expect(stretchOf(thumb)).toBeGreaterThan(0);
    expect(thumb.style.transformOrigin).toBe("50% 100%");
  });

  it("does not stretch during ordinary scrolling", () => {
    const { viewport, thumb } = setup();
    viewport.scrollTop = 200;
    fireEvent.scroll(viewport);
    fireEvent.wheel(viewport, { deltaY: 100 });
    fireEvent.wheel(viewport, { deltaY: -100 });
    expect(stretchOf(thumb)).toBe(0);
  });

  it("stretches with touch past the end and releases when the finger lifts", () => {
    const { viewport, thumb } = setup();
    fireEvent.touchStart(viewport, { touches: [{ clientY: 100 }] });
    fireEvent.touchMove(viewport, { touches: [{ clientY: 260 }] });
    expect(stretchOf(thumb)).toBeGreaterThan(0.4);
    fireEvent.touchEnd(viewport);
    expect(stretchOf(thumb)).toBe(0);
    expect(thumb).toHaveAttribute("data-releasing");
  });

  it("gives an elastic bump when an arrow is pressed at the end", () => {
    const { thumb } = setup();
    const up = document.querySelector('.hhip-elastic-arrow[data-direction="up"]') as HTMLElement;
    fireEvent.pointerDown(up, { button: 0 });
    expect(stretchOf(thumb)).toBeGreaterThan(0);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(stretchOf(thumb)).toBe(0);
  });

  it("stays still for people who prefer reduced motion", () => {
    // jsdom has no matchMedia; provide one that reports reduced motion.
    window.matchMedia = ((query: string) => ({ matches: query.includes("reduce"), media: query })) as typeof window.matchMedia;
    try {
      const { viewport, thumb } = setup();
      for (let i = 0; i < 4; i++) fireEvent.wheel(viewport, { deltaY: -100 });
      expect(stretchOf(thumb)).toBe(0);
    } finally {
      delete (window as { matchMedia?: unknown }).matchMedia;
    }
  });
});
