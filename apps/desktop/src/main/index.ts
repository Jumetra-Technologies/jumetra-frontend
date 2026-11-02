/**
 * Kiungo 2 main process: the window, the app's own protocol, and the IPC
 * handlers the interface may call. The interface gets no Node access; it
 * talks to this process only through the channels in @kiungo/api.
 */
import { app, BrowserWindow, dialog, ipcMain, net, protocol, session, shell } from "electron";
import { hostname } from "node:os";
import { join, normalize, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { EMULATED_BOARDS, EXAMPLE_SKETCHES, INSTALLABLE_CORES, isInvokeChannel, type AuthState, type Handlers, type Platform } from "@kiungo/api";
import { PROJECT_FILE } from "@kiungo/core/project";
import { keychainStore } from "./auth/secret-store";
import { AuthService } from "./auth/service";
import { ProjectService } from "./projects/service";
import { SketchFiles } from "./projects/sketch";
import { compileSketch, installCore, locateCli, toolchainStatus } from "./toolchain/arduino-cli";

const APP_SCHEME = "kiungo-app";
/** The website sends the app back to kiungo://signin after signing in. */
const LINK_SCHEME = "kiungo";
/** The backend the app signs in with. KIUNGO_API_URL points it at another one (staging, a local backend). */
const API_BASE = (process.env.KIUNGO_API_URL || "https://europe-west4-hhipsystemv0.cloudfunctions.net/api").replace(/\/+$/, "");
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
  "font-src 'self' data:",
  "connect-src 'self'",
  // The account picture comes from Google or GitHub.
  "img-src 'self' data: https://lh3.googleusercontent.com https://avatars.githubusercontent.com",
  "object-src 'none'",
  "base-uri 'none'",
].join("; ");

let windowShownAt: number | null = null;
let mainWindow: BrowserWindow | null = null;
let projects: ProjectService | null = null;

/** Made once the app is ready: the folders it uses come from Electron. */
function projectService(): ProjectService {
  projects ??= new ProjectService({
    appDataDir: app.getPath("userData"),
    defaultProjectsFolder: join(app.getPath("documents"), "Kiungo"),
    generator: `Kiungo ${app.getVersion()}`,
  });
  return projects;
}

/** A folder picker attached to the window, so it opens in front of it. */
async function chooseFolder(options: Electron.OpenDialogOptions): Promise<string | null> {
  const result = mainWindow ? await dialog.showOpenDialog(mainWindow, options) : await dialog.showOpenDialog(options);
  return result.canceled || !result.filePaths[0] ? null : result.filePaths[0];
}

const isText = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length < 4096;

let auth: AuthService | null = null;
function authService(): AuthService {
  auth ??= new AuthService({
    apiBase: API_BASE,
    device: {
      // The computer's name as the person knows it, shown on the website's approval page and their device list.
      name: (hostname() || "This computer").slice(0, 120),
      platform: process.platform === "win32" ? "windows" : process.platform === "darwin" ? "macos" : "linux",
      appVersion: app.getVersion(),
    },
    store: keychainStore(join(app.getPath("userData"), "session.bin")),
    openBrowser: (url) => (url.startsWith("https://") || url.startsWith("http://127.0.0.1") || url.startsWith("http://localhost") ? shell.openExternal(url) : Promise.resolve()),
    onChange: (state: AuthState) => mainWindow?.webContents.send("auth:changed", state),
  });
  return auth;
}

const sketchFiles = new SketchFiles((path) => shell.trashItem(path));
/** Sketch files belong to the project open in this window, and only that one. */
const openProject = (path: unknown): path is string => isText(path) && projectService().isOpen(path);
const notOpen = { ok: false as const, message: "This project isn't open." };

/** Links (kiungo://signin?…) arrive before the window exists on a cold start; hold them until then. */
const pendingLinks: string[] = [];
function handleLink(link: string) {
  if (!link.startsWith(`${LINK_SCHEME}://`)) return;
  if (!app.isReady()) {
    pendingLinks.push(link);
    return;
  }
  void authService().handleLink(link);
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
}

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
  "projects:recent": () => projectService().recent(),
  "projects:create": (input) => {
    if (!input || typeof input !== "object") throw new Error("Refused: no project details.");
    return projectService().create({ name: String(input.name ?? ""), board: String(input.board ?? ""), starter: typeof input.starter === "string" ? input.starter : null });
  },
  "projects:open-recent": async (path) => {
    if (!isText(path) || !(await projectService().isRecent(path))) return { ok: false, message: "That project isn't in the recent list." };
    return projectService().openFolder(path);
  },
  "projects:open-dialog": async () => {
    const folder = await chooseFolder({ title: "Open a Kiungo project", buttonLabel: "Open project", properties: ["openDirectory"] });
    return folder ? projectService().openFolder(folder) : null;
  },
  "projects:save": (path, payload) => {
    if (!isText(path) || !payload || typeof payload !== "object") return { ok: false, message: "Refused: nothing to save." };
    return projectService().save(path, payload);
  },
  "projects:close": async (path) => {
    if (isText(path)) await projectService().close(path);
  },
  "projects:forget": (path) => (isText(path) ? projectService().forget(path) : projectService().recent()),
  "projects:reveal": async (path) => {
    if (!isText(path)) return;
    if (projectService().isOpen(path) || (await projectService().isRecent(path))) shell.showItemInFolder(join(path, PROJECT_FILE));
  },
  "projects:settings": () => projectService().settings(),
  "auth:state": () => authService().current(),
  "auth:sign-in": () => authService().signIn(),
  "auth:cancel": () => authService().cancel(),
  "auth:sign-out": () => authService().signOut(),
  "auth:skip": () => authService().skip(),
  "sketch:list": (path) => (openProject(path) ? sketchFiles.list(path) : []),
  "sketch:read": (path, name) => (openProject(path) ? sketchFiles.read(path, name) : notOpen),
  "sketch:write": (path, name, content) => (openProject(path) ? sketchFiles.write(path, name, content) : notOpen),
  "sketch:create": (path, name) => (openProject(path) ? sketchFiles.create(path, name) : notOpen),
  "sketch:rename": (path, from, to) => (openProject(path) ? sketchFiles.rename(path, from, to) : notOpen),
  "sketch:delete": (path, name) => (openProject(path) ? sketchFiles.remove(path, name) : notOpen),
  "projects:choose-folder": async () => {
    const current = await projectService().settings();
    const folder = await chooseFolder({ title: "Where should new projects go?", buttonLabel: "Use this folder", defaultPath: current.projectsFolder, properties: ["openDirectory", "createDirectory"] });
    return folder ? projectService().setProjectsFolder(folder) : current;
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
  mainWindow = win;
  win.on("closed", () => {
    if (mainWindow === win) mainWindow = null;
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

// One Kiungo at a time: a second launch (or a kiungo:// link on Windows and Linux) hands its arguments to this one.
if (!app.requestSingleInstanceLock() && !process.env.KIUNGO_MEASURE_BUDGETS) {
  app.quit();
} else {
  app.on("second-instance", (_event, argv) => {
    const link = argv.find((a) => a.startsWith(`${LINK_SCHEME}://`));
    if (link) handleLink(link);
    else if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
// macOS delivers links as an event, possibly before the app is ready.
app.on("open-url", (event, url) => {
  event.preventDefault();
  handleLink(url);
});
// The link a cold start was launched with (Windows and Linux).
for (const arg of process.argv) if (arg.startsWith(`${LINK_SCHEME}://`)) pendingLinks.push(arg);

function registerLinkScheme() {
  // In development the app is electron + this folder, so the scheme must name both.
  if (process.defaultApp && process.argv.length >= 2) app.setAsDefaultProtocolClient(LINK_SCHEME, process.execPath, [join(process.cwd(), process.argv[1])]);
  else app.setAsDefaultProtocolClient(LINK_SCHEME);
}

app.whenReady().then(() => {
  // No camera, microphone or other device access until a feature asks the user for it (PCP-02).
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  serveRenderer();
  registerIpc();
  registerLinkScheme();
  createWindow();
  void authService()
    .restore()
    .then(() => {
      for (const link of pendingLinks.splice(0)) void authService().handleLink(link);
    });
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Finish every save before the app goes. A forced quit loses at most the change in flight: files are written whole or not at all.
let quitting = false;
app.on("will-quit", (event) => {
  auth?.dispose();
  if (quitting || !projects) return;
  event.preventDefault();
  quitting = true;
  void projects.closeAll().finally(() => app.quit());
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
