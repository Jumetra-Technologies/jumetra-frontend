import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HC_SR04_BEAM, OBSTACLE_WIDTH, echoOff } from "@kiungo/core/lab/obstacle";
import { ObstacleView } from "./ObstacleTest";

function view(distance: number, offset = 0, held = true) {
  const obstacle = { distance, offset, width: OBSTACLE_WIDTH };
  const onMove = vi.fn();
  const result = render(<ObstacleView obstacle={obstacle} echo={echoOff(HC_SR04_BEAM, obstacle)} held={held} onMove={onMove} />);
  const rerender = (d: number, o = 0) => {
    const next = { distance: d, offset: o, width: OBSTACLE_WIDTH };
    result.rerender(<ObstacleView obstacle={next} echo={echoOff(HC_SR04_BEAM, next)} held={held} onMove={onMove} />);
  };
  return { onMove, rerender, obstacle: screen.getByRole("slider", { name: "Obstacle" }) };
}

describe("the obstacle test in the HC-SR04's surroundings (Stage 0)", () => {
  it("shows what the sensor reads, and the reading changes as the obstacle moves", () => {
    const { rerender } = view(0.3);
    expect(screen.getByTestId("obstacle-reading")).toHaveTextContent("Sensor reads 30.0 cm");
    expect(screen.getByTestId("obstacle-echo")).toBeInTheDocument();
    rerender(0.125);
    expect(screen.getByTestId("obstacle-reading")).toHaveTextContent("Sensor reads 12.5 cm");
  });

  it("the arrow keys move the obstacle: a centimeter at a time, ten with Shift", () => {
    const { onMove, obstacle } = view(0.3);
    fireEvent.keyDown(obstacle, { key: "ArrowRight" });
    fireEvent.keyDown(obstacle, { key: "ArrowLeft", shiftKey: true });
    fireEvent.keyDown(obstacle, { key: "ArrowUp" });
    fireEvent.keyDown(obstacle, { key: "ArrowDown", shiftKey: true });
    expect(onMove.mock.calls.map(([v]) => v)).toEqual([
      { distance: 0.31, offset: 0 },
      { distance: 0.2, offset: 0 },
      { distance: 0.3, offset: 0.01 },
      { distance: 0.3, offset: -0.1 },
    ]);
  });

  it("dragging puts the obstacle where the pointer is", () => {
    const { onMove } = view(0.3);
    const svg = screen.getByRole("img");
    // The drawing at its own size: the sensor's face at x 26, 240 px to the meter in the 1 m view, the beam's center at y 64.
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 280, height: 128, right: 280, bottom: 128, x: 0, y: 0, toJSON: () => ({}) });
    fireEvent.pointerDown(svg, { clientX: 26 + 240 * 0.5, clientY: 64, pointerId: 1 });
    fireEvent.pointerMove(svg, { clientX: 26 + 240 * 0.75, clientY: 64 - 240 * 0.05, pointerId: 1 });
    fireEvent.pointerUp(svg, { pointerId: 1 });
    fireEvent.pointerMove(svg, { clientX: 26 + 240 * 0.9, clientY: 64, pointerId: 1 });
    expect(onMove.mock.calls.map(([v]) => v)).toEqual([
      { distance: 0.5, offset: 0 },
      { distance: 0.75, offset: 0.05 },
    ]);
  });

  it("stays within the sensor's range", () => {
    const { onMove, obstacle } = view(0.025);
    fireEvent.keyDown(obstacle, { key: "ArrowLeft", shiftKey: true });
    expect(onMove).toHaveBeenLastCalledWith({ distance: 0.02, offset: 0 });
  });

  it("says why there is no echo: outside the beam, or past 4 m", () => {
    const { rerender } = view(0.3, 0.2);
    expect(screen.getByTestId("obstacle-reading")).toHaveTextContent("No echo: the obstacle is outside the beam.");
    expect(screen.queryByTestId("obstacle-echo")).toBeNull();
    rerender(3.99, 0.5);
    expect(screen.getByTestId("obstacle-reading")).toHaveTextContent("No echo: the obstacle is beyond the sensor's 4 m.");
  });

  it("describes the obstacle's place for a screen reader", () => {
    const { obstacle } = view(0.3, -0.04);
    expect(obstacle).toHaveAttribute("aria-valuetext", "300 mm ahead, 40 mm to the right");
  });

  it("opens on the whole 4 m when the obstacle is past the first meter", () => {
    view(2.5);
    expect(screen.getByRole("radio", { name: /whole 4 m range/ })).toHaveAttribute("aria-checked", "true");
  });

  it("in the simulated sweep, says that dragging takes over", () => {
    view(0.4, 0, false);
    expect(screen.getByTestId("obstacle-test")).toHaveTextContent("Showing the simulated sweep. Drag the obstacle to take over.");
  });
});
