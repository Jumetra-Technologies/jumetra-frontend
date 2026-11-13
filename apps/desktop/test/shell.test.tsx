import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthState } from "@kiungo/api";
import { Sidebar } from "../src/renderer/src/shell/Sidebar";

const signedOut: AuthState = { status: "signed-out", message: null, canSkip: true, skipped: true };

beforeEach(() => {
  (window as unknown as { kiungo: { invoke: ReturnType<typeof vi.fn>; on: ReturnType<typeof vi.fn> } }).kiungo = { invoke: vi.fn().mockResolvedValue(undefined), on: vi.fn() };
});

describe("the sidebar", () => {
  it("shows every module: there are no roles to unlock them", () => {
    render(<Sidebar view="dashboard" onView={vi.fn()} auth={signedOut} onSettings={vi.fn()} />);
    for (const id of ["dashboard", "projects", "simulation", "firmware", "components", "research", "learning", "collaboration", "marketplace", "assistant"]) expect(screen.getByTestId(`nav-${id}`)).toBeInTheDocument();
  });

  it("reports which module was picked", () => {
    const onView = vi.fn();
    render(<Sidebar view="dashboard" onView={onView} auth={signedOut} onSettings={vi.fn()} />);
    fireEvent.click(screen.getByTestId("nav-projects"));
    expect(onView).toHaveBeenCalledWith("projects");
  });
});
