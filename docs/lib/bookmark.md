# src/lib/bookmark/

## Purpose
The core "listening session" domain logic: tracking which ordered snapshot of the inbox a user
is working through, where they left off (the bookmark), and advancing that state when they
skip/archive/reply/snooze an email. This is what makes listening resumable across days —
the feature that gives the module its name.

## Key files
| File | Role |
|---|---|
| `session.ts` (single file, 182 lines) | `getOrCreateActiveSession`, `getActiveSessionProgress`, `advanceSession`, `buildCheckpointResponse`. |

## Depends on
- `src/lib/db/collections.ts` — `sessionsCollection`, `bookmarksCollection`, `emailActionLogsCollection`.
- `src/lib/gmail/list.ts` (`buildInboxSnapshot`) — builds the ordered message-ID list a session walks through.
- `src/lib/gmail/client.ts` (`fetchMessage`) and `src/lib/gmail/parse.ts` (`parseGmailMessage`) — used inside `buildCheckpointResponse` to turn the next message ID into a `ParsedEmail`.
- `src/lib/types.ts` — `ListeningSessionDoc`, `InboxScope`, `InboxOrder`, `EmailAction`, `CheckpointPayload`.

## Depended on by
- `src/app/home/page.tsx` — `getActiveSessionProgress` to show progress on the dashboard.
- `src/app/api/session/route.ts` — `getOrCreateActiveSession`, `getActiveSessionProgress`, `buildCheckpointResponse`.
- `src/app/api/session/next/route.ts` and all three `src/app/api/actions/{archive,reply,snooze}` routes — `advanceSession` + `buildCheckpointResponse` after the underlying Gmail action completes. See [docs/app/api/session.md](../app/api/session.md) and [docs/app/api/actions.md](../app/api/actions.md).

## Conventions
- `advanceSession` is the single place that both logs the action (`emailActionLogsCollection`) and moves the bookmark cursor forward — routes never update the bookmark directly.
- Every action route follows the same shape: perform the Gmail-side effect (archive/reply/snooze) → call `advanceSession` → call `buildCheckpointResponse` → return the resulting `CheckpointPayload`. Keep new action routes consistent with this.

## Where to add new code here
- A new listening-progress concept (e.g. per-label bookmarks) → extend `SessionWithProgress`/`ListeningSessionDoc` in `src/lib/types.ts` first, then `session.ts`.
- A new user action that should advance the session (beyond skip/archive/reply/snooze) → add to the `EmailAction` union in `types.ts`, then call `advanceSession` with the new action from a new route under `src/app/api/actions/` — don't reimplement bookmark advancement in the route itself.
