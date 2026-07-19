# src/app/api/reply/cleanup/

## Purpose
Takes a raw dictated (STT) transcript and returns OpenAI-cleaned reply text, as a step
before the user confirms and sends via `/api/actions/reply`. Requires a resolved OpenAI API key
(trial or user-supplied via `resolveOpenAiCredential`).

## Key files
| File | Role |
|---|---|
| `route.ts` | POST `{ rawTranscript }` → resolves credential → `cleanupReply(rawTranscript, apiKey)` → `{ cleanedText }`. Returns 400 if no OpenAI key is available. |

## Depends on
- `src/lib/auth/requireUser`
- `src/lib/auth/openaiKey` (`resolveOpenAiCredential`)
- `src/lib/voice/replyCleanup` (`cleanupReply`, OpenAI via `openai` package) — see [docs/lib/voice.md](../../lib/voice.md)

## Depended on by
- `src/app/(authenticated)/listen/ListenClient.tsx`'s `runDictationFlow` — the reply sub-flow is
  dictate → this endpoint (`cleaning` stage) → user confirms → `/api/actions/reply` sends it.
  See [docs/app/listen.md](../listen.md) and the reply-by-dictation flow in
  [docs/ARCHITECTURE.md](../../ARCHITECTURE.md).

## Where to add new code here
Prompt/cleanup behavior changes belong in `src/lib/voice/replyCleanup.ts`, not this route —
keep the route as a thin pass-through.
