import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Dialog } from "./dialog";

function Harness({ onClose }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <Dialog
        open={open}
        onClose={() => {
          onClose?.();
          setOpen(false);
        }}
        title="Add a part"
        testId="dlg"
      >
        <input data-autofocus aria-label="Search" />
      </Dialog>
    </>
  );
}

describe("the shared dialog", () => {
  it("opens modal, focuses what it says to, and is labeled by its title", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    const dialog = screen.getByTestId("dlg");
    expect(dialog).toHaveAttribute("open");
    expect(dialog).toHaveAccessibleName("Add a part");
    expect(screen.getByRole("textbox", { name: "Search" })).toHaveFocus();
  });

  it("closes on Escape (the dialog's cancel) and gives focus back to what opened it", () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const opener = screen.getByRole("button", { name: "Open" });
    opener.focus();
    fireEvent.click(opener);
    fireEvent(screen.getByTestId("dlg"), new Event("cancel", { cancelable: true }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("dlg")).not.toHaveAttribute("open");
    expect(opener).toHaveFocus();
  });

  it("closes on a click on the backdrop, and after the X shows its press", async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    fireEvent.click(screen.getByTestId("dlg"));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(2));
  });
});
