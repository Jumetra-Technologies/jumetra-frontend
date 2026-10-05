import type { DocArticle } from "../types";

export const DEVELOPER_ARTICLES: DocArticle[] = [
  {
    slug: "frontend-structure",
    category: "developer-resources",
    title: "Frontend structure",
    summary:
      "The technology stack, how the repository is organised, where client state lives, and the everyday commands.",
    tags: ["frontend", "nextjs", "react", "typescript", "tailwind", "zustand", "structure", "stack", "testing"],
    related: ["technical-guides/run-locally", "developer-resources/contributing-docs"],
    blocks: [
      { type: "h2", text: "Technology stack" },
      {
        type: "table",
        head: ["Layer", "Technology"],
        rows: [
          ["Web framework", "Next.js 16 (App Router)"],
          ["UI runtime", "React 19 with TypeScript"],
          ["Styling and controls", "Tailwind CSS 4 with shared local UI components"],
          ["Engineering canvas", "React Flow (`@xyflow/react`)"],
          ["Code editing", "Monaco editor (`@monaco-editor/react`)"],
          ["Client state", "Zustand stores; browser local storage for project journals"],
          ["Charts and icons", "Recharts and lucide-react"],
          ["Tests", "Vitest with Testing Library in a jsdom environment"],
        ],
      },
      {
        type: "callout",
        tone: "warning",
        title: "Read the bundled Next.js docs",
        text: "This project uses a Next.js version whose conventions differ from older releases. For example, `params` and `searchParams` in pages are Promises that you must `await`. The repository's `AGENTS.md` points to the matching guides in `node_modules/next/dist/docs/`.",
      },
      { type: "h2", text: "Repository layout" },
      {
        type: "table",
        head: ["Folder", "Contents"],
        rows: [
          ["`app/`", "Routes. Each folder with a `page.tsx` is a URL, for example `app/docs` serves `/docs`."],
          ["`components/`", "UI by feature area (`workspace`, `library`, `firmware`, `projects`, `experiments`, `learning`, and others) plus shared `ui` primitives and the `layout` shell."],
          ["`lib/`", "The typed API client, WebSocket client, hardware registry, and shared helpers."],
          ["`stores/`", "Zustand stores for workspace, simulation, selection, discovery, and UI state."],
          ["`assets/components/`", "Per-component hardware data. See [Component asset format](/docs/developer-resources/component-asset-format)."],
          ["`__tests__/`", "Vitest test files (`*.test.ts` and `*.test.tsx`)."],
        ],
      },
      { type: "h2", text: "Where data is kept" },
      {
        type: "p",
        text: "Projects and experiment journals are saved in the browser under the local storage key `hhip-robotics-workspace:v1`. Other keys hold the sign-in session, theme choice, sidebar state, and the active workspace id. Hardware, simulation, and firmware features talk to the backend through the shared API client in `lib/api-client.ts`.",
      },
      { type: "h2", text: "Everyday commands" },
      {
        type: "code",
        language: "bash",
        code: `npm run dev        # start the dev server
npm test           # run the Vitest suite once
npm run lint       # ESLint
npm run build      # production build`,
      },
    ],
  },
  {
    slug: "component-asset-format",
    category: "developer-resources",
    title: "Component asset format",
    summary:
      "The files that describe a hardware component in the frontend: metadata, pins, animations, and the SVG drawing.",
    tags: ["components", "assets", "metadata", "pins", "json", "svg", "library", "hardware"],
    related: ["developer-resources/frontend-structure", "technical-guides/api-and-environment"],
    blocks: [
      {
        type: "p",
        text: "Each component the frontend can draw lives in its own folder under `assets/components/<id>/`, with a mirrored copy under `public/assets/components/<id>/` so the browser can load the files. The folder name is the component id, such as `dht11` or `arduino-uno`.",
      },
      {
        type: "table",
        head: ["File", "Purpose"],
        rows: [
          ["`metadata.json`", "Identity and drawing size."],
          ["`pins.json`", "Every pin with its position, voltage, and capabilities."],
          ["`animations.json`", "Animation definitions for the component's visual states."],
          ["`component.svg`", "The drawing itself."],
        ],
      },
      { type: "h2", text: "metadata.json" },
      {
        type: "code",
        language: "json",
        filename: "assets/components/dht11/metadata.json",
        code: `{
  "id": "dht11",
  "name": "DHT11",
  "width": 70,
  "height": 90,
  "category": "sensors",
  "defaultVoltage": 3.3
}`,
      },
      {
        type: "p",
        text: "`description` is an optional text field and `firmwareKey` is used by boards that report a firmware version. Categories in use today include `arduino`, `esp32`, `pico`, `stm32`, `sensors`, `displays`, `robotics`, `passive`, and `prototyping`.",
      },
      { type: "h2", text: "pins.json" },
      {
        type: "code",
        language: "json",
        filename: "assets/components/esp32/pins.json",
        code: `{
  "pins": [
    {
      "id": "3V3",
      "name": "3V3",
      "number": "3V3",
      "x": 0.02,
      "y": 0.12,
      "side": "left",
      "voltage": 3.3,
      "interfaces": ["power"],
      "signal": "power"
    }
  ]
}`,
      },
      {
        type: "ul",
        items: [
          "`x` and `y` are positions relative to the component, from 0 to 1.",
          "`side` is one of `left`, `right`, `top`, or `bottom`.",
          "`interfaces` lists capabilities such as `digital`, `analog`, `adc`, `pwm`, `i2c`, `spi`, `uart`, `can`, `gpio`, `power`, and `ground`.",
          "`signal` is `input`, `output`, `bidirectional`, or `power`.",
        ],
      },
      { type: "h2", text: "The backend side" },
      {
        type: "p",
        text: "The backend keeps its own catalog data. Its component packages (`data/component_packages/<id>/`) hold a `manifest.json`, a `datasheet.md`, and a `simulation.py` behavior model, and boards also include a `firmware.json`. When you add a part, keep the two sides consistent.",
      },
      {
        type: "callout",
        tone: "note",
        title: "Component data exists in more than one place",
        text: "The same component can be described under `assets/`, under `public/assets/`, and in the in-code registry at `lib/hardware/asset-data.ts`. Update all of them together until they are consolidated.",
      },
    ],
  },
  {
    slug: "contributing-docs",
    category: "developer-resources",
    title: "Contributing documentation",
    summary:
      "How to add or edit articles, tutorials, and FAQ entries in the Documentation and Learning Centers.",
    tags: ["contributing", "documentation", "content", "tutorials", "faq", "authoring", "guide"],
    related: ["developer-resources/frontend-structure"],
    blocks: [
      {
        type: "p",
        text: "All documentation and learning content is typed data in `lib/learning/content/`. There is no CMS: you edit a TypeScript file, run the tests, and open a pull request.",
      },
      {
        type: "table",
        head: ["To add", "Edit this file", "It appears at"],
        rows: [
          ["A reference article", "`docs-system.ts`, `docs-hardware.ts`, or `docs-developer.ts`", "`/docs/<category>/<slug>`"],
          ["A tutorial", "`modules.ts` (set `order`, `topic`, `level`, `minutes`)", "`/learn/<slug>` and the Tutorials category"],
          ["A FAQ entry", "`faq.ts`", "`/learn#faq` and search"],
        ],
      },
      { type: "h2", text: "Content blocks" },
      {
        type: "p",
        text: "A page is an ordered list of blocks: `h2`, `h3`, `p`, `ul`, `ol`, `code`, `callout`, `table`, and `link-card`. Inside text you can use `code` in backticks, **bold** in double asterisks, and links as `[label](/path)`.",
      },
      { type: "h2", text: "Writing guidelines" },
      {
        type: "ul",
        items: [
          "Keep specifications accurate and say so when values vary by board or vendor.",
          "Add a warning callout wherever a mistake could damage hardware or hurt someone, such as voltage mismatches and mains switching.",
          "Link to the relevant hardware reference and to the part in the component library.",
          "Reference real routes only. The test suite fails if an internal link points to a page that does not exist.",
          "Every article needs a one-sentence summary and a few search tags.",
        ],
      },
      {
        type: "code",
        language: "bash",
        code: `npm test           # validates content, links, and search
npm run lint`,
      },
    ],
  },
];
