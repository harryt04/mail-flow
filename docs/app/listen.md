# src/app/listen/

## Purpose
The core screen of the app: reads emails aloud paragraph-by-paragraph, listens for voice
commands between paragraphs, and handles the reply-by-dictation sub-flow. `ListenClient.tsx`
(547 lines) is the largest and most complex file in the repo — this doc goes a level deeper
than other module docs because of that.

## Key files
| File | Role |
|---|---|
| `page.tsx` (16 lines) | Server component — `auth()` check (redirects if unauthenticated), renders `AppHeader` + `ListenClient`. |
| `ListenClient.tsx` (547 lines) | Client component and state machine — see below. |

## Depends on
- `src/hooks/useAudioPlayback`, `src/hooks/useVoiceSession` — the two engines of the loop ([docs/hooks.md](../hooks.md)).
- `src/lib/voice/commandMatcher` (`matchCommand`) — called directly client-side, not via an API route ([docs/lib/voice.md](../lib/voice.md)).
- `src/lib/types` (`CheckpointPayload`, `ParsedEmail`).
- `src/components/ui/{Card,Button,IconButton,icons}`, `src/components/listening/{ManualControls,StatusIndicator}`.
- Calls `/api/session`, `/api/session/next`, `/api/actions/{archive,reply,snooze}`, `/api/reply/cleanup` — see [docs/app/api/README.md](./api/README.md).

## State machine shape
- `phase`: `"loading" | "ready" | "error" | "done"` — overall page lifecycle.
- `uiState` (`ListeningState`, from `components/listening/StatusIndicator`): `"idle" | "speaking" | "listening" | "thinking" | "error" | "confirmed"` — drives the visual status indicator.
- `replyStage`: `"idle" | "dictating" | "cleaning" | "confirming"` — the reply sub-flow's own stage, nested inside the main loop.
- `checkpoint` (`CheckpointPayload | null`), plus UI fields (`promptText`, `paragraphIndex`, `showContinue`, `error`, `busy`, `replyOpen`, `replyText`).
- `generationRef` (`useRef<number>`) — the cancellation mechanism: incremented on every new user action; async flows check `isCurrent(gen)` and throw `CancelledError` to abort stale work when the user interrupts (e.g. presses skip while TTS is still playing).
- Two effects: one on mount to fetch the initial checkpoint (`phase` → `ready`/`done`), one on unmount to bump `generationRef` and cancel any in-flight voice/audio.

## Depended on by
Reached via `/home`'s "Start Listening" button; gated by `proxy.ts`.

## Conventions
- All server calls go through a single `postJson()` helper — new calls to `/api/*` from this component should use it rather than calling `fetch` directly, to keep error handling centralized.
- The cancellation pattern (`generationRef` + `isCurrent()` + `CancelledError`) is the mechanism that makes rapid user interruptions (e.g. pressing skip mid-sentence) safe — any new async flow added to this component must participate in it (check `isCurrent(gen)` after each await) or it will race with newer user actions.
- The reply sub-flow (`runDictationFlow`) is self-contained and resumes the main loop via `sendReplyAndResume` — new sub-flows with their own multi-step UI should follow this self-contained-then-resume shape rather than interleaving state directly into the main loop.

## Where to add new code here
- A new voice command's client-side handling (after `matchCommand` recognizes it in `src/lib/voice/commandMatcher.ts`) → add a case in the command-dispatch logic inside `runEmailLoop`/`runParagraphsFrom`, following the existing `continue`/`skip`/`archive`/`reply`/`snooze` cases.
- A new manual (button) action → add to `ManualControls` props ([docs/components/listening.md](../components/listening.md)) and a corresponding `handleManualAction` call here.
- Do not add Gmail/session logic directly in this file — it should only orchestrate calls to `/api/*` and the two hooks; business logic belongs in `src/lib/`.
