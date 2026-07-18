# src/hooks/

## Purpose
Client-side React hooks that own the two hardware-adjacent concerns of the listening
experience — mic capture and audio playback — plus theme preference. All three are
self-contained: none imports from another `src/` module.

## Key files
| File | Role |
|---|---|
| `useAudioPlayback.ts` | `useAudioPlayback()` → `{ speak, stop, status }`. Controls a single `<audio>` element (calls `/api/tts`). Playback and mic capture are deliberately never concurrent. |
| `useVoiceSession.ts` | `useVoiceSession()` → `{ state, listen, cancel }`. Opens the mic for a single checkpoint's listening window: mints a short-lived Deepgram token (via `/api/stt/token`) and streams audio for that window only — not a continuously-open mic. |
| `useTheme.ts` | `useTheme()` → `{ preference, setTheme }`. `prefers-color-scheme` drives the default; a manual override persists via a `data-theme` attribute. |

## Depends on
- `react` only (useCallback/useEffect/useRef/useState). No internal `src/` imports.
- Indirectly, via `fetch`: `/api/tts` (useAudioPlayback) and `/api/stt/token` (useVoiceSession) — see [docs/app/api/stt-tts.md](./app/api/stt-tts.md).

## Depended on by
- `src/app/listen/ListenClient.tsx` uses both `useAudioPlayback` and `useVoiceSession` as the two engines of its listening loop — see [docs/app/listen.md](./app/listen.md).
- `src/app/settings/SettingsClient.tsx` uses `useTheme` to drive the theme `ToggleGroup`.

## Conventions
- Each hook returns a small state enum (`PlaybackStatus`, `VoiceSessionState`) rather than exposing raw loading/error booleans — components branch on that enum. Keep new hooks in this shape.
- Hooks here talk to the network directly (fetch) rather than taking a callback/service injected from the component — that's consistent across all three.

## Where to add new code here
- A new hardware-adjacent concern (e.g. haptics, a second audio channel) → a new hook here following the `{ state, action(s) }` return shape.
- Don't add Gmail/session business logic to these hooks — they're UI/hardware plumbing only; that logic belongs in `src/lib/bookmark/` ([docs/lib/bookmark.md](./lib/bookmark.md)) or the API routes that call it.
