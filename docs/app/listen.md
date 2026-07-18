# src/app/(authenticated)/listen/

## Purpose
The core screen of the app (served at `/listen`): reads emails aloud paragraph-by-paragraph,
listens for voice commands between paragraphs, and handles the reply-by-dictation and
move-to-folder sub-flows. `ListenClient.tsx` is the largest and most complex file in the repo —
this doc goes a level deeper than other module docs because of that.

## Key files
| File | Role |
|---|---|
| `page.tsx` | Server component — re-checks `auth()` (the route group layout already gates access, but this page also needs the session's `user.id`), reads the user's `playbackSpeed` setting directly (server-component-calls-lib pattern) and passes it as `initialPlaybackSpeed`, renders `ListenClient`. The sidebar comes from `(authenticated)/layout.tsx`, not this file. |
| `ListenClient.tsx` | Client component and state machine — see below. |

## Depends on
- `src/hooks/useAudioPlayback`, `src/hooks/useVoiceSession` — the two engines of the loop ([docs/hooks.md](../hooks.md)). `useAudioPlayback` also exposes `setRate` for the playback-speed control.
- `src/lib/voice/commandMatcher` (`matchCommand`) and `src/lib/voice/labelMatcher` (`findMatchingLabels`) — called directly client-side, not via an API route ([docs/lib/voice.md](../lib/voice.md)).
- `src/lib/types` (`CheckpointPayload`, `ParsedEmail`, `PlaybackSpeed`, `PLAYBACK_SPEEDS`).
- `src/lib/gmail/labels` (`GmailLabel`, type-only).
- `src/components/ui/{Card,Button,IconButton,icons}`, `src/components/listening/{ManualControls,StatusIndicator}`.
- Calls `/api/session`, `/api/session/next`, `/api/actions/{archive,reply,move}`, `/api/reply/cleanup`, `/api/labels`, and (fire-and-forget) `/api/settings` for the speed control — see [docs/app/api/README.md](./api/README.md).

## State machine shape
- `phase`: `"loading" | "ready" | "error" | "done"` — overall page lifecycle.
- `uiState` (`ListeningState`, from `components/listening/StatusIndicator`): `"idle" | "speaking" | "listening" | "thinking" | "error" | "confirmed"` — drives the visual status indicator.
- `replyStage`: `"idle" | "dictating" | "cleaning" | "confirming"` — the reply sub-flow's own stage, nested inside the main loop.
- `moveOpen`/`moveConfirmLabel` — the move sub-flow's manual (tap-driven) picker: pick a label, then a confirm step, before `handleConfirmMove` fires the actual action. The voice-triggered path (`runMoveVoiceFlow`) doesn't use this state — it speaks its own confirmation and listens for "yes"/"redo" inline.
- `checkpoint` (`CheckpointPayload | null`), plus UI fields (`promptText`, `paragraphIndex`, `showContinue`, `error`, `busy`, `replyOpen`, `replyText`, `labels`, `playbackSpeed`).
- `generationRef` (`useRef<number>`) — the cancellation mechanism: incremented on every new user action; async flows check `isCurrent(gen)` and throw `CancelledError` to abort stale work when the user interrupts (e.g. presses skip while TTS is still playing).
- Mount effects: fetch the initial checkpoint (`phase` → `ready`/`done`); apply `initialPlaybackSpeed` to the audio element; fetch `/api/labels` into `labels` state (best-effort — an empty/failed fetch just means the move picker shows "no labels found" copy). Unmount effect bumps `generationRef` and cancels any in-flight voice/audio.

## Depended on by
Reached via `/home`'s "Start Listening" button, the sidebar's "Listen" link, and `/inbox`'s "Start here" jump (which resumes the session at a specific message); gated by both `(authenticated)/layout.tsx` and `proxy.ts`.

## Conventions
- All server calls go through a single `postJson()` helper — new calls to `/api/*` from this component should use it rather than calling `fetch` directly, to keep error handling centralized. Fire-and-forget calls (playback speed persistence) intentionally bypass this since they don't need the response.
- The cancellation pattern (`generationRef` + `isCurrent()` + `CancelledError`) is the mechanism that makes rapid user interruptions (e.g. pressing skip mid-sentence) safe — any new async flow added to this component must participate in it (check `isCurrent(gen)` after each await) or it will race with newer user actions.
- The reply sub-flow (`runDictationFlow`) and the voice-triggered move sub-flow (`runMoveVoiceFlow`) are both self-contained and resume the main loop via `sendReplyAndResume`/`runAction` respectively — new sub-flows with their own multi-step UI should follow this self-contained-then-resume shape rather than interleaving state directly into the main loop.
- `move` is open-vocabulary (a Gmail label name, not a fixed word), so unlike every other command it always speaks a confirmation before applying, via `findMatchingLabels` + a confirm/redo listen loop inside `runMoveVoiceFlow` — see [docs/lib/voice.md](../lib/voice.md).
- `runAction` and `sendReplyAndResume` both end with `void runEmailLoop(...)` (fire-and-forget), not `await` — they only need to wait for the action's own round trip and its spoken confirmation before returning, since their callers (`handleManualAction`, `handleConfirmMove`, `handleSendReplyManual`) hold the `busy` flag (which disables `ManualControls`) for exactly as long as they're awaited. Awaiting the full continuation there previously kept `busy` stuck `true` for the rest of the session after the first manual action. Any new terminal-action handler must follow the same fire-and-forget shape.

## Where to add new code here
- A new voice command's client-side handling (after `matchCommand` recognizes it in `src/lib/voice/commandMatcher.ts`) → add a case in the command-dispatch logic inside `runEmailLoop`/`runParagraphsFrom`, following the existing `continue`/`skip`/`archive`/`reply`/`move` cases.
- A new manual (button) action → add to `ManualControls` props ([docs/components/listening.md](../components/listening.md)) and a corresponding `handleManualAction` call here. If it needs a parameter (like `move`'s label), give it its own picker/confirm panel state instead of firing immediately.
- Do not add Gmail/session logic directly in this file — it should only orchestrate calls to `/api/*` and the two hooks; business logic belongs in `src/lib/`.
