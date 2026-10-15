# Changelog

All notable changes to the Kiungo frontend. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html):

- **Patch** (`1.2.0 → 1.2.1`): fixes, no new behaviour.
- **Minor** (`1.2.0 → 1.3.0`): new features that keep saved data and URLs working.
- **Major** (`1.2.0 → 2.0.0`): breaking changes, such as a new saved-data format, removed routes, or a backend contract older clients can't use.

Every pull request that changes the app bumps the version (`npm run release:patch | release:minor | release:major`) and adds an entry here. `__tests__/Version.test.ts` fails if the version in `package.json` has no entry. Tag the merge commit `vX.Y.Z` on `main`.

Versions before 1.2.0 were assigned after the fact to the pull requests already merged.

## [1.17.0] - 2026-10-15

### Added
- **Resistor part.** A through-hole resistor is in the Component library, under the renamed group **Breadboards and resistors**, and in the Engineering Lab. Its value is chosen in the Inspector: 100 Ω, 220 Ω, 330 Ω, 470 Ω, 1 kΩ, 2.2 kΩ, 4.7 kΩ or 10 kΩ. Its color bands change to match, in 3D, 2D and the Inspector preview. In the lab:
  - **Current flows through it.** An LED whose anode (or cathode) goes through a resistor to a board pin is driven by that pin. The check and the LED's Live panel use the real value: 220 Ω from 5 V is 13.6 mA, and 1 kΩ is 3.0 mA. Below 150 Ω at 5 V you get a warning ("30 mA: more than the LED takes. Use at least 150 Ω").
  - **Auto-wire puts it where it belongs.** Adding a resistor to a build with an LED wired straight to a pin takes that wire out and puts the resistor in series (pin → leg 1, leg 2 → anode), as one undo step.
  - **Builds without a resistor still work.** They keep the 220 Ω assumption, and the tip now suggests adding a Resistor part.
- `analyze()` takes the session's inputs (part values). `NodeReport.seriesOhms` holds the resistance in series with a part.

## [1.16.6] - 2026-10-15

### Changed
- **The code editor is served by Kiungo.** The Firmware page's editor (Monaco) used to download from a third-party CDN (jsDelivr), so a school network that blocked it got a plain text box. Monaco is now an npm dependency, and `scripts/copy-monaco.mjs` copies it into `public/monaco/vs` before every `dev` and `build`. The page loads it from there, with no outside requests. The copy is generated and git-ignored.
- **Fonts are bundled with the app.** Inter and JetBrains Mono now come from npm (`@fontsource-variable/*`) through `next/font/local`, not from Google Fonts at build time. A build no longer needs internet access to Google: `npm run build` now completes in environments where it used to fail. The fonts look the same.

## [1.16.5] - 2026-10-15

### Changed
- **The Firmware page works on phones and tablets.** Below desktop width its three columns squeezed into one illegible strip. A **Project / Code / Run it** switch now shows one pane at a time, and opening a project jumps straight to its code. The output tabs scroll sideways instead of wrapping. Desktops keep all three columns.
- **Pins are easier to hit on touch screens.** On a phone or tablet each pin's tap target extends past the dot, by 9 px for pins and 3 px for breadboard holes, which are only 0.1" apart.

### Checked
- No page scrolls sideways at 360 px or 768 px: Home, Projects, Experiment Records, Component library, Firmware, Learning Center, Documentation, Roadmap, Hybrid Hardware, Analytics, Engineering Lab, legal pages. On a phone, the lab's parts panel and Inspector open as drawers over the canvas.

## [1.16.4] - 2026-10-15

### Fixed
- **Keyboard focus is always visible, and components can draw their own.** The default focus ring was an unlayered rule, so it overrode every component's own focus style; that's why the library search showed a thick ring that got clipped. It now sits in the base layer. Elements that remove it draw their own instead:
  - The lab's terminal input, the session-name field and the fallback code editor get a ring.
  - Menu items keep their highlight.
  - The SVG hotspots in the 2D and Trace views and the architecture board keep their highlights.

  `__tests__/FocusStyles.test.ts` fails if anything removes the outline without a replacement.
- **US English throughout.** A pass over all app copy, part descriptions, learning content and docs: color, center, organization, behavior, labeled, catalog, millimeter, modeled, gray, license, recognize and the rest. Search tags keep the UK spelling as a synonym, so "colour" still finds the RGB LED. `__tests__/Spelling.test.ts` guards it.

## [1.16.3] - 2026-10-15

### Added
- **Checks on every pull request.** GitHub Actions (`.github/workflows/ci.yml`) runs the typecheck, lint, every test and a production build, plus the MCP server's typecheck and self-test. `npm test`, `npm run typecheck` and `npm run check` are back in `package.json`.
- **The test suite is back:** 38 files and 464 tests. The 29 files deleted in 507b93c are restored and updated to how the app works now:
  - projects and experiment records live on the account;
  - sign-in uses Google and GitHub;
  - profiles are no longer kept on the device;
  - errors aren't sent anywhere yet.
  The project-creation tests are rewritten for the account-backed flow, including teammate search.

### Fixed
- **Learning progress:**
  - Progress saved under the module's pre-rename slug counts again.
  - Repeats are dropped.
  - A browser that blocks storage no longer crashes the Learning Center.
  All three were lost in 507b93c.
- **Cookie policy.** It now lists every key the app stores: the per-account lab sessions, the lab sound setting, the System Diagnostics log, and the two session-storage keys. It no longer lists keys the app has stopped using.
- **Developer wording.** "The backend returned an invalid sign-in configuration" now reads "Sign-in isn't set up correctly right now". The Firmware page's "Kiungo server" wording became "Kiungo online".
- **Lint is clean** (it had 8 errors and 5 warnings):
  - The sidebar's collapsed state and the theme are now read with `useSyncExternalStore`, so the effects no longer set state.
  - The teammate search, the pin explorer and the component inspector derive what they show.
  - Two effects that polled the server start on the next tick.
  - Unused imports are removed.

## [1.16.2] - 2026-10-15

### Fixed
- **The Engineering Lab saves your work again.** Since 1.15.1, lab sessions lived only in memory, so a page refresh lost the whole build. They are now saved in the browser **for the signed-in account**, under that account's own key. A refresh or a return visit brings them back, and a second person signed in on the same school computer never sees them. Signed out, nothing is shown. The old storage, which every visitor of a browser shared, stays cleared. The toolbar says **Saved on this device** or **Not saved**. The browser copy is a stopgap until lab sessions are stored on the account's server; the routes the backend needs are in `docs/engineering-lab-simulation.md` §6.

## [1.16.1] - 2026-10-15

### Changed
- **The Home page board is the real Arduino Uno R3.** The hero used to show its own hand-built "Kiungo DEV BOARD", a green slab with Kiungo branding. It now shows the same R3 model as the Component library and the Engineering Lab (`lib/parts/models/arduino-uno.ts`): teal PCB, USB-B and barrel jacks on the left, real headers and silkscreen, and the socketed ATmega328P. It still turns slowly, pauses under the pointer, and can be dragged or turned with the arrow keys.
- **Blink moved to a button.** The pin-13 LED used to be a tiny target on the turning board. **Run Blink** now flashes the board's L LED on and off every half second, with the ON LED lit throughout. **Stop Blink** ends it. The link to the Blink lesson is unchanged.

### Removed
- `components/landing/hero-board.module.css`, the old board's stylesheet.

## [1.16.0] - 2026-10-15

### Changed
- **The Firmware page says what it is and what really happened.**
  - **Simulated builds are labeled.** When the Kiungo server has no compiler for a board, it only checks the project's files. The page used to report that as a normal build. Compiler messages now show a **Simulated** badge and a note that the code wasn't compiled. The Memory tab marks its figures as estimates, and the Compile step turns amber.
  - **Simulated uploads are labeled too.** An upload with no board or flasher used to say "Verified · board reset" with nothing flashed. It now says "Simulated: no board was flashed". "On the board" appears only when a board was really flashed.
  - **The page explains itself.** It opens with what firmware is and four steps: Start a project → Write and save → Compile → Run it. The steps are tracked in the header.
  - **Plain language throughout.** Boards are listed by name ("Arduino Uno", not `arduino-uno`). Each starter says what it does. The panels are renamed: Compiler messages, Serial monitor, Memory (program storage and working memory, in KB), Compilers, Pin activity. Internal project ids are hidden.
  - **No more misleading COM3.** The default port is gone, and the port box says it is a port on the Kiungo server. Upload explains that it flashes boards attached to the server, not to your computer.

### Added
- **Read your own board over USB.** Serial monitor → **My board (USB)** connects to a board plugged into your computer, from the browser (Chrome or Edge), at the speed you choose. It shows each line the board prints, and you can send lines back. Nothing goes through the server. Other browsers get a short explanation.
- **Try it in the lab.** Opens a new Engineering Lab session with your project's board and the parts its starter drives, wired up: Blink gets an LED, DHT11 a DHT11, and so on. Wi-Fi starters use an ESP32. The lab runs its own version of the starter, not your edited code, and the page says so.
- `docs/firmware.md`: how the page works, where each step runs, and what the backend needs for flashing from the browser and running your own code in the lab.

### Fixed
- The server Serial monitor and Compilers tab no longer throw when the server can't be reached; they say so.

## [1.15.2] - 2026-10-14

### Fixed
- **Component library search: the focus ring was clipped on the left.** The scrolling parts list cut off the left edge of the teal ring around the search box. The list now leaves room for the ring on every side, and the search box still lines up with the parts below it. This fix missed the 1.15.1 merge.

## [1.15.1] - 2026-10-14

### Fixed
- **Component library search:**
  - **One clear button.** The browser drew its own × inside the search box next to ours. The browser's × is now hidden for every search box in the app, including Documentation search.
  - **No icon while typing.** The magnifying glass goes away once you type, and the text moves into its place.
  - **Breadboard thumbnail.** The list showed the breadboard as a blank cream rectangle, because thumbnails drew bodies only. Thumbnails now draw printed paths too, so the breadboard shows its holes and red and blue rail stripes.

### Changed
- **The library search is redesigned.** It's a taller, rounded field that turns teal with a soft ring on focus, and it stays pinned at the top of the parts list while you scroll. The clear button is round. A `/` hint shows when the box is empty, and `/` jumps to search from anywhere on the page. Escape clears the search. The match count is a pill with your query beside it ("2 parts match "bre"").

## [1.15.0] - 2026-10-14

### Added
- **Breadboard.** A 400-point half-size solderless breadboard is in the Component library, under a new **Breadboards** group, and in the Engineering Lab. An Uno has one 5 V pin. Wire it to the breadboard's + rail once, and every part can take its power from the rail, as on the bench. In the lab:
  - **It works like the real thing.** The five holes of each half-column are one strip. The channel splits a–e from f–j. Each of the four rails (+ and − along the top and the bottom) is one strip end to end. Wires can go into any of the 400 holes.
  - **Auto-wire uses it.** Adding a breadboard to a build with a board wires the board's 5V to the top + rail and GND to the top − rail. Every part added afterwards takes VCC and GND from free rail holes, and its signals still go to board pins. 3.3 V parts stay on the board's 3.3V pin while the rail carries 5 V.
  - **You can see what's joined.** A strip lights in its net's color once wired: red for supply, slate for ground, blue for a signal. In Trace the breadboard is drawn as its strips, with current running along the ones in use. The caption shows what the rails carry ("5 V · GND"), and the Inspector lists the strips in use and what is on each.
  - **It's checked.** A short made on a strip is caught. GND on a + rail, or 5 V on a − rail, gets a warning. A part on a rail that nothing feeds is told so.
  - **It's suggested** once two or more parts need 5 V.
- The breadboard is drawn as itself in all three views, Trace included. In 3D it is square-on with a gentler tilt, so its 0.1" holes stay far enough apart to aim a wire at.

## [1.14.0] - 2026-10-14

### Changed
- **The Arduino Uno is the real R3.** The 3D, 2D and Trace views now draw the board as it is on the bench, measured from the Rev3 reference: 68.6 × 53.4 mm teal PCB; USB-B jack and barrel jack on the left edge; the digital headers along the top with their 0.16" gap; power and analog headers along the bottom; the socketed ATmega328P bottom right; the 16U2 USB bridge, its 2 × 3 ICSP and the 16 MHz crystal top left; the main ICSP on the right edge; the two 47 µF capacitors by the jack; the regulator; the L, TX, RX and ON LEDs; four mounting holes; and the traces between them. The silkscreen carries the real markings (DIGITAL (PWM~), POWER, ANALOG IN, every pin name, L, TX, RX, ON, ICSP, RESET). The Kiungo branding is gone from it. The Arduino name and logo are Arduino SA's trademarks, so the board carries no logo or wordmark.
- **On the lab canvas the Uno is itself, not a card.** In the 3D and 2D views there is no white box or pin rails around it: jumper wires now land on the real header holes (D0–D13, A0–A5, 5V, 3.3V, GND, VIN, the ICSP's 5 V), with a small handle on each. The name, status and badge sit in a caption above the board, and a selected board glows instead of getting a frame. Hover a pin for its name. The Trace view keeps the card, as before.
- **The USB lead plugs into the real jack.** On Run, the lead comes in from the left and seats in the USB-B jack, in 3D and in 2D, instead of dropping into the top of a card. Other boards keep the card and the lead on top for now.

### Added
- The 3D renderer can draw at a fixed scale without perspective, and `lib/parts/geometry.ts` reproduces its projection, so the lab knows exactly where every pin of a tilted board lands. A part declares `canvas.pins` and `canvas.usb` (`lib/parts/types.ts`) to be drawn bare; the Uno is the first.

## [1.13.1] - 2026-10-14

### Fixed
- Engineering Lab: the Inspector's **Trace** preview showed overlapping text for every part. The Trace view was built for the Component library's large panel: a diagram, then a hover note, then the numbered steps. Squeezed into the Inspector's small fixed-height preview box, the diagram collapsed to nothing and the note and steps were drawn over each other. In the Inspector, Trace now fills the box with the diagram and shows the hover note as one line along its foot. The steps sit underneath in a collapsible "How it works". The box is a little taller in Trace. The Component library's Trace view is unchanged.

## [1.13.0] - 2026-10-13

### Added
- **Log in on the Home page.** Next to **Build a robot now**, signed-out visitors get **Log in**, which opens Continue with Google. Once signed in, that button becomes **Take the learning path**. Build a robot now still goes straight to the lab: nobody has to sign in to try Kiungo.

### Changed
- **The footer is in the brand's colors:** teal deepening to navy, like the logo. It has white headings, soft teal-white links and a reversed logo, so it closes the page with weight instead of blending into the white. It also now closes the Learning Center and Documentation home pages.
- **The Blue, Red and Green themes are redesigned for clarity.** The sidebar was a 40 % mix of the color into slate gray: a hazy mid-tone with white text at about 2.5:1 contrast, the "foggy" look. Cards and text were tinted too, and the muted text was as strong as the main text. Each theme now has:
  - a deep, solid sidebar with white text: navy blue `#0f2557`, crimson `#4c0f1b`, forest `#0b3b2a` (contrast ≥ 10:1)
  - a reversed logo
  - crisp white cards on a faintly tinted page
  - near-black text with a real muted gray
  - a stronger accent: blue `#2563eb`, rose `#be123c`, emerald `#047857`
  - Settings swatches updated to match.

## [1.12.0] - 2026-10-13

### Removed
- The **Platform** tile in Settings (API URL, WebSocket address, workspace product). Settings now has Appearance and Profile. The same details are in System Diagnostics, for administrators.

### Changed
- Screens and messages no longer show technical details. Each change below says the same thing in plain words:
  - **Engineering Lab:** the status pill reads Online, Saving, Connecting or Offline mode. It no longer mentions a "runtime" or a "backend". The Inspector and Real hardware notes say real boards join when Kiungo is online.
  - **Firmware:** reads "Connecting…" and "Kiungo is getting ready…", not "the Kiungo server is waking up". Build progress no longer shows job ids.
  - **Laboratory:** no longer prints the API address.
  - **Projects:** "Read-only API records" is now "Shared records (read-only)".
  - **Experiment Records:** no longer mentions "the connected API".
  - **Profile and sign-in:** messages no longer mention "Kiungo's server".
  - **Legal pages:** say "Kiungo's servers" instead of "the Kiungo backend".
  - **Documentation home:** the "Run Kiungo locally" card says it's for contributors.
- Developer documentation (Run locally, API and environment, Architecture) and the administrators' System Diagnostics keep their technical content on purpose.

### Added
- A test that fails if user-facing code mentions the API, the backend, servers, sockets, runtime, gateways or service addresses (outside System Diagnostics and the architecture docs).

## [1.11.0] - 2026-10-13

### Changed
- Error messages are short and plain. Each says what didn't happen and what to do next: check your connection, sign in, try something smaller, try again in a minute. For faults on Kiungo's side it says "We've logged the problem and will look into it." Messages never show status codes, URLs, "API", gateways or stack traces. This applies to Firmware, the Component library, the Engineering Lab's hardware scan, the hybrid and laboratory screens, profile saving, sign-in, projects and experiment records (`lib/errors.ts`).
- Errors appear in a small notice with an icon (and Try again where it helps), instead of bare red text.
- When browser storage refuses a save, the message says how to fix it (privacy or storage settings).

### Added
- Every error is logged for System Diagnostics with its technical details and the sentence the person saw. A failed request is logged once, and the message shown is added to that entry. Each error is also sent to the backend's error collector (`POST /telemetry/error`) as soon as that route exists, so the team sees errors from every browser.
- A designed error page for any page that breaks while loading, with Try again, Go home and a reference to quote. The Engineering Lab keeps its own version. A last-resort page covers the app frame itself failing.

## [1.10.0] - 2026-10-13

### Added
- **System Diagnostics for administrators** at an unlisted address. The way in is hidden: a small Arduino turns beside the version number in Settings, and seven quick clicks open the page. Opened any other way, the page looks like a broken link. Once in, it checks the platform role the server reports: administrators get the full page, and other accounts or signed-out visitors see "Administrators only". The server doesn't report roles yet, so for now the page opens with a notice saying it can't confirm the role.
- What the page shows:
  - **Overview:** system health, registered and online users, errors in the last 24 hours, service status, activity.
  - **Health:** live checks of the backend and the live-updates connection, admin statistics and analytics; this build's version, environment and service addresses; this browser's network and storage.
  - **Performance:** request times, the slowest endpoints, page load, the backend's own latency, synchronization figures.
  - **Usage:** registered, online, active and new users, and the most visited pages, for all users and for this browser.
  - **Errors:** every failed request and uncaught error, with page, time and details; copy as JSON, clear.
  - **Architecture:** the deployment chain with live status, and the layers.
  - **Reports:** the report center.
- The app now records request times, failures, uncaught errors and page visits in this browser for the page, capped and never sent anywhere.
- `docs/system-diagnostics.md`: how access works, where each number comes from, and the backend contract still to build: `platform_role` on `/auth/me`, `GET /admin/stats`, `POST /telemetry/page-view`, `POST /telemetry/error` and `GET /admin/errors`, with the server enforcing ADMIN.

### Changed
- **Reports** is no longer a page of its own. Its report center lives in System Diagnostics. Each experiment record now has an **Export report** button in Experiment Records, so everyone can still save their work as Markdown. `/reports` redirects to Experiment Records.
- An administrator permission (`platform_role`) is kept apart from the profile's self-described role, so editing a profile can never grant access.

## [1.9.0] - 2026-10-13

### Changed
- The Hybrid Hardware page has been reorganized and redesigned:
  - The four device modes (Virtual, Physical, Simulator, Hybrid) are explained at the top, with a link to the Device modes article.
  - Building an experiment is laid out as three numbered steps: name it and pick the board; choose parts and how each one joins; create, then run it. A filter narrows the parts list, and a summary counts the chosen parts by mode.
  - The run panel shows the experiment's status in words (Ready to start, Running, Stopped) and gains a Stop button. "Advance" is renamed **Step 100 ms**.
  - Hardware availability lists parts by name and mode, instead of raw data. Missing components come with what to do about them.
  - The circuit panel explains itself before an experiment exists.
  - Colors follow the theme, including dark mode.
- If boards and parts can't be loaded, the page says so plainly and offers the Engineering Lab instead of showing an empty form.
- Failed actions show a short, plain message instead of the technical error.

## [1.8.0] - 2026-10-13

### Changed
- **Architecture** and **Roadmap** are part of Documentation now, as the team agreed: `/docs/architecture` and `/docs/roadmap`, with breadcrumbs, a "The platform" section on the Documentation home, and entries in docs search. They are no longer in the sidebar. `/architecture` and `/roadmap` redirect, so old links still work.
- The roadmap has been reviewed and rebuilt around the project's four goals: build without every part, mix virtual and real, bridge learning and building, and work others can repeat. It now has three development phases: Phase One, the web platform (in progress); Phase Two, desktop and real hardware; Phase Three, classrooms and clubs. Each phase names the goals it serves, has milestones with a status (Done, In progress, Next, Planned) and lists the conditions that mark it done. A "Where we are" summary leads the page. The data lives in `lib/roadmap.ts`.
- The Development phases article matches the roadmap's phases and exit criteria.

### Added
- The project history on the roadmap records when HHIP became Kiungo: v1.1.0, pull request #11, merged 9 October 2026 at 09:59 EAT (06:59 UTC). "What is Kiungo?" gives the date too.

## [1.7.0] - 2026-10-13

Engineering Lab QA cycle 2. Root causes, acceptance matrix and retest steps are in `docs/engineering-lab-simulation.md` §4.

### Fixed
- Selecting an LCD 16×2 showed "Hello, Kiungo! / Temp: 24.5 C" in the Inspector while its Live panel named the DHT11 as the source. The Inspector's preview drew the Component library's model, which has that sample text printed on its glass. The lab's own data path was correct. The preview now shows what the sketch wrote this frame, in 3D and 2D, the same as the canvas, or nothing before Run.
- Changing a stepper's speed partway through a move made it jump, because the whole move was re-timed at the new speed. The rest of the move now continues from where the shaft is.
- Stop on a stepper replaced the move it interrupted, so the commanded and executed steps couldn't be compared. The move now stays on record as stopped partway.
- A DC motor's shaft angle (frame data) turned the same way in reverse.

### Changed
- The LED's resistor note explains the model. The lab has no resistor part, so it assumes a 220 Ω resistor in series and shows the current that gives (13.6 mA from a 5 V pin, 5.9 mA from 3.3 V). The LED's Live panel shows "Current (modelled)". It remains a tip: a real build needs the resistor.
- Stepper Live readings: Position, Position (steps), Command, **Last move** and **Done** ("670 of 2000, stopped").
- An LCD's Live "Source" says whether each reading is set, simulated or missing. A sensor that is wired but can't be read (no ground, say) shows "DHT11: no data / Check its wiring" instead of the no-sensor banner.

### Added
- `__tests__/LabAcceptance.test.ts`: 37 acceptance tests for the five experiments as the QA brief lists them, plus a component test that the Inspector preview shows the live LCD text.

## [1.6.1] - 2026-10-13

### Removed
- The **System Diagnostics** page and its sidebar link, as the team agreed: everything on it is shown elsewhere. Project and experiment counts are on Projects and Experiment Records, and the synchronization and latency metrics are in Advanced Analytics. `/dashboard` now redirects to `/analytics`, so old links and bookmarks still work.

## [1.6.0] - 2026-10-13

### Added
- Powering up on Run. In the Engineering Lab, pressing Run plugs a USB lead into each board before the sketch starts: the cable drops in from above, the plug seats with a small settle, a click and a ring on the port, and a 5 V pulse runs down the cable while the sketch runs. Each board gets the plug it really takes: USB-B for the Uno and Mega (the square printer-style plug; the USB-A end is in the computer, off the canvas), micro-USB for ESP32, ESP8266, Pico, STM32, Teensy and micro:bit, USB-C for the Raspberry Pi 4. The run starts once the plug is seated (about half a second); the Run button reads "Powering…" meanwhile, and pressing it again cancels. Stop pulls the lead out. The click is part of the lab's sound and follows the sound button.
- With "reduce motion" set in the system, the lead appears already plugged in and the run starts at once.

### Changed
- Parts higher on the canvas draw over the parts below them, so a lead coming down to a lower board passes behind the one above. A selected part no longer jumps above the others.

## [1.5.0] - 2026-10-13

### Added
- Buzzers you can hear. In the Engineering Lab, a buzzer now sounds through the speakers exactly when the sketch drives its pin: a 12 mm active buzzer's fixed ~2.3 kHz tone (a square wave through the piezo's resonance, with its millisecond attack and short ring), fast 150 ms beeps while an alarm condition holds (ultrasonic obstacle too close, motion, gas…), or a 150 ms chirp per blink period with no sensor. Beeps are scheduled on the sound card's clock, so they stay crisp and in step at any simulation speed; two buzzers are slightly detuned and beat against each other as real ones do. Silent when stopped, when the sketch isn't driving the pin, or in a background tab.
- A sound button in the lab's top bar mutes and unmutes the buzzers; the choice is remembered in this browser. Sound starts with the first Run, as browsers require a click before audio plays.

## [1.4.0] - 2026-10-13

### Added
- Skeleton loading on every page. The app frame (sidebar and top bar) now lives in the root layout, so it paints at once and stays put between pages; each route has a loading view that shows the page's real title and a skeleton shaped like its content (stat tiles, cards, lists, tables, charts, articles, the Embedded Studio, the lab) until the data arrives. Measured against a 4-second API: the frame and title appear in under 0.2 s.
- A small "i" on each view option in the Engineering Lab and the Component library explains the view in a sentence or two.
- Engineering Lab problems can be copied: double-click one to copy it, or right-click for Copy problem, Copy all problems and Show the part. The text can also be selected. Copied text reads "Fault: …", the explanation, and the parts involved.

### Changed
- View options renamed: "3D model", "Top view" and "Current flow" are now **3D**, **2D** and **Trace**, everywhere (lab, library, Inspector, lessons).
- The Engineering Lab opens with only the canvas: the parts panel and the Inspector start hidden behind their buttons in the top bar (or "/" and right-click → Search parts / Inspect).
- Experiment records, reports and the code editor show skeletons instead of a spinner while they load.
- The company is credited as Kiungo Labs Technologies (footer description, copyright, structured data, legal drafts, API error text) instead of Jumetra Technologies. Repository names and the GitHub organization link are unchanged.
- The current page is marked for screen readers in the sidebar (`aria-current`).

### Fixed
- View-switcher icons could shrink to a few pixels wide when space was tight (the Trace/Current-flow icon looked like a dot).
- Moving between pages no longer redraws the sidebar, and each new page starts at the top.

## [1.3.0] - 2026-10-12

### Added
- Engineering Lab inputs. Select a part to set its surroundings (ultrasonic obstacle distance, PIR motion, DHT temperature and humidity, light, soil moisture, gas, tilt, pressure), an actuator's command (servo angle; DC motor speed and direction; stepper moves, speed, Stop and Zero), or a board's sketch settings (blink delay, warning distance, gate angles, alarm levels). Values are clamped to each part's documented range. Sensors keep a labelled "Simulated sweep" until a value is set; "Defaults" returns to it.
- Sketch rules per board (`lib/lab/sketch.ts`): outputs follow the board's alert sensor (ultrasonic below the warning distance, PIR motion, gas, dry soil, darkness) or blink with the set delay; a PIR and a servo make a gate; displays show the board's sensors. Written down in `docs/engineering-lab-simulation.md` with the acceptance matrix and retest steps.

### Fixed
- Engineering Lab: the LCD 16×2 "always showed 24.5 °C". That text was painted on the part model's glass; the live reading was a small overlay showing only the first value. Display glass now shows the frame's lines in the 3D and top views (temperature and humidity on separate lines, cut to the display's width) and is blank when the sketch isn't running.
- Engineering Lab: the blink interval, obstacle distance, motion, servo angle, motor speed and direction, and stepper position all followed fixed formulas of time and could not be controlled. They now follow the inputs above; nothing oscillates unless it is in the labelled simulated mode.
- Engineering Lab: the stepper's step count accumulates with its moves and its position wraps at 360°, instead of a counter that climbed for ever.

## [1.2.3] - 2026-10-12

### Changed
- Firmware (Embedded Studio) opens at once instead of waiting on the server. The project and template lists load in the background, the last lists seen in this tab show straight away, and the built-in template list fills the New Project form before the server answers. A bar under the header says when the server is still waking up (it is a Firebase function that sleeps when idle and takes several seconds to start) and offers Retry if it can't be reached.
- The code editor is fetched while the page is idle, so opening a project no longer waits for the download.

### Fixed
- Firmware: New Project showed "API /firmware/projects failed: 401" when the server wanted a signed-in user. The studio now says "Sign in to create a firmware project" with a Log in button, retries once with a refreshed session when one is stored, reports an expired session in plain words, and finishes the action by itself after the user signs in.
- The editor loader's failure on networks that block its CDN no longer surfaces as an unhandled error; a plain text editor is used instead.

## [1.2.2] - 2026-10-12

### Fixed
- Engineering Lab: finishing a wire while a part was selected (as it is right after adding one) crashed the page with "This page couldn't load". React Flow and the lab were both setting the selection and kept undoing each other, one render apart, until React stopped. Selection now has one owner. React Flow reports clicks, and the lab decides what's selected.

### Added
- An error page for the Engineering Lab. If anything else breaks, it offers to reopen the lab or go to Projects instead of the browser's blank error.

## [1.2.1] - 2026-10-12

### Changed
- Home page footer: the Kiungo description now runs as one band across the top, beside the logo. The Product, Learn, Legal and About columns sit underneath as four even columns, or two on phones. The description lines up with the Learn column.

## [1.2.0] - 2026-10-09

### Added
- Sign-in modal with Log in and Sign up modes, opened from Settings and the sidebar.
- Profile modal: Google photo, name, email, role, organisation, location and an about line. Users can edit and save these, clear them, or delete their account.
- Settings "Profile" tile with a preview of the profile. It opens the profile modal; signed out, it shows Log in (primary) and Sign up.
- Google profile photos in the sidebar, Settings and profile, with initials as the fallback.
- App version shown in the Settings footer.
- `docs/accounts-and-profile.md`: the visual spec, component architecture and backend contract (`PATCH /auth/me`, `DELETE /auth/me`).

### Changed
- "Continue with Google" follows Google's branding: the four-colour G on a neutral pill, readable in light and dark themes. It no longer fades out while sign-in loads.
- The sidebar account row opens the profile (or sign-in when signed out); the gear still opens Settings.
- Settings and the new modals share one modal shell, so they stack: Escape closes only the top one.
- Sign-in errors are in plain words (pop-up blocked, domain not authorised, offline). Closing the Google window is no longer reported as an error.

### Fixed
- Sessions from backends that nest the user under `user` (as `jumetra-backend` does) are read correctly.
- Refreshing the session no longer drops the profile photo when the backend leaves it out.

## [1.1.0] - 2026-10-09

### Changed
- Rebrand from HHIP to Kiungo: vector mark, loading animation, broken-link 404 page, teal theme, and renamed docs and Learning pages with redirects (#11).

## [1.0.0] - 2026-10-08

### Added
- First complete release: Learning Center and Documentation (#1), System Architecture Explorer (#2), elastic scrollbars (#3), sidebar brand (#4), Settings modal (#6), landing page (#7), Component library with 34 parts in three views (#8), Engineering Lab with saved sessions, three views and circuit checks (#9), Google sign-in and account display (#10). Production API on Firebase.

[1.17.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.16.6...v1.17.0
[1.16.6]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.16.5...v1.16.6
[1.16.5]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.16.4...v1.16.5
[1.16.4]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.16.3...v1.16.4
[1.16.3]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.16.2...v1.16.3
[1.16.2]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.16.1...v1.16.2
[1.16.1]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.16.0...v1.16.1
[1.16.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.15.2...v1.16.0
[1.15.2]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.15.1...v1.15.2
[1.15.1]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.15.0...v1.15.1
[1.15.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.14.0...v1.15.0
[1.14.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.13.1...v1.14.0
[1.13.1]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.13.0...v1.13.1
[1.13.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.12.0...v1.13.0
[1.12.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.11.0...v1.12.0
[1.11.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.10.0...v1.11.0
[1.10.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.9.0...v1.10.0
[1.9.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.8.0...v1.9.0
[1.8.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.7.0...v1.8.0
[1.7.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.6.1...v1.7.0
[1.6.1]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.6.0...v1.6.1
[1.6.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.5.0...v1.6.0
[1.5.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.2.3...v1.3.0
[1.2.3]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.2.2...v1.2.3
[1.2.2]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/releases/tag/v1.0.0
