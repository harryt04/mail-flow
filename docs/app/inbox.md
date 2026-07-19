# src/app/(authenticated)/inbox/

## Purpose
A browsable, paginated view of the active listening session's ordered snapshot (served at
`/inbox`) — lets the user see individual emails (sender/subject/snippet) and jump the bookmark
straight to one, instead of only ever moving sequentially. Added because a fixed-order-only
queue gave no way to see or choose what's coming up.

## Key files
| File | Role |
|---|---|
| `page.tsx` | Server component — thin wrapper rendering `InboxClient`. Auth gating and the sidebar both come from `(authenticated)/layout.tsx`, not this file. |
| `InboxClient.tsx` | Client component. Fetches `GET /api/inbox?page=`, renders paginated `Card` rows, marks the bookmark row with a "Current" `Badge`, and POSTs `/api/inbox/jump` + `router.push("/listen")` on "Start here". |

## Depends on
- `src/components/ui/{Card,Button,Badge,icons}`.
- Calls `/api/inbox` and `/api/inbox/jump` — see [docs/app/api/README.md](./api/README.md).

## Depended on by
Reached via the sidebar's (`AppSidebar.tsx`) "Inbox" link and `/home`'s "Browse inbox" button;
gated by both `(authenticated)/layout.tsx` and `src/proxy.ts` (`/inbox` is in
`PROTECTED_PREFIXES`/`config.matcher`).

## Conventions
- Fetches sender, subject, snippet, received timestamp (`receivedAt`), and unread status for each
  message via `fetchMessageSummaries` (metadata format, no extra API calls). `InboxClient` renders
  these as sender name, email, subject, snippet excerpt, relative timestamp ("2h ago", "Jan 5"),
  and an "Unread" badge for unread messages.
- Only fetches metadata for the current page of message IDs (25 by default, capped at 50) — never
  the whole snapshot at once, to stay within Gmail's per-user quota. See `fetchMessageSummaries`
  in [docs/lib/gmail.md](../lib/gmail.md).
- "Start here" doesn't archive/skip/log an action — it only moves the bookmark
  (`jumpToMessage` in [docs/lib/bookmark.md](../lib/bookmark.md)) then hands off to `/listen`,
  which resumes the session from the new cursor position automatically.

## Where to add new code here
A new inbox-browsing affordance (e.g. search, filtering) → extend `GET /api/inbox` and
`InboxClient.tsx` together; keep the "one page of metadata at a time" quota discipline.
