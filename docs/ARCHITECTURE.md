# Architecture

MailFlow is a mobile-first PWA that reads a user's Gmail inbox aloud, paragraph by paragraph,
and accepts voice commands (skip, archive, reply, snooze) between paragraphs. Sessions are
resumable across days via a persisted bookmark. It is a narrow, single-purpose product, not a
general email client or a general-purpose voice-assistant framework.

## Stack
| Layer | Choice | Version (package.json, verified 2026-07-17) |
|---|---|---|
| Framework | Next.js, App Router, Turbopack | 16.2.10 |
| UI | React | 19.2.4 |
| Auth | NextAuth (Auth.js) v5, Google provider scoped to Gmail | 5.0.0-beta.31 |
| Database | MongoDB, raw driver (no ODM) | ^7.5.0 |
| Gmail | `googleapis` | ^173.0.0 |
| TTS | OpenAI (`gpt-4o-mini-tts`) | ^6.48.0 |
| STT | OpenAI (`gpt-4o-mini-transcribe`), batch — client records + silence-detects locally | ^6.48.0 |
| Reply cleanup | OpenAI (`gpt-4o-mini`) | ^6.48.0 |
| Styling | Tailwind CSS v4 | ^4 |

All three AI-backed features run on OpenAI, funded by a per-user free trial (100 actions) off
the app's own `OPENAI_API_KEY`, then the user's own key (BYOK) — see
[docs/lib/auth.md](./lib/auth.md) (`openaiKey.ts`) and `mvp-docs/user-supplied-api-key-plan.md`.
`mvp-docs/TTS-STT-ANALYSIS.md` documents the original (pre-consolidation) provider evaluation —
historical context only, the app no longer uses Deepgram or Anthropic. See `mvp-docs/BUILD-LOG.md`
for the original phase-by-phase build history.

## Request flow
```
Browser
  → src/proxy.ts (auth gate + locale detection at the edge — docs/proxy-and-routing.md)
  → App Router page (src/app/**) or API route (src/app/api/** — docs/app/api/README.md)
       page: requireUser() / auth() again, then calls into src/lib/* directly (server component)
       route: requireUser() again, then delegates to src/lib/*
  → src/lib/{auth,db,gmail,bookmark,voice} (docs/lib/README.md)
  → MongoDB / Gmail API / OpenAI
```
Two auth checks are deliberate: `src/proxy.ts` blocks unauthenticated requests at the edge before
routing; `requireUser()`/`auth()` inside the page or route guarantees it never runs
unauthenticated even if reached directly.

## Feature flows

### 1. Login
`GoogleSignInForm` (docs/components/landing.md) → NextAuth `signIn` → Google OAuth → NextAuth
callbacks in `src/lib/auth/options.ts` upsert the user doc, encrypt and store Gmail tokens,
seed `DEFAULT_USER_SETTINGS` → `src/proxy.ts` now allows the session onto `/home`, `/listen`,
`/settings`. See [docs/lib/auth.md](./lib/auth.md).

### 2. Listening session
`ListenClient` (docs/app/listen.md) mounts → `POST /api/session` →
`getOrCreateActiveSession` builds an ordered inbox snapshot (`lib/gmail/list.ts`) if none
exists → `buildCheckpointResponse` fetches and parses the next message → `ListenClient` plays
it via `useAudioPlayback` → `/api/tts`. Between paragraphs, `useVoiceSession` opens the mic for
one checkpoint window, records locally with its own silence detector, and sends the clip to
`/api/stt/transcribe` once the user stops talking → transcript is matched client-side via
`matchCommand` (`lib/voice/commandMatcher.ts`). See [docs/lib/bookmark.md](./lib/bookmark.md).

### 3. Command handling (skip/archive/snooze/move)
Matched command → `ListenClient`'s `runAction`/`handleManualAction` (or, for the open-vocabulary
"move" command, `runMoveVoiceFlow`, which fuzzy-matches the spoken folder name against the
user's real Gmail labels and always confirms before applying) → the corresponding route
(`/api/session/next` for skip, `/api/actions/{archive,snooze,move}`) → Gmail-side mutation
(except skip) via `lib/gmail/actions.ts` → `advanceSession` + `buildCheckpointResponse` → next
email loads. See [docs/app/api/actions.md](./app/api/actions.md).

### 4. Reply by dictation
User says "reply" → `ListenClient` enters `replyStage: "dictating"` → mic captures audio via
`useVoiceSession` → raw transcript sent to `POST /api/reply/cleanup` → `cleanupReply`
(`lib/voice/replyCleanup.ts`, OpenAI `gpt-4o-mini`) returns cleaned text → `replyStage:
"confirming"` → user confirms → `POST /api/actions/reply` → `sendReply` (`lib/gmail/actions.ts`)
sends the threaded Gmail reply → `incrementTrialActionUsage` → `advanceSession` +
`buildCheckpointResponse`. See [docs/app/api/reply-cleanup.md](./app/api/reply-cleanup.md).

### 5. Settings
`SettingsClient` (docs/app/settings.md) → `GET/POST /api/settings` reads/writes
`UserSettings` (inbox scope/order, theme, voice tone) → theme also applied client-side via
`useTheme`. Disconnect: `POST /api/settings/disconnect` revokes/clears stored Gmail tokens and
wipes bookmarks/sessions. See [docs/app/api/settings.md](./app/api/settings.md).

### 6. Free trial / BYOK gate
Every archive/move/reply action calls `incrementTrialActionUsage` after it succeeds. Every
TTS/STT/reply-cleanup route call resolves a credential via `resolveOpenAiCredential` first — the
user's own key if set, else the app's trial key while `trialActionsUsed < 100`, else `null` (the
route responds `400`). `(authenticated)/layout.tsx` independently checks the same condition on
every page load and redirects to `/onboarding` once the trial is exhausted and no key is set;
`OnboardingClient` posts a new key to `/api/settings/openai-key` and redirects back to `/home`.
See [docs/lib/auth.md](./lib/auth.md) and `mvp-docs/user-supplied-api-key-plan.md`.

## Where things live
See [docs/DECISION-TREE.md](./DECISION-TREE.md) for a task → file lookup table, or
[docs/README.md](./README.md) for the full doc index.
