import { Dialog } from "../ui/Dialog";

/**
 * "Move this file to the trash?", in the app's own dialog. A native
 * window.confirm would block the whole window, the Esc emergency stop for a
 * running real board included (DESK-005/009); this one doesn't.
 */
export function ConfirmTrash({ name, onConfirm, onCancel }: { name: string | null; onConfirm: (name: string) => void; onCancel: () => void }) {
  return (
    <Dialog
      open={name !== null}
      onClose={onCancel}
      title={`Move ${name ?? "this file"} to the trash?`}
      testId="confirm-trash"
      footer={
        <>
          <button type="button" onClick={onCancel} className="ml-auto h-9 rounded-[10px] border border-border px-4 text-[13.5px] font-medium text-foreground hover:bg-muted-bg" data-autofocus>
            Keep it
          </button>
          <button type="button" onClick={() => name !== null && onConfirm(name)} className="h-9 rounded-[10px] bg-danger px-4 text-[13.5px] font-medium text-white hover:opacity-90" data-testid="confirm-trash-yes">
            Move to trash
          </button>
        </>
      }
    >
      <p className="text-[13.5px] text-muted">You can get it back from the trash.</p>
    </Dialog>
  );
}
