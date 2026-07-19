# src/app/api/stt/transcribe/ + src/app/api/tts/

## Purpose
Server-side audio endpoints for the voice pipeline — one transcribes a recorded clip (STT), the
other synthesizes speech (TTS). Both resolve which OpenAI key to use (trial or the user's own)
via `resolveOpenAiCredential` before calling out to OpenAI.

## Key files
| File | Role |
|---|---|
| `stt/transcribe/route.ts` | POST, `multipart/form-data` with an `audio` field (a WAV blob recorded client-side) — resolves the caller's OpenAI credential, calls `transcribe(audio, apiKey)`, returns `{ transcript }`. `400` if no credential is available (trial exhausted, no user key). |
| `tts/route.ts` | POST `{ text, voiceTone? }` — resolves the caller's OpenAI credential, calls `getTtsProvider().synthesize(text, { voiceTone, apiKey })`, streams back synthesized audio. Same `400` behavior as above. |

## Depends on
- `src/lib/auth/requireUser` — both.
- `src/lib/auth/openaiKey` (`resolveOpenAiCredential`) — both.
- `src/lib/voice/stt` (`transcribe`) / `src/lib/voice/tts` (`getTtsProvider`) — see [docs/lib/voice.md](../../lib/voice.md)

## Depended on by
- `src/hooks/useVoiceSession.ts` → `POST /api/stt/transcribe`. The browser records a clip locally (mic capture + local RMS-based silence detection, no server round-trip needed to know when to stop) and sends the whole clip once — there's no STT WebSocket or streaming token anymore.
- `src/hooks/useAudioPlayback.ts` → `POST /api/tts`

Both hooks are consumed by `src/app/(authenticated)/listen/ListenClient.tsx` — see [docs/hooks.md](../../hooks.md) and [docs/app/listen.md](../listen.md).

## Where to add new code here
Provider swaps or synthesis-option changes belong in `src/lib/voice/{stt,tts}.ts`, not these
routes. A new voice-tone/synthesis parameter → thread it through `TtsSynthesizeOptions` in
`src/lib/voice/tts.ts` first, then this route's request body. A switch to streaming STT would
also require rewriting `src/hooks/useVoiceSession.ts`'s client-side recording logic — see the
"Key finding" note in `docs/lib/voice.md`.
