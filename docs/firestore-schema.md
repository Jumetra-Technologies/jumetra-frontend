# Firestore persistence

The backend is the only application writer. The browser sends authenticated API
requests; it does not use the Firebase Firestore SDK. Data is scoped to the
authenticated Kiungo user, and the only top-level application collections are
`users` and `projects`.

## Paths

```text
users/{userId}
  account identity, profile, auth metadata, learning_progress[]
  lab_sessions/{sessionId}
    one bounded Engineering Lab session per document

projects/{ownerId}
  owner_id
  projects/{projectId}
    project details and the existing experiments[] journal
  firmware_projects/{firmwareProjectId}
    project name, board, template, timestamps
    files/{sha256(relativePath)}
      relative path, text source, updated_at
```

`projects/{ownerId}` is an owner marker, not a user-facing project. Project and
firmware operations use the owner ID from the authenticated backend session;
they never accept an owner ID from the browser as authorization.

Lab sessions and source files are separate documents so they do not inflate a
user or project document. Firmware source files are limited to 700,000 UTF-8
bytes. Compiled binaries and other large artifacts should use Cloud Storage,
not Firestore.

## Data that stays out of Firestore

- Google and GitHub sign-in tokens are verified by the backend and are not
  stored as token documents.
- Theme, UI, diagnostics, and other temporary browser preferences stay local.
- Build output and device runtime state are not persisted by these routes.

This backend must not create top-level `access_tokens`, `login_sessions`,
`oauth_accounts`, `organizations`, `refresh_tokens`, or `runtime_objects`
collections. This restriction does not delete existing documents or collections.
