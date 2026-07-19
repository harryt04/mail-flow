# public/ — hand-written assets

## Purpose
Two hand-written JS files supporting the PWA/voice pipeline (the rest of `public/` is static
icons/images, not documented here since they're not code).

## Key files
| File | Role |
|---|---|
| `public/audio/pcm-worklet.js` (20 lines) | An `AudioWorkletProcessor` named `"pcm-worklet-processor"` — converts Float32 mic samples to 16-bit linear PCM, posted back to the main thread which buffers it locally and sends the recorded clip to `/api/stt/transcribe`. |
| `public/sw.js` (48 lines) | Install-only service worker for "Add to Home Screen" installability; cache-first for static assets only (not a full offline-first SW). Only registered in production (see below) — cache-first + Turbopack dev's stable chunk URLs otherwise serves stale CSS/JS on normal reload. |

## Depends on
Nothing internal — both are plain browser-runtime JS, loaded by URL rather than imported/bundled.

## Depended on by
- `src/hooks/useVoiceSession.ts` loads `pcm-worklet.js` via `audioContext.audioWorklet.addModule("/audio/pcm-worklet.js")`, then instantiates the `"pcm-worklet-processor"` node and streams PCM buffers out via `workletNode.port.postMessage()`. See [docs/hooks.md](./hooks.md).
- `src/components/ui/ServiceWorkerRegister.tsx` registers `sw.js` via `navigator.serviceWorker.register("/sw.js")`, gated to `NODE_ENV === "production"`. See [docs/components/ui.md](./components/ui.md).

## Where to add new code here
- Changes to audio processing before it's sent for transcription (e.g. different sample rate/format) → `pcm-worklet.js`, and keep the worklet's processor name (`"pcm-worklet-processor"`) in sync with the string `useVoiceSession.ts` uses to instantiate it.
- Expanding the service worker's caching (e.g. true offline support) → `sw.js` — note it's currently deliberately minimal (install-only, cache-first for static assets), not a general-purpose offline cache.
