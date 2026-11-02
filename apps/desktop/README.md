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

## Keyboard

| Keys | What |
| --- | --- |
| Ctrl+K (⌘K) | Search and commands |
| Ctrl+N (⌘N) | New project |
| Ctrl+O (⌘O) | Open a project folder |
| Ctrl+Shift+H (⇧⌘H) | Home |
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
| `src/main/projects/` | Projects on disk: making, opening, the recent list, crash-safe autosave |
| `src/main/toolchain/arduino-cli.ts` | Finding and running Arduino CLI with JSON output |
| `src/preload/index.ts` | The only bridge: `window.kiungo.invoke(channel, ...args)` |
| `src/renderer/` | The interface: Home, the project screen (the shared lab from `@kiungo/lab`), the command palette |
| `resources/sketches/` | Example sketches shipped with the app |
| `scripts/fetch-arduino-cli.mjs` | Pinned Arduino CLI download, checked against Arduino's published checksums |
| `scripts/measure-lab.mjs` | DSK-21: frames per second while panning a 40-part, 200-wire build |

## Environment overrides (development and CI)

- `KIUNGO_ARDUINO_CLI`: path to an `arduino-cli` binary.
- `KIUNGO_ARDUINO_CONFIG`: path to an Arduino CLI config file. Otherwise the app writes its own under the user data folder.
