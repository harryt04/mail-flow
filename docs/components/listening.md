# src/components/listening/

## Purpose
The visual vocabulary for voice-session state — what the user sees while the app is
listening, speaking, thinking, or confirming a command. Rendered entirely from
`ListenClient.tsx`'s `uiState`.

## Key files
| File | Role |
|---|---|
| `StatusIndicator.tsx` | The composite status display — pairs shape/motion + color + a text label for every state (`ListeningState`: `speaking`, `listening`, `thinking`, `confirmed`, `error`, `idle`). Color is never the sole signal. Renders `Waveform` for `speaking` and `ListeningRing` for `listening`. |
| `ListeningRing.tsx` | Pulsing ring around the mic icon, shown during a checkpoint's listening window. |
| `Waveform.tsx` | Continuous motion while TTS audio plays — the one exception to BRAND.md §7's no-bounce rule. Also used standalone in `landing/LandingHero.tsx`. |
| `ManualControls.tsx` | Fallback button row (Skip/Archive/Snooze/Reply/Continue) for when voice isn't practical — mirrors the exact icon+color vocabulary of the voice-command states. |

## Depends on
- `src/components/ui/` — icons (`IconMic`, `IconCheck`, `IconAlert`, `IconDots`, `IconSkip`, `IconArchive`, `IconReply`, `IconSnooze`, `IconPlay`) and `IconButton`.

## Depended on by
- `src/app/listen/ListenClient.tsx` renders `StatusIndicator` (with `state={uiState}`) and `ManualControls` directly — see [docs/app/listen.md](../app/listen.md).
- `src/components/landing/LandingHero.tsx` renders `Waveform` standalone, decoratively.

## Conventions
- `ListeningState` (defined in `StatusIndicator.tsx`) is the shared vocabulary for voice-session UI state — `ListenClient.tsx`'s `uiState` is typed against it directly rather than a separately-defined enum.
- Every state pairing (motion + color + label) is defined once in `StatusIndicator`; individual sub-components (`Waveform`, `ListeningRing`) don't know which logical state they represent, they're purely visual and get composed by `StatusIndicator`.

## Where to add new code here
- A new voice-session visual state → add to the `ListeningState` union in `StatusIndicator.tsx`, then add its shape/motion/color/label case there. Check `mvp-docs/BRAND.md` §6 for the established motion/color rules before inventing a new visual treatment.
- A new manual (non-voice) action → `ManualControls.tsx`, following its existing `on<Action>` callback-prop pattern.
