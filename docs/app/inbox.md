# src/app/inbox/

## Purpose
A browsable, paginated view of the active listening session's ordered snapshot — lets the user
see individual emails (sender/subject/snippet) and jump the bookmark straight to one, instead
of only ever moving sequentially. Added because a fixed-order-only queue gave no way to see or
choose what's coming up.

## Key files
| File | Role |
|---|---|
| `page.tsx` | Server component — `auth()` redirect gate, renders `AppHeader` + `InboxClient`. |
| `InboxClient.tsx` | Client component. Fetches `GET /api/inbox?page=`, renders paginated `Card` rows, marks the bookmark row with a "Current" `Badge`, and POSTs `/api/inbox/jump` + `router.push("/listen")` on "Start here". |

## Depends on
- `src/components/ui/{Card,Button,Badge,icons}`.
- Calls `/api/inbox` and `/api/inbox/jump` — see [docs/app/api/README.md](./api/README.md).

## Depended on by
Reached via `AppHeader`'s "Inbox" link and `/home`'s "Browse inbox" button; gated by `proxy.ts`
(`/inbox` is in `PROTECTED_PREFIXES`/`config.matcher`).

## Conventions
- Only fetches metadata (sender/subject/snippet) for the current page of message IDs (25 by
  default, capped at 50) — never the whole snapshot at once, to stay within Gmail's per-user
  quota. See `fetchMessageSummaries` in [docs/lib/gmail.md](../lib/gmail.md).
- "Start here" doesn't archive/skip/log an action — it only moves the bookmark
  (`jumpToMessage` in [docs/lib/bookmark.md](../lib/bookmark.md)) then hands off to `/listen`,
  which resumes the session from the new cursor position automatically.

## Where to add new code here
A new inbox-browsing affordance (e.g. search, filtering) → extend `GET /api/inbox` and
`InboxClient.tsx` together; keep the "one page of metadata at a time" quota discipline.
