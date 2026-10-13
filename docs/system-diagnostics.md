# System Diagnostics (v1.10.0)

An administrators' page with the state of the Kiungo platform: health, performance, usage, errors, architecture, and the report center. It replaces the old System Diagnostics dashboard (removed in v1.6.1) and the Reports page.

## Getting in

- The page is at `/system` and isn't linked anywhere. Settings has a small spinning Arduino beside the version number. Seven clicks in a row (no more than 1.5 s apart) open the page. This marks the browser tab as unlocked (`sessionStorage`). Opening `/system` any other way shows the normal broken-link page.
- Once unlocked, the page checks the signed-in user's **platform role** as the server reports it (`platform_role` on the user):
  - `ADMIN`: the full page.
  - Any other role, or signed out: "Administrators only".
  - Not reported (today's backend): the page opens with a notice that the role can't be confirmed.

**Hiding the way in is not security.** Anyone can read the app's JavaScript and find `/system` or the click count. Every admin-only answer must be enforced by the server. The page itself only shows public endpoints (`/health`, `/analytics`) and what this browser recorded until the endpoints below exist.

## Where the numbers come from

| Panel | Source | Scope |
|---|---|---|
| Services (backend, live updates) | `GET /health` timed 3×, median; WebSocket open to the live-updates URL | Live check from this browser |
| Activity, sync, backend latency | `GET /analytics/dashboard`, `GET /analytics` | Platform (public today) |
| Registered users, online now, active 24 h, new 7 days, most visited pages (all users) | `GET /admin/stats` | Platform, **needs backend** |
| Request times, slowest endpoints | Every request the app makes (`lib/api-client.ts` → `lib/diagnostics/store.ts`) | This browser |
| Most visited pages (this browser) | The app frame records each page visit | This browser |
| Errors | Failed requests (not 401/403), uncaught errors and rejected promises | This browser; **platform-wide needs backend** |
| Page load | Navigation and paint timing | This page load |
| Architecture | Deployment chain with live status; layers from `lib/architecture/model.ts` | — |
| Reports | The report center (Markdown export of records in this browser) | This browser |

The browser log is kept in `localStorage` (`kiungo-diagnostics`). It is capped at 300 requests and 150 errors and never leaves the browser.

## Backend contract (to build)

All `/admin/*` routes answer only when the bearer token belongs to a user whose `users.role` is `ADMIN`; anyone else gets `403`. The frontend treats `404`, `405` or `501` as "not built yet".

1. **`GET /auth/me` returns `platform_role`**: the `users.role` column (`ADMIN`, `RESEARCHER`, `TEACHER`, `STUDENT`, `VIEWER`). It is a separate field from the profile's self-described `role` (student, instructor…). `PATCH /auth/me` must never change `users.role`.
2. **`GET /admin/stats`**
   ```json
   { "registered_users": 412, "online_users": 9, "active_users_24h": 57, "signups_7d": 23,
     "top_pages": [{ "path": "/laboratory/workspace", "views": 1840 }] }
   ```
   "Online" means a request or heartbeat in the last 5 minutes (`users.last_seen_at`, updated by the auth dependency at most once a minute).
3. **`POST /telemetry/page-view`** `{ "path": "/docs/roadmap" }`: anonymous, rate-limited, path only (no query string). Feeds `top_pages`.
4. **`POST /telemetry/error`** `{ "message", "source", "page", "shown", "detail", "at", "app_version" }`, rate-limited, size-capped; **`GET /admin/errors?limit=100`** lists them for this page. The app already sends every error it logs here (since v1.11.0), with `navigator.sendBeacon` and a `text/plain` body containing JSON (a simple request, no CORS preflight). Until the route exists the beacons are ignored and errors stay in each browser's own log.

Once 3 exists, `lib/diagnostics/store.ts` posts page views the same way.
