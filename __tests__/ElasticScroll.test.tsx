import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent } from "@testing-library/react";
import { MANAGED_CLASS, startElasticScrollbars } from "@/lib/ui/elastic-scrollbars";
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

describe("app-wide elastic scrollbars", () => {
  let stop: (() => void) | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 1;
    });
  });
  afterEach(() => {
    stop?.();
    stop = undefined;
    document.body.innerHTML = "";
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  /** A scroll container with fixed layout numbers, since jsdom has no layout. */
  function scroller(style: string, dims: { ch?: number; sh?: number; cw?: number; sw?: number } = {}, tag = "div") {
    const el = document.createElement(tag);
    el.setAttribute("style", style);
    const set = (prop: string, value: number) => Object.defineProperty(el, prop, { configurable: true, get: () => value });
    set("clientHeight", dims.ch ?? 500);
    set("scrollHeight", dims.sh ?? 1000);
    set("clientWidth", dims.cw ?? 300);
    set("scrollWidth", dims.sw ?? 300);
    el.getBoundingClientRect = () => new DOMRect(0, 0, dims.cw ?? 300, dims.ch ?? 500);
    const child = document.createElement("p");
    child.textContent = "content";
    el.append(child);
    document.body.append(el);
    return { el, child };
  }

  function start() {
    stop = startElasticScrollbars();
    vi.advanceTimersByTime(100);
  }

  const track = (axis: "x" | "y", index = 0) =>
    document.querySelectorAll<HTMLElement>(`.hhip-elastic-track[data-axis="${axis}"]`)[index];
  const thumb = (axis: "x" | "y", index = 0) => track(axis, index).querySelector<HTMLElement>(".hhip-elastic-thumb")!;
  const stretchOf = (el: HTMLElement) => Number(el.dataset.stretch);

  it("finds scroll containers and textareas on its own and hides their native bar", () => {
    const { el } = scroller("overflow-y: auto");
    const { el: area } = scroller("", {}, "textarea");
    start();
    expect(el).toHaveClass(MANAGED_CLASS);
    expect(area).toHaveClass(MANAGED_CLASS);
    expect(track("y")).toHaveAttribute("data-scrollable", "true");
    expect(document.documentElement).toHaveClass("hhip-elastic-ready");
  });

  it("leaves non-scrolling and opted-out elements alone", () => {
    const { el } = scroller("overflow: hidden");
    const wrapper = document.createElement("div");
    wrapper.setAttribute("data-native-scrollbar", "");
    document.body.append(wrapper);
    const { el: native } = scroller("overflow-y: auto");
    wrapper.append(native);
    start();
    expect(el).not.toHaveClass(MANAGED_CLASS);
    expect(native).not.toHaveClass(MANAGED_CLASS);
  });

  it("picks up scroll areas added later, such as a modal opening", async () => {
    start();
    expect(document.querySelectorAll(".hhip-elastic-track")).toHaveLength(0);
    const { el } = scroller("overflow-y: auto");
    await vi.advanceTimersByTimeAsync(100);
    expect(el).toHaveClass(MANAGED_CLASS);
  });

  it("squashes against the top past the start, then springs back", () => {
    const { child } = scroller("overflow-y: auto");
    start();
    for (let i = 0; i < 4; i++) fireEvent.wheel(child, { deltaY: -100 });
    expect(stretchOf(thumb("y"))).toBeGreaterThan(0.5);
    expect(thumb("y").style.transformOrigin).toBe("50% 0%");
    vi.advanceTimersByTime(200);
    expect(stretchOf(thumb("y"))).toBe(0);
    expect(thumb("y")).toHaveAttribute("data-releasing");
  });

  it("squashes against the bottom past the end", () => {
    const { el, child } = scroller("overflow-y: auto");
    start();
    el.scrollTop = 500;
    fireEvent.wheel(child, { deltaY: 120 });
    expect(stretchOf(thumb("y"))).toBeGreaterThan(0);
    expect(thumb("y").style.transformOrigin).toBe("50% 100%");
  });

  it("does not stretch during ordinary scrolling", () => {
    const { el, child } = scroller("overflow-y: auto");
    start();
    el.scrollTop = 200;
    fireEvent.wheel(child, { deltaY: 100 });
    expect(stretchOf(thumb("y"))).toBe(0);
  });

  it("works sideways too", () => {
    const { child } = scroller("overflow-x: auto", { ch: 200, sh: 200, cw: 300, sw: 900 });
    start();
    expect(track("x")).toHaveAttribute("data-scrollable", "true");
    fireEvent.wheel(child, { deltaX: -150 });
    expect(stretchOf(thumb("x"))).toBeGreaterThan(0);
    expect(thumb("x").style.transformOrigin).toBe("0% 50%");
  });

  it("stretches only the innermost scroll area under the pointer", () => {
    const { el: outer } = scroller("overflow-y: auto");
    const { el: inner, child } = scroller("overflow-y: auto");
    outer.append(inner);
    start();
    fireEvent.wheel(child, { deltaY: -200 });
    const innerThumb = [...document.querySelectorAll<HTMLElement>(".hhip-elastic-thumb")].find(
      (t) => Number(t.dataset.stretch) > 0,
    );
    expect(innerThumb).toBeDefined();
    expect(document.querySelectorAll('.hhip-elastic-thumb[data-stretch]:not([data-stretch="0.000"])')).toHaveLength(1);
  });

  it("stretches with touch and releases when the finger lifts", () => {
    const { child } = scroller("overflow-y: auto");
    start();
    fireEvent.touchStart(child, { touches: [{ clientX: 10, clientY: 100 }] });
    fireEvent.touchMove(child, { touches: [{ clientX: 10, clientY: 260 }] });
    expect(stretchOf(thumb("y"))).toBeGreaterThan(0.4);
    fireEvent.touchEnd(child);
    expect(stretchOf(thumb("y"))).toBe(0);
  });

  it("gives an elastic bump when an arrow is pressed at the end", () => {
    scroller("overflow-y: auto");
    start();
    const up = track("y").querySelector<HTMLElement>('[data-direction="up"]')!;
    fireEvent.pointerDown(up, { button: 0 });
    expect(stretchOf(thumb("y"))).toBeGreaterThan(0);
    vi.advanceTimersByTime(200);
    expect(stretchOf(thumb("y"))).toBe(0);
  });

  it("removes a bar when its scroll area leaves the page", async () => {
    const { el } = scroller("overflow-y: auto");
    start();
    expect(document.querySelectorAll(".hhip-elastic-track")).toHaveLength(2);
    el.remove();
    await vi.advanceTimersByTimeAsync(100);
    expect(document.querySelectorAll(".hhip-elastic-track")).toHaveLength(0);
  });

  it("stays still for people who prefer reduced motion", () => {
    window.matchMedia = ((query: string) => ({ matches: query.includes("reduce"), media: query })) as typeof window.matchMedia;
    try {
      const { child } = scroller("overflow-y: auto");
      start();
      for (let i = 0; i < 4; i++) fireEvent.wheel(child, { deltaY: -100 });
      expect(stretchOf(thumb("y"))).toBe(0);
    } finally {
      delete (window as { matchMedia?: unknown }).matchMedia;
    }
  });

  it("cleans everything up when stopped", () => {
    const { el } = scroller("overflow-y: auto");
    start();
    stop?.();
    stop = undefined;
    expect(el).not.toHaveClass(MANAGED_CLASS);
    expect(document.querySelectorAll(".hhip-elastic-track")).toHaveLength(0);
    expect(document.documentElement).not.toHaveClass("hhip-elastic-ready");
  });
});

describe("the standard is wired in", () => {
  it("mounts the elastic scrollbars once, in the root layout", async () => {
    const { readFileSync } = await import("node:fs");
    const layout = readFileSync("app/layout.tsx", "utf8");
    expect(layout).toMatch(/<ElasticScrollbars \/>/);
  });
});
