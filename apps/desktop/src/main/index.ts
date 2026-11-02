/**
 * Kiungo 2 main process: the window, the app's own protocol, and the IPC
 * handlers the interface may call. The interface gets no Node access; it
 * talks to this process only through the channels in @kiungo/api.
 */
import { app, BrowserWindow, ipcMain, net, protocol, session, shell } from "electron";
import { join, normalize, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { EMULATED_BOARDS, EXAMPLE_SKETCHES, INSTALLABLE_CORES, isInvokeChannel, type Handlers, type Platform } from "@kiungo/api";
import { compileSketch, installCore, locateCli, toolchainStatus } from "./toolchain/arduino-cli";

const APP_SCHEME = "kiungo-app";
const FQBN = { uno: "arduino:avr:uno", nano: "arduino:avr:nano:cpu=atmega328" } as const;

/**
 * Shared memory (SharedArrayBuffer) between the interface and the emulator
 * workers needs the page to be cross-origin isolated.
 */
const ISOLATION_HEADERS = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
};
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
].join("; ");

let windowShownAt: number | null = null;

protocol.registerSchemesAsPrivileged([
  { scheme: APP_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
]);

const rendererDir = () => join(__dirname, "../renderer");
const devResourcesDir = () => join(__dirname, "../../resources");
const resourcesDir = () => (app.isPackaged ? process.resourcesPath : devResourcesDir());

/** Serves the built interface with the isolation headers and a strict content policy. */
function serveRenderer() {
  protocol.handle(APP_SCHEME, async (request) => {
    const root = normalize(rendererDir());
    const pathname = decodeURIComponent(new URL(request.url).pathname);
    const file = normalize(join(root, pathname === "/" ? "index.html" : pathname));
    if (file !== root && !file.startsWith(root + sep)) return new Response("Not found", { status: 404 });
    const response = await net.fetch(pathToFileURL(file).toString());
    const headers = new Headers(response.headers);
    for (const [k, v] of Object.entries(ISOLATION_HEADERS)) headers.set(k, v);
    headers.set("Cross-Origin-Resource-Policy", "same-origin");
    headers.set("Content-Security-Policy", CSP);
    return new Response(response.body, { status: response.status, headers });
  });
}

function cli() {
  return locateCli({
    platform: process.platform,
    arch: process.arch,
    resourcesDir: resourcesDir(),
    devResourcesDir: devResourcesDir(),
    userDataDir: app.getPath("userData"),
    env: process.env,
  });
}

const handlers: Handlers = {
  "app:info": () => ({
    appVersion: app.getVersion(),
    platform: process.platform as Platform,
    arch: process.arch,
    versions: { electron: process.versions.electron, chrome: process.versions.chrome, node: process.versions.node },
  }),
  "app:metrics": () => ({
    toWindowShownMs: windowShownAt === null ? null : Math.round(windowShownAt),
    mainRssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    totalMb: Math.round(app.getAppMetrics().reduce((sum, m) => sum + m.memory.workingSetSize, 0) / 1024),
  }),
  "toolchain:status": () => toolchainStatus(cli()),
  "toolchain:compile-example": async (sketch, board) => {
    if (!EXAMPLE_SKETCHES.includes(sketch) || !EMULATED_BOARDS.includes(board)) throw new Error("Unknown example or board.");
    const location = cli();
    if (!location) return { ok: false, durationMs: 0, log: "Arduino CLI wasn't found." };
    const sketchDir = join(resourcesDir(), "sketches", sketch);
    const buildPath = join(app.getPath("userData"), "builds", `${sketch}-${board}`);
    return compileSketch(location, sketchDir, FQBN[board], buildPath);
  },
  "toolchain:install-core": async (core) => {
    if (!INSTALLABLE_CORES.includes(core)) throw new Error("Unknown board core.");
    const location = cli();
    if (!location) return { ok: false, durationMs: 0, log: "Arduino CLI wasn't found." };
    return installCore(location, core);
  },
};

function registerIpc() {
  for (const channel of Object.keys(handlers)) {
    if (!isInvokeChannel(channel)) continue;
    ipcMain.handle(channel, (event, ...args: unknown[]) => {
      // Only our own interface may call the main process.
      const from = event.senderFrame?.url ?? "";
      if (!from.startsWith(`${APP_SCHEME}://`) && !(process.env.ELECTRON_RENDERER_URL && from.startsWith(process.env.ELECTRON_RENDERER_URL))) {
        throw new Error("Refused: the request didn't come from the Kiungo interface.");
      }
      return (handlers[channel] as (...a: unknown[]) => unknown)(...args);
    });
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 600,
    show: false,
    title: "Kiungo",
    backgroundColor: "#f6f8fb",
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });
  win.once("ready-to-show", () => {
    // process.uptime() counts from the moment the operating system started the app.
    windowShownAt = process.uptime() * 1000;
    win.show();
    // scripts/measure-budgets.mjs: print the startup numbers once the app has settled, then quit.
    if (process.env.KIUNGO_MEASURE_BUDGETS) {
      setTimeout(() => {
        const processes = app.getAppMetrics().map((m) => ({ type: m.type, pid: m.pid, mb: Math.round(m.memory.workingSetSize / 1024) }));
        process.stdout.write(`KIUNGO_METRICS ${JSON.stringify({ ...handlers["app:metrics"](), processes })}\n`);
        setTimeout(() => app.quit(), 1500); // long enough for the script to read /proc for each pid
        return;
      }, Number(process.env.KIUNGO_MEASURE_BUDGETS) || 5000);
    }
  });
  // Links open in the user's browser; the window never leaves the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) void shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    const dev = process.env.ELECTRON_RENDERER_URL;
    if (!url.startsWith(`${APP_SCHEME}://`) && !(dev && url.startsWith(dev))) event.preventDefault();
  });
  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) void win.loadURL(process.env.ELECTRON_RENDERER_URL);
  else void win.loadURL(`${APP_SCHEME}://app/index.html`);
}

app.whenReady().then(() => {
  // No camera, microphone or other device access until a feature asks the user for it (PCP-02).
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  serveRenderer();
  registerIpc();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
