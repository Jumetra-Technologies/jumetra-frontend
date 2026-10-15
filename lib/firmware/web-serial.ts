/**
 * Read a board plugged into this computer, over Web Serial.
 *
 * Chrome, Edge and Opera on desktop can open a USB serial port from a web
 * page once the person picks it in the browser's own dialog. That is how the
 * Firmware page shows a real board's `Serial.println` output without the
 * Kiungo server being involved. Safari and Firefox don't support it.
 */

/** The slice of the Web Serial API this file uses (TypeScript's DOM types don't include it). */
interface SerialPortLike {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  getInfo?: () => { usbVendorId?: number; usbProductId?: number };
}
interface SerialLike {
  requestPort(options?: { filters?: Array<{ usbVendorId?: number }> }): Promise<SerialPortLike>;
}

export const BAUD_RATES = [9600, 19200, 38400, 57600, 115200] as const;

export function webSerialSupported(): boolean {
  return typeof navigator !== "undefined" && "serial" in navigator && !!(navigator as unknown as { serial?: SerialLike }).serial;
}

/** Common USB-serial chips, so the port can be named in words. */
const USB_VENDORS: Record<number, string> = {
  0x2341: "Arduino",
  0x2a03: "Arduino",
  0x1a86: "CH340 USB-serial",
  0x10c4: "CP210x USB-serial (ESP32 boards)",
  0x0403: "FTDI USB-serial",
  0x303a: "Espressif",
  0x2e8a: "Raspberry Pi Pico",
  0x16c0: "Teensy",
  0x0d28: "micro:bit",
};

export interface BoardConnection {
  /** "Arduino", "CH340 USB-serial", or "USB serial device". */
  name: string;
  write(text: string): Promise<void>;
  close(): Promise<void>;
}

/**
 * Ask the person to pick a port, open it and call `onLine` for every line the
 * board prints. `onClose` runs once when the board is unplugged or closed.
 * Throws if the person cancels the picker or the port can't be opened.
 */
export async function connectBoard(baudRate: number, onLine: (line: string) => void, onClose: (reason?: string) => void): Promise<BoardConnection> {
  const serial = (navigator as unknown as { serial: SerialLike }).serial;
  const port = await serial.requestPort();
  await port.open({ baudRate });
  const info = port.getInfo?.() ?? {};
  const name = (info.usbVendorId !== undefined && USB_VENDORS[info.usbVendorId]) || "USB serial device";

  let closed = false;
  const reader = port.readable!.getReader();
  const decoder = new TextDecoder();
  let pending = "";

  void (async () => {
    let reason: string | undefined;
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        pending += decoder.decode(value, { stream: true });
        const parts = pending.split(/\r?\n/);
        pending = parts.pop() ?? "";
        for (const line of parts) onLine(line);
      }
    } catch {
      reason = closed ? undefined : "The board was unplugged or stopped answering.";
    } finally {
      if (pending) onLine(pending);
      reader.releaseLock();
      closed = true;
      await port.close().catch(() => undefined);
      onClose(reason);
    }
  })();

  return {
    name,
    async write(text: string) {
      const writer = port.writable!.getWriter();
      try {
        await writer.write(new TextEncoder().encode(text.endsWith("\n") ? text : `${text}\n`));
      } finally {
        writer.releaseLock();
      }
    },
    async close() {
      if (closed) return;
      closed = true;
      await reader.cancel().catch(() => undefined);
    },
  };
}
