# src/lib/bookmark/

## Purpose
The core "listening session" domain logic: tracking which ordered snapshot of the inbox a user
is working through, where they left off (the bookmark), and advancing that state when they
skip/archive/reply/snooze/move an email. This is what makes listening resumable across days —
the feature that gives the module its name.

## Key files
| File | Role |
|---|---|
| `session.ts` | `getOrCreateActiveSession`, `getActiveSessionProgress`, `advanceSession`, `jumpToMessage`, `buildCheckpointResponse`. |
| `stats.ts` | `getActionCounts(userId)` — all-time per-`EmailAction` tallies from `emailActionLogsCollection`, for `/home`'s idle-state dashboard. Read-only aggregation, kept separate from `session.ts` since it doesn't mutate anything. |

## Depends on
- `src/lib/db/collections.ts` — `sessionsCollection`, `bookmarksCollection`, `emailActionLogsCollection`.
- `src/lib/gmail/list.ts` (`buildInboxSnapshot`) — builds the ordered message-ID list a session walks through, plus `totalEstimate` (Gmail's approximate true count, for honest capped-snapshot messaging).
- `src/lib/gmail/client.ts` (`fetchMessage`) and `src/lib/gmail/parse.ts` (`parseGmailMessage`) — used inside `buildCheckpointResponse` to turn the next message ID into a `ParsedEmail`.
- `src/lib/types.ts` — `ListeningSessionDoc`, `InboxScope`, `InboxOrder`, `EmailAction`, `CheckpointPayload`.

## Depended on by
- `src/app/home/page.tsx` — `getActiveSessionProgress` and `getActionCounts` for the dashboard.
- `src/app/api/session/route.ts` — `getOrCreateActiveSession`, `getActiveSessionProgress`, `buildCheckpointResponse`.
- `src/app/api/session/next/route.ts` and all four `src/app/api/actions/{archive,reply,snooze,move}` routes — `advanceSession` + `buildCheckpointResponse` after the underlying Gmail action completes. See [docs/app/api/session.md](../app/api/session.md) and [docs/app/api/actions.md](../app/api/actions.md).
- `src/app/api/inbox/jump/route.ts` — `jumpToMessage` + `buildCheckpointResponse`. See [docs/app/api/inbox.md](../app/api/inbox.md).

## Conventions
- `advanceSession` is the single place that both logs the action (`emailActionLogsCollection`) and moves the bookmark cursor forward — routes never update the bookmark directly. It takes an optional `replyText` and an optional `label` (the Gmail label name, for "move") purely for logging — neither affects cursor advancement.
- Every action route follows the same shape: perform the Gmail-side effect (archive/reply/snooze/move) → call `advanceSession` → call `buildCheckpointResponse` → return the resulting `CheckpointPayload`. Keep new action routes consistent with this.
- `jumpToMessage` is the one exception to that shape — it's navigation, not an action: it `$set`s `cursorIndex` directly (rather than `advanceSession`'s atomic `$inc`), validates the target `messageId` belongs to the session's immutable snapshot, and does not log anything or touch `bookmarks.lastProcessedMessageId`.
- `CheckpointPayload`/`ListeningSessionDoc` carry `totalEstimate` (optional — absent on session docs created before this field existed, callers fall back to `messageIds.length`).

## Where to add new code here
- A new listening-progress concept (e.g. per-label bookmarks) → extend `SessionWithProgress`/`ListeningSessionDoc` in `src/lib/types.ts` first, then `session.ts`.
- A new user action that should advance the session (beyond skip/archive/reply/snooze/move) → add to the `EmailAction` union in `types.ts`, then call `advanceSession` with the new action from a new route under `src/app/api/actions/` — don't reimplement bookmark advancement in the route itself.
- A new aggregate stat for the dashboard → `stats.ts`, following `getActionCounts`'s zero-filled `$group` pattern.
