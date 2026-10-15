"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HexError, parseIntelHex } from "@/lib/firmware/intel-hex";
import { ATMEGA328P, FlashError, flashStk500, openSerialLink, type FlashStage } from "@/lib/firmware/stk500";
import { requestSerialPort, webSerialSupported } from "@/lib/firmware/web-serial";
import { UploadProgress, type UploadOutcome } from "./UploadProgress";

const STAGE: Record<FlashStage, string> = {
  connecting: "Resetting the board and waiting for its bootloader…",
  writing: "Writing the program…",
  verifying: "Reading it back to check every byte…",
  done: "Done",
};

const noop = () => () => undefined;

/**
 * Flash a compiled .hex onto an Uno or Nano plugged into this computer,
 * straight from the browser. Kiungo online can't send its compiled file
 * yet, so the person exports one from the Arduino IDE (see docs/firmware.md).
 */
export function FlashHexFile() {
  const supported = useSyncExternalStore(noop, webSerialSupported, () => false);
  const input = useRef<HTMLInputElement>(null);
  const [outcome, setOutcome] = useState<UploadOutcome>("idle");
  const [percent, setPercent] = useState(0);
  const [message, setMessage] = useState("");

  async function flash(file: File) {
    setOutcome("running");
    setPercent(0);
    let image: Uint8Array;
    try {
      image = parseIntelHex(await file.text(), ATMEGA328P.maxBytes);
    } catch (err) {
      setOutcome("failed");
      setMessage(err instanceof HexError ? err.message : "Kiungo couldn't read that file.");
      return;
    }
    setMessage("Pick your board's port in the browser's list.");
    let port;
    try {
      port = await requestSerialPort();
    } catch {
      setOutcome("idle");
      setMessage("No port picked, so nothing was flashed.");
      return;
    }
    let link: Awaited<ReturnType<typeof openSerialLink>> | null = null;
    try {
      link = await openSerialLink(port);
      await flashStk500(link, image, (p) => {
        setPercent(p.percent);
        setMessage(STAGE[p.stage]);
      });
      setOutcome("flashed");
      setMessage(`${file.name} (${image.length.toLocaleString()} bytes) is on the board, checked byte for byte, and running.`);
    } catch (err) {
      setOutcome("failed");
      setMessage(err instanceof FlashError ? err.message : "The port couldn't be opened. Close any other program using it (the Arduino IDE's Serial Monitor, or this page's Serial monitor) and try again.");
    } finally {
      await link?.close();
    }
  }

  return (
    <section className="space-y-2 rounded-[10px] border border-border p-2.5" data-testid="flash-hex">
      <p className="flex items-center gap-1.5 text-[12.5px] font-semibold">
        <FileUp className="size-3.5 text-primary" aria-hidden /> On my board (USB)
      </p>
      <p className="text-[11.5px] leading-4 text-muted">
        Flash an Arduino Uno, or a Nano with the new bootloader, plugged into this computer with a compiled <span className="font-mono">.hex</span> file. In the Arduino IDE use Sketch &gt; Export Compiled Binary, then pick the <span className="font-mono">.hex</span> without &ldquo;bootloader&rdquo; in its name.
      </p>
      {supported ? (
        <>
          <input
            ref={input}
            type="file"
            accept=".hex,text/plain"
            className="sr-only"
            aria-label="Compiled .hex file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void flash(file);
            }}
          />
          <Button size="sm" variant="secondary" className="h-7 w-full gap-1 text-[12px]" disabled={outcome === "running"} onClick={() => input.current?.click()}>
            <FileUp className="size-3.5" aria-hidden /> Choose a .hex file and flash
          </Button>
          {outcome !== "idle" || message ? <UploadProgress percent={percent} message={message} outcome={outcome} /> : null}
        </>
      ) : (
        <p className="rounded-[8px] bg-muted-bg px-2 py-1.5 text-[11.5px] leading-4 text-muted" data-testid="flash-unsupported">
          This browser can&apos;t reach USB boards. Use Chrome or Edge on a computer.
        </p>
      )}
    </section>
  );
}
