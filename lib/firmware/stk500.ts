/**
 * Flash an Arduino Uno (or Nano) from the browser, over Web Serial.
 *
 * The Uno's ATmega328P runs a small bootloader (Optiboot) for about a second
 * after a reset. It speaks STK500 version 1 at 115200 baud: sync, enter
 * programming mode, then for each 128-byte page load the address and write
 * the page. Kiungo reads every page back to verify it, then leaves
 * programming mode so the board starts the new program. This is what
 * `avrdude -c arduino` does.
 *
 * `flashStk500` talks to any `ByteLink`, so tests drive it with a fake
 * bootloader; `openSerialLink` makes one from a Web Serial port.
 */

const STK = {
  OK: 0x10,
  INSYNC: 0x14,
  EOP: 0x20,
  GET_SYNC: 0x30,
  ENTER_PROGMODE: 0x50,
  LEAVE_PROGMODE: 0x51,
  LOAD_ADDRESS: 0x55,
  PROG_PAGE: 0x64,
  READ_PAGE: 0x74,
  READ_SIGN: 0x75,
} as const;

/** The chips Kiungo can flash this way. */
export const ATMEGA328P = {
  name: "ATmega328P",
  signature: [0x1e, 0x95, 0x0f],
  pageSize: 128,
  /** 32 KB, less the 512 bytes Optiboot keeps at the top. */
  maxBytes: 32 * 1024 - 512,
  baudRate: 115200,
} as const;

export class FlashError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FlashError";
  }
}

/** Bytes in and out of the board, plus the reset line. */
export interface ByteLink {
  write(bytes: Uint8Array): Promise<void>;
  /** Exactly `count` bytes, or a FlashError after `timeoutMs`. */
  read(count: number, timeoutMs: number): Promise<Uint8Array>;
  /** Drop anything already received (the running program's serial output). */
  drain(): void;
  /** Pulse DTR/RTS so the board resets into its bootloader. */
  reset(): Promise<void>;
}

export type FlashStage = "connecting" | "writing" | "verifying" | "done";
export interface FlashProgress {
  stage: FlashStage;
  /** 0–100 over the whole flash. */
  percent: number;
}

const REPLY_MS = 400;

async function command(link: ByteLink, bytes: number[], replyBytes = 0, timeoutMs = REPLY_MS): Promise<Uint8Array> {
  await link.write(Uint8Array.from([...bytes, STK.EOP]));
  const reply = await link.read(replyBytes + 2, timeoutMs);
  if (reply[0] !== STK.INSYNC || reply[reply.length - 1] !== STK.OK) throw new FlashError("The board's bootloader stopped answering in the middle of the upload. Unplug it, plug it back in and try again.");
  return reply.slice(1, 1 + replyBytes);
}

async function sync(link: ByteLink): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    await link.reset();
    link.drain();
    for (let tries = 0; tries < 6; tries++) {
      try {
        await link.write(Uint8Array.from([STK.GET_SYNC, STK.EOP]));
        const reply = await link.read(2, 200);
        if (reply[0] === STK.INSYNC && reply[1] === STK.OK) {
          link.drain();
          return;
        }
      } catch {
        // No answer yet: the bootloader may still be starting.
      }
      link.drain();
    }
  }
  throw new FlashError("The board didn't answer. Check that it's an Uno or Nano, that you picked its port, and that nothing else (the Arduino IDE's Serial Monitor) has the port open.");
}

/** Write `image` to the board's flash, check every page and start it. */
export async function flashStk500(link: ByteLink, image: Uint8Array, onProgress?: (p: FlashProgress) => void, chip = ATMEGA328P): Promise<void> {
  if (image.length > chip.maxBytes) throw new FlashError(`The program is ${image.length.toLocaleString()} bytes, more than the ${chip.maxBytes.toLocaleString()} the ${chip.name} has room for.`);
  onProgress?.({ stage: "connecting", percent: 0 });
  await sync(link);
  const sig = await command(link, [STK.READ_SIGN], 3);
  if (sig.some((b, i) => b !== chip.signature[i])) throw new FlashError(`This board's chip isn't an ${chip.name}, so it isn't an Uno or Nano. Kiungo can only flash those from the browser for now.`);
  await command(link, [STK.ENTER_PROGMODE]);

  const pages = Math.ceil(image.length / chip.pageSize);
  const pageAt = (i: number) => {
    const page = new Uint8Array(chip.pageSize).fill(0xff);
    page.set(image.subarray(i * chip.pageSize, (i + 1) * chip.pageSize));
    return page;
  };
  const load = (i: number) => {
    const word = (i * chip.pageSize) >> 1;
    return command(link, [STK.LOAD_ADDRESS, word & 0xff, word >> 8]);
  };
  const size = [chip.pageSize >> 8, chip.pageSize & 0xff];

  for (let i = 0; i < pages; i++) {
    await load(i);
    // Writing a page takes the chip about 4.5 ms; allow for a slow USB bridge.
    await command(link, [STK.PROG_PAGE, ...size, 0x46, ...pageAt(i)], 0, 1000);
    onProgress?.({ stage: "writing", percent: Math.round(((i + 1) / pages) * 70) });
  }
  for (let i = 0; i < pages; i++) {
    await load(i);
    const back = await command(link, [STK.READ_PAGE, ...size, 0x46], chip.pageSize, 1000);
    const want = pageAt(i);
    if (back.some((b, k) => b !== want[k])) throw new FlashError(`Page ${i + 1} of ${pages} read back different from what was written. Try again; if it keeps happening, the board's flash may be worn.`);
    onProgress?.({ stage: "verifying", percent: 70 + Math.round(((i + 1) / pages) * 30) });
  }
  await command(link, [STK.LEAVE_PROGMODE]);
  onProgress?.({ stage: "done", percent: 100 });
}

/** The slice of a Web Serial port flashing needs. */
export interface FlashPort {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  setSignals?(signals: { dataTerminalReady?: boolean; requestToSend?: boolean }): Promise<void>;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Open `port` and wrap it as a ByteLink. Call `close()` when done. */
export async function openSerialLink(port: FlashPort, baudRate: number = ATMEGA328P.baudRate): Promise<ByteLink & { close(): Promise<void> }> {
  await port.open({ baudRate });
  const reader = port.readable!.getReader();
  const writer = port.writable!.getWriter();
  let buffer: number[] = [];
  const wake: { fn: (() => void) | null } = { fn: null };
  let stopped = false;
  const pump = (async () => {
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) buffer.push(...value);
        wake.fn?.();
      }
    } catch {
      // Unplugged or cancelled.
    } finally {
      stopped = true;
      wake.fn?.();
    }
  })();

  return {
    async write(bytes) {
      await writer.write(bytes);
    },
    async read(count, timeoutMs) {
      const deadline = Date.now() + timeoutMs;
      while (buffer.length < count) {
        if (stopped) throw new FlashError("The board was unplugged.");
        const left = deadline - Date.now();
        if (left <= 0) throw new FlashError("The board didn't answer in time.");
        await Promise.race([new Promise<void>((resolve) => (wake.fn = resolve)), wait(left)]);
        wake.fn = null;
      }
      const out = Uint8Array.from(buffer.slice(0, count));
      buffer = buffer.slice(count);
      return out;
    },
    drain() {
      buffer = [];
    },
    async reset() {
      // Pulling DTR low makes the USB bridge pulse the chip's reset pin, as the Arduino IDE does.
      await port.setSignals?.({ dataTerminalReady: false, requestToSend: false });
      await wait(120);
      await port.setSignals?.({ dataTerminalReady: true, requestToSend: true });
      await wait(60);
    },
    async close() {
      await reader.cancel().catch(() => undefined);
      await pump;
      reader.releaseLock();
      writer.releaseLock();
      await port.close().catch(() => undefined);
    },
  };
}
