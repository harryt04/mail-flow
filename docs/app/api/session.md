# src/app/api/session/ + src/app/api/session/next/

## Purpose
Getting/creating the active listening session and advancing it with a plain "skip" (no Gmail
mutation, unlike archive/reply/snooze).

## Key files
| File | Role |
|---|---|
| `session/route.ts` (50 lines) | GET — returns current progress via `getActiveSessionProgress`, or `null`. POST — `getOrCreateActiveSession` (creates one if none active) then `buildCheckpointResponse`. |
| `session/next/route.ts` (31 lines) | POST — `advanceSession` (action: skip) + `buildCheckpointResponse`. The only session-advancing route with no corresponding Gmail-side effect. |

## Depends on
- `src/lib/auth/requireUser`
- `src/lib/db/collections` (`usersCollection`, in `session/route.ts` for scope/order settings lookup)
- `src/lib/gmail/client` (`getGmailClientForUser`) — both
- `src/lib/bookmark/session` (`getOrCreateActiveSession`, `getActiveSessionProgress`, `advanceSession`, `buildCheckpointResponse`) — see [docs/lib/bookmark.md](../../lib/bookmark.md)

## Depended on by
- `src/app/(authenticated)/listen/ListenClient.tsx`: `POST /api/session` on mount to load the first checkpoint; `POST /api/session/next` for the "skip" command. See [docs/app/listen.md](../listen.md).
- `src/app/(authenticated)/home/page.tsx` reads progress via `getActiveSessionProgress` directly (not through this route — it's a server component calling the lib function inline).

## Where to add new code here
A new way to advance a session without a corresponding Gmail mutation → follow `session/next`'s
pattern (call `advanceSession` directly, no Gmail client needed unless the action needs one).
Session creation/scope logic changes belong in `src/lib/bookmark/session.ts`, not these routes.
