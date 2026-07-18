# src/app/api/reply/cleanup/

## Purpose
Takes a raw dictated (STT) transcript and returns Claude-cleaned reply text, as a step
before the user confirms and sends via `/api/actions/reply`.

## Key files
| File | Role |
|---|---|
| `route.ts` (16 lines) | POST `{ rawTranscript }` → `cleanupReply(rawTranscript)` → `{ cleanedText }`. |

## Depends on
- `src/lib/auth/requireUser`
- `src/lib/voice/replyCleanup` (`cleanupReply`, Claude via `@anthropic-ai/sdk`) — see [docs/lib/voice.md](../../lib/voice.md)

## Depended on by
- `src/app/listen/ListenClient.tsx`'s `runDictationFlow` — the reply sub-flow is
  dictate → this endpoint (`cleaning` stage) → user confirms → `/api/actions/reply` sends it.
  See [docs/app/listen.md](../listen.md) and the reply-by-dictation flow in
  [docs/ARCHITECTURE.md](../../ARCHITECTURE.md).

## Where to add new code here
Prompt/cleanup behavior changes belong in `src/lib/voice/replyCleanup.ts`, not this route —
keep the route as a thin pass-through.
