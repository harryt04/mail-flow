# src/lib/voice/

## Purpose
The voice pipeline: matching a spoken transcript to a command, matching a spoken folder name
against real Gmail labels, cleaning up a dictated reply with an LLM, transcribing a recorded
utterance clip, and synthesizing TTS audio. Each concern is one small, independent file — none of
these files import runtime code from each other or anything else in `src/lib` (`labelMatcher.ts`'s
`import type` of a `gmail/labels` type is erased at build time, so it doesn't break this rule).

All three AI-backed concerns (`replyCleanup.ts`, `stt.ts`, `tts.ts`) run entirely on OpenAI and
take a per-call `apiKey` (trial or the user's own, resolved via `resolveOpenAiCredential` in
`src/lib/auth/openaiKey.ts`) — there is no other AI provider in this pipeline. STT is **batch**,
not streaming: the client (`useVoiceSession.ts`) records one clip locally with its own
RMS-based silence detection and sends it whole; see `mvp-docs/TTS-STT-ANALYSIS.md` §3 and the
"Key finding" callout in the BYOK plan for why streaming isn't needed here (the UI never shows
live partial captions).

## Key files
| File | Role |
|---|---|
| `commandMatcher.ts` | `matchCommand(transcript)` — keyword matching against a fixed `Command` union (`continue`, `skip`, `archive`, `reply`, `confirm`, `redo`, `move`). Phrases (`COMMAND_PHRASES`) and trigger patterns (`MOVE_TRIGGERS`) are read from the `voice` namespace of `src/messages/en-US.json` (see [docs/i18n.md](../i18n.md)) rather than hardcoded in this file — still English-only; true multi-language voice matching also needs the STT provider's language to switch in lockstep, not just a translated phrase list. `move` is the one open-vocabulary command: matched via capturing trigger phrases (`MOVE_TRIGGERS`, e.g. "move to ___", "sort into ___") rather than the fixed phrase list, returning the raw spoken folder name in `CommandMatch.argument` for the caller to fuzzy-match. Otherwise a pure function, no external deps. |
| `labelMatcher.ts` | `findMatchingLabels(spoken, labels)` — normalized exact/substring matching of a spoken folder name against the user's real Gmail labels (open vocabulary, so deliberately simple rather than fuzzy NLU). Returns all matches so the caller can tell "none" / "one" / "ambiguous" apart before ever applying anything. |
| `replyCleanup.ts` | `cleanupReply(rawTranscript, apiKey)` — sends the raw dictated transcript to OpenAI (`gpt-4o-mini`) to produce clean reply text. Takes a per-call `apiKey` (trial or user's own, resolved via `resolveOpenAiCredential`). |
| `stt.ts` | `transcribe(audioBlob, apiKey)` — sends one recorded utterance clip (a WAV blob built client-side) to OpenAI's transcription API (`gpt-4o-mini-transcribe`) and returns the transcript text. |
| `tts.ts` | `getTtsProvider()` — returns a `TtsProvider` (currently OpenAI `gpt-4o-mini-tts`) behind a small interface, so the provider is swappable. Takes a per-call `apiKey` in `TtsSynthesizeOptions` (trial or user's own, resolved via `resolveOpenAiCredential`). |

## Depends on
- `openai` (all three of `replyCleanup.ts`, `stt.ts`, `tts.ts`).
- `src/lib/auth/openaiKey.ts` (`resolveOpenAiCredential`) — used by the route callers (`api/reply/cleanup`, `api/stt/transcribe`, `api/tts`), not by these files directly.
- `src/lib/gmail/labels.ts` (`GmailLabel`, type-only) — `labelMatcher.ts` only.
- Env var: `OPENAI_API_KEY` (funds the free trial for all three; users can supply their own key once the trial is exhausted — see `src/lib/auth/openaiKey.ts` and `src/app/onboarding/`).

## Depended on by
- `src/app/api/reply/cleanup/route.ts` → `cleanupReply`.
- `src/app/api/stt/transcribe/route.ts` → `transcribe`.
- `src/app/api/tts/route.ts` → `getTtsProvider().synthesize`.
- `src/hooks/useVoiceSession.ts` — records a clip client-side (mic capture + local silence detection, `public/audio/pcm-worklet.js`) and POSTs it to `/api/stt/transcribe`; the browser never talks to the STT provider directly.
- `src/app/(authenticated)/listen/ListenClient.tsx` calls `matchCommand` and `findMatchingLabels` directly (client-side, not via an API route) inside its command-handling loop and `runMoveVoiceFlow`. See [docs/app/listen.md](../app/listen.md).

## Conventions
- Each concern (match/label-match/cleanup/stt/tts) stays in its own file with no cross-imports between them at runtime — a route/component composes them, they don't compose each other. Keep new voice-pipeline code following this shape rather than merging concerns into one file.
- `TtsProvider` is an interface specifically so the OpenAI implementation can be swapped later (see `mvp-docs/TTS-STT-ANALYSIS.md` for the provider evaluation) — if adding a second provider, implement the same interface rather than branching inside the existing one.

## Where to add new code here
- A new voice command keyword/phrase → `commandMatcher.ts`, extend the `Command` union and the matching logic (fixed phrase list for closed-vocabulary commands, a new trigger-regex array for open-vocabulary ones like `move`).
- A new open-vocabulary target to fuzzy-match (beyond labels) → a new file following `labelMatcher.ts`'s shape, not folded into `commandMatcher.ts`.
- Swapping or adding a TTS/STT provider → implement against the existing interface in `tts.ts` (`TtsProvider`) or replace the OpenAI call in `stt.ts`'s `transcribe()`; don't change the call sites in `src/app/api/tts` / `src/app/api/stt/transcribe`. Note a streaming STT provider would also require rewriting `src/hooks/useVoiceSession.ts`'s client-side recording/silence-detection logic, not just `stt.ts` — see the "Key finding" note in the Purpose section above.
- Reply cleanup prompt/behavior changes → `replyCleanup.ts` only.
