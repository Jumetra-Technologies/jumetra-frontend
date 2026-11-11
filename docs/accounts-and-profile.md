# Accounts and profile (v1.2.0)

How sign-in, the profile and account deletion work in the Kiungo frontend, and the backend contract they rely on.

## 1. What the user sees

### Provider buttons (everywhere sign-in appears)

Google follows Google's sign-in branding: the official four-color "G" on a neutral pill. GitHub uses its mark on a high-contrast dark button.

| Provider | Light | Dark |
|---|---|---|
| Google | Neutral white button and official four-color mark | Neutral near-black button and official mark |
| GitHub | GitHub dark button with white mark and label | Same high-contrast GitHub button |

The Firebase popup is prepared before use; a small spinner replaces the provider mark while sign-in is running. GitHub opens a secure popup through Firebase and can reuse an existing GitHub browser session. Errors explain blocked popups, network problems and providers that have not been enabled.

### Sign-in modal (`Log in` / `Sign up`)

```
┌──────────────────────────────────────┐
│                                   ✕  │
│            [Kiungo mark]             │
│        Log in to Kiungo              │
│  Pick up your projects and lab       │
│  sessions on any device.             │
│                                      │
│  ( G  Continue with Google        )  │
│                 or                   │
│  ( ◉  Continue with GitHub        )  │
│                                      │
│  New to Kiungo? Sign up              │  ← switches mode in place
│  ──────────────────────────────────  │
│  We use your name, email and photo   │
│  from your provider. Privacy Policy. │
└──────────────────────────────────────┘
```

Sign-up mode reads "Create your Kiungo account" with "Already have an account? Log in". Both providers create a Kiungo account on first sign-in. The modal closes itself on success.

### First profile setup

After sign-in, people without a profile role see a welcome card. It asks them to choose Student, Researcher, Instructor, or Other; Other opens a custom role field. The card also offers secure provider linking so Google and GitHub can sign in to the same Kiungo account. For complete profiles, a separate optional recommendation appears after sign-in. Linking proves access to both providers through Firebase; an email address is never used alone to merge accounts. Organization and location are optional. Location may be typed, or requested only after the person presses "Use my location" and approves the browser prompt; approved coordinates are saved as editable profile text. "Not now" defers setup until a later sign-in.

### Settings → Profile tile (replaces "Account")

Signed out:

```
┌ Profile ─────────────────────────────┐
│ Not signed in                        │
│ Everything in Kiungo works without   │
│ an account. Sign in to save your     │
│ projects and lab sessions, and to    │
│ open them on another device.         │
│ [ Log in ]  [ Sign up ]              │  ← Log in = primary (teal)
└──────────────────────────────────────┘
```

Signed in: the whole tile is one button that opens the profile modal on top of Settings.

```
┌ Profile ───────────────────── View ›┐
│ (photo) Brad Robinson               │
│         bradr3671@gmail.com         │
│ Instructor · Strathmore University  │
└──────────────────────────────────────┘
```

### Sidebar account row

- Shows the provider profile photo (falls back to initials if the photo fails to load).
- The name/email area is a button: signed in → profile modal; signed out → sign-in modal.
- The gear still opens Settings.
- Collapsed sidebar: the avatar opens the profile (or sign-in when signed out).

### Profile modal

```
┌──────────────────────────────────────┐
│ Profile                           ✕  │
│ (photo 72px)  Brad Robinson          │
│               bradr3671@gmail.com    │
│               [✓] Secure sign-in enabled
│ Sign-in methods    Google Connected  GitHub Connect
│ ──────────────────────────────────── │
│ Name           Brad Robinson         │
│ Email          bradr…  (managed by provider)
│ Role           Instructor            │
│ Organization   Strathmore University │
│ Location       Nairobi               │
│ About          …                     │
│                                      │
│ [ Edit profile ]          Sign out   │
│ ──────────────────────────────────── │
│ Delete account                       │
│ Removes your profile from Kiungo…    │
│ [ Delete account ]                   │
└──────────────────────────────────────┘
```

Edit mode turns the rows into inputs with Save / Cancel and "Clear my details". Deleting asks for confirmation in place, not in a second pop-up.

## 2. Components

```
app/layout.tsx
└── AuthBootstrap               restores the session, refreshes it from /auth/me
components/layout/sidebar.tsx
├── AccountRow                  avatar + name → profile or sign-in
├── SettingsDialog              (ModalShell) → ProfileTile
└── AccountDialogs              mounts AuthDialog + WelcomeDialog + ProfileDialog
components/account/ProviderConnections   links Google/GitHub to the active account
components/ui/modal.tsx         ModalShell: focus trap, Escape, backdrop, stacking
components/auth/
├── social-signin-button.tsx    shared Firebase popup, session and error handling
├── google-signin-button.tsx    Google branded provider wrapper
├── github-signin-button.tsx    GitHub branded provider wrapper
├── google-logo.tsx             official four-color G
└── AuthDialog.tsx              log in / sign up modal
components/account/
├── Avatar.tsx                  Provider photo with initials fallback
├── ProfileTile.tsx             Settings preview
└── ProfileDialog.tsx           view / edit / delete
lib/account-dialogs.ts          open/close state (same pattern as settings-dialog)
lib/profile.ts                  types, validation and API calls
lib/auth-store.ts               provider token exchange, session + user
```

Modals stack: the profile opens on top of Settings, and Escape closes only the top one.

## 3. Data flow

```
Sign in
  ProviderButton ─▶ Firebase popup ─▶ { idToken, photoURL }
                 ─▶ POST /auth/{google|github} { id_token } ─▶ session
                 ─▶ one User record with provider identities + managed session
                 ─▶ store (picture_url = backend's, else Firebase photoURL)
                 ─▶ WelcomeDialog if the profile role is not set

Link a sign-in method
  ProviderConnections ─▶ Firebase linkWithPopup (active Firebase UID)
                      ─▶ POST /auth/link-provider { id_token, provider }
                      ─▶ backend verifies same UID and records linked identity

Load
  AuthBootstrap ─▶ localStorage session ─▶ GET /auth/me (or /auth/refresh)
               ─▶ user merged; photo kept if the backend returns none

Edit
  ProfileDialog   ─▶ PATCH /auth/me { editable profile fields } ─▶ updated user

Delete
  ProfileDialog ─▶ DELETE /auth/me ─▶ 204 ─▶ clear local profile, sign out
               └▶ 405/404/501: "not available yet"; nothing is claimed deleted
```

## 4. Backend contract

All routes take `Authorization: Bearer <access_token>`. Errors use FastAPI's `{ "detail": "…" }`.

### `POST /auth/google` and `POST /auth/github`

Both routes accept a Firebase ID token and create or resume the same managed Kiungo session. GitHub tokens must identify `github.com` as the Firebase sign-in provider; GitHub emails need not be verified to authenticate. Only verified email claims can match an existing account by email; unverified emails are never used to merge accounts. Provider identity or Firebase UID is used for account continuity, and provider linking requires the same Firebase UID. Access and refresh tokens are signed credentials returned to the client and are not stored as Firestore documents or in separate token/session collections.

Enable GitHub in Firebase Console → Authentication → Sign-in method, configure the GitHub OAuth app's Authorization callback URL as `https://hhipsystemv0.firebaseapp.com/__/auth/handler`, and enable the `user:email` scope. The Firebase SDK uses the configured Firebase `authDomain` to construct the OAuth callback for provider popups; for this project it must be `hhipsystemv0.firebaseapp.com`. This is a shared Firebase setting, not a GitHub-only frontend redirect, so keep it aligned with the existing Google configuration. The GitHub OAuth Client ID and Client Secret configured in Firebase must belong to the GitHub OAuth App with that exact callback. Keep the GitHub client secret in Firebase Console, never in the frontend or this backend. Add each app host (including localhost for development) to Firebase Authorized domains.

### `POST /auth/link-provider`

Requires the active Kiungo bearer token and a Firebase ID token for the same Firebase UID, after the user links the additional provider with Firebase. The backend confirms that the requested provider identity is present in the verified token and is not attached to a different user, then updates the existing user record. Email-only requests cannot merge accounts.

### `GET /auth/me` (exists; extend the response)

```json
{
  "id": "u_123",
  "email": "bradr3671@gmail.com",
  "display_name": "Brad Robinson",
  "picture_url": "https://lh3.googleusercontent.com/a/…=s96-c",
  "role": "instructor",
  "organization": "Strathmore University",
  "location": "Nairobi",
  "bio": "Teaches embedded systems."
}
```

`picture_url` comes from the selected provider's Firebase ID token `picture` claim.

### `PATCH /auth/me`

Body: any subset of the editable fields. `null` or `""` clears a field.

| Field | Type | Rule |
|---|---|---|
| `display_name` | string | 1–80 chars, required if sent |
| `role` | enum or null | `student`, `researcher`, `instructor`, `technician`, `club_lead`, `school_admin`, `hobbyist`, `other` |
| `role_other` | string or null | ≤ 80 chars; required when role is `other` |
| `organization` | string or null | ≤ 120 chars |
| `location` | string or null | ≤ 80 chars |
| `bio` | string or null | ≤ 280 chars |

`email` and `picture_url` aren't editable (the identity provider owns them). Returns the full user (as `GET /auth/me`), including connected sign-in methods. `422` on validation errors.

### `DELETE /auth/me` (new)

Deletes the user and their personal data, returns `204`. Tokens for that user must stop working afterwards (`401` from `/auth/me`).

The user's self-described role is stored separately from the backend authorization role. The frontend cannot change the authorization role. The dialog says "Saved on this device". The next successful `PATCH` sends them to the server and clears the local copy.
- Delete shows "Account deletion isn't available on the server yet" and deletes nothing.

Firebase Authentication must list every domain that serves the app (`jumetra-frontend.vercel.app`, `localhost`) under Authorized domains, or the popup fails with `auth/unauthorized-domain`. Both buttons show provider-specific errors in plain words.

## 5. Using Kiungo without an account (v1.41.0)

No page asks for a sign-in before it can be used. An account is for **saving** work and for the few things the server only does for an account. The backend sets the line: every request that changes something needs a signed-in user (`security/auth_middleware.py`), and so does everything under `/auth/me`; other reads are open.

### What a signed-out visitor gets

| Page | Signed out |
|---|---|
| Projects (`/workspace`, `/workspace/projects/[id]`) | Create, edit and delete projects, record experiments, start lab sessions. Marked **Not saved**. |
| Engineering Lab (`/laboratory/workspace`) | The whole lab. The toolbar's save status is a "Not saved · Sign in to save" button. |
| Experiment Records (`/experiments`) | Record, edit, delete and export records for the projects made in this tab. |
| Advanced Analytics (`/analytics`) | Charts this tab's lab sessions, projects and records, and learning progress. |
| Component library, Learning Center, Documentation | Everything (learning progress is kept in the browser). |

### What still needs a sign-in, and how each says so

| Feature | Why | What the visitor sees |
|---|---|---|
| Saving projects, records and lab sessions; opening them on another device | They are kept on the account | A band on each page: what isn't saved, and **Sign in to save** (`SignInNotice`) |
| Opening a project saved to an account (`user-project-…`) | It is read from `/auth/me/projects` | "Sign in to open this project" (`SignInPrompt`) |
| Adding teammates to a project | Teammates are other accounts (`/auth/users/search`) | A note in the create form with a Sign in link; the rest of the form works |
| Real boards in the lab, and the lab's mirror to Kiungo online | The server keeps them for an account | A line in the Real hardware panel with a Sign in link; no status pill |
| Hybrid experiments (`/hybrid`) | Created and run on the server | A note by the Create button; planning (board, parts, modes) works |
| Firmware projects, compiling and uploading (`/firmware`) | Kept and compiled on the server | A note by New project; flashing a `.hex` over USB works without one |
| Legacy lab pages (`/laboratory`, `/laboratory/hybrid`) | Their actions are server writes | The error ends "Sign in and try again." with a Sign in button (`ErrorNotice`) |
| Profile, sign-in methods, admin portal, signing in the desktop app | They are the account | Their own sign-in screens |

### Unsaved work

Signed out, projects, experiment records and lab sessions live in **this tab's memory**: nothing is written to the browser's storage and nothing is sent to the server. Closing or reloading the page discards them, and the browser asks first when there is something to lose (`hasUnsavedWork` in `components/projects/ProjectsAccountSync.tsx`).

- `lib/projects/workspace.ts` is the one place pages get projects and records from (`useProjects`, `createProject`, `updateProject`, `deleteProject`, `listRecords`, `saveRecord`, `deleteRecord`). Signed in they go to the account; signed out they go to the in-memory store in `lib/robotics-data.ts`. An unsaved project's id starts with `local-project-`; an account's with `user-project-`.
- **Signing in saves what was made signed out.** `ProjectsAccountSync` (mounted once in `app/layout.tsx`) calls `setProjectsAccount`, which runs `saveUnsaved()`: each unsaved project is created on the account, its records and lab sessions are re-pointed at the saved project, then its records are created. `LabAccountSync` carries the lab sessions (see `docs/engineering-lab-simulation.md` section 6). A project's own page follows it to its new id where it stands, so nothing being typed is lost.
- **When saving fails** (no connection, say), what couldn't be saved stays unsaved and marked so; the Projects page says so with Try again, the project's page offers "Save to my account", and the browser still asks before leaving.
- **Signing out** shows nothing of the account that left: the store is emptied, and anything a page fetched is kept with the account it was fetched for.

### Adding a feature

- If it only reads, or works in the browser, don't gate it.
- If it needs the server to change something, let the page open and gate the **action**: say up front what the account is for (a short note with a Sign in link that calls `openAuth("login")`), and show `describeError()` through `ErrorNotice` if the server still refuses.
- Never wrap a page in a sign-in screen. `SignInPrompt` is only for things that exist solely on an account.
- User-facing text calls the server "Kiungo online" (`__tests__/Errors.test.tsx` checks the wording).

## 6. Versioning

The app follows [Semantic Versioning](https://semver.org): `MAJOR.MINOR.PATCH`.

- **Patch**: fixes with no new behavior.
- **Minor**: new features that don't break saved data or URLs.
- **Major**: breaking changes (saved-data format, removed routes, a backend contract change that old clients can't use).

The version lives in `package.json`, is shown in Settings, and every release has an entry in `CHANGELOG.md`. A test fails if the version has no changelog entry. Bump with `npm run release:patch`, `release:minor` or `release:major`, then add the entry.
