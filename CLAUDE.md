@AGENTS.md

## UI standards

- Scrollbars: every scroll area gets HHIP's elastic 6px scrollbar automatically from `<ElasticScrollbars />` in `app/layout.tsx` (engine: `lib/ui/elastic-scrollbars.ts`). Make things scroll with normal `overflow-*-auto` classes; never add custom scrollbar CSS or wrappers. Opt a subtree out with `data-native-scrollbar`.
