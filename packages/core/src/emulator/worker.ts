/**
 * Web Worker entry for one emulated board. The app creates it with
 * `new Worker(new URL("@kiungo/core/emulator/worker", import.meta.url), { type: "module" })`
 * and talks to it with the messages in ./protocol.
 */
import { BOARDS } from "../boards";
import { AvrBoard, type PinChange } from "./avr";
import { LEVEL_CODES, PIN_SLOTS, type FromWorker, type ToWorker } from "./protocol";
import { Pacer } from "./realtime";

type Scope = {
  postMessage(message: FromWorker): void;
  onmessage: ((event: MessageEvent<ToWorker>) => void) | null;
};
const scope = self as unknown as Scope;

let board: AvrBoard | null = null;
let pacer: Pacer | null = null;
let shared: Uint8Array | null = null;
let pending: PinChange[] = [];
let serial = "";

const post = (message: FromWorker) => scope.postMessage(message);

function flush() {
  if (pending.length) post({ type: "pins", changes: pending });
  pending = [];
  if (serial) post({ type: "serial", text: serial });
  serial = "";
}

scope.onmessage = (event) => {
  const message = event.data;
  try {
    switch (message.type) {
      case "load": {
        pacer?.stop();
        board = new AvrBoard(BOARDS[message.board], message.hex);
        shared = message.pins ? new Uint8Array(message.pins, 0, PIN_SLOTS) : null;
        board.onPinChange((change) => {
          if (shared && change.pin < PIN_SLOTS) shared[change.pin] = LEVEL_CODES[change.level];
          else pending.push(change);
        });
        board.onSerialByte((byte) => (serial += String.fromCharCode(byte)));
        pacer = new Pacer(board, {
          onStatus: ({ simMs, speedPercent }) => {
            flush();
            post({ type: "status", running: true, simMs, speedPercent });
          },
        });
        post({ type: "loaded", programBytes: board.programBytes });
        break;
      }
      case "start":
        pacer?.start();
        break;
      case "stop":
        pacer?.stop();
        flush();
        if (board) post({ type: "status", running: false, simMs: board.timeMs, speedPercent: 0 });
        break;
      case "input":
        board?.setInput(message.pin, message.high);
        break;
    }
  } catch (error) {
    post({ type: "error", message: error instanceof Error ? error.message : String(error) });
  }
};
