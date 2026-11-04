import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { players } from "./stubs/lottie-player";

const scene = { v: "5.7.0", fr: 60, ip: 0, op: 345, w: 520, h: 420, layers: [] };
function reducedMotion(on: boolean) {
  window.matchMedia = ((q: string) => ({ matches: on && q.includes("reduce"), media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
}

describe("Kiungo's robot typing", () => {
  beforeEach(() => {
    players.length = 0;
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(scene), { status: 200 })));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("loops the animation, decorative, each robot with its own copy of the data, from one fetch", async () => {
    reducedMotion(false);
    const { RobotTyping } = await import("@/components/ui/robot-typing");
    const { container } = render(
      <>
        <RobotTyping />
        <RobotTyping />
      </>,
    );
    await waitFor(() => expect(players).toHaveLength(2));
    expect(players[0].options).toMatchObject({ renderer: "svg", loop: true, autoplay: true, animationData: scene });
    expect(players[0].options.animationData).not.toBe(players[1].options.animationData);
    expect(container.querySelectorAll('[data-testid="robot-typing"][aria-hidden="true"]')).toHaveLength(2);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith("/animations/robot-typing.json");
  });

  it("holds still on the robot's face for people who ask for less motion", async () => {
    reducedMotion(true);
    const { RobotTyping } = await import("@/components/ui/robot-typing");
    render(<RobotTyping />);
    await waitFor(() => expect(players).toHaveLength(1));
    expect(players[0].options).toMatchObject({ loop: false, autoplay: false });
    players[0].loaded?.();
    expect(players[0].calls.goToAndStop).toEqual([[240, true]]);
  });

  it("stops the player when it goes", async () => {
    reducedMotion(false);
    const { RobotTyping } = await import("@/components/ui/robot-typing");
    const { unmount } = render(<RobotTyping />);
    await waitFor(() => expect(players).toHaveLength(1));
    unmount();
    expect(players[0].calls.destroyed).toBe(true);
  });
});

describe("where the robot shows", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(scene), { status: 200 }))));
  afterEach(() => vi.unstubAllGlobals());

  it("types in the compiler's messages while a build runs, and goes when it's done", async () => {
    const { BuildOutput } = await import("@/components/firmware/BuildOutput");
    const { rerender, queryByTestId, getByRole } = render(<BuildOutput logs={["Build running…"]} busy />);
    expect(getByRole("status")).toHaveTextContent("Compiling your code…");
    expect(queryByTestId("robot-typing")).toBeInTheDocument();
    rerender(<BuildOutput logs={["done"]} success />);
    expect(queryByTestId("build-busy")).not.toBeInTheDocument();
  });

  it("tells you when a page breaks", async () => {
    const { ErrorScreen } = await import("@/components/ui/error-screen");
    const { getByTestId, getByRole } = render(<ErrorScreen error={new Error("boom")} retry={() => undefined} />);
    expect(getByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();
    expect(getByTestId("error-screen")).toContainElement(getByTestId("robot-typing"));
  });
});
