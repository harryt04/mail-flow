# src/app/api/actions/ (+ src/app/api/labels/)

## Purpose
The user-initiated actions that both mutate Gmail and advance the listening session: archive,
reply, and move. `src/app/api/labels/route.ts` is a read-only sibling — it lists the user's
Gmail labels for the "move to folder" picker, documented here since it exists solely to support
the move action.

## Key files
| File | Role |
|---|---|
| `archive/route.ts` (35 lines) | POST — archives the current message (MVP: no permanent delete). |
| `reply/route.ts` (53 lines) | POST — sends a threaded Gmail reply using already-cleaned text (see [reply-cleanup.md](./reply-cleanup.md) for the cleanup step that precedes this call). |
| `move/route.ts` | POST — applies a user Gmail label (`labelId`/`labelName` in the body) and archives the message in one call, so it drops out of the inbox queue but stays findable under that label. |
| `../labels/route.ts` | GET — returns the user's real Gmail labels (`{ labels: GmailLabel[] }`), filtered to `type: "user"` (excludes INBOX/SPAM/CATEGORY_* system labels). MVP does not create labels on the user's behalf — if the one they want doesn't exist, they add it in Gmail and it shows up here next time. |

## Depends on
- `src/lib/auth/requireUser`
- `src/lib/gmail/client` (`getGmailClientForUser`) — all
- `src/lib/gmail/actions` (`archiveMessage`, `sendReply`, `moveMessageToLabel`) — archive, reply, move respectively
- `src/lib/gmail/labels` (`listUserLabels`) — the `/api/labels` route only
- `src/lib/gmail/parse` (`parseGmailMessage`) — reply only, to include original message context
- `src/lib/auth/openaiKey` (`incrementTrialActionUsage`) — archive, reply, move (called after Gmail action succeeds)
- `src/lib/bookmark/session` (`advanceSession`, `buildCheckpointResponse`) — all four actions, called last

## Depended on by
- `src/app/(authenticated)/listen/ListenClient.tsx` calls all four action routes via its `runAction`/
  `handleManualAction`/`runMoveVoiceFlow`/`handleConfirmMove` helpers, and fetches `/api/labels`
  once on mount for the move picker. See [docs/app/listen.md](../listen.md).

## Conventions
Every action route here follows the same four-step body: (1) get an authenticated Gmail
client, (2) perform the Gmail-side mutation, (3) call `incrementTrialActionUsage` to record
the action against the user's trial action count (archive, move, and reply routes only), and
(4) `advanceSession` + `buildCheckpointResponse` and return the resulting `CheckpointPayload`.
`move` is the first action to also pass an optional metadata value (`label`, the label name)
through to `advanceSession`'s logging — see [docs/lib/bookmark.md](../../lib/bookmark.md).

## Where to add new code here
A new Gmail-mutating user action (e.g. "mark as spam") → add the Gmail-side function to
`src/lib/gmail/actions.ts` first ([docs/lib/gmail.md](../../lib/gmail.md)), add the action to
the `EmailAction` union in `src/lib/types.ts`, then add a new route folder here following the
three-step pattern above.
