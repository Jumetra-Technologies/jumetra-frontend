@AGENTS.md

## UI standards

- Scrollbars: every scroll area gets HHIP's elastic 6px scrollbar automatically from `<ElasticScrollbars />` in `app/layout.tsx` (engine: `lib/ui/elastic-scrollbars.ts`). Make things scroll with normal `overflow-*-auto` classes; never add custom scrollbar CSS or wrappers. Opt a subtree out with `data-native-scrollbar`.

## Desktop releases

- Any pull request that changes the desktop app (`apps/desktop`, or `packages/api|core|ui|lab`, tests and docs aside) raises the version in `apps/desktop/package.json` (and `package-lock.json`). CI's **Desktop · version raised for the update** check fails otherwise.
- Merging to `main` publishes that version automatically (`release-desktop.yml`): installers, the GitHub release, and the in-app update feed. Nobody needs to run the release by hand.
