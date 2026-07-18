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
| `tokenCrypto.ts` | `encryptToken` / `decryptToken` — AES-256-GCM, keyed by `TOKEN_ENC_KEY`. Used to encrypt Gmail access/refresh tokens at rest. |
| `next-auth.d.ts` | Module augmentation for NextAuth's `Session`/`JWT` types (adds `user.id` etc.). |

## Depends on
- `src/lib/db/collections.ts` (`usersCollection`, `ensureIndexes`) — `options.ts` upserts the user doc on sign-in.
- `src/lib/types.ts` (`DEFAULT_USER_SETTINGS`) — seeded onto new users.
- `next-auth` / `next-auth/providers/google` — the auth framework itself.
- Node `crypto` — `tokenCrypto.ts` only.

## Depended on by
- Every route under `src/app/api/**` calls `requireUser()` first (see [docs/app/api/README.md](../app/api/README.md)).
- `src/lib/gmail/client.ts` calls `decryptToken`/`encryptToken` when building an authenticated Gmail client and refreshing tokens.
- `proxy.ts` (root) gates page routes using the same `auth` session (see [docs/proxy-and-routing.md](../proxy-and-routing.md)).

## Conventions
- Routes never call `auth()` directly — they call `requireUser()` and treat `null` as 401. Keep following this pattern for new routes rather than reimplementing the check.
- Raw Gmail OAuth tokens are never stored or logged in plaintext — always go through `encryptToken`/`decryptToken`. `tokenCrypto.ts` is the only file that should touch the `crypto` module for this purpose.

## Where to add new code here
- A new OAuth scope or provider setting → `options.ts` (the `GoogleProvider` config block).
- A new field derived from the session (e.g. exposing another claim to routes) → extend `AuthenticatedUser` in `requireUser.ts` and the callbacks in `options.ts` that populate the JWT/session.
- Don't add Gmail-specific logic here — that belongs in `src/lib/gmail/` ([docs/lib/gmail.md](./gmail.md)), which already depends on this module for token decryption.
