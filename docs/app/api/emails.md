# src/app/api/emails/[id]/

## Purpose
Fetch and parse a single Gmail message by ID.

## Key files
| File | Role |
|---|---|
| `route.ts` (19 lines) | GET — `getGmailClientForUser` → `fetchMessage(gmail, id)` → `parseGmailMessage` → returns the `ParsedEmail`. |

## Depends on
- `src/lib/auth/requireUser`
- `src/lib/gmail/client` (`getGmailClientForUser`, `fetchMessage`)
- `src/lib/gmail/parse` (`parseGmailMessage`)

## Depended on by
Not currently called from `ListenClient.tsx` directly (the listening flow gets emails via
`/api/session` and `/api/session/next`'s `CheckpointPayload.email` instead) — this route exists
as a standalone single-message fetch, likely for future direct-link/deep-link use cases.

## Where to add new code here
If adding a feature that needs to fetch one specific message outside the listening-session flow
(e.g. a search result, a deep link), use this route as-is or extend it — don't duplicate the
fetch+parse sequence elsewhere.
