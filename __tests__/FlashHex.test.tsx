import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FlashHexFile } from "@/components/firmware/FlashHexFile";
import { HexError, parseIntelHex } from "@kiungo/core/firmware/intel-hex";
import { ATMEGA328P, FlashError, flashStk500, openSerialLink, type ByteLink, type FlashProgress } from "@/lib/firmware/stk500";

/** One Intel HEX data record. */
function record(address: number, bytes: number[], type = 0): string {
  const all = [bytes.length, address >> 8, address & 0xff, type, ...bytes];
  const sum = (0x100 - (all.reduce((a, b) => a + b, 0) & 0xff)) & 0xff;
  return `:${[...all, sum].map((b) => b.toString(16).padStart(2, "0").toUpperCase()).join("")}`;
}
const EOF_RECORD = ":00000001FF";

describe("Intel HEX", () => {
  it("reads data records into an image, filling gaps with erased flash", () => {
    const text = [record(0, [1, 2, 3, 4]), record(8, [9, 9]), EOF_RECORD].join("\n");
    expect(Array.from(parseIntelHex(text, 1024))).toEqual([1, 2, 3, 4, 0xff, 0xff, 0xff, 0xff, 9, 9]);
  });

  it("parses what the Arduino IDE writes, with CRLF line ends", () => {
    const text = ":100000000C945C000C946E000C946E000C946E00CA\r\n:00000001FF\r\n";
    const image = parseIntelHex(text, 1024);
    expect(image).toHaveLength(16);
    expect(image[0]).toBe(0x0c);
  });

  it("follows extended segment addresses", () => {
    const text = [record(0, [0x00, 0x10], 0x02), record(0, [7]), EOF_RECORD].join("\n");
    expect(parseIntelHex(text, 1024)[256]).toBe(7);
  });

  it("refuses damaged, incomplete, empty, oversized and non-HEX files in plain words", () => {
    expect(() => parseIntelHex("void setup() {}", 1024)).toThrow(/isn't an Intel HEX file/);
    expect(() => parseIntelHex(`${record(0, [1, 2]).slice(0, -2)}00\n${EOF_RECORD}`, 1024)).toThrow(/bad checksum/);
    expect(() => parseIntelHex(record(0, [1]), 1024)).toThrow(/incomplete/);
    expect(() => parseIntelHex(EOF_RECORD, 1024)).toThrow(/no program/);
    expect(() => parseIntelHex([record(0, new Array(16).fill(1)), EOF_RECORD].join("\n"), 8)).toThrow(HexError);
  });
});

/** Optiboot on an ATmega328P, byte for byte: answers whatever the flasher writes. */
function fakeOptiboot(opts: { signature?: number[]; silentResets?: number; corruptPage?: number } = {}) {
  const flash = new Uint8Array(ATMEGA328P.maxBytes).fill(0xff);
  const out: number[] = [];
  let input: number[] = [];
  let address = 0;
  let resets = 0;
  let listening = false;
  let left = false;
  const reply = (...bytes: number[]) => out.push(0x14, ...bytes, 0x10);
  const step = () => {
    for (;;) {
      if (!input.length) return;
      const cmd = input[0];
      const need = cmd === 0x55 ? 4 : cmd === 0x64 ? 5 + ((input[1] << 8) | input[2]) : cmd === 0x74 ? 5 : 2;
      if (input.length < need) return;
      const msg = input.slice(0, need);
      input = input.slice(need);
      if (msg[msg.length - 1] !== 0x20) continue;
      if (cmd === 0x30 || cmd === 0x50) reply();
      else if (cmd === 0x51) {
        left = true;
        reply();
      } else if (cmd === 0x75) reply(...(opts.signature ?? [0x1e, 0x95, 0x0f]));
      else if (cmd === 0x55) {
        address = ((msg[2] << 8) | msg[1]) * 2;
        reply();
      } else if (cmd === 0x64) {
        const data = msg.slice(4, -1);
        if (opts.corruptPage === address / 128) data[0] ^= 0xff;
        flash.set(data, address);
        reply();
      } else if (cmd === 0x74) {
        const n = (msg[1] << 8) | msg[2];
        reply(...flash.slice(address, address + n));
      }
    }
  };
  const link: ByteLink = {
    async write(bytes) {
      if (!listening) return;
      input.push(...bytes);
      step();
    },
    async read(count) {
      if (out.length < count) throw new FlashError("The board didn't answer in time.");
      return Uint8Array.from(out.splice(0, count));
    },
    drain() {
      out.length = 0;
    },
    async reset() {
      resets++;
      listening = resets > (opts.silentResets ?? 0);
      input = [];
    },
  };
  return { link, flash, left: () => left, resets: () => resets };
}

describe("Flashing an Uno over STK500", () => {
  const program = Uint8Array.from({ length: 300 }, (_, i) => (i * 7) & 0xff);

  it("writes every page, verifies it, starts the program and reports progress", async () => {
    const board = fakeOptiboot();
    const progress: FlashProgress[] = [];
    await flashStk500(board.link, program, (p) => progress.push(p));
    expect(Array.from(board.flash.slice(0, 300))).toEqual(Array.from(program));
    expect(board.flash[300]).toBe(0xff);
    expect(board.left()).toBe(true);
    expect(progress[0]).toEqual({ stage: "connecting", percent: 0 });
    expect(progress.at(-1)).toEqual({ stage: "done", percent: 100 });
    expect(progress.map((p) => p.percent)).toEqual([...progress.map((p) => p.percent)].sort((a, b) => a - b));
  });

  it("retries the reset when the bootloader doesn't answer at first", async () => {
    const board = fakeOptiboot({ silentResets: 1 });
    await flashStk500(board.link, program);
    expect(board.resets()).toBe(2);
  });

  it("says when no bootloader answers", async () => {
    await expect(flashStk500(fakeOptiboot({ silentResets: 99 }).link, program)).rejects.toThrow(/didn't answer.*Uno or Nano/);
  });

  it("refuses a chip that isn't an ATmega328P", async () => {
    await expect(flashStk500(fakeOptiboot({ signature: [0x1e, 0x98, 0x01] }).link, program)).rejects.toThrow(/isn't an ATmega328P/);
  });

  it("fails when a page reads back wrong", async () => {
    await expect(flashStk500(fakeOptiboot({ corruptPage: 1 }).link, program)).rejects.toThrow(/Page 2 of 3 read back different/);
  });

  it("refuses a program bigger than the chip before touching the board", async () => {
    const board = fakeOptiboot();
    await expect(flashStk500(board.link, new Uint8Array(ATMEGA328P.maxBytes + 1))).rejects.toThrow(/more than the 32,256/);
    expect(board.resets()).toBe(0);
  });
});

describe("Web Serial link", () => {
  it("buffers what the board sends, reads exact counts, times out and resets with DTR", async () => {
    let push!: (b: number[]) => void;
    const readable = new ReadableStream<Uint8Array>({ start: (c) => void (push = (b) => c.enqueue(Uint8Array.from(b))) });
    const written: number[] = [];
    const writable = new WritableStream<Uint8Array>({ write: (chunk) => void written.push(...chunk) });
    const signals: Array<Record<string, boolean>> = [];
    let opened = 0;
    const port = { open: async (o: { baudRate: number }) => void (opened = o.baudRate), close: async () => undefined, readable, writable, setSignals: async (s: Record<string, boolean>) => void signals.push(s) };
    const link = await openSerialLink(port);
    expect(opened).toBe(115200);
    await link.write(Uint8Array.from([0x30, 0x20]));
    expect(written).toEqual([0x30, 0x20]);
    push([0x14]);
    setTimeout(() => push([0x10, 0x99]), 10);
    expect(Array.from(await link.read(2, 500))).toEqual([0x14, 0x10]);
    expect(Array.from(await link.read(1, 500))).toEqual([0x99]);
    await expect(link.read(1, 30)).rejects.toThrow(/in time/);
    push([1, 2]);
    await new Promise((r) => setTimeout(r, 5));
    link.drain();
    await expect(link.read(1, 20)).rejects.toThrow(FlashError);
    await link.reset();
    expect(signals).toEqual([{ dataTerminalReady: false, requestToSend: false }, { dataTerminalReady: true, requestToSend: true }]);
    await link.close();
  });
});

describe("Flash panel on the Firmware page", () => {
  afterEach(() => {
    cleanup();
    delete (navigator as unknown as { serial?: unknown }).serial;
  });

  it("offers a .hex file when the browser can reach USB boards", () => {
    (navigator as unknown as { serial: unknown }).serial = { requestPort: async () => ({}) };
    render(<FlashHexFile />);
    expect(screen.getByRole("button", { name: /Choose a \.hex file and flash/ })).toBeInTheDocument();
    expect(screen.getByLabelText("Compiled .hex file")).toHaveAttribute("accept", ".hex,text/plain");
  });

  it("says which browsers work when this one can't", () => {
    render(<FlashHexFile />);
    expect(screen.getByTestId("flash-unsupported")).toHaveTextContent(/Chrome or Edge/);
    expect(screen.queryByRole("button", { name: /flash/i })).toBeNull();
  });
});
