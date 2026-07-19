# src/lib/auth/

## Purpose
NextAuth (Auth.js v5) configuration for Google/Gmail OAuth, plus the two primitives every
protected route and every Gmail-touching module builds on: a session guard (`requireUser`)
and encryption for the OAuth tokens stored in Mongo (`tokenCrypto`).

## Key files
| File | Role |
|---|---|
| `options.ts` | NextAuth config: Google provider (scoped to Gmail), JWT/session callbacks, upserts the user document and seeds `DEFAULT_USER_SETTINGS` on first sign-in, encrypts tokens before persisting them. Exports `handlers`, `auth`, `signIn`, `signOut`. |
| `requireUser.ts` | `requireUser()` — calls `auth()`, returns `{ userId, email }` or `null`. The single auth check used by every API route. |
| `tokenCrypto.ts` | `encryptToken` / `decryptToken` — AES-256-GCM, keyed by `TOKEN_ENC_KEY`. Used to encrypt Gmail access/refresh tokens at rest, and the user's own OpenAI key (`UserDoc.openaiKey`). |
| `next-auth.d.ts` | Module augmentation for NextAuth's `Session`/`JWT` types (adds `user.id` etc.). |
| `openaiKey.ts` | `FREE_TRIAL_ACTION_LIMIT` (100), `resolveOpenAiCredential(userId)` — returns the user's own key if set, else the app's trial key while under the limit, else `null`. `incrementTrialActionUsage(userId)` — bumps `UserDoc.trialActionsUsed`, called by the archive/move/reply action routes. |

## Depends on
- `src/lib/db/collections.ts` (`usersCollection`, `ensureIndexes`) — `options.ts` upserts the user doc on sign-in; `openaiKey.ts` reads/writes it directly.
- `src/lib/types.ts` (`DEFAULT_USER_SETTINGS`, `UserDoc.openaiKey`/`trialActionsUsed`) — seeded/read by `options.ts`/`openaiKey.ts`.
- `next-auth` / `next-auth/providers/google` — the auth framework itself.
- Node `crypto` — `tokenCrypto.ts` only.

## Depended on by
- Every route under `src/app/api/**` calls `requireUser()` first (see [docs/app/api/README.md](../app/api/README.md)).
- `src/lib/gmail/client.ts` calls `decryptToken`/`encryptToken` when building an authenticated Gmail client and refreshing tokens.
- `src/proxy.ts` gates page routes using the same `auth` session (see [docs/proxy-and-routing.md](../proxy-and-routing.md)).
- `src/app/api/reply/cleanup`, `src/app/api/stt/transcribe`, `src/app/api/tts` call `resolveOpenAiCredential` before calling OpenAI. `src/app/api/actions/{archive,move,reply}` call `incrementTrialActionUsage` after a successful Gmail action. `src/app/(authenticated)/layout.tsx` uses `FREE_TRIAL_ACTION_LIMIT` for the onboarding redirect gate. See [docs/lib/voice.md](./voice.md) and `mvp-docs/user-supplied-api-key-plan.md`.

## Conventions
- Routes never call `auth()` directly — they call `requireUser()` and treat `null` as 401. Keep following this pattern for new routes rather than reimplementing the check.
- Raw Gmail OAuth tokens are never stored or logged in plaintext — always go through `encryptToken`/`decryptToken`. `tokenCrypto.ts` is the only file that should touch the `crypto` module for this purpose.

## Where to add new code here
- A new OAuth scope or provider setting → `options.ts` (the `GoogleProvider` config block).
- A new field derived from the session (e.g. exposing another claim to routes) → extend `AuthenticatedUser` in `requireUser.ts` and the callbacks in `options.ts` that populate the JWT/session.
- Don't add Gmail-specific logic here — that belongs in `src/lib/gmail/` ([docs/lib/gmail.md](./gmail.md)), which already depends on this module for token decryption.
