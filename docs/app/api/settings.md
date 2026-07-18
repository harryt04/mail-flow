# src/app/api/settings/ + src/app/api/settings/disconnect/

## Purpose
Read/write user settings (inbox scope, inbox order, theme, voice tone), and disconnect
(revoke Gmail access + clear related data).

## Key files
| File | Role |
|---|---|
| `settings/route.ts` (66 lines) | GET — returns `UserSettings`. POST — validates and persists a partial `UserSettings` update. |
| `settings/disconnect/route.ts` (31 lines) | POST — clears stored Gmail tokens and deletes the user's bookmarks/sessions, effectively resetting their listening state. |

## Depends on
- `src/lib/auth/requireUser`
- `src/lib/db/collections` (`usersCollection`; disconnect also uses `bookmarksCollection`, `sessionsCollection`)
- `src/lib/auth/tokenCrypto` (disconnect only, to identify/clear stored tokens)

## Depended on by
- `src/app/settings/SettingsClient.tsx` — `GET/POST /api/settings` for reading/saving preferences, `POST /api/settings/disconnect` for the disconnect button. See [docs/app/settings.md](../settings.md).

## Conventions
`settings/route.ts` validates against a `VALID_THEME`-style allowlist array (mirroring the
`ThemePreference`/`InboxScope`/`InboxOrder` unions in `src/lib/types.ts`) before persisting —
follow this pattern for any new setting field rather than trusting the request body directly.

## Where to add new code here
A new user preference → add the field to `UserSettings` in `src/lib/types.ts`
([docs/lib/README.md](../../lib/README.md)), extend `DEFAULT_USER_SETTINGS`, then extend the
GET/POST handling and validation in `settings/route.ts`.
