# Accounts and profile (v1.2.0)

How sign-in, the profile and account deletion work in the Kiungo frontend, and the backend contract they rely on.

## 1. What the user sees

### Google button (everywhere sign-in appears)

Follows Google's sign-in branding: the official four-colour "G" on a neutral pill.

| | Light | Dark |
|---|---|---|
| Fill | `#FFFFFF` | `#131314` |
| Border | `#747775` | `#8E918F` |
| Label | `#1F1F1F`, 14px medium | `#E3E3E3` |
| Hover | 4% grey wash + shadow | 8% white wash |

The button no longer greys itself out while the Firebase config loads. It stays at full contrast; if the config isn't ready when clicked, the click waits for it. A small spinner replaces the "G" only while sign-in is actually running.

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
│                                      │
│  New to Kiungo? Sign up              │  ← switches mode in place
│  ──────────────────────────────────  │
│  We keep your name, email and photo  │
│  from Google. Privacy Policy.        │
└──────────────────────────────────────┘
```

Sign-up mode reads "Create your Kiungo account" with "Already have an account? Log in". Both modes use the same Google flow (Google accounts are created on first sign-in). The modal closes itself on success.

### Settings → Profile tile (replaces "Account")

Signed out:

```
┌ Profile ─────────────────────────────┐
│ Not signed in                        │
│ Projects are saved in this browser.  │
│ Sign in to keep them with you.       │
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

- Shows the Google profile photo (falls back to initials if the photo fails to load).
- The name/email area is a button: signed in → profile modal; signed out → sign-in modal.
- The gear still opens Settings.
- Collapsed sidebar: the avatar opens the profile (or sign-in when signed out).

### Profile modal

```
┌──────────────────────────────────────┐
│ Profile                           ✕  │
│ (photo 72px)  Brad Robinson          │
│               bradr3671@gmail.com    │
│               [G] Signed in with Google
│ ──────────────────────────────────── │
│ Name           Brad Robinson         │
│ Email          bradr…  (managed by Google)
│ Role           Instructor            │
│ Organisation   Strathmore University │
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
└── AccountDialogs              mounts AuthDialog + ProfileDialog
components/ui/modal.tsx         ModalShell: focus trap, Escape, backdrop, stacking
components/auth/
├── google-signin-button.tsx    branded button, error mapping
├── google-logo.tsx             official four-colour G
└── AuthDialog.tsx              log in / sign up modal
components/account/
├── Avatar.tsx                  Google photo with initials fallback
├── ProfileTile.tsx             Settings preview
└── ProfileDialog.tsx           view / edit / delete
lib/account-dialogs.ts          open/close state (same pattern as settings-dialog)
lib/profile.ts                  types, validation, API calls, device fallback
lib/auth-store.ts               session + user; keeps the Google photo
```

Modals stack: the profile opens on top of Settings, and Escape closes only the top one.

## 3. Data flow

```
Sign in
  GoogleButton ─▶ Firebase popup ─▶ { idToken, photoURL }
               ─▶ POST /auth/google { id_token } ─▶ session
               ─▶ store (picture_url = backend's, else Firebase photoURL)

Load
  AuthBootstrap ─▶ localStorage session ─▶ GET /auth/me (or /auth/refresh)
               ─▶ user merged; photo kept if the backend returns none

Edit
  ProfileDialog ─▶ PATCH /auth/me { changed fields } ─▶ updated user
               └▶ 405/404/501: saved on this device (hhip-profile:<user id>)
                   and the dialog says so

Delete
  ProfileDialog ─▶ DELETE /auth/me ─▶ 204 ─▶ clear local profile, sign out
               └▶ 405/404/501: "not available yet"; nothing is claimed deleted
```

## 4. Backend contract

All routes take `Authorization: Bearer <access_token>`. Errors use FastAPI's `{ "detail": "…" }`.

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

`picture_url` should come from the Google ID token's `picture` claim on every sign-in.

### `PATCH /auth/me` (new)

Body: any subset of the editable fields. `null` or `""` clears a field.

| Field | Type | Rule |
|---|---|---|
| `display_name` | string | 1–80 chars, required if sent |
| `role` | enum or null | `student`, `technician`, `instructor`, `club_lead`, `school_admin`, `hobbyist` |
| `organization` | string or null | ≤ 120 chars |
| `location` | string or null | ≤ 80 chars |
| `bio` | string or null | ≤ 280 chars |

`email` and `picture_url` aren't editable (Google owns them). Returns the full user (as `GET /auth/me`). `422` on validation errors.

### `DELETE /auth/me` (new)

Deletes the user and their personal data, returns `204`. Tokens for that user must stop working afterwards (`401` from `/auth/me`).

### Until the backend ships these

The frontend treats `404`, `405` and `501` from `PATCH`/`DELETE /auth/me` as "not supported yet":

- Edits are saved in this browser under `hhip-profile:<user id>` and overlaid on the server user. The dialog says "Saved on this device". The next successful `PATCH` sends them to the server and clears the local copy.
- Delete shows "Account deletion isn't available on the server yet" and deletes nothing.

Firebase Authentication must list every domain that serves the app (`jumetra-frontend.vercel.app`, `localhost`) under Authorized domains, or the popup fails with `auth/unauthorized-domain`. The button shows that error in plain words.

## 5. Versioning

The app follows [Semantic Versioning](https://semver.org): `MAJOR.MINOR.PATCH`.

- **Patch**: fixes with no new behaviour.
- **Minor**: new features that don't break saved data or URLs.
- **Major**: breaking changes (saved-data format, removed routes, a backend contract change that old clients can't use).

The version lives in `package.json`, is shown in Settings, and every release has an entry in `CHANGELOG.md`. A test fails if the version has no changelog entry. Bump with `npm run release:patch`, `release:minor` or `release:major`, then add the entry.
