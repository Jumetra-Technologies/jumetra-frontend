# Kiungo 2 desktop app

Electron, React and TypeScript. The interface has no Node access. It talks to the main process only through the channels typed in `@kiungo/api`. It runs cross-origin isolated, so the emulator workers can share pin levels through shared memory.

## Run it

From the repository root:

```bash
npm install
npm run fetch:arduino-cli -w @kiungo/desktop   # once: the pinned Arduino CLI for this computer
npm run desktop                                # development, with hot reload
```

In the app, **Install the Uno and Nano core** downloads the compiler once, into Kiungo's own data folder. It never touches an Arduino IDE install.

## Projects

Home lists your projects; **New project** makes one from blank or a starter, and **Open folder** opens any Kiungo project. A project is a folder:

| File | What |
| --- | --- |
| `kiungo.json` | The project: name, board, starter, dates |
| `circuit.json` | The lab build, in the website's `.kiungo.json` format |
| `sketch/sketch.ino` | The code |
| `sketch/sketch.yaml` | Arduino CLI profile: the board package and libraries, pinned |
| `records/` | Experiment records (later sprints) |
| `.kiungo/history.json` | Undo and redo, so they survive a restart |

New projects go in Documents/Kiungo unless you pick another folder in the New project dialog. Every change is saved within about 50 ms, written to a temporary file and renamed over the old one, so a forced quit never leaves half a file.

The main process keeps the recent list and only opens projects that are on it or chosen in a folder dialog; the interface can't name other folders.

## Signing in

Kiungo signs in through the website: **Sign in with your browser** opens `/desktop/sign-in`, you approve this computer there, and the browser sends the app a one-time code through `kiungo://signin`. The code only works with a secret this copy of the app holds (PKCE). If the link doesn't arrive, the app polls for the approval every 3 seconds. The refresh token is kept encrypted by the operating system's keychain (`src/main/auth/`). The backend side is `jumetra-backend` `docs/desktop-sign-in.md`.

`KIUNGO_API_URL` points the app at another backend, e.g. a local one with the desktop routes:

```bash
KIUNGO_API_URL=http://127.0.0.1:8000 npm run desktop
```

## Building

**Build** (Ctrl+B) runs `arduino-cli compile --profile kiungo` on the project's `sketch/` folder (`src/main/build/service.ts`). The profile in `sketch.yaml` pins the board package and the libraries, so a project builds the same everywhere; Arduino CLI downloads anything missing into Kiungo's own data folder the first time, so the first build needs the internet. Builds go in `<userData>/builds/<hash of the project path>`, never inside the project.

The compiler's output is turned into problems, explanations and fixes by `@kiungo/core/build` (`packages/core/src/build/`), tested against real avr-gcc 7.3 messages in `packages/core/test/fixtures/gcc/`. Libraries are added and removed with `arduino-cli profile lib add|remove`, which also pins what they depend on.

## Boards, uploads and the serial monitor

Arduino CLI finds boards (`board list --watch`, kept running while the app is open), uploads (`upload --profile kiungo --fqbn … -p …`) and runs the serial monitor (`monitor -p … --config baudrate=…`), all as child processes (`src/main/hardware/`). The interface can only name a port that discovery has found, and only open the driver pages listed in `src/main/hardware/doctor.ts`. Board limits and pins are in `@kiungo/core/hardware/boards`; upload failures are matched to recovery steps in `@kiungo/core/hardware/upload`.

## Keyboard

| Keys | What |
| --- | --- |
| Ctrl+K (⌘K) | Search and commands |
| Ctrl+N (⌘N) | New project |
| Ctrl+O (⌘O) | Open a project folder |
| Ctrl+Shift+H (⇧⌘H) | Home |
| Ctrl+E (⌘E) | Show or hide the code |
| Ctrl+B (⌘B) | Build |
| Ctrl+U (⌘U) | Upload |
| Ctrl+F (⌘F) | Find, in the code |
| Ctrl+Enter (⌘↵) | Run or stop, in the lab |
| / | Search parts, in the lab |
| 1, 2, 3 | 3D, 2D, Trace |

## Build installers

```bash
npm run dist -w @kiungo/desktop
```

Before a release build, CI runs `npm run fetch:arduino-cli -w @kiungo/desktop -- --all`. Signing and the update feed come in sprint 6.

## Where things are

| Path | What |
| --- | --- |
| `src/main/index.ts` | Window, the `kiungo-app://` protocol (isolation headers and content policy), IPC handlers |
| `src/main/projects/` | Projects on disk: making, opening, the recent list, crash-safe autosave, sketch files |
| `src/main/auth/` | Signing in through the website, the keychain-encrypted session |
| `src/main/build/` | Building a project with its profile, its libraries, and uploading |
| `src/main/hardware/` | Finding boards on USB, the serial monitor, and why a board might not show up |
| `src/main/toolchain/arduino-cli.ts` | Finding and running Arduino CLI with JSON output |
| `src/preload/index.ts` | The only bridge: `window.kiungo.invoke(channel, ...args)` |
| `src/renderer/` | The interface: the sign-in screen, Home, the project screen (the shared lab from `@kiungo/lab` and the code editor), the command palette |
| `resources/sketches/` | Example sketches shipped with the app |
| `scripts/fetch-arduino-cli.mjs` | Pinned Arduino CLI download, checked against Arduino's published checksums |
| `scripts/measure-lab.mjs` | DSK-21: frames per second while panning a 40-part, 200-wire build |

## Environment overrides (development and CI)

- `KIUNGO_ARDUINO_CLI`: path to an `arduino-cli` binary.
- `KIUNGO_ARDUINO_CONFIG`: path to an Arduino CLI config file. Otherwise the app writes its own under the user data folder.
