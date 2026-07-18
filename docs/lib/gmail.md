# src/lib/gmail/

## Purpose
All Gmail API integration: building a per-user authenticated client (with token refresh),
fetching/parsing messages, listing labels, building the ordered inbox snapshot a listening
session walks through, and the mutating actions (archive, send reply, move to label).

## Key files
| File | Role |
|---|---|
| `client.ts` | `getGmailClientForUser(userId)` — decrypts the stored tokens, refreshes if needed (re-encrypting and persisting the refreshed token via `src/lib/db`), returns an authenticated `gmail_v1.Gmail` instance. Also `fetchMessage`. |
| `list.ts` | `buildInboxSnapshot(gmail, scope, order)` — returns `{ messageIds, totalEstimate }`; `messageIds` is what a `ListeningSessionDoc` walks through, `totalEstimate` is Gmail's `resultSizeEstimate` (approximate true count, for honest capped-snapshot messaging). Also `fetchMessageSummaries(gmail, messageIds)` — lightweight `format: "metadata"` fetch (sender/subject/snippet only, no body) for the `/inbox` browser; callers must only pass one page of IDs at a time to stay within Gmail's per-user quota. |
| `parse.ts` | `parseGmailMessage(message)` — turns a raw Gmail API message into a `ParsedEmail` (sender, subject, paragraph-split body). Also humanizes literal URLs in the body text (`a link to {domain}` instead of reading them verbatim via TTS) and exports `headerValue`/`parseSenderHeader`, reused by `list.ts`'s `fetchMessageSummaries`. |
| `labels.ts` | `listUserLabels(gmail)` — the user's real Gmail labels (`type: "user"` only, system labels like INBOX/CATEGORY_* excluded), for the "move to folder" picker. MVP does not create labels on the user's behalf. |
| `actions.ts` | `archiveMessage`, `sendReply`, `moveMessageToLabel` — the Gmail-mutating operations the app performs. `moveMessageToLabel` both applies a label and archives in one `messages.modify` call. |

## Depends on
- `googleapis` (`google.auth.OAuth2`, `google.gmail`) for the API client and types.
- `src/lib/auth/tokenCrypto.ts` — decrypt/re-encrypt tokens.
- `src/lib/db/collections.ts` (`usersCollection`) — read/update stored tokens.
- `src/lib/types.ts` — `UserDoc`, `InboxScope`, `InboxOrder`, `ParsedEmail`.
- Env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

## Depended on by
- `src/lib/bookmark/session.ts` — `buildInboxSnapshot`, `fetchMessage`, `parseGmailMessage`.
- Nearly every API route that touches an email: `emails/[id]`, `session`, `session/next`, `inbox`, `inbox/jump`, `actions/{archive,reply,snooze,move}`, `labels` all call `getGmailClientForUser` first, then the relevant action/parse/list function. See [docs/app/api/README.md](../app/api/README.md) for the full route table.

## Conventions
- `getGmailClientForUser(userId)` is the only way routes obtain a Gmail client — never construct `google.gmail(...)` elsewhere. This keeps token refresh/encryption centralized.
- `archiveMessage`/`sendReply`/`moveMessageToLabel` take an already-authenticated `gmail_v1.Gmail` instance as a parameter rather than a `userId` — the caller is expected to have called `getGmailClientForUser` already.
- `fetchMessageSummaries` deliberately uses `format: "metadata"` (not `"full"`, what `fetchMessage` uses for actual playback) — no MIME body traversal, safe to call for a page of rows.

## Where to add new code here
- A new Gmail-mutating action (e.g. "mark as spam") → add a function to `actions.ts` following the `archiveMessage`/`sendReply`/`moveMessageToLabel` signature pattern (takes `gmail: gmail_v1.Gmail` + params), then wire it into a new route under `src/app/api/actions/` and into `advanceSession` in [docs/lib/bookmark.md](./bookmark.md) if it should advance the listening session.
- A new field extracted from a message → extend `ParsedEmail` in `src/lib/types.ts`, then `parseGmailMessage` in `parse.ts`.
- A new inbox ordering/scope option → extend `InboxScope`/`InboxOrder` in `types.ts`, then the query logic in `buildInboxSnapshot` in `list.ts`.
- A new label-list filter/behavior (e.g. allow creating labels) → `labels.ts`.
