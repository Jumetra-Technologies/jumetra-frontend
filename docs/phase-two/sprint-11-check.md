# Sprint 11 check: website companion, sync and import

What Brad checks before the Sprint 11 gate. About 30 minutes, with a second computer for step 3 if you have one.

The backend needs jumetra-backend #7 (project sync) deployed for steps 3 and 4. Until then they work against a local backend only: Juma's pipeline deploys it, and Masden reviews the tables.

## 1. The website sends people to the app

1. Open the website's new **/download** page. It reads the newest release from `/releases/latest`:
   - With a release: the big button is for your computer ("Download for Windows"), and every installer is listed with its size and checksum. On a phone there's no guess: the list says which computers it runs on.
   - With no release published yet: it says the app is in beta, and offers the lab in the browser.
2. Home page: the "Already have a board?" section now leads to **Download the desktop app**. The footer and the sidebar have **Desktop app**.
3. **Hybrid Hardware** shows three modes (Virtual, Physical, Hybrid). The Simulator mode is gone, from the docs too.
4. **Firmware** shows a Preview note at the top: building and uploading moved to the desktop app.
5. The website's lab has a **Desktop app** link in its toolbar (on wide screens).
6. Lighthouse on the home page, mobile: performance ______, LCP ______ s. Pass: 90 or more, and 2.5 s or less.

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
