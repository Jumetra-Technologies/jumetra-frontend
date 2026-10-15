# Firmware page (v1.16.0)

The Firmware page (`/firmware`, `components/firmware/`) is a small Arduino IDE in the browser: write the program a board runs, compile it, and run it.

## What a person sees

| Area | What it does |
|---|---|
| **Header** | Save, Compile, Upload, and four steps: Start a project → Write and save → Compile → Run it. A step that only happened as a simulation is amber, with an i icon and a tooltip saying so. |
| **Start a project** | Name, board (by its real name, e.g. "Arduino Uno"), and starter code, with one line on what the starter does. |
| **Your projects / Files** | Projects saved to the person's account on the Kiungo server (sign-in needed), and the files of the open one. |
| **Editor** | Monaco, C++ for sketches and Python for Raspberry Pi. With nothing open, a short explanation of what firmware is and the four steps. |
| **Compiler messages** | The build log, with a Compiled / Simulated / Failed badge. |
| **Serial monitor** | **My board (USB)**: a board on this computer, read by the browser over Web Serial (Chrome and Edge on desktop). **Kiungo server**: the server's serial log. |
| **Memory** | Program storage (flash) and working memory (RAM) used, in KB and %. Marked as estimates after a simulated build. |
| **Compilers** | Which compilers the server has. A missing one means builds for those boards are simulated. |
| **Run it** | **In the Engineering Lab**: opens a lab session with the board and the parts the starter drives, wired up. **On a board**: Upload to a board attached to the server, with an optional server port. Then **Pin activity**. |

## Where things actually run

- **Compile runs on the Kiungo server** (`POST /firmware/build/jobs`) with Arduino CLI or PlatformIO. If the server has no compiler for the board, it does a **dry run**: it checks the project's files and returns `dry_run: true` without compiling. The page shows that as **Simulated**, with a note that the code wasn't compiled and that the memory figures are estimates.
- **Upload runs on the Kiungo server** (`POST /firmware/upload`) and flashes a board plugged into *the server*. With no flasher or port it also returns `dry_run: true`. The page then says "Simulated: no board was flashed", never "Verified · board reset". A blank port is sent as no port (the server picks), not a made-up `COM3`.
- **The Serial monitor's My board (USB) is real and local.** `lib/firmware/web-serial.ts` asks the browser for a port, opens it at the chosen speed (9600 by default, matching `Serial.begin(9600)`), and prints each line. Nothing goes through the server. Common USB chips are named (Arduino, CH340, CP210x, FTDI, Espressif, Pico, Teensy, micro:bit). A busy port gets a hint to close the Arduino IDE's monitor.
- **Try it in the lab runs the lab's own version of the starter**, not the code in the editor (`lib/firmware/lab-handoff.ts`, mapping in `lib/firmware/boards.ts`). The lab's simulation follows fixed rules (`lib/lab/sketch.ts`). The page says so.

## What it would take to go further

Both of these need real compilers on the server (Arduino CLI with the `arduino:avr` and `esp32:esp32` cores in the backend image). Today the hosted server simulates.

1. **Flash the board on the person's own computer.** The backend returns the compiled file: `GET /firmware/builds/{build_id}/binary` → `.hex` (AVR) or `.bin` (ESP32), owner-only. The frontend then flashes over Web Serial: STK500v1 for the Uno and Mega bootloader, and `esptool-js` for ESP32 and ESP8266. The Serial monitor's USB connection already exists to build on.
2. **Run the person's own code in the Engineering Lab.** For the Uno, run the compiled `.hex` in the browser with `avr8js` (an ATmega328P emulator). Then map its pin writes onto the lab's LEDs, buzzers and relays, and its analog reads onto the lab's sensor inputs. This replaces the fixed sketch rules for boards that have a compiled program.
