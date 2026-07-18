# src/app/api/session/ + src/app/api/session/next/

## Purpose
Getting/creating the active listening session and advancing it with a "skip" action that marks
the email as read (no INBOX label change, unlike archive).

## Key files
| File | Role |
|---|---|
| `session/route.ts` (50 lines) | GET — returns current progress via `getActiveSessionProgress`, or `null`. POST — `getOrCreateActiveSession` (creates one if none active) then `buildCheckpointResponse`. |
| `session/next/route.ts` (35 lines) | POST — marks message as read, then `advanceSession` (action: skip) + `buildCheckpointResponse`. |

## Depends on
- `src/lib/auth/requireUser`
- `src/lib/db/collections` (`usersCollection`, in `session/route.ts` for scope/order settings lookup)
- `src/lib/gmail/client` (`getGmailClientForUser`) — both
- `src/lib/gmail/actions` (`markMessageAsRead`) — `session/next/route.ts` only
- `src/lib/bookmark/session` (`getOrCreateActiveSession`, `getActiveSessionProgress`, `advanceSession`, `buildCheckpointResponse`) — see [docs/lib/bookmark.md](../../lib/bookmark.md)

## Depended on by
- `src/app/(authenticated)/listen/ListenClient.tsx`: `POST /api/session` on mount to load the first checkpoint; `POST /api/session/next` for the "skip" command. See [docs/app/listen.md](../listen.md).
- `src/app/(authenticated)/home/page.tsx` reads progress via `getActiveSessionProgress` directly (not through this route — it's a server component calling the lib function inline).

## Where to add new code here
A new way to advance a session with a distinct Gmail mutation → follow `session/next`'s pattern
(call the Gmail action from `src/lib/gmail/actions`, then `advanceSession` with the appropriate
action name). Session creation/scope logic changes belong in `src/lib/bookmark/session.ts`, not
these routes.
