/**
 * The emulator's worker entry for the website: the shared worker
 * (@kiungo/core/emulator/worker) behind a local file, because the bundler
 * resolves `new Worker(new URL("./…", import.meta.url))` for a relative path.
 */
import "@kiungo/core/emulator/worker";
