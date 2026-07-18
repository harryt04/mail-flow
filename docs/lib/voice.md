# src/lib/voice/

## Purpose
The voice pipeline: matching a spoken transcript to a command, matching a spoken folder name
against real Gmail labels, cleaning up a dictated reply with an LLM, minting short-lived STT
tokens, and synthesizing TTS audio. Each concern is one small, independent file — none of these
files import runtime code from each other or anything else in `src/lib` (`labelMatcher.ts`'s
`import type` of a `gmail/labels` type is erased at build time, so it doesn't break this rule).

## Key files
| File | Role |
|---|---|
| `commandMatcher.ts` | `matchCommand(transcript)` — keyword matching against a fixed `Command` union (`continue`, `skip`, `archive`, `reply`, `confirm`, `redo`, `move`). `move` is the one open-vocabulary command: matched via capturing trigger phrases (`MOVE_TRIGGERS`, e.g. "move to ___", "sort into ___") rather than the fixed phrase list, returning the raw spoken folder name in `CommandMatch.argument` for the caller to fuzzy-match. Otherwise a pure function, no external deps. |
| `labelMatcher.ts` | `findMatchingLabels(spoken, labels)` — normalized exact/substring matching of a spoken folder name against the user's real Gmail labels (open vocabulary, so deliberately simple rather than fuzzy NLU). Returns all matches so the caller can tell "none" / "one" / "ambiguous" apart before ever applying anything. |
| `replyCleanup.ts` | `cleanupReply(rawTranscript)` — sends the raw dictated transcript to Claude (`@anthropic-ai/sdk`) to produce clean reply text. |
| `stt.ts` | `mintSttToken()` — mints a short-lived Deepgram key (`@deepgram/sdk`) for the browser to stream audio to for STT. |
| `tts.ts` | `getTtsProvider()` — returns a `TtsProvider` (currently OpenAI `gpt-4o-mini-tts`) behind a small interface, so the provider is swappable. |

## Depends on
- `@anthropic-ai/sdk` (replyCleanup.ts only), `@deepgram/sdk` (stt.ts only), `openai` (tts.ts only).
- `src/lib/gmail/labels.ts` (`GmailLabel`, type-only) — `labelMatcher.ts` only.
- Env vars: `ANTHROPIC_API_KEY`, `DEEPGRAM_API_KEY`, `DEEPGRAM_PROJECT_ID`, `OPENAI_API_KEY`.

## Depended on by
- `src/app/api/reply/cleanup/route.ts` → `cleanupReply`.
- `src/app/api/stt/token/route.ts` → `mintSttToken`.
- `src/app/api/tts/route.ts` → `getTtsProvider().synthesize`.
- `src/app/(authenticated)/listen/ListenClient.tsx` calls `matchCommand` and `findMatchingLabels` directly (client-side, not via an API route) inside its command-handling loop and `runMoveVoiceFlow`. See [docs/app/listen.md](../app/listen.md).

## Conventions
- Each concern (match/label-match/cleanup/stt/tts) stays in its own file with no cross-imports between them at runtime — a route/component composes them, they don't compose each other. Keep new voice-pipeline code following this shape rather than merging concerns into one file.
- `TtsProvider` is an interface specifically so the OpenAI implementation can be swapped later (see `mvp-docs/TTS-STT-ANALYSIS.md` for the provider evaluation) — if adding a second provider, implement the same interface rather than branching inside the existing one.

## Where to add new code here
- A new voice command keyword/phrase → `commandMatcher.ts`, extend the `Command` union and the matching logic (fixed phrase list for closed-vocabulary commands, a new trigger-regex array for open-vocabulary ones like `move`).
- A new open-vocabulary target to fuzzy-match (beyond labels) → a new file following `labelMatcher.ts`'s shape, not folded into `commandMatcher.ts`.
- Swapping or adding a TTS/STT provider → implement against the existing interface in `tts.ts` (`TtsProvider`) or replace the Deepgram calls in `stt.ts`; don't change the call sites in `src/app/api/tts` / `src/app/api/stt/token`.
- Reply cleanup prompt/behavior changes → `replyCleanup.ts` only.
