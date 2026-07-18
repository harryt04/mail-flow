# src/lib/gmail/

## Purpose
All Gmail API integration: building a per-user authenticated client (with token refresh),
fetching/parsing messages, building the ordered inbox snapshot a listening session walks
through, and the two mutating actions (archive, send reply).

## Key files
| File | Role |
|---|---|
| `client.ts` | `getGmailClientForUser(userId)` — decrypts the stored tokens, refreshes if needed (re-encrypting and persisting the refreshed token via `src/lib/db`), returns an authenticated `gmail_v1.Gmail` instance. Also `fetchMessage`. |
| `list.ts` | `buildInboxSnapshot(gmail, scope, order)` — returns an ordered `string[]` of message IDs; this list is what a `ListeningSessionDoc` walks through. |
| `parse.ts` | `parseGmailMessage(message)` — turns a raw Gmail API message into a `ParsedEmail` (sender, subject, paragraph-split body). |
| `actions.ts` | `archiveMessage`, `sendReply` — the two Gmail-mutating operations the app performs. |

## Depends on
- `googleapis` (`google.auth.OAuth2`, `google.gmail`) for the API client and types.
- `src/lib/auth/tokenCrypto.ts` — decrypt/re-encrypt tokens.
- `src/lib/db/collections.ts` (`usersCollection`) — read/update stored tokens.
- `src/lib/types.ts` — `UserDoc`, `InboxScope`, `InboxOrder`, `ParsedEmail`.
- Env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

## Depended on by
- `src/lib/bookmark/session.ts` — `buildInboxSnapshot`, `fetchMessage`, `parseGmailMessage`.
- Nearly every API route that touches an email: `emails/[id]`, `session`, `session/next`, `actions/archive`, `actions/reply`, `actions/snooze` all call `getGmailClientForUser` first, then the relevant action/parse function. See [docs/app/api/README.md](../app/api/README.md) for the full route table.

## Conventions
- `getGmailClientForUser(userId)` is the only way routes obtain a Gmail client — never construct `google.gmail(...)` elsewhere. This keeps token refresh/encryption centralized.
- `archiveMessage`/`sendReply` take an already-authenticated `gmail_v1.Gmail` instance as a parameter rather than a `userId` — the caller is expected to have called `getGmailClientForUser` already.

## Where to add new code here
- A new Gmail-mutating action (e.g. "mark as spam") → add a function to `actions.ts` following the `archiveMessage`/`sendReply` signature pattern (takes `gmail: gmail_v1.Gmail` + params), then wire it into a new route under `src/app/api/actions/` and into `advanceSession` in [docs/lib/bookmark.md](./bookmark.md) if it should advance the listening session.
- A new field extracted from a message → extend `ParsedEmail` in `src/lib/types.ts`, then `parseGmailMessage` in `parse.ts`.
- A new inbox ordering/scope option → extend `InboxScope`/`InboxOrder` in `types.ts`, then the query logic in `buildInboxSnapshot` in `list.ts`.
