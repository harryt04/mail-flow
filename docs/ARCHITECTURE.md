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
| STT | Deepgram Nova-3, streaming | ^5.6.0 |
| Reply cleanup | Anthropic Claude (`@anthropic-ai/sdk`) — text cleanup only, no TTS/STT from Anthropic | ^0.112.3 |
| Styling | Tailwind CSS v4 | ^4 |

See `mvp-docs/TTS-STT-ANALYSIS.md` for why OpenAI/Deepgram were chosen over alternatives
(iOS Safari audio constraints were the deciding factor), and `mvp-docs/BUILD-LOG.md` for the
original phase-by-phase build history.

## Request flow
```
Browser
  → proxy.ts (auth gate at the edge — docs/proxy-and-routing.md)
  → App Router page (src/app/**) or API route (src/app/api/** — docs/app/api/README.md)
       page: requireUser() / auth() again, then calls into src/lib/* directly (server component)
       route: requireUser() again, then delegates to src/lib/*
  → src/lib/{auth,db,gmail,bookmark,voice} (docs/lib/README.md)
  → MongoDB / Gmail API / OpenAI / Deepgram / Anthropic
```
Two auth checks are deliberate: `proxy.ts` blocks unauthenticated requests at the edge before
routing; `requireUser()`/`auth()` inside the page or route guarantees it never runs
unauthenticated even if reached directly.

## Feature flows

### 1. Login
`GoogleSignInForm` (docs/components/landing.md) → NextAuth `signIn` → Google OAuth → NextAuth
callbacks in `src/lib/auth/options.ts` upsert the user doc, encrypt and store Gmail tokens,
seed `DEFAULT_USER_SETTINGS` → `proxy.ts` now allows the session onto `/home`, `/listen`,
`/settings`. See [docs/lib/auth.md](./lib/auth.md).

### 2. Listening session
`ListenClient` (docs/app/listen.md) mounts → `POST /api/session` →
`getOrCreateActiveSession` builds an ordered inbox snapshot (`lib/gmail/list.ts`) if none
exists → `buildCheckpointResponse` fetches and parses the next message → `ListenClient` plays
it via `useAudioPlayback` → `/api/tts`. Between paragraphs, `useVoiceSession` opens the mic for
one checkpoint window → `/api/stt/token` mints a Deepgram key → transcript is matched
client-side via `matchCommand` (`lib/voice/commandMatcher.ts`). See
[docs/lib/bookmark.md](./lib/bookmark.md).

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
(`lib/voice/replyCleanup.ts`, Claude) returns cleaned text → `replyStage: "confirming"` → user
confirms → `POST /api/actions/reply` → `sendReply` (`lib/gmail/actions.ts`) sends the threaded
Gmail reply → `advanceSession` + `buildCheckpointResponse`. See
[docs/app/api/reply-cleanup.md](./app/api/reply-cleanup.md).

### 5. Settings
`SettingsClient` (docs/app/settings.md) → `GET/POST /api/settings` reads/writes
`UserSettings` (inbox scope/order, theme, voice tone) → theme also applied client-side via
`useTheme`. Disconnect: `POST /api/settings/disconnect` revokes/clears stored Gmail tokens and
wipes bookmarks/sessions. See [docs/app/api/settings.md](./app/api/settings.md).

## Where things live
See [docs/DECISION-TREE.md](./DECISION-TREE.md) for a task → file lookup table, or
[docs/README.md](./README.md) for the full doc index.
