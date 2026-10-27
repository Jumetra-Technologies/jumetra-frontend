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

## Build installers

```bash
npm run dist -w @kiungo/desktop
```

Before a release build, CI runs `npm run fetch:arduino-cli -w @kiungo/desktop -- --all`. Signing and the update feed come in sprint 6.

## Where things are

| Path | What |
| --- | --- |
| `src/main/index.ts` | Window, the `kiungo-app://` protocol (isolation headers and content policy), IPC handlers |
| `src/main/toolchain/arduino-cli.ts` | Finding and running Arduino CLI with JSON output |
| `src/preload/index.ts` | The only bridge: `window.kiungo.invoke(channel, ...args)` |
| `src/renderer/` | The interface |
| `resources/sketches/` | Example sketches shipped with the app |
| `scripts/fetch-arduino-cli.mjs` | Pinned Arduino CLI download, checked against Arduino's published checksums |

## Environment overrides (development and CI)

- `KIUNGO_ARDUINO_CLI`: path to an `arduino-cli` binary.
- `KIUNGO_ARDUINO_CONFIG`: path to an Arduino CLI config file. Otherwise the app writes its own under the user data folder.
