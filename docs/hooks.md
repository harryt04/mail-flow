# src/hooks/

## Purpose
Client-side React hooks that own the two hardware-adjacent concerns of the listening
experience — mic capture and audio playback — plus theme preference. All three are
self-contained: none imports from another `src/` module.

## Key files
| File | Role |
|---|---|
| `useAudioPlayback.ts` | `useAudioPlayback()` → `{ speak, stop, status, setRate }`. Controls a single `<audio>` element (calls `/api/tts`). `setRate` sets `playbackRate` immediately and is reapplied on every future `speak()` call, for the playback-speed control. Playback and mic capture are deliberately never concurrent. `stop()` immediately settles any pending `speak()` promise (via a ref to the in-flight resolver) rather than just pausing the `<audio>` element — `pause()` alone fires neither `'ended'` nor `'error'`, so without this the caller's `await speak(...)` would hang until an unrelated event fired; this is what lets a manual button click hard-cancel mid-speech instead of abandoning a dangling promise. |
| `useVoiceSession.ts` | `useVoiceSession()` → `{ state, listen, cancel }`. Opens the mic for a single checkpoint's listening window: mints a short-lived Deepgram token (via `/api/stt/token`) and streams audio for that window only — not a continuously-open mic. Failure messages are differentiated by cause (mic-permission denial, worklet load failure, token-mint failure, socket error) rather than one generic string, per BRAND.md's rule that errors always name the next step. |
| `useTheme.ts` | `useTheme()` → `{ preference, setTheme }`. `prefers-color-scheme` drives the default; a manual override persists via a `data-theme` attribute. |
| `use-mobile.ts` | Shadcn-provided `useIsMobile()` hook (added via `npx shadcn add sidebar`) — used only by `src/components/ui/sidebar.tsx` to switch between the fixed desktop sidebar and the mobile `Sheet` drawer. Not part of the hand-written hooks above; don't add app logic to it. |

## Depends on
- `react` only (useCallback/useEffect/useRef/useState). No internal `src/` imports.
- Indirectly, via `fetch`: `/api/tts` (useAudioPlayback) and `/api/stt/token` (useVoiceSession) — see [docs/app/api/stt-tts.md](./app/api/stt-tts.md).

## Depended on by
- `src/app/(authenticated)/listen/ListenClient.tsx` uses both `useAudioPlayback` and `useVoiceSession` as the two engines of its listening loop — see [docs/app/listen.md](./app/listen.md).
- `src/app/(authenticated)/settings/SettingsClient.tsx` uses `useTheme` to drive the theme `ToggleGroup`.
- `src/components/ui/sidebar.tsx` uses `use-mobile.ts`'s `useIsMobile()`.

## Conventions
- Each hook returns a small state enum (`PlaybackStatus`, `VoiceSessionState`) rather than exposing raw loading/error booleans — components branch on that enum. Keep new hooks in this shape.
- Hooks here talk to the network directly (fetch) rather than taking a callback/service injected from the component — that's consistent across all three.

## Where to add new code here
- A new hardware-adjacent concern (e.g. haptics, a second audio channel) → a new hook here following the `{ state, action(s) }` return shape.
- Don't add Gmail/session business logic to these hooks — they're UI/hardware plumbing only; that logic belongs in `src/lib/bookmark/` ([docs/lib/bookmark.md](./lib/bookmark.md)) or the API routes that call it.
