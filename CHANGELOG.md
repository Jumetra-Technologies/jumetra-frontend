# Changelog

All notable changes to the Kiungo frontend. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html):

- **Patch** (`1.2.0 → 1.2.1`): fixes, no new behaviour.
- **Minor** (`1.2.0 → 1.3.0`): new features that keep saved data and URLs working.
- **Major** (`1.2.0 → 2.0.0`): breaking changes, such as a new saved-data format, removed routes, or a backend contract older clients can't use.

Every pull request that changes the app bumps the version (`npm run release:patch | release:minor | release:major`) and adds an entry here. A pull request that changes the desktop app (`apps/desktop`, or the `packages/` it bundles) also raises `apps/desktop/package.json`'s version: merging it publishes that version to every installed copy. `__tests__/Version.test.ts` fails if the version in `package.json` has no entry. Tag the merge commit `vX.Y.Z` on `main`.

Versions before 1.2.0 were assigned after the fact to the pull requests already merged.

## [1.49.0] - 2026-11-12

Board pins look like the real header, and auto-wire stops using the ICSP 5 V. Desktop 0.13.13.

### Changed
- **A board's pins are black female sockets**, as on the real header, instead of colored dots. The pin's role (power, ground, digital, PWM, analog, bus) is a thin colored ring round the socket. Once a wire is plugged in, the socket fills with that color.
  - The ICSP header's male pins show only the ring.
- **Pins are easier to hit and to reach by keyboard:**
  - Each pin's target spans one pin spacing along its header and 24 px across it, so neighboring pins never overlap.
  - Pins can be focused with Tab, with a visible outline and the pin's name shown.
  - Screen readers hear the part, the pin and what it's wired to: "Arduino Uno D13 SCK pin, wired to LED Anode (+)".
  - Pins on a part's card in Trace get the same.
- The 2D drawing's header sockets are black openings with a rim, not gray squares.

### Fixed
- **Auto-wire never takes a part's power from the ICSP header.** An LDR, a display or a sensor on the Uno's right used to get its 5 V from `5V ICSP`. It now comes from the power header's 5V, wherever the part sits. The same goes for the Mega, and for a breadboard's + rail.
  - Pins on a programming header are marked as such in the part data (`programmingHeader`).
  - Builds that already use `5V ICSP` still open and work: it is still a real 5 V pin.

## [1.48.0] - 2026-11-12

In the desktop app, the code takes half the window. Desktop 0.13.12.

### Changed
- **Desktop: the code is an equal half beside the circuit.**
  - It opens at 50 % of the width (it was 42 %).
  - If your saved width was still the old default, it moves to 50 % once. A width you chose yourself stays.
  - Dragging the divider or using the arrow keys on it still resizes it, from 25 % to 70 %.
- **Desktop: Show or hide the code is also in ⋮.** The Code button in the top bar and ⌘E (Ctrl+E) stay.
- **Desktop: hiding the code keeps the editor open behind the scenes.** Your open files and undo history are still there when you show it again.
- **The lab's top bar fits the width it has, not the window's.** Beside the code it drops the simulated time first, then the view switch (still in ⋮ → View), then the + Add label. Run never moves or gets covered: checked at every lab width from 290 px up.

### Fixed
- **Desktop: moving a sketch file to the trash asks in the app's own dialog.** The system's confirm box blocked the whole window, Esc emergency stop for a running board included. **Keep it** is the default.

## [1.47.0] - 2026-11-12

A part's settings open beside the part when you click it, and the inspector panel is gone. Desktop 0.13.11.

### Changed
- **Click a part to see its properties**, in a small window beside it.
  - It flips to the other side near the edge of the canvas and follows the part as you pan or move it. On a phone it is a sheet at the bottom of the screen.
  - It doesn't open when you drag a part, Shift-click to pick several, or drag a selection box.
  - Escape, a click on empty canvas, or picking more parts closes it. Clicking another part moves it there.
  - **It never pauses the run:** turn a sensor's knob while the circuit runs and watch it react.
- **What's in it:**
  - The name, which you can edit, with Duplicate, Remove wires and Delete beside it.
  - The part's settings, in SI units.
  - **Runs on** (virtual, hybrid or physical), for boards only.
  - **Now**: the live readings.
  - **Pins and checks**, closed until you open it: each pin, what it's wired to, and this part's problems. The full list of problems stays in the Problems tab.
  - The Component library link.
  - A breadboard shows the strips in use.
- **Click a wire for its own smaller window:** its two ends, a color (red, black, orange, yellow, green, blue, white, or Auto for the color of what it carries), the net, what it carries now, and Delete. A picked color is saved with the build and can be undone.
- **The circuit overview is now ⋮ → Circuit summary**, in a window: ready, to wire, faults, problems, power and the legend.
- **The inspector panel and its button are gone.** The three-view thumbnails went with it: the canvas already shows the part. Right-click → **Properties** opens a part's window. In the desktop app the command palette's "Show or hide the Inspector" is now **Show the selected part's properties**.
- **Desktop 0.13.11:** all of the above, from the shared lab.

## [1.46.3] - 2026-11-12

A simpler lab top bar and the whole parts library in one place: **+ Add**. Desktop 0.13.10.

### Changed
- **The lab's top bar keeps only what you reach for.** Left to right:
  - **+ Add**, the brand teal button;
  - the session's name and its menu;
  - **Run / Stop**, which says what it's doing: Building…, Powering…;
  - the simulated time;
  - **⋮**;
  - the 3D / 2D / Trace switch, as icons, with each view's explanation in its tooltip;
  - the host's own buttons (the desktop's Code) and the save status.

  Emergency stop stays in the bar while a real board runs.
- **Everything else is in ⋮:** step 100 ms, reset, speed, buzzer sound, undo, redo, fit to screen, the view, opening and saving a `.kiungo.json` file, and the connection status.
- **Run** is navy in the brand palette, so it never looks like **+ Add**. Both pass WCAG AA contrast.
- **+ Add (or /) opens "Add a part": the whole library in a window**, instead of a side panel.
  - Search, the ten group filters, suggestions for your build, and the starter builds are all there.
  - The header counts the parts from the catalog.
  - Click or Enter adds a part at the center of the canvas and closes the window. **Shift-click** (or Shift+Enter) adds and keeps it open, and each next part lands 24 px further down and right. A new part never covers one that was already there.
  - Escape closes the window, and focus returns to + Add.
- **The components side panel and its toggle are gone.** Parts can still be dropped onto the canvas from elsewhere.
- The modal on the native `<dialog>` that the desktop app used is now shared from `@kiungo/ui`. The lab uses it, and the desktop's dialogs are unchanged.
- **Desktop 0.13.10:** all of the above, from the shared lab.

## [1.46.2] - 2026-11-13

### Fixed
- **Desktop 0.13.11: two account requests at once no longer sign the app out (audit DESK-001).**
  - When the access token had run out, each caller refreshed the session on its own with the same refresh token. Account import asks for two things at once, for example.
  - A refresh token can only be used once, so the second refresh was refused. The backend is now gaining replay detection (jumetra-backend audit fix BE-1), and with it that second refresh would also end the device's sign-in.
  - Now every caller waits for the same refresh.
  - Signing out while a refresh is in flight stays signed out.
- **Desktop 0.13.11: an Arduino CLI that can't be started no longer leaves things looking connected (DESK-007).**
  - Before, a failed spawn of the serial monitor or the Hybrid link left the port shown as open with nothing behind it. A failed spawn of the board watcher stopped watching for good.
  - Now they close and say why, or the watcher restarts.

## [1.46.0] - 2026-11-12

Every value you set on a part in the Engineering Lab is now a physical quantity in SI units. A resistor takes any value you type. Desktop 0.13.10.

### Changed
- **A resistor takes any value from 0.1 Ω to 10 MΩ.**
  - Type it the way it's printed: `4.7k`, `4k7`, `4700`, `4.7 kΩ`, `330`, `1M`, `10M` or `4R7`.
  - One click picks a common value: 220 Ω, 1 kΩ and 10 kΩ come first, then the E24 values of the decade you're in.
  - A new **Tolerance** setting: ±5 % (the default) or ±1 %.
  - The color bands are now right for every value: two digits, a multiplier (gold ×0.1 and silver ×0.01 below 10 Ω), then a tolerance band. 4.7 Ω is yellow, violet, gold.
  - A value that isn't a standard E24 value is drawn as the nearest one ("Bands show 1.2 kΩ…"). The circuit still uses exactly what you typed.
- **Every setting is stored in SI units and shown with an SI prefix:**

  | Setting | Shown as |
  |---|---|
  | Distance | 300 mm |
  | Pressure | 1013.2 hPa |
  | Blink delay | 500 ms |
  | Step rate | 256 Hz |
  | Angle | 45° (radians are kept) |
  | Humidity, moisture and motor duty | % (kept as a ratio) |
  | Gas | ppm |

  Temperature stays in °C (kelvins in its tooltip).
- **The LDR is set in lux**, from 0 to 100 000 lx on a log slider, and shows the resistance that light gives it. The board's **Dark below** setting is in lux too.
- **A potentiometer's knob** is its share of the track in %. It gets a **Track resistance** setting (10 kΩ by default) and shows the resistance from end A to the wiper.
- **Typing a value works the same everywhere:**
  - Enter keeps it, and Esc puts back the old value.
  - A value that isn't a number, or is out of range, is refused with a message under the field instead of being clamped silently.
  - The range is written under each field, each field has its own reset, and a slider sits beside it where a range is natural.
- **A motor's speed** reads in rad/s with rpm after it: "14.7 rad/s (140 rpm)".
- **The MCP server's `set_inputs`** takes SI numbers, or a value written with its unit: `{"distance": "120 mm"}`, `{"ohms": "4.7k"}`.
- **Labs saved before this change open unchanged and simulate exactly as they did.** Their values are converted when they open (30 cm becomes 0.3 m, 1013 hPa becomes 101 300 Pa).
  - Keys that named their unit get an SI name: `distanceCm` becomes `distance`, `delayMs` becomes `delay`, `pressureHpa` becomes `pressure`, `stepsPerSecond` becomes `stepRate`, and `warnCm`, `darkPct`, `dryPct` and the board's `gasPpm` become `warnDistance`, `darkBelow`, `dryBelow` and `gasAlarm`.
  - Lab files are now written as version 2. An older Kiungo asks to be updated rather than misreading the values.
- **Desktop 0.13.10:** all of the above, from the shared lab.

### Fixed
- **Resistor bands for values under 10 Ω, or with more than two significant digits, were wrong.** 4.7 Ω drew as 5 Ω, and 1234 Ω drew as 1.2 kΩ without saying so. The cache of recolored resistors is also now capped at 64.
- **`npm run parts:check` failed on `main`:** it took the generated `catalog/counts.ts` for a part.

## [1.45.0] - 2026-11-12

### Added
- **The website's lab can run your own code (WP-D2).** A web program driver (`lib/lab/program.ts`), modeled on the desktop's, does the following when you press Run:
  - It sends the session's sketch to Kiungo's compile service (`lib/lab/compile.ts`, `https://kiungo-compile.onrender.com`).
  - It loads the Intel HEX into the shared emulator in a worker (`lib/lab/emulator-worker.ts`).
  - It feeds the board's pins and serial to the lab.
  - Builds come back in the desktop's `BuildResult` shape, with problems parsed by the shared `parseDiagnostics`.
- **When the driver steps aside**, Run shows the built-in behavior and says why: there's no code, there's no Arduino Uno, or the Uno is marked Physical or Hybrid.
- **If the compiler can't be reached or is busy**, Run falls back to the built-in behavior with a clear message instead of failing.
- **A sketch the compiler refuses**, or one with mistakes, stops the run with its problems.
- **The compile service is woken when the lab opens**, because its free plan sleeps.
- **The shared lab: `ProgramDriver.start` can answer `{ ok: false, fallback: true }`**, and the lab then runs the built-in behavior and shows the message. Desktop 0.13.9 carries this change; its own runs never fall back.

## [1.44.0] - 2026-11-12

### Changed
- **Every brand-teal fill now has the footer's grain.** That covers the main buttons, the chosen option in segmented controls and the sidebar, avatars, the progress fill on the download button, and the Home page's play button.
  - The grain blends over the color, so the teal stays exactly #077a7d on average.
  - It's static, and hidden in Windows high-contrast mode.
  - It only appears where the color is teal: the blue, red, green, high-contrast and dark palettes, whose buttons aren't teal, stay smooth.
- **Desktop 0.13.8:** the same grain, from the shared theme.

## [1.43.0] - 2026-11-11

### Changed
- **The Home page board is now a Blink scene with one big emerald-teal play/stop button.** The "Run Blink" switch and its description underneath are gone.
- **Still:** the real Arduino Uno R3 model holds a fixed three-quarter view from the front left, with the USB and power jacks toward you and the headers behind.
- **Play:**
  - The USB lead slides in from the left and plugs into the USB-B socket. The ON LED lights.
  - A 220 Ω resistor (red, red, brown, gold) pops in and stands in pin 13.
  - A red LED pops in with its short leg in GND and its long leg twisted onto the resistor.
  - Each connection flashes teal as it seats.
  - The sketch uploads (TX, RX and L flicker), then the LED and the board's L LED blink together, on and off every half second.
  - The camera moves in on the build and sways slowly while it blinks.
- **Stop:** the parts leave and the camera returns to the still view.
- **Reduced motion:** the parts appear in place without flying in, and the camera holds still.
- **Without WebGL:** the board's top view shows instead, without the button.
- **Screen readers:** the scene's description follows each step.

## [1.42.0] - 2026-11-11

A cleaner desktop frame, notifications that tell you what's actually happening (with the button to act on it), a dashboard that knows the time of day, and desktop updates that publish themselves when a pull request is merged. The frame and notifications shipped in desktop 0.13.6 (#107); the greeting is desktop 0.13.7.

### Added
- **A greeting that knows the time and the calendar**, at the top of the dashboard, with your first name when you're signed in:
  - **Good morning** from 5:00, **Good afternoon** from 12:00, **Good evening** from 18:00, and **Lock in late night** from 23:00 until 5:00.
  - **On a public holiday, the holiday's greeting all day:** "Merry Christmas, Brad", "Happy New Year", "Happy Easter".
  - **Kenya's public holidays** are added on a computer set to Kenyan time: Labour Day, Madaraka Day, Utamaduni Day, Mashujaa Day, Jamhuri Day and Boxing Day.
  - Today's date sits above it. The greeting changes on the minute while Kiungo is open.
- **Notifications that mean something**, behind the bell in the top bar. They come from what's really true on your computer:
  - **An update ready to install**, with **Update now** (saves your projects, restarts on the new version) and **What's new**.
  - **An update downloading**, with its progress.
  - **An update check that failed**, with **Try again**.
  - **Firmware can't be compiled yet**, when the Arduino toolchain is missing, with **Set it up**.
  - **You're offline**, when signed in without a connection.
  - **Updated to Kiungo X**, once, after an update, with **What's new**.
- **The bell shows how many** notifications there are (3, not just a dot), on a new liquid-glass button. Each notification can be dismissed; with none, it says you're all caught up.

### Changed
- **One title bar, not two.** The separate Windows/Linux title bar is gone. The sidebar and top bar run to the top edge of the window, the window buttons sit in the top bar and follow light and dark, and you drag the window by the top bar or the sidebar's name. On macOS the traffic lights sit at the top of the sidebar.
- **One name.** The sidebar shows "Kiungo" once, as plain text: no logo, no 2.0 badge, and no "Platform" label.
- **A quieter top bar:** only the notification bell. The breadcrumb ("Kiungo / Dashboard"), the search box (Ctrl+K still opens commands and search, as the footer says), the "Systems nominal" label and the light/dark toggle are gone. Light and dark live in **Settings → Appearance**.
- **One way to Settings.** The sidebar's foot has the Settings row and, below it, Sign in or your account. The second settings button next to Sign in, and Settings in the account menu, are gone.
- **The update card in the corner** now only answers a check you start in Settings. Updates found in the background go to the notifications, so they're never shown twice.
- The footer shows the version number instead of "Kiungo 2.0".

### Removed
- The three sample notifications ("Firmware build passed for Line Follower" and others), which were placeholders, not real events.

- **Desktop updates publish themselves.** Merging a pull request that raises the desktop version now builds that version and puts it in the update feed, so every installed copy's **Check for updates** finds it. Before, someone had to run **Release the desktop app** by hand, and merged changes sat unreleased.
- **A pull request that changes the desktop app must raise its version.** A new CI check, **Desktop · version raised for the update**, fails otherwise. Changes to tests and docs don't count.

### Fixed
- **A test that failed at random:** the one that draws every part in all three views now has a time limit that fits 88 parts.

## [1.41.0] - 2026-11-11

### Changed
- **A new site footer in the logo's emerald teal.**
  - The page melts into a pale mint, which deepens through the logo teal (#077a7d) to near-black teal at the very bottom.
  - A two-layer film grain sits on top. It's static.
- **The fade starts from the exact color above the footer** (the page, a section or the app canvas), so there's no seam.
- **Text starts at the logo teal**, where white text is 5.3:1.
- **Dark themes use deeper teals for the fade**, so no pale band glows against black.
- **The grain is hidden in Windows high-contrast mode.**
- **The footer's dividing lines are white again.** The page's border color had been overriding them.

## [1.40.0] - 2026-11-10

The Component library, rebuilt: 88 parts where there were 38, every one redrawn from its real dimensions with the engineering data behind it, and a lab that understands batteries, motor drivers and heat. Desktop 0.13.5.

### Added
- **50 new parts**, chosen from what 41 robot kits, competition builds and shops really use:
  - **Power** (new group): 4 × AA, 9 V, 2 × 18650, 2S LiPo, 3S LiPo and 1S LiPo batteries; an LM2596 buck converter and an MT3608 boost converter; the MB102 breadboard supply; a TP4056 charger.
  - **Buttons and controls** (new group): push button, potentiometer, joystick, IR receiver, rotary encoder, 4 × 4 keypad, slide switch, limit switch.
  - **Drivers and switches** (new group): L298N, TB6612FNG, L293D, DRV8833, A4988, PCA9685 and an IRF520 MOSFET module. The relay moved here.
  - **Motors and servos** (new group): N20 gear motor with encoder, MG996R servo, NEMA 17 stepper, water pump. The SG90, the TT gear motor and the 28BYJ-48 moved here.
  - **Sensors:** TCRT5000 line sensor, FC-51 obstacle sensor, QTR-8A line array, Sharp IR ranger, wheel encoder, VL53L0X, TCS34725 color sensor, BNO055, QMC5883L compass, sound sensor, INA219.
  - **And:** Arduino Nano; capacitor, diode, transistor and level shifter; NeoPixel ring and stick; TM1637 and MAX7219 displays; RC522 RFID reader.
- **Engineering data on every part**, in a new panel under the views:
  - **Power:** the supply it takes and what it draws idle, working and at worst.
  - **Heat:** for parts that waste power, how warm they get doing a typical job, worked out from their own numbers.
  - **Form factor:** mass, how it mounts, pin pitch, mounting holes.
  - **Sourcing:** the real part number, its maker, whether it is still made, and a price range.
  - **Know its limits** and **Better for a new build:** where the part falls short, with numbers, and what to use instead. An L298N turns about 1.8 W into heat at 1 A; a TB6612FNG about 0.1 W.
- **The lab understands power:**
  - **Batteries and converters are real supplies.** A converter's output is live only while it is fed. A board's VIN takes a battery, and the lab says when that battery is too weak or too strong for it.
  - **A motor runs from a driver, not from a board pin.** Wiring one to a pin is an error that says what to put between them. A stepper needs both coils on one driver, and a stepper driver that limits current (the A4988) is expected to run from far more than the motor's rated voltage: the lab budgets what it really draws.
  - **A power budget in Circuit check:** each supply with what hangs on it against what it can give, how long a battery lasts, and the parts that run warm. The lab warns before a supply is overloaded or a part overheats.
  - A part on its own battery has to share the board's ground, and the lab says so when it doesn't.
  - A level shifter in a wire clears the "5 V signal into a 3.3 V input" fault.
  - **Auto-wire** sends a battery to the driver waiting for one and a motor to a free driver channel, and wires a driver's control pins.
  - New sensors and controls bring their own knobs and readings to the lab.
- **Your own code reaches the new parts.** Buttons, switches, knobs, the joystick and the sensors with an analog or digital output answer a program on the emulated board and in a Hybrid run, with no code written per part. A program drives motors through a driver: direction from IN1 and IN2, speed from the PWM duty, steps from STEP, and nothing while standby is low. The MG996R follows its pulse like the SG90.
- **The lab's part search knows the new kinds.** A motor says it needs a driver and a battery says what it can power, in place of "Works with Arduino". With a motor on the canvas the search offers the driver it needs, then the battery the driver needs, and a project brief that mentions a line, a battery, a button, a compass or a keypad is matched to the part.
- **AI clients build with the new parts.** The MCP server (now 0.2.0) lists all ten groups, gives each part's power data and limits, sends a battery to the driver waiting for one and a motor to a free channel, and says what to add first when a part has nothing to wire to yet.

### Changed
- **Every part the library already had was redrawn** from datasheet dimensions. Among the corrections: the SG90's body is 23 mm long (it was drawn at its 32 mm tab length), the TT motor is 70 × 22 × 18 mm, the breadboards are 82.5, 165.1 and 47 mm wide with a real center channel and dovetails, the Ra-02 is 17 × 16 mm, and the 28BYJ-48 takes 2037.9 steps a turn, not 2048.
- **2D is now a labeled pinout drawing.** Each pin has a colored chip beside the part with a line to its pad; hover a chip to read what the pin does. Mounting holes show their size.
- **Trace now draws the flow over the part itself**, numbered to match the diagram beside it. The block that makes heat glows, with its temperature.
- **Ten groups in place of six**, in the order a build comes together: Boards, Power, Breadboards and basics, Buttons and controls, Sensors, Motors and servos, Drivers and switches, Lights and sound, Displays, Radios and tags.
- **The website and the desktop app share one library screen**, so both have the same views, search and engineering panel.
- Saved projects open as before: no part or pin was renamed. Two radios are stricter, as the real parts are: an RC522 or a Ra-02 LoRa module on a 5 V board now raises "5 V signal into a 3.3 V input", and a level shifter clears it.
- The FAQ, the documentation and the page descriptions name the new groups and the real number of parts.
- **The home page lists the real library.** Its library section counted 20 parts from an older list; it now counts and lists every part in the library, each linking to its page.

### Fixed
- **A chip's marking or a key's legend could vanish from some 3D angles.**
- **Printing off a part's footprint wasn't drawn:** a label on a cable, traces on a flex tail.

### For people adding parts
- **One file per part:** `packages/core/src/parts/catalog/<group>/<id>.ts` holds its body, pins, Trace, engineering data and how the lab runs it. The guide is `docs/parts/AUTHORING.md`.
- `npm run parts:check` checks a part against the rules, `npm run parts:sheet` draws it for comparing with a photo, and `npm run parts:index` lists it in the library.
- `npm run parts:index` also writes `catalog/counts.ts`: the number of parts in all and by group, for pages that state the numbers without loading every part.
- **Known cost:** the part data is about 240 KB of compressed JavaScript where it was about 62 KB. Every page of the website loads it, as before, because the root layout's lab-session sync imports the lab store. Loading it only on the pages that use the lab is a follow-up.
- How the lab models supplies, motors, the power budget and heat is written up in `docs/engineering-lab-simulation.md` (section 7).

## [1.39.2] - 2026-11-10

### Fixed
- **Security: the download route could be made to pass through any GitHub repository's files.** `/api/desktop/download` checked the address as text, so `..`, backslashes or encoded dots after the allowed prefix resolved to someone else's release, served from Kiungo's own address. It now parses the address and checks its host, its exact path and every segment, and fetches only an address already in that exact form.

## [1.39.1] - 2026-11-10

Desktop 0.13.3.

### Removed
- **The Current workspace dropdown in the desktop sidebar** (Everything, Research Focus, Engineering Focus and so on). The sidebar now starts with Dashboard, Projects and the rest. The footer label, the dashboard's Current focus tile and the Workspace focus buttons in Settings went with it. Roles still decide which modules show.

## [1.39.0] - 2026-11-09

Kiungo now asks before counting how people use it, and the Cookie Policy says exactly what's counted. Needs jumetra-backend #15 for the account side.

### Added
- **A consent banner.** The first time someone visits, Kiungo asks: "Can Kiungo count how you use it?" Allow and Don't allow look the same and sit side by side, with a link to the Cookie Policy.
  - **Nothing is counted until someone chooses Allow.** Before, the website started counting at once.
  - The banner stays out of the way on the Cookie Policy itself and in the admin portal.
- **Settings, Privacy:** the same question, changeable any time.
- **The answer follows the account:**
  - Signed in, it's saved to the account and the newer answer wins, so it follows people to another browser.
  - The desktop app (0.13.2) checks the account's answer and sends nothing without a yes.
  - The server ignores usage from accounts that haven't said yes.
- **Saying no deletes what was counted** for that person, or for that browser when signed out. Page totals carry no names and stay.

### Changed
- **The Cookie Policy is rewritten (9 November):**
  - It now lists the two sign-in cookies Kiungo's server sets (`hhip_access`, `hhip_refresh`). It used to say Kiungo set none.
  - It explains usage counting: what's counted, what never is, who sees it (Kiungo's team, in the admin portal), how long it's kept, where, and how to say no.
  - It corrects what clearing site data removes.
- **The Privacy Policy (9 November)** states that usage counting is by consent and can be withdrawn in Settings.
- **The website stops sending usage without a yes.** That replaces its earlier rule of skipping only signed-out browsers that send Do Not Track or Global Privacy Control.

## [1.38.2] - 2026-11-09

### Changed
- **The admin portal opens from the settings icon now, not the Kiungo logo.** Two quick clicks on the gear in the sidebar, within about half a second, open the admin password box. This works with the sidebar open or collapsed, and in the phone menu.
  - One click still opens Settings straight away. The second click closes it and opens the password box instead.
  - The logo is just a link home again.
  - `/admin` still asks for the password, and the server still checks it.

## [1.38.1] - 2026-11-06

### Changed
- **The website and the desktop app (0.13.1) use Kiungo's API on Render** (`https://kiungo-api.onrender.com`), with its data in a Neon PostgreSQL database (jumetra-backend #13). The old address was a hand-deployed Cloud Function that nobody here can deploy to.
  - That old server was missing the admin portal, the community figures, desktop releases and project sync.
  - People sign in again once: accounts on it aren't in the new database.
  - The free plan sleeps when idle, so the first request after a quiet spell can take about a minute.

## [1.38.0] - 2026-11-06

An admin portal for Kiungo's team, and usage reporting from the website and the desktop app (0.13.0) to feed it. Needs jumetra-backend's `/telemetry/heartbeat` and `/admin/*` (backend PR #10, on top of #11) on the API this site talks to.

### Added
- **The way in:** click the Kiungo logo at the top left eight times in quick succession, each within 1.5 seconds of the last. A password box opens. The server checks the password, never this site, and the right one opens `/admin` for 30 minutes in that tab. Five wrong passwords lock sign-in from that address for 15 minutes. Without a valid sign-in, `/admin` asks for the password itself, and search engines are told not to index it.
- **The admin portal:**
  - **Totals:** how many accounts and projects there are (website projects plus desktop projects synced to accounts, with lab sessions and experiment records), who is online now, time spent in Kiungo, and active accounts.
  - **Online now:** each signed-in person with a Kiungo window open, the website or the desktop app, the page they're on and for how long, plus a count of signed-out visitors.
  - **Most active pages:** by time and views.
  - **Each day:** time, active accounts and new accounts per day.
  - **Accounts:** a table with the time each spent in the range, split between the website and the desktop app, all-time time, active days, projects, last seen and when they joined. It can be searched and sorted, and exported as CSV.
  - **Admin sign-ins:** the last 12 tries at the password.
  - The range can be today, 7, 30 or 90 days. The figures refresh every 30 seconds.
- **Usage reporting, website:** a heartbeat on each page, then every 30 seconds while the tab is visible and someone has moved, typed or scrolled in the last five minutes, and a last one when the tab is hidden or closed.
  - Signed in, it counts for the account. Signed out, it counts for a random id the browser makes.
  - A signed-out browser sending Do Not Track or Global Privacy Control sends nothing, and the admin portal itself isn't counted.
  - Set `NEXT_PUBLIC_ACTIVITY=off` to switch it off.
- **Usage reporting, desktop app 0.13.0:** the main process sends a heartbeat every minute while the window is shown and the computer is in use, with the desktop session's token. It sends Home or "a project", never what's in it, and a goodbye when the app quits.

### Changed
- **Privacy Policy and Cookie Policy** (revised 6 November 2026) now say what usage is recorded, why, for how long, and what it never includes. They also list the `kiungo.visitor` and `kiungo.admin.session` keys.

## [1.37.0] - 2026-11-05

Advanced Analytics is a real page: what you've built, tested and learned, and what the whole Kiungo community is building. The community figures need jumetra-backend's `GET /community/stats` (backend PR #9) on the API this site talks to; until it's there, that section says so and the rest of the page works on its own.

### Added
- **Your work**, for 30 days, 90 days, 12 months or all time (remembered in this browser), each compared with the stretch before it: projects, lab sessions, runs, parts explored out of the catalog, and modules completed, with a sparkline each.
- **Insights that come with an action.** At most four, each a real finding from your own work with a link to act on it: the part you lean on most, experiment records missing a step, the fault you meet most and how many you fixed, a kind of part you haven't tried yet, and the next module.
- **Your days in the lab**, drawn as a breadboard: one hole per day, weekdays above the center channel and the weekend below it, power rails top and bottom. A day glows brighter the more you built, ran and fixed. Arrow keys move between days, and picking one lists what you did that day.
- **A weekly goal** (1 to 7 days a week, default 3) instead of a daily streak, with the last 12 weeks against it.
- **Parts you use** (pick one to see the sessions it's in) and **parts to try next**, ordered by what the community uses most; **How you build** (virtual, Hybrid and physical parts) with runs, faults met, fixes, and the faults you meet most; **Learning path** progress by topic with the next module; **Projects and records** by category, and the records still missing steps.
- **The Kiungo community**: robotics projects, lab sessions, runs, parts placed and builders across every account; a growth chart (so far, or new each month) you can point at or tab through; the most-used parts (marked when you've used them too) and what people build. No names and no rankings, and a part or category only appears once 10 or more people use it.
- Every chart has a one-line summary of what it shows and a **Show as table** switch. Works in light and dark, and down to phone width.

### Changed
- Signed out, the page uses this browser's lab sessions and learning progress and offers to sign in for projects and experiment records. Someone with nothing yet sees three ways to start instead of a page of zeros.

## [1.36.2] - 2026-11-05

### Fixed
- **Signing in on a new browser no longer deletes your lab sessions from your account.** When you signed in on a page that doesn't open the lab (Home, Settings, the docs) on a browser that had never held your sessions, they arrived from the account but weren't saved in the browser. Opening the Engineering Lab, Projects or Analytics afterwards loaded the browser's empty copy over them, and the account sync took the missing sessions as deleted and deleted them from the account. The sync now loads the browser's copy before it merges, so the merged list is saved and nothing reloads over it. A regression test signs in, lets the sessions arrive, then opens the lab, and checks nothing is deleted.

## [1.36.1] - 2026-11-05

### Changed
- **The download button fills as the file arrives.** While downloading, the button is a light gray track that fills with teal from the left: almost all gray at 1%, half and half at 50%, all teal at 99%. The label turns white where the fill passes under it. The percent always reads 1 to 99 (never 0 or 100); the done state says **Downloaded** instead. In the two dark palettes the fill is a deep teal, since their primary color is gray.
- **The download notice no longer repeats the percent.** It shows how much has arrived ("10 MB of 149 MB") and the bar; the percent is on the button.
- **The notice has an X while downloading.** It hides the notice and the download keeps going, with the button showing how far it is. The notice comes back when the download finishes or fails, so the result isn't missed.
- **Cancel is now Stop.** It halts the download, and the button goes back to its first state.

## [1.36.0] - 2026-11-05

The desktop app is 0.12.2: a Settings dialog (the account gear, the command palette, or `Ctrl+,`/`⌘,`) with the signed-in profile, light/dark/system appearance, and the version Kiungo is running.

### Added
- **Settings.** One dialog with three things: who's signed in (with Switch account and Sign out, or Sign in when nobody is), **Appearance** (System, Light, Dark — System follows the computer's own setting live, same as before; the other two hold regardless of it, saved to `settings.json` and applied at once), and **About** (the installed version, its channel, the platform, and, when one's ready, a button to install it without leaving Settings).

## [1.35.0] - 2026-11-04

The desktop app is 0.12.1: its own icon, and the update card in the bottom-left corner. This is the first version that installed copies of 0.12.0 receive through the app rather than by download.

### Added
- **The Kiungo icon.** The installers, the Start menu, the Dock, the taskbar and the window carry the Kiungo mark on a white tile (`apps/desktop/build/icon.svg`; the macOS one sits on Apple's icon grid) instead of Electron's. `node apps/desktop/build/rasterize.mjs` draws the PNGs electron-builder packages.
- **Trying an update without a release.** A development copy with `KIUNGO_UPDATE_URL` set checks that feed (with `dev-app-update.yml` as electron-updater's settings), so the flow can be watched end to end against a local folder.

### Changed
- **The update card** now sits in the bottom-left corner, in the Kiungo-blue pop-up style, and appears the moment a new version is found, following the download with a bar and its percent. Once the version is ready the card itself is the button: one click saves every project, installs, and reopens Kiungo on the new version (it says so while it happens). **Later** puts that version's card away until the next start; the update still installs when Kiungo quits. The restart is unavoidable: an update replaces the app's own files, which a reload of the window can't do.

## [1.34.0] - 2026-11-04

Kiungo's robot types while the app works on an answer, and tells you when a page breaks.

### Added
- **The robot animation** (`components/ui/robot-typing.tsx`): a typing bubble that becomes Kiungo's robot, talks, and turns back into the bubble, on a 5.75 s loop. It's drawn in the theme's primary color (grey in Dark, white with black eyes in Dark contrast), holds still on the robot's face for people who ask for less motion, and is decorative: the words beside it say what's happening. The player (lottie-web's light SVG build, no `eval`) and the 47 KB animation load only when a robot is on screen, once per page.
- **Where it shows:**
  - **Firmware, while compiling:** *Compiling your code…* at the top of Compiler messages, until the compiler answers.
  - **Hybrid experiments:** *Building your experiment…* where the circuit will appear while it's created, and *Starting your experiment…*, *Moving it forward 100 ms…* or *Stopping your experiment…* in the Run card while the server works.
  - **When a page breaks:** the error screen (every route, and *The lab hit a snag*) shows the robot above the message, in place of the broken Kiungo mark. The 404 page keeps the broken mark.

## [1.33.0] - 2026-11-04

The desktop app updates itself. Kiungo looks for a new version a little after it starts and every four hours, downloads it in the background, and offers **Restart to update**; nobody has to download an installer again. The desktop app is 0.12.0.

### Added
- **In-app updates on Windows and the Linux AppImage.** A card in the corner says **Kiungo 0.12.0 is ready** with **Restart to update** and **Later**. Restarting saves every project first, installs silently into the same folder (no administrator: the installer is per-user) and opens the new version. **Later** waits: the update installs anyway the next time Kiungo quits.
  - **It never restarts in the middle of a board run.** While a Hybrid run is live or an upload is in flight, Restart to update says to stop the run (or wait for the upload) first.
  - **Search and commands** gains **Check for updates**, with the version you have and whether it's a beta, and **Restart to update** once one is ready. A check you asked for shows how it went (checking, downloading with its percent, up to date, or what went wrong in plain words); checks nobody asked for stay quiet unless an update is ready.
  - Downloads are checked against the release's SHA-512 before anything installs. On Windows only the parts that changed are downloaded when the old version's blockmap is on its release (from 0.12.0 on).
  - Beta copies follow betas and stable releases; stable copies follow stable releases only.
  - macOS can't update itself until the app is signed (DSK-80), and the .deb and .rpm packages update from the website: on those, **Check for updates** says so and opens the download page. `KIUNGO_UPDATES=off` turns updates off, for computers a school manages.
- **The update feed** (`.github/scripts/desktop-update-feed.mjs`). Each run of **Release the desktop app** now also uploads the installers' blockmaps and refreshes the `desktop-feed` release: `beta.yml` and `beta-linux.yml`, plus `latest.yml` and `latest-linux.yml` for a stable release. They're electron-builder's own files pointed at the versioned release, and the script refuses one for another version or naming another file. `KIUNGO_UPDATE_URL` points the app at another feed, e.g. the backend's later.

### Changed
- The release workflow writes the channel (beta or stable) into the packaged app, so it knows which feed file to read.

## [1.32.0] - 2026-11-03

The home page downloads the desktop app itself, and says how it went. The first beta, `desktop-v0.11.0`, is published.

### Added
- **The download happens on the page.** Pressing **Download for Windows** (or macOS, or Linux) fetches the installer right there: the button turns into *Downloading 12%*, a notice in the corner shows megabytes and percent with a Cancel button, and when the file is saved the notice says **Downloaded! Kiungo for Windows is ready to install**, that it matches the release's SHA-512, and what to do next (open it, the Start menu, and the SmartScreen step for a beta). Every installer under **All downloads** works the same way, and so does the hybrid section's button, which is now the download itself rather than a link to the section.
  - The file comes through the site's own `/api/desktop/download`, which streams the release asset from GitHub (only this project's release URLs are allowed; GitHub's downloads carry no CORS headers, so a page can't read them directly). It's fetched in 8 MB ranges: a dropped connection costs only the piece in flight, and the download carries on from where it was, on its own while the browser is still online and from **Try again** after it gives up.
  - **Problems say exactly what happened and what to do**: you're offline; the file isn't on the release page any more (404); too many downloads at once (429); the download server couldn't send the file (HTTP 503); the connection dropped at 34 MB of 148 MB; the file arrived damaged (checksum mismatch); the browser couldn't hold the file. Each has its fix, and the relevant action: Try again, Reload the page, Let the browser download it, or Open the release page.
  - If the download route itself is down before anything arrived, the browser is handed the plain link and the notice says why. `KIUNGO_DOWNLOAD_MODE=browser` turns the page's own download off altogether (plain links, no notice beyond "your browser is downloading it").
  - A download in flight warns before the tab is closed, and Escape closes a finished notice.

### Changed
- **Where the home page finds the release.** After the backend, it now reads the manifest of the GitHub release for the desktop version it was built with (`apps/desktop/package.json`), straight from GitHub's download CDN, which has no rate limit; the releases API (60 requests an hour per IP unauthenticated, which a shared host exhausts) is the last resort, and uses `GITHUB_TOKEN` when the site has one.
- Sizes are set with a no-break space, so "148 MB" never splits across lines.

## [1.31.0] - 2026-11-02

Phase Two, Sprint 11: the website companion, sync and import. The website is now the way into the desktop app. Phase One work comes across, and projects can sync between computers through the account. The desktop app is 0.11.0.

### Added
- **The desktop app on the home page.** The page's last section, *Then take it to your desk*, is the release: a download button for the visitor's computer (Windows, macOS on Apple silicon or Intel, or Linux), every installer with its size, and four screenshots of the app behind tabs: code and run, the real board, the robot world, and a mistake fixed.
  - The release comes from the backend's `/releases/latest`, or, until the release pipeline publishes there, from the newest GitHub release made by the new **Release the desktop app** workflow. Both are read on the server and refreshed every five minutes.
  - A beta is labeled as one, with how to get past the Windows and macOS warnings about an unsigned installer, and what a computer needs.
  - On a phone there's no button to press, only the list, since the app runs on computers.
  - Before the first release it says so and points to the lab in the browser.
- **A release workflow** (`.github/workflows/release-desktop.yml`). Run from the Actions tab, or push a tag `desktop-v<version>`: it builds the installers on Windows, Ubuntu and macOS, writes a manifest with each file's SHA-512, publishes a GitHub release (a pre-release for a beta), and, once the pipeline's token is set, posts the same to the backend. Installers now have plain names: `Kiungo-0.11.0-win-x64.exe`, `Kiungo-0.11.0-mac-arm64.dmg`, `Kiungo-0.11.0-linux-x86_64.AppImage`.
- **Import Phase One work (DSK-15).** Home > **Import** takes either:
  - a lab session file (`.kiungo.json`) saved from the website, or
  - the lab sessions and projects on the signed-in account.

  A lab session becomes a project with the same circuit and a blank sketch for its board. A website project becomes a blank project with its details in `records/about.md`. Importing the same thing again makes a second copy and says so (`kiungo.json` records `importedFrom`).
- **Project sync (DSK-14)**, with jumetra-backend #7. It's off until the person turns it on, from Home > **On your account**.
  - Projects sync about 30 seconds after edits settle, and when they close.
  - On opening, changes from another computer are taken first.
  - A file changed in both places keeps this computer's version, and saves the other beside it (a sketch's copy as `.txt`, so it isn't built).
  - A chip by **Saved** shows the state and syncs on click.
  - Home lists the account's projects that aren't on this computer, with **Bring to this computer**.
  - Only a project's own files sync: never `.kiungo/`, the local undo history.

### Changed
- **Landing page:** the hybrid section hands over to the desktop release below it, and the facts, footer and search-engine data (version and download) mention the app.
- **Navigation:** the footer gains **Desktop app**, which goes to that section.
- **Desktop app:** the build panel's tabs no longer wrap onto two lines in a narrow Code pane.
- **Hybrid Hardware and the docs:** both show three device modes. The external Simulator binding is gone (Phase Two decision).
- **Firmware** is marked as a Preview: building and uploading moved to the desktop app.
- **Website lab:** gains a **Desktop app** link in its toolbar.

## [1.30.0] - 2026-11-02

Phase Two, Sprint 10: Hybrid safety and readiness. Real outputs are always safe: Stop, the emergency stop and a dropped link all turn the board's outputs off. The lab checks the wiring before real current flows, and lists what to have on the desk. The desktop app is 0.10.0.

### Added
- **Emergency stop (SAF-01).** While your code runs on a real board, a red **Emergency stop** sits beside Run, and **Esc** does the same from anywhere in the window.
  - It turns every pin the sketch drives off at once, PWM included, and holds them off until the next upload.
  - **Stop** also takes the outputs to the safe state before the link closes.
- **A watchdog on the board (SAF-02).** Once Kiungo has said hello, the board listens for it. If the link goes quiet for 300 ms, every driven output turns off: the app closed or crashed, or the USB cable came out while the board has its own power.
  - It runs on a timer interrupt, so it works inside a long `delay()`. In CI it trips about 210 ms after the last byte.
  - While the link is lost, virtual sensors fall back to "no value" (0, LOW, NAN or a timeout).
  - A new hello lets the sketch drive again.
- **Electrical checks before a run (SAF-03).** With the board marked Physical or Hybrid, Problems adds the real-board checks, and errors stop Run with the reason:
  - Pins 0 and 1 are Kiungo's link.
  - A DC motor must not run from the board's 5 V.
  - An LED without its resistor is an error, not a warning.
  - A servo on the board's 5 V gets a warning.
  - The parts on the board's supply must stay inside what USB gives.
  - Of the lab's own problems, those that can damage something (shorts, wrong voltages, outputs fighting) also stop Run. A part that isn't wired yet doesn't.
- **Parts (VER-01, VER-03).** A new **Parts** tab in the lab:
  - **In a run** shows each part as **Virtual**, **Real**, **Hybrid** or **Not available**, with what that means.
  - **What you need** lists what to have on the desk, or the whole build: parts, jumper wires, the USB cable and a battery pack for motors. **Copy list** gives plain text and **Save CSV** saves a spreadsheet file.

### Changed
- Auto-wire puts a DC motor's VM on **VIN**, the barrel jack's supply, rather than the board's 5 V. The robot starters follow.
- The Hybrid link is protocol 2: STOP (PC to board) and SAFE (board to PC) frames. Delay calls `yield()`, which now handles the link's frames, so a STOP lands at once even mid-delay.

## [1.29.0] - 2026-11-02

Phase Two, Sprint 9: Hybrid runs. Mark the board Physical and Run puts your own code on the real board, while the lab plays the parts you don't have and mirrors what the board drives. The desktop app is 0.9.0.

### Added
- **Run on the real board (RUN-01, RUN-04).** In the desktop app, a board marked **Physical** or **Hybrid** in the Inspector runs your code for real. Run builds the sketch with Kiungo's Hybrid layer, uploads it to the board picked in **Upload to**, and opens a link to it.
  - Parts marked **Virtual** are played by the lab: the sketch reads the values set in Inputs, unchanged code and all.
  - Parts marked **Physical** are the real ones on your desk.
  - Outputs are always real: the board drives them and the lab mirrors the levels and PWM it reports (OUT-01, OUT-04).
- **Virtual sensors on a real board (INJ-01 to INJ-06).**
  - HC-SR04 through `pulseIn` and through NewPing.
  - DHT11 and DHT22 through the DHT library: a Kiungo adapter stands in for it, with the same API.
  - PIR, light sensor, soil moisture and gas sensor on their analog and digital pins.
- **Ship and Hybrid builds (HWT-02 to HWT-04).** Every Hybrid run also builds the sketch alone. The memory meters show Kiungo's share striped at the end, and the note under them gives the plain program's use, which is what the board runs after an Upload. If only the Hybrid build is too big, the message says so.
- **The board says where it runs.** Its panel says **Runs on: The real Arduino Uno on COM3**, and the lab log names the port.

### Changed
- The Hybrid runtime reports what the sketch drives (`digitalWrite`, `analogWrite`) in a new OUT frame. It sends that frame whenever the serial port has room, so it never slows the sketch.
- The Inspector's note under **Mode** says what Run does with each mode in the desktop app.
- The desktop installer now ships the Hybrid runtime and adapter libraries.
- The Hybrid link starts before `setup()`, so a sketch that never calls `Serial.begin` (Blink) still talks to Kiungo. The sketch's `Serial.begin` and `Serial.end` leave the link alone.
- With Arduino CLI, the shim is forced into every C++ file of a Hybrid build (`compiler.cpp.extra_flags`), so the runtime and the adapters get the virtual pins.

### Not yet
- Hybrid runs work on the Uno and the Nano; the Mega and ESP32 come later.
- I2C and 1-Wire parts must be Physical in a Hybrid run.

## [1.28.0] - 2026-11-02

Phase Two, Sprint 8: robots in a world. A two-wheel robot built in the lab drives round a course in the desktop app, driven by your own code. The desktop app is 0.8.0.

### Added
- **The World (WLD-01 to WLD-03).** Beside the code there's now a **World** tab. It shows the robot's arena from above: walls, boxes, a line on the floor and the course's checkpoints, with the robot driving as your code says.
  - Physics (Rapier 2D) stops the robot at walls and boxes, and counts each bump.
  - The world steps in the same simulated time as the emulated board, so a run is the same every time.
  - The pane shows the time, speed, distance driven, bumps and checkpoints passed, and says **Finished** at the end of the course.
- **Move the walls while it runs.** Drag a box and the running robot sees it move at once. **Box** adds one; the turn and bin buttons rotate or remove the selected box. The world is saved in the project's `world.json`.
- **Sensors that measure the world (WLD-02, WLD-05).** The sensors sit at fixed places on the chassis.
  - The HC-SR04 looks forward from the front. Three rays across its 15° cone find the nearest echo, drawn on the World as a dashed line to what it sees.
  - The light sensors look down either side of the middle and read dark over the tape.
- **The robot is the circuit (OUT-03).** A board with two DC motors is a two-wheel robot: DC motor 1 is the left wheel and DC motor 2 the right. Each wheel turns at its driver's EN PWM duty, in the direction IN1 and IN2 say, at the TT gear motor's 140 rpm on 65 mm wheels. The lab's circuit shows the same motors spinning.
- **Two robot templates (PRJ-03)**, each with its course:
  - **Obstacle avoider:** drives forward and spins away from anything closer than 25 cm, through a field of boxes to the goal.
  - **Line follower:** two light sensors either side of a black oval, steering back onto the line.
  - Starter code can now name a second part of the same kind (`{{dc-motor#2.EN}}`).
- **Courses checked in CI.** A test harness runs the templates' compiled code in their worlds, with no screen: the emulated board, the part models and the physics stepped together. The line follower must finish a lap without leaving the tape by more than 6 cm, and the obstacle avoider must reach its goal.

### Changed
- The desktop app's content policy allows WebAssembly (for the physics), and still no JavaScript eval.

### Not yet
- One robot per project, on the Uno.

## [1.27.0] - 2026-11-02

Phase Two, Sprint 7: run your own code. In the desktop app, **Run** now runs the project's sketch on an emulated Arduino Uno, and the circuit does what the code says. The desktop app is 0.7.0. The website's lab works as before.

### Added
- **Run your code (RUN-02, RUN-03, EMU-01).** **Run** (or Ctrl+Enter, in the lab or the editor) saves the files, builds the sketch, loads it into an emulated ATmega328P with the Uno's real 32 KB of flash and 2 KB of RAM, and starts it. The button says **Building…**, then **Loading…**, then **Stop**. A sketch that doesn't build stops the run, with the problems in **Code problems** and on their lines.
- **Cached builds.** When nothing in the sketch has changed since the last good build, Run and Build use it without running the compiler, so Run reaches running in a fraction of a second. Any change to a file, `sketch.yaml` or the board builds again.
- **Parts follow the pins (OUT-02, DBG-01).**
  - An LED is as bright as its pin's PWM duty.
  - A servo turns to the angle its pulse width means (the Servo library's 544 to 2400 µs).
  - A buzzer sounds at the pitch the pin toggles at (`tone()`), through the speaker, or at its own 2.3 kHz when the pin is held high.
  - The relay module energizes on a low pin, as the real one does.
  - A DC motor runs from its driver's pins.
- **Sensors that answer your code like the real ones (EMU-02, PCP-03).**
  - The HC-SR04 replies to the trigger with an echo as long as the sound's round trip, so `pulseIn()` reads the distance.
  - The DHT11 and DHT22 answer the start signal with their 40 timed bits, so the Adafruit DHT library reads them.
  - The LDR, soil moisture and gas sensors set a voltage that `analogRead()` reads.
  - The PIR holds its pin high while it sees motion.
  - Each sensor reads the value you set in the Inspector, or the lab's simulated sweep.
- **Live pins, serial and signals (DBG-01).** The lab's **Serial** panel shows what the program prints. **Signals** traces the program's pins over the last 4 seconds.
- **Real time, and honest about it (RUN-05).** The program runs at the Uno's real speed; the board's panel says **Real time**, or the percentage when the computer can't keep up. The speed menu is off while your code runs.
- **Real failure behavior (HWT-07).** A program that runs out of RAM (the stack runs over the chip's registers) or jumps outside itself stops, as a real board hangs, and the board shows **Crashed**: "Stopped: ran out of memory".
- Backend (jumetra-backend #6): the project sync API design for review, ahead of sprint 11.

### Not yet
- Only the Uno runs your code in the lab for now (EMU-01). Mega and ESP32 projects keep the built-in behavior on Run, and the Run button says why; **Upload** runs the code on a real board.
- Displays and radios talk over I2C, SPI or serial buses the emulator doesn't model yet: they say "Not shown yet" while your code runs.

## [1.26.0] - 2026-11-02

Phase Two, Sprint 6: real boards. Plug in a board, upload to it, and talk to it. The desktop app is 0.6.0.

### Added
- **Boards on USB, by name (HW-01).** **Upload to** lists what's plugged in as it's plugged in, by name: a genuine board ("Arduino Uno · COM3"), or a clone by its USB chip ("USB serial board (CH340)"). When USB can't tell which board it is, Kiungo asks and suggests the most likely one: a CH340 board is most often a Nano with the old bootloader. The choice is remembered per project.
- **Upload (BLD-06).** **Upload** (Ctrl+U) builds for the chosen board and uploads to it. A Uno project uploads to an Arduino Nano too (same chip); each board builds in its own folder. If the serial monitor is open on that port, it closes for the upload and reconnects after.
- **Recovery steps when an upload fails (BLD-06).** The board didn't answer, the port is busy, the port is gone, no permission, an ESP32 that needs BOOT held, or a different ESP32 chip: each one says what happened and what to try, in order. A Nano that doesn't answer offers **Upload as Arduino Nano (old bootloader)** in one click.
- **Serial monitor and plotter (HW-02).** **Serial monitor** under the code connects to the chosen board at the speed you pick, shows what it prints, and sends what you type, with the line ending you choose. **Plot** draws the numbers on each line, read the way the Arduino IDE's plotter reads them (`temp:21.5 humidity:40`, `Distance: 20 cm`).
- **My board isn't listed (FIX-09).** Checks this computer and gives steps. On Linux it can see a CH340 board whose port was taken by brltty and gives the command to remove it, and spots a port you're not allowed to open and gives the dialout command. On Windows and macOS it links the official CH340 and CP210x drivers from the chip makers, and reminds you that some cables only carry power.
- **Board definitions (HWT-01)** for the Uno, Nano (both bootloaders), Mega 2560 and ESP32 Dev Module. They carry the board packages' exact limits (32,256 bytes of program storage on the Uno, 30,720 on the Nano, 253,952 on the Mega, 1,310,720 on the ESP32) and what each pin can do, with cautions such as pins 0 and 1 carrying the upload, the ESP32's boot-mode pins, and its input-only pins.
- **ESP32 projects.** New projects can be for the ESP32 Dev Module (esp32 board package 3.3.12, pinned). Starters that aren't safe on a 3.3 V board say why: the HC-SR04's 5 V echo needs a level shifter.
- Backend (jumetra-backend #5, stacked on #4): crash-report consent (`GET/PUT /auth/me/consents`, `POST /crash-reports` only with consent, kept 90 days), and writes from the desktop app (bearer token, no website origin) are now accepted with a valid session.

### Fixed
- **The Nano's limit was 1.5 KB too high** in the emulator's board definition (32,256 bytes). arduino:avr keeps 2 KB for the Nano's bootloader: it's 30,720.

### Not in this release
- Signing the Windows installer and the stable and beta update channels (DSK-80) are Juma's, through the CI/CD pipeline. Installers from CI are still unsigned.

## [1.25.0] - 2026-11-02

Phase Two, Sprint 5: building the code, libraries, and error explanations. The desktop app is 0.5.0.

### Added
- **Build (BLD-01, BLD-05).** **Build** (Ctrl+B) compiles the sketch with Arduino CLI using the project's own `sketch.yaml` profile, so the board package and every library are the exact versions pinned there, on every computer. The first build downloads what's missing into Kiungo's own folder and needs the internet once; after that, builds work offline. Files are saved before a build starts, and each project builds in its own folder outside the project, so later builds are quick.
- **Memory used (BLD-02).** After a build, two meters show how much of the board's program storage (flash) and variable memory (RAM) the program uses, against that board's real limits (32,256 and 2,048 bytes on the Uno).
- **Problems on their line (EDT-05, ERR-01).** The compiler's errors appear under the code in **Code problems** and as red underlines on the line they belong to. Clicking a problem goes to its line. Warnings from the board package or libraries are left out: they aren't the sketch's to fix.
- **Plain-words explanations (ERR-02)** for the mistakes people make most in their first sketches: a missing `;`, a name that isn't defined, wrong capital letters (`serial` for `Serial`), a missing library, a missing `}`, the wrong number of values for a function, an unclosed `"`, `setup()` or `loop()` written twice or missing, and a program too big for the board. Each one says what it means and what to do; the compiler's own words are one click away.
- **Quick fixes with a preview (FIX-01)** for the ones Kiungo can be sure of: adding the missing `;` (skipping a trailing comment), fixing a name's capital letters or an obvious misspelling GCC suggests, closing an unclosed `"`, and closing a function that runs into the next. **Fix** shows the lines before and after; **Make this change** makes it as one undo step. Problems in a file edited since the build say so and offer no fix until the next build.
- **Missing libraries in one click (FIX-02).** When a sketch includes a header Kiungo knows (`Servo.h`, `DHT.h`, `LiquidCrystal_I2C.h`, `Adafruit_SSD1306.h`, `NewPing.h` and 12 more), the problem has **Add Servo**: it pins the newest version, and the libraries it needs, in `sketch.yaml`, then builds again.
- **Libraries (BLD-04).** The **Libraries** tab lists what the sketch pins, finds libraries in the Arduino library index that work on AVR boards, and adds or removes them. Arduino CLI writes `sketch.yaml` and pins the dependencies too (marked "needed by another library").
- Backend (jumetra-backend #4, stacked on #3): `releases` and `release_files` tables, and `GET /releases/latest` for the download page and the app's update check. Publishing takes the release pipeline's token.

### Fixed
- **The temperature and humidity starter couldn't build.** DHT sensor library includes `Adafruit_Sensor.h`, but the starter didn't pin Adafruit Unified Sensor. New projects from the starter pin it (1.1.15). For a project made with 0.3.0 or 0.4.0, build it and click **Add Adafruit Unified Sensor**.

### Notes
- CI builds all seven starters for the Uno, Blink for the Mega, and a sketch with a mistake, using the real Arduino CLI on Windows, macOS and Linux.
- **Run** still runs each board's built-in behavior in the lab. Running your own built program in the lab arrives in Sprint 7.

## [1.24.0] - 2026-11-02

Phase Two, Sprint 4: signing in to the desktop app through the website, and the code editor. The desktop app is 0.4.0.

### Added
- **Sign in to the desktop app (DSK-01, DSK-02).** The first time it starts, Kiungo shows one screen with one button, **Sign in with your browser**. The browser opens the website's new **/desktop/sign-in** page; you sign in with Google or GitHub as usual, see which computer is asking ("Sign in to Kiungo on BRAD-THINKPAD?") and say yes. The browser then sends Kiungo a one-time code through `kiungo://signin`, which only this copy of the app can use: it holds a secret the code is checked against (PKCE). Where the link doesn't arrive (some Linux desktops), the app finds the approval by asking every 3 seconds.
- **The session is kept safely and survives restarts and time offline (DSK-02).** The refresh token is encrypted with the computer's keychain (Windows' DPAPI, the macOS Keychain, the Linux Secret Service). On a Linux computer with no keychain it stays in memory only, and the account menu says you'll sign in each time. Offline, you stay signed in until the session can be checked.
- **Sign out and switch account (DSK-03)** from the account menu on Home, or the command palette. Signing out ends this computer's session on the account and never touches projects on disk.
- **When signing in can't start** (offline, or the sign-in service isn't there yet), the sign-in screen says why and offers **Use Kiungo without signing in**.
- **The code editor beside the circuit (DSK-30, EDT-01 to EDT-03, EDT-06).** Each project opens with its sketch on the right: the editor from the website's Firmware page, bundled with the app so it works offline, with Arduino (C++) highlighting, find and replace, and Kiungo's light and dark themes. Files open in tabs; **New file** makes `.h`, `.cpp`, `.c` and the other files Arduino builds (headers start with an include guard); files can be renamed and moved to the computer's trash, except the main `sketch.ino`. Every change is saved 400 ms after typing stops, crash-safe as the circuit is. **Run** and **Stop** drive the lab (Ctrl+Enter from the editor too); **Upload** is there and waits for USB board support. Ctrl+E shows or hides the code, and the divider sets how much room it gets.
- The website's API client: `getDesktopSignIn`, `approveDesktopSignIn`, `denyDesktopSignIn`.
- The installers register `kiungo://` (Windows registry, macOS Info.plist, the Linux .desktop file).

### Fixed
- **Keys typed in the code editor no longer reach the lab.** The lab took `/` (search parts) and `1` to `3` (switch views) from anything that wasn't a plain text box, so typing a comment opened the parts search. Elements marked `data-own-keys` now keep their keys.

### Not yet live
- Production's backend doesn't have the desktop sign-in routes yet, so signing in only works against a backend with them (set `KIUNGO_API_URL`). Until they're deployed, the app offers to go on without signing in.

## [1.23.0] - 2026-11-02

Phase Two, Sprint 3: the desktop app's Home, projects on disk and the lab. The website works as before. The desktop app is 0.3.0.

### Added
- **Home (DSK-10).** The desktop app opens on your projects and nothing else: each one with a drawing of its circuit, its board and when it was last opened, plus **New project** and **Open folder**. A project that was moved or deleted says so and can be removed from the list; the folder is never touched. With no projects yet, Home offers four starters.
- **New project (DSK-11)** from blank or a starter, for the Arduino Uno or the Mega 2560: Blink, servo sweep, temperature and humidity (DHT11), distance (HC-SR04), motion alarm, relay switch and night light. The lab's auto-wire places and wires the parts, and the sketch is written from that wiring, so the pins in the code are the pins the wires go to on that board.
- **Projects are folders in an open format (PRJ-01, DSK-12)**, in Documents/Kiungo unless you choose another folder: `kiungo.json` (the project), `circuit.json` (the build, in the same format as the website's `.kiungo.json` export), `sketch/sketch.ino` and `sketch/sketch.yaml` (an Arduino CLI profile pinning the board package and any libraries), `records/`, and `.kiungo/history.json` for undo.
- **Autosave that survives a forced quit (EDT-04, DSK-13).** Every change reaches the project folder within about 50 ms. Files are written to a temporary file, flushed to the disk and renamed over the old one, so a crash or a power cut leaves the old file or the new one, never half of one. Undo and redo come back after a restart. A test kills a writing process mid-write and checks the file is whole every time.
- **The lab in the desktop app (DSK-20):** the website's Engineering Lab, unchanged: parts, wiring, breadboards, auto-wire, the circuit check, and the 3D, 2D and Trace views. The top bar has Home and a project menu (Rename, Show in folder, Open a build file, Export the build, Close project).
- **Light and dark follow the system; a command palette (DSK-82).** Ctrl+K (⌘K on macOS) finds every command and recent project. Ctrl+N makes a project, Ctrl+O opens a folder, Ctrl+Shift+H goes Home. The Sprint 1 Foundations check stays as **Check the toolchain and emulator** in the palette.
- **`npm run measure-lab -w @kiungo/desktop`** (DSK-21) makes a 40-part, 200-wire project, opens it in the built app, drags the canvas and reports frames per second. Run it on the reference PC; the cloud workspace has no graphics card.

### Changed
- **The Engineering Lab is shared code.** The lab interface moved from the website into `@kiungo/lab`, and the controls it uses (button, menu, segmented control, skeleton, the Kiungo mark) and the theme CSS into `@kiungo/ui`. The website's `EngineeringLab` adds what only the website has: sessions per account, the project link, Kiungo online and links to the Component library. Pure session helpers moved to `@kiungo/core/lab/session`; the MCP server uses them from there.
- **Panning stays smooth with big builds.** While the canvas pans or zooms it moves as one layer and the parts aren't redrawn every frame; they redraw sharp when it stops. With 40 parts and 200 wires on a machine with no graphics card, panning in 2D went from 25 to 41 frames per second.
- The checks for spelling, focus rings, brand words and developer details now cover the packages and the desktop app as well as the website.

## [1.22.0] - 2026-10-29

Phase Two, Sprint 2: the hybrid spike (issues #57 to #61). The website is unchanged. The desktop app is 0.2.0.

### Added
- **The Hybrid shim, proved (INJ-01, INJ-03, INJ-04).** A Hybrid build compiles the user's sketch unchanged with a generated forced-include header, the `KiungoHybrid` runtime library and, where a sensor needs one, an adapter library of the same name as the real one. Virtual sensors answer from values the PC pushes over a COBS-framed link at 115200; the sketch's own `Serial` text travels inside frames. PC side in `@kiungo/core/hybrid/*` (COBS, frames, the shim generator); board side in `apps/desktop/resources/hybrid/`.
- **A NewPing adapter** (INJ-02's first): the same API as Tim Eckel's NewPing; a virtual HC-SR04 reports the pushed distance, a real one is pinged.
- **The emulator receives serial** (`AvrBoard.writeSerial`), so a Hybrid build runs end to end on the PC: `apps/desktop/test/hybrid-shim.test.ts` pushes distances into the unchanged NewPing sketch and reads them back within the loop period.
- **A direct avr-gcc build path** (`apps/desktop/src/main/toolchain/hybrid-build.ts`) that mirrors Arduino CLI's recipes, for the spike and for CI; `compileSketch` takes libraries and compiler flags for the Arduino CLI path.
- **Scripts:** `npm run spike` writes `docs/phase-two/sprint-2-spike-results.md` (toolchain facts, footprint, delay, Electron budgets); `npm run measure-budgets` measures startup and memory; `npm run hardware-check` is Brad's Sprint 2 check on a real Uno (#61).
- CI compiles the shim tests on Windows, Ubuntu and macOS with the installed core.

### Decided by measurement (details in `docs/phase-two/sprint-2-spike-results.md`)
- `--wrap` is silently dropped with LTO on, and cannot reach `Serial` at all. The forced include works with LTO on everywhere, including header-only code, and costs nothing beyond the runtime. LTO stays on.
- The runtime adds about 1.2 KB of flash and 170 B of RAM; the NewPing adapter brings an HC-SR04 sketch to +1.6 KB / +190 B.
- Push-to-print delay in the emulator: median 25 ms, worst 49 ms against a 50 ms loop.
- Electron on this Linux machine: window in 357 ms, 282 MB proportional set size.

## [1.21.2] - 2026-10-29

CI for the desktop app on all three systems (issue #54).

### Added
- **Desktop CI matrix.** Every pull request now typechecks and tests the desktop app on Windows, Ubuntu and macOS, fetches the pinned Arduino CLI, installs the Uno core (`arduino:avr@1.8.6`), runs the real compile test, and uploads an unsigned installer for each system as a build artifact (`.exe`, `.AppImage`, `.deb`, `.rpm`, `.dmg`). Signing comes in sprint 6.
- The website job sets `ELECTRON_SKIP_BINARY_DOWNLOAD=1`; the desktop jobs set it back to `0`.

### Fixed
- **electron-builder refused to package the app.** It derived the executable name from the package name `@kiungo/desktop`, which is not a valid file name. The binary is now `kiungo`, Linux artifacts are named `Kiungo-<version>-<arch>`, and the desktop package carries the `homepage` and `repository` fields the `.deb` and `.rpm` targets require.

## [1.21.1] - 2026-10-29

### Fixed
- **CI on `main` is green again.** The "no developer details" test caught the internal sign-in stage label `backend-token-exchange` (added in `5b5e4a9`, which went to `main` without a pull request). The label only ever reached `console.warn`, so nothing people see changes; it is now `token-exchange`.

## [1.21.0] - 2026-10-27

Phase Two, Sprint 1: foundations for Kiungo 2. The website looks and works exactly as before.

### Added
- **npm workspaces for the website and the desktop app.** The website stays at the root. Next to it:
  - `@kiungo/core`: the shared engine.
  - `@kiungo/ui`: Kiungo 2 design tokens.
  - `@kiungo/api`: the typed contract between the desktop app's main process and its interface.
  - `@kiungo/desktop`: the Electron app.
- **An emulated Uno and Nano in `@kiungo/core`** (EMU-01, spike #51). It runs programs compiled by Arduino CLI, unmodified, in a Web Worker, with the boards' real 32 KB of flash and 2 KB of RAM. Tests prove Blink toggles pin 13 every 1000 ms of simulated time, and that Serial prints at 9600 baud with real character timing.
- **Determinism rules (EMU-04, #53).** Simulated time comes only from CPU cycles. Random values come from a seeded generator. Lint refuses `Math.random`, `Date.now` and `performance.now` in the emulator and simulation code.
- **Kiungo 2 desktop shell (#50).** Electron 44 with context isolation, a sandboxed interface with no Node access, and a typed IPC bridge. The interface is served from its own `kiungo-app://` protocol with a strict content policy and cross-origin isolation, so the emulator shares pin levels through shared memory. The Sprint 1 "Foundations check" screen shows an emulated Uno running Blink, the Arduino toolchain status, and startup time and memory.
- **Arduino CLI on the computer (spike #52).**
  - A script fetches the pinned Arduino CLI 1.5.1 for Windows, Linux and macOS, and checks it against Arduino's published checksums.
  - The main process installs the Uno and Nano core into Kiungo's own folder, compiles Blink, and loads the result into the emulator.
- **The Sprint 2 hardware check** (`docs/phase-two/sprint-2-hardware-check.md`).

### Changed
- Parts, the lab model and the Intel HEX parser moved from `lib/parts`, `lib/lab` and `lib/firmware` to `packages/core`. They are imported as `@kiungo/core/...`. No behavior changed; the website's 500 tests pass unchanged.

## [1.20.2] - 2026-10-21

### Removed
- **The second sign-in block at the bottom of the Home page.** The page offered logging in twice: the **Log in** button at the top, and a "Save your work. Pick up anywhere." section at the bottom with its own Google and GitHub buttons. As agreed with the team, only the **Log in** button at the top remains. It opens the same Continue with Google / GitHub dialog, with the Privacy Policy note. The story now ends with the hybrid section, then the footer.

## [1.20.1] - 2026-10-20

### Changed
- **The Home page's Log in button shows the Google "G".** It used to show a generic sign-in arrow. Signing in is Continue with Google, so the button now carries the same four-color mark as the sign-in dialog.

## [1.20.0] - 2026-10-15

### Added
- **Flash an Uno from the browser.** On the Firmware page, **On my board (USB)** flashes an Arduino Uno, or a Nano with the new bootloader, plugged into your computer (Chrome or Edge on desktop):
  - **Pick a compiled `.hex` file.** In the Arduino IDE use Sketch > Export Compiled Binary.
  - **Kiungo flashes it directly.** It resets the board into its bootloader, writes the program, reads every page back to check it, then starts it. Nothing goes through the Kiungo server.
  - **A clear message when something is wrong:** a damaged or oversized file, a board that isn't an Uno or Nano, or a port another program has open.
- The upload panel for boards on the server is now headed **On Kiungo online**, so the two ways to put a program on a board are clearly separate.

## [1.19.0] - 2026-10-15

### Added
- **The ESP32 and the Raspberry Pi Pico are drawn as themselves in the Engineering Lab.** In 3D and 2D they used to be cards with pin rails; now, like the Uno, the real board sits on the canvas and wires land in its header holes, in the real order:
  - **ESP32 DevKit V1:** VIN, GND and GPIO13 nearest the USB on one header, 3V3, GND and GPIO15 on the other.
  - **Pico:** GP0–GP15 (pins 1–20) along one edge, VBUS, VSYS, 3V3, the analog pins and GP16–22 (pins 40–21) along the other.
  - Trace still shows them as cards.

### Fixed
- **The Pico's pads were off-center.** The 3D and 2D drawings put the first pad 4 mm from the USB end and the last one past the far edge. All 40 pads are now centered on the 51 mm board, as on the real one.
- **Corrected the header descriptions for both boards** in the Component library. They had the two rows swapped.

## [1.18.0] - 2026-10-15

### Added
- **Two more breadboard sizes.** The Component library and the Engineering Lab now have a **full-size 830-point breadboard** (63 columns, four 50-hole rails) and a **mini 170-point breadboard** (17 columns, no rails), next to the half-size one. All three are drawn in 3D, 2D and Trace and have the same checks: strips and rails join their holes, a rail with the wrong sign gets a warning, and the Inspector lists the strips in use. Adding a full-size board feeds its top rails from the board, as with the half-size one. A mini has no rails, so it stays unwired until you feed a strip.

### Fixed
- **A breadboard's caption is no longer covered in 2D and Trace.** The flat drawing was taller than the 3D one and ran over the name and the "5 V · GND" badge. It is now scaled to fit below the caption.

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

[1.49.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.48.0...v1.49.0
[1.48.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.47.0...v1.48.0
[1.47.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.46.3...v1.47.0
[1.46.3]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.46.2...v1.46.3
[1.46.2]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.46.1...v1.46.2
[1.46.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.45.0...v1.46.0
[1.45.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.44.0...v1.45.0
[1.44.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.43.0...v1.44.0
[1.43.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.42.0...v1.43.0
[1.42.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.41.0...v1.42.0
[1.41.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.40.0...v1.41.0
[1.40.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.39.2...v1.40.0
[1.39.2]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.39.1...v1.39.2
[1.39.1]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.39.0...v1.39.1
[1.39.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.38.2...v1.39.0
[1.38.2]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.38.1...v1.38.2
[1.38.1]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.38.0...v1.38.1
[1.38.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.37.0...v1.38.0
[1.37.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.36.2...v1.37.0
[1.36.2]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.36.1...v1.36.2
[1.36.1]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.36.0...v1.36.1
[1.36.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.35.0...v1.36.0
[1.35.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.34.0...v1.35.0
[1.34.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.33.0...v1.34.0
[1.33.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.32.0...v1.33.0
[1.32.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.31.0...v1.32.0
[1.31.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.30.0...v1.31.0
[1.30.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.29.0...v1.30.0
[1.29.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.28.0...v1.29.0
[1.28.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.27.0...v1.28.0
[1.27.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.26.0...v1.27.0
[1.26.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.25.0...v1.26.0
[1.25.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.24.0...v1.25.0
[1.24.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.23.0...v1.24.0
[1.23.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.22.0...v1.23.0
[1.22.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.21.2...v1.22.0
[1.21.2]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.21.1...v1.21.2
[1.21.1]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.21.0...v1.21.1
[1.21.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.20.2...v1.21.0
[1.20.2]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.20.1...v1.20.2
[1.20.1]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.20.0...v1.20.1
[1.20.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.19.0...v1.20.0
[1.19.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.18.0...v1.19.0
[1.18.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.17.0...v1.18.0
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
