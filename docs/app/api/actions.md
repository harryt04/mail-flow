# src/app/api/actions/

## Purpose
The three user-initiated actions that both mutate Gmail and advance the listening session:
archive, reply, snooze.

## Key files
| File | Role |
|---|---|
| `archive/route.ts` (35 lines) | POST — archives the current message (MVP: no permanent delete). |
| `reply/route.ts` (53 lines) | POST — sends a threaded Gmail reply using already-cleaned text (see [reply-cleanup.md](./reply-cleanup.md) for the cleanup step that precedes this call). |
| `snooze/route.ts` (31 lines) | POST — MVP snooze has the same effect as skip, logged separately for future differentiation. |

## Depends on
- `src/lib/auth/requireUser`
- `src/lib/gmail/client` (`getGmailClientForUser`) — all three
- `src/lib/gmail/actions` (`archiveMessage`, `sendReply`) — archive and reply respectively
- `src/lib/gmail/parse` (`parseGmailMessage`) — reply only, to include original message context
- `src/lib/bookmark/session` (`advanceSession`, `buildCheckpointResponse`) — all three, called last

## Depended on by
- `src/app/listen/ListenClient.tsx` calls all three via its `runAction`/`handleManualAction` helpers. See [docs/app/listen.md](../listen.md).

## Conventions
Every route here follows the same three-step body: (1) get an authenticated Gmail client, (2)
perform the Gmail-side mutation, (3) `advanceSession` + `buildCheckpointResponse` and return
the resulting `CheckpointPayload`. `snooze` currently has no distinct Gmail-side effect from
skip — it exists as its own route (rather than a parameter on `/api/session/next`) so its
`EmailAction` is logged distinctly for future snooze-specific behavior.

## Where to add new code here
A new Gmail-mutating user action (e.g. "mark as spam") → add the Gmail-side function to
`src/lib/gmail/actions.ts` first ([docs/lib/gmail.md](../../lib/gmail.md)), add the action to
the `EmailAction` union in `src/lib/types.ts`, then add a new route folder here following the
three-step pattern above.
