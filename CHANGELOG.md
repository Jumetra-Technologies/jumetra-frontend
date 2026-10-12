# Changelog

All notable changes to the Kiungo frontend. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html):

- **Patch** (`1.2.0 → 1.2.1`): fixes, no new behaviour.
- **Minor** (`1.2.0 → 1.3.0`): new features that keep saved data and URLs working.
- **Major** (`1.2.0 → 2.0.0`): breaking changes, such as a new saved-data format, removed routes, or a backend contract older clients can't use.

Every pull request that changes the app bumps the version (`npm run release:patch | release:minor | release:major`) and adds an entry here. `__tests__/Version.test.ts` fails if the version in `package.json` has no entry. Tag the merge commit `vX.Y.Z` on `main`.

Versions before 1.2.0 were assigned after the fact to the pull requests already merged.

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

[1.3.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.2.3...v1.3.0
[1.2.3]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.2.2...v1.2.3
[1.2.2]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/Jumetra-Technologies/jumetra-frontend/releases/tag/v1.0.0
