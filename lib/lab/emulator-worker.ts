/**
 * The emulator's worker entry for the website: the shared worker
 * (@kiungo/core/emulator/worker) behind a local file, because the bundler
 * resolves `new Worker(new URL("./…", import.meta.url))` for a relative path.
 * The import runs for its side effects (it sets the worker's onmessage), so
 * packages/core lists that file under "sideEffects"; without that the bundler
 * drops it and the board never answers.
 */
import "@kiungo/core/emulator/worker";
