# src/lib/ — layer overview

`src/lib/` is the backend/domain layer: everything that isn't a route handler or a UI
component lives here, organized by concern. Modules are intentionally layered — see each
module's "Depends on" section for the exact direction:

```
lib/voice   — leaf, no internal deps (OpenAI wrappers; caller passes in the resolved API key)
lib/db      — leaf, no internal deps except lib/types (Mongo access)
lib/auth    — depends on lib/db, lib/types (NextAuth config, token crypto, session guard)
lib/gmail   — depends on lib/auth (tokenCrypto), lib/db, lib/types (Gmail API integration)
lib/bookmark — depends on lib/db, lib/gmail, lib/types (listening session/progress domain logic)
```

API routes (`src/app/api/**`) sit above all of these and compose them; see
[docs/app/api/README.md](../app/api/README.md).

## Modules
- [auth.md](./auth.md) — NextAuth config, session guard, token encryption
- [db.md](./db.md) — MongoDB client + typed collection accessors
- [gmail.md](./gmail.md) — Gmail API client, list/parse/actions
- [bookmark.md](./bookmark.md) — listening session + bookmark progress tracking
- [voice.md](./voice.md) — command matching, reply cleanup, STT, TTS (all OpenAI)

## src/lib/types.ts
A single root file (90 lines) with every shared type: DB document shapes (`UserDoc`,
`ListeningSessionDoc`, `BookmarkDoc`, `EmailActionLogDoc`), API payload shapes (`ParsedEmail`,
`CheckpointPayload`), settings types (`UserSettings`, `InboxScope`, `InboxOrder`,
`ThemePreference`, `DEFAULT_USER_SETTINGS`), and `EncryptedTokenPayload`. Nearly every module
above imports from it. When adding a new persisted concept or API payload shape, add the type
here first — don't declare document/payload shapes inline in individual modules.
