/**
 * A lab session's own code (WP-D3): the sketch the website's lab runs. It
 * lives in the session, so it is saved and synced with the account like the
 * circuit. The desktop app keeps its code in the project folder instead.
 *
 * File names follow Kiungo's compile service (Jumetra-Backend
 * compile_service): flat names like `Blink.ino` or `motor.h`, exactly one
 * `.ino`, at most 16 files and 256 KB.
 */

export interface SessionCodeFile {
  path: string;
  content: string;
}

export interface SessionCode {
  files: SessionCodeFile[];
  /** The file open in the editor. */
  active: string;
}

export const MAX_CODE_FILES = 16;
export const MAX_CODE_BYTES = 256 * 1024;
const NAME = /^[A-Za-z0-9_][A-Za-z0-9_-]{0,63}\.(ino|h|hpp|c|cpp)$/;

export const DEFAULT_SKETCH_NAME = "sketch.ino";

/** The first sketch a session gets: Blink on the Uno's built-in LED (pin 13). */
export const DEFAULT_SKETCH = `// Blink: turns the LED on pin 13 on for half a second, then off for half a second.
// Wire an LED (with a 220 Ω resistor) to pin 13, or watch the Uno's own L LED.

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(500);
  digitalWrite(LED_BUILTIN, LOW);
  delay(500);
}
`;

export function defaultCode(): SessionCode {
  return { files: [{ path: DEFAULT_SKETCH_NAME, content: DEFAULT_SKETCH }], active: DEFAULT_SKETCH_NAME };
}

/** Why a new file name can't be used, or null when it can. */
export function codeFileNameProblem(name: string, files: readonly SessionCodeFile[]): string | null {
  if (!NAME.test(name)) return "Use letters, digits, “_” and “-”, ending in .ino, .h, .hpp, .c or .cpp, with no folders.";
  if (files.some((f) => f.path.toLowerCase() === name.toLowerCase())) return `There's already a file called ${name}.`;
  if (name.endsWith(".ino") && files.some((f) => f.path.endsWith(".ino"))) return "A sketch has one .ino file. Add a .h or .cpp file instead.";
  if (files.length >= MAX_CODE_FILES) return `A sketch can have up to ${MAX_CODE_FILES} files.`;
  return null;
}

/**
 * A session's code as read from storage or the account: kept if it is a
 * well-formed sketch, otherwise dropped file by file (never thrown), so a
 * damaged copy can't stop the lab from opening.
 */
export function sanitizeCode(raw: unknown): SessionCode | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const input = raw as { files?: unknown; active?: unknown };
  if (!Array.isArray(input.files)) return undefined;
  const files: SessionCodeFile[] = [];
  let bytes = 0;
  for (const f of input.files) {
    if (!f || typeof f !== "object") continue;
    const { path, content } = f as { path?: unknown; content?: unknown };
    if (typeof path !== "string" || typeof content !== "string" || !NAME.test(path)) continue;
    if (files.some((g) => g.path.toLowerCase() === path.toLowerCase())) continue;
    if (path.endsWith(".ino") && files.some((g) => g.path.endsWith(".ino"))) continue;
    bytes += content.length;
    if (bytes > MAX_CODE_BYTES || files.length >= MAX_CODE_FILES) break;
    files.push({ path, content });
  }
  if (!files.length) return undefined;
  const active = typeof input.active === "string" && files.some((f) => f.path === input.active) ? input.active : files[0].path;
  return { files, active };
}
