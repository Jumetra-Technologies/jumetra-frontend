/** Where the code editor is served from: Kiungo itself (copied by scripts/copy-monaco.mjs), never a CDN. */
export const MONACO_PATH = "/monaco/vs";

/** Point the editor's loader at Kiungo's own copy. Call before the loader starts; repeat calls are harmless. */
export function configureLocalMonaco(loader: { config: (options: { paths: { vs: string } }) => void }): void {
  loader.config({ paths: { vs: MONACO_PATH } });
}
