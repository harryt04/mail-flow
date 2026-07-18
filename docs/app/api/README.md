# src/app/api/ — overview

All 10 route groups (12 route files) live under `src/app/api/`. Every route (except NextAuth's
own handler) starts with `const auth = await requireUser()` and returns 401 if `null` — see
[docs/lib/auth.md](../../lib/auth.md). Routes are intentionally thin: they call into `src/lib/*`
for all actual logic (Gmail calls, DB access, voice pipeline) rather than implementing it inline.

## Route table
| Path | File | Methods | Calls into |
|---|---|---|---|
| `/api/settings` | `settings/route.ts` | GET, POST | `lib/db` (`usersCollection`) |
| `/api/settings/disconnect` | `settings/disconnect/route.ts` | POST | `lib/db`, `lib/auth/tokenCrypto` — see [settings.md](./settings.md) |
| `/api/auth/[...nextauth]` | `auth/[...nextauth]/route.ts` | GET, POST | delegates to `lib/auth/options` handlers — see [auth.md](./auth.md) |
| `/api/emails/[id]` | `emails/[id]/route.ts` | GET | `lib/gmail/client`, `lib/gmail/parse` — see [emails.md](./emails.md) |
| `/api/session` | `session/route.ts` | GET, POST | `lib/db`, `lib/gmail/client`, `lib/bookmark/session` — see [session.md](./session.md) |
| `/api/session/next` | `session/next/route.ts` | POST | `lib/gmail/client`, `lib/bookmark/session` — see [session.md](./session.md) |
| `/api/reply/cleanup` | `reply/cleanup/route.ts` | POST | `lib/voice/replyCleanup` — see [reply-cleanup.md](./reply-cleanup.md) |
| `/api/actions/archive` | `actions/archive/route.ts` | POST | `lib/gmail/{client,actions}`, `lib/bookmark/session` — see [actions.md](./actions.md) |
| `/api/actions/reply` | `actions/reply/route.ts` | POST | `lib/gmail/{client,parse,actions}`, `lib/bookmark/session` — see [actions.md](./actions.md) |
| `/api/actions/snooze` | `actions/snooze/route.ts` | POST | `lib/gmail/client`, `lib/bookmark/session` — see [actions.md](./actions.md) |
| `/api/stt/token` | `stt/token/route.ts` | POST | `lib/voice/stt` — see [stt-tts.md](./stt-tts.md) |
| `/api/tts` | `tts/route.ts` | POST | `lib/voice/tts` — see [stt-tts.md](./stt-tts.md) |

## Conventions
- Auth check first, always: `const auth = await requireUser(); if (!auth) return 401`.
- Every route that mutates a listening session (`session/next`, `actions/*`) ends with the same pair of calls — `advanceSession()` then `buildCheckpointResponse()` — and returns the resulting `CheckpointPayload`. New action routes should follow this shape rather than returning a bespoke response.
- Route bodies are thin: no Gmail API calls, Mongo queries, or LLM calls happen directly in a route file — they call the relevant `src/lib/*` function.

## Where to add new code here
- A new API endpoint → create `route.ts` under a new/existing subfolder here, call `requireUser()` first, then delegate to `src/lib/*`. Register it in this route table and in [docs/DECISION-TREE.md](../../DECISION-TREE.md) if it's a common target.
- A new action that advances the listening session → follow the `actions/*` pattern in [actions.md](./actions.md).
