# Sprint 11 check: website companion, sync and import

What Brad checks before the Sprint 11 gate. About 30 minutes, with a second computer for step 3 if you have one.

The backend needs jumetra-backend #7 (project sync) deployed for steps 3 and 4. Until then they work against a local backend only: Juma's pipeline deploys it, and Masden reviews the tables. Step 1's download needs no backend: it reads the GitHub release until the pipeline publishes to the backend.

## 1. The website sends people to the app

1. Open the home page and scroll to the end, **Then take it to your desk** (or follow **Get the desktop app** from the hybrid section, or **Desktop app** in the footer).
   - On your Windows PC the big button says **Download for Windows** and downloads `Kiungo-0.11.0-win-x64.exe`. **All downloads** lists every installer with its size.
   - On a phone there's no button: it says the app runs on computers, and the list is still there.
   - The four tabs (**Code and run**, **Real board**, **Robot world**, **Fix mistakes**) swap the screenshot and its caption; the arrow keys work on them too.
   - **How to open the beta** says what to do about the Windows and macOS warnings (the installers aren't signed yet).
2. Install it from that download. Windows warns (SmartScreen: More info, Run anyway); the app opens to the sign-in screen.
3. **Hybrid Hardware** shows three modes (Virtual, Physical, Hybrid). The Simulator mode is gone, from the docs too.
4. **Firmware** shows a Preview note at the top: building and uploading moved to the desktop app.
5. The website's lab has a **Desktop app** link in its toolbar (on wide screens).
6. Lighthouse on the home page, mobile: performance ______, LCP ______ s. Pass: 90 or more, and 2.5 s or less.

Where the download comes from: the backend's `/releases/latest` when the release pipeline has published there (Juma's token), otherwise the newest GitHub release from the **Release the desktop app** workflow. Until a release exists, the section says the first beta is being prepared.

**To publish the first beta** (one of these; the workflow builds the installers on Windows, Ubuntu and macOS, about 25 minutes):
- Push the tag from the Sprint 11 branch: `git tag desktop-v0.11.0 && git push origin desktop-v0.11.0`.
- Or, once the branch is merged, open **Actions → Release the desktop app → Run workflow** with the channel set to beta.

The home page picks the release up within five minutes.

## 2. Phase One work comes across (DSK-15)

1. On the website, save a lab session (in the lab, signed in) and make a project on the Projects page.
2. In the desktop app, signed in as the same person, go to Home > **Import** > **From the Kiungo website…**. Both are listed.
3. Import the lab session. It opens as a project with the same parts and wires, a blank sketch for its board, and a note if the board can't be built for here (a Pico, say).
4. Import the website project. It opens as a blank project, with its description, objectives, hardware and team in `records/about.md`.
5. Import the same lab session again. It says it's a second copy.
6. Also try **Import > A lab session file…** with a `.kiungo.json` exported from the website's lab.

## 3. Sync (DSK-14)

1. Home > **On your account**: tick **Keep a copy of my projects on my account**. Off is the default: nothing leaves the computer until you turn it on.
2. Open a project. The chip by **Saved** says **Synced** (hover it for the revision). Change the code, wait about 30 seconds, or close the project: it syncs.
3. On a second computer (or a second user profile), sign in and turn sync on. The project is listed under **On your account**. **Bring to this computer** opens it.
4. Change the sketch on both computers without syncing in between, then open it on the first. Your version stays. The other is saved beside it as `sketch.ino (from OTHER-PC 2 Nov).txt`, and the chip says **Synced, with a conflict**.
5. Work offline: the chip says **Offline**, and everything else works as usual.

## Gate question

Does the website send people to the app without losing anyone?

## Known limits

- Sync is per project and whole files, not live collaboration. While a project is open, changes made on another computer are taken the next time it opens (the chip says so).
- Projects sync up to 20 MB, each file up to 2 MB, with 200 MB per account (the backend's limits, for Masden to confirm).
- The web firmware tools still work for now. Retiring the server build endpoints is a backend change, left for after launch.
