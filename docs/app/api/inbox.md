# src/app/api/inbox/

## Purpose
Paginated read access to the active session's snapshot, plus the "jump bookmark to this
message" action, for the `/inbox` browser page.

## Key files
| File | Role |
|---|---|
| `route.ts` | GET — `?page=&pageSize=` (default 25, max 50). Slices `session.messageIds` for that page, fetches lightweight metadata via `fetchMessageSummaries`, returns items + `cursorIndex` + `totalEstimate` so the client can mark the current bookmark row and show honest capped-count copy. |
| `jump/route.ts` | POST `{ sessionId, messageId }` — calls `jumpToMessage` then reuses `buildCheckpointResponse` (same shape as every other action route), so the response is ready to hand straight to `/listen`. |

## Depends on
- `src/lib/auth/requireUser`
- `src/lib/bookmark/session` (`getActiveSessionProgress`, `jumpToMessage`, `buildCheckpointResponse`)
- `src/lib/gmail/{client,list}` (`getGmailClientForUser`, `fetchMessageSummaries`)

## Depended on by
- `src/app/inbox/InboxClient.tsx` — see [docs/app/inbox.md](../inbox.md).

## Conventions
- Unlike `advanceSession` (skip/archive/reply/snooze/move), `jumpToMessage` does not log an
  `EmailActionLogDoc` entry or touch `bookmarks.lastProcessedMessageId` — jumping is navigation,
  not an action taken on the email.
- `GET` never fetches metadata for more than one page of message IDs — see
  [docs/lib/gmail.md](../../lib/gmail.md)'s quota note on `fetchMessageSummaries`.

## Where to add new code here
A new way to navigate the snapshot (e.g. jump by search) → extend this GET route's query
params; keep the jump mutation itself in `jumpToMessage` (`src/lib/bookmark/session.ts`) rather
than reimplementing cursor logic in the route.
