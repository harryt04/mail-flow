# src/lib/voice/

## Purpose
The voice pipeline: matching a spoken transcript to a command, cleaning up a dictated reply
with an LLM, minting short-lived STT tokens, and synthesizing TTS audio. Each concern is one
small, independent file — none of these files import each other or anything else in `src/lib`.

## Key files
| File | Role |
|---|---|
| `commandMatcher.ts` | `matchCommand(transcript)` — keyword matching against a fixed `Command` union (`continue`, `skip`, `archive`, `reply`, `snooze`, `confirm`, `redo`). Pure function, no external deps. |
| `replyCleanup.ts` | `cleanupReply(rawTranscript)` — sends the raw dictated transcript to Claude (`@anthropic-ai/sdk`) to produce clean reply text. |
| `stt.ts` | `mintSttToken()` — mints a short-lived Deepgram key (`@deepgram/sdk`) for the browser to stream audio to for STT. |
| `tts.ts` | `getTtsProvider()` — returns a `TtsProvider` (currently OpenAI `gpt-4o-mini-tts`) behind a small interface, so the provider is swappable. |

## Depends on
- `@anthropic-ai/sdk` (replyCleanup.ts only), `@deepgram/sdk` (stt.ts only), `openai` (tts.ts only).
- Env vars: `ANTHROPIC_API_KEY`, `DEEPGRAM_API_KEY`, `DEEPGRAM_PROJECT_ID`, `OPENAI_API_KEY`.
- No internal `src/lib` imports — this module is intentionally leaf-level.

## Depended on by
- `src/app/api/reply/cleanup/route.ts` → `cleanupReply`.
- `src/app/api/stt/token/route.ts` → `mintSttToken`.
- `src/app/api/tts/route.ts` → `getTtsProvider().synthesize`.
- `src/app/listen/ListenClient.tsx` calls `matchCommand` directly (client-side, not via an API route) inside its command-handling loop. See [docs/app/listen.md](../app/listen.md).

## Conventions
- Each concern (match/cleanup/stt/tts) stays in its own file with no cross-imports between them — a route composes them, they don't compose each other. Keep new voice-pipeline code following this shape rather than merging concerns into one file.
- `TtsProvider` is an interface specifically so the OpenAI implementation can be swapped later (see `mvp-docs/TTS-STT-ANALYSIS.md` for the provider evaluation) — if adding a second provider, implement the same interface rather than branching inside the existing one.

## Where to add new code here
- A new voice command keyword/phrase → `commandMatcher.ts`, extend the `Command` union and the matching logic.
- Swapping or adding a TTS/STT provider → implement against the existing interface in `tts.ts` (`TtsProvider`) or replace the Deepgram calls in `stt.ts`; don't change the call sites in `src/app/api/tts` / `src/app/api/stt/token`.
- Reply cleanup prompt/behavior changes → `replyCleanup.ts` only.
