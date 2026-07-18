# src/app/api/stt/token/ + src/app/api/tts/

## Purpose
Server-side credential minting (STT) and audio synthesis (TTS) — the two endpoints the
voice pipeline's client-side hooks call.

## Key files
| File | Role |
|---|---|
| `stt/token/route.ts` (10 lines) | POST — `mintSttToken()`, returns a short-lived Deepgram key for the browser to stream audio to directly. |
| `tts/route.ts` (23 lines) | POST `{ text, voiceTone? }` — `getTtsProvider().synthesize(text, { voiceTone })`, streams back synthesized audio. |

## Depends on
- `src/lib/auth/requireUser` — both
- `src/lib/voice/stt` (`mintSttToken`) / `src/lib/voice/tts` (`getTtsProvider`) — see [docs/lib/voice.md](../../lib/voice.md)

## Depended on by
- `src/hooks/useVoiceSession.ts` → `POST /api/stt/token`
- `src/hooks/useAudioPlayback.ts` → `POST /api/tts`

Both hooks are consumed by `src/app/(authenticated)/listen/ListenClient.tsx` — see [docs/hooks.md](../../hooks.md) and [docs/app/listen.md](../listen.md).

## Where to add new code here
Provider swaps or synthesis-option changes belong in `src/lib/voice/{stt,tts}.ts`, not these
routes. A new voice-tone/synthesis parameter → thread it through `TtsSynthesizeOptions` in
`src/lib/voice/tts.ts` first, then this route's request body.
