# Decision tree — where do I do X?

| I need to... | Read | Then likely edit |
|---|---|---|
| Add a new voice command (e.g. "delete") | [lib/voice.md](./lib/voice.md), [app/listen.md](./app/listen.md) | `src/lib/voice/commandMatcher.ts` (add to `Command` union + matching), `src/app/listen/ListenClient.tsx` (dispatch case) |
| Add a new Gmail-mutating action (e.g. "mark spam") | [lib/gmail.md](./lib/gmail.md), [app/api/actions.md](./app/api/actions.md) | `src/lib/gmail/actions.ts`, `src/lib/types.ts` (`EmailAction` union), new route under `src/app/api/actions/` |
| Add a new API route | [app/api/README.md](./app/api/README.md) | `src/app/api/<name>/route.ts` — call `requireUser()` first; add its prefix to `proxy.ts`'s matcher/`PROTECTED_PREFIXES` if it needs auth gating at the edge |
| Change checkpoint/bookmark/session-progress logic | [lib/bookmark.md](./lib/bookmark.md) | `src/lib/bookmark/session.ts` |
| Add a new user setting | [app/settings.md](./app/settings.md), [app/api/settings.md](./app/api/settings.md) | `src/lib/types.ts` (`UserSettings`, `DEFAULT_USER_SETTINGS`), `src/app/api/settings/route.ts`, `src/app/settings/SettingsClient.tsx` |
| Add a generic reusable UI component | [components/ui.md](./components/ui.md) | `src/components/ui/` |
| Add/change listening-screen visual state | [components/listening.md](./components/listening.md) | `src/components/listening/StatusIndicator.tsx` (the `ListeningState` union + its rendering) |
| Add a landing-page section | [components/landing.md](./components/landing.md) | `src/components/landing/`, wire into `src/app/page.tsx` |
| Touch auth, sessions, or Google OAuth scopes | [lib/auth.md](./lib/auth.md), [proxy-and-routing.md](./proxy-and-routing.md) | `src/lib/auth/options.ts`, `proxy.ts` |
| Add a new MongoDB collection | [lib/db.md](./lib/db.md) | `src/lib/types.ts` (document type), `src/lib/db/collections.ts` (accessor) |
| Change PWA/offline/installability behavior | [public-assets.md](./public-assets.md) | `public/sw.js`, `src/app/manifest.ts` |
| Change mic capture / audio streaming to Deepgram | [public-assets.md](./public-assets.md), [hooks.md](./hooks.md) | `public/audio/pcm-worklet.js`, `src/hooks/useVoiceSession.ts` |
| Change TTS voice/provider | [lib/voice.md](./lib/voice.md) | `src/lib/voice/tts.ts` (implements the swappable `TtsProvider` interface) |
| Change reply-cleanup (Claude) behavior | [lib/voice.md](./lib/voice.md), [app/api/reply-cleanup.md](./app/api/reply-cleanup.md) | `src/lib/voice/replyCleanup.ts` |
| Understand the overall system / a full feature flow end-to-end | [ARCHITECTURE.md](./ARCHITECTURE.md) | — |

If your task isn't in this table, start at [README.md](./README.md) — it links every doc, and
the doc tree mirrors `src/` one directory level deep, so the right file is usually
`docs/<same-path-as-src>.md`.
