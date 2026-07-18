# MailFlow — Build Log & Current State

*Written after the initial MVP build pass. Companion to [PRD.md](./PRD.md), [BRAND.md](./BRAND.md), [IMPLEMENTATION-PLAN.md](./IMPLEMENTATION-PLAN.md), and [TTS-STT-ANALYSIS.md](./TTS-STT-ANALYSIS.md).*

**Purpose of this doc:** those four docs describe the *intended* design. This doc describes what actually got built, exactly as it exists in the repo right now, plus every place the implementation deviates from or adds detail beyond those docs. Read this first if you're picking up the project cold — it should make repo exploration mostly unnecessary. When in doubt, this doc and the source are the source of truth; the plan docs may describe intentions that shifted slightly during implementation (each shift is called out below with the reason).

## 1. Status

All 10 build phases from the implementation plan are complete: scaffold → DB/auth → Gmail integration → bookmark/session logic → manual-control screens → TTS → STT → full checkpoint voice loop → reply dictation → settings/accessibility. The app **builds and lints clean** (`npm run build`, `npm run lint`) but has **never been exercised against real credentials** — no real Google OAuth client, MongoDB Atlas cluster, OpenAI/Deepgram/Anthropic API keys have been supplied yet. Everything that doesn't require a live third-party call has been verified (auth redirect wiring, 401 gating, page rendering in both themes, build/typecheck). See §8 for exactly what's verified vs. not.

## 2. Stack — what's actually installed (not just planned)

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 16.2.10** (App Router, Turbopack default) | Plan originally said Next 15 — upgraded to 16 on the user's explicit instruction mid-planning. Turbopack is the default bundler in 16, no flag needed. |
| React | 19.2.4 | Ships as part of Next 16's canary-track React. |
| Styling | Tailwind CSS v4 (`@theme inline` in `globals.css`, no `tailwind.config.js`) | CSS-first config; see §4. |
| Database | MongoDB (official `mongodb` driver v7, no ODM) | No Atlas cluster provisioned yet — `MONGODB_URI` is a placeholder in `.env.local`. |
| Auth | `next-auth@5.0.0-beta.31` (Auth.js v5) | **Still in beta as of this build** — the v5 line has never left beta upstream. Pinned to this exact version, not `@beta` floating. |
| Email | `googleapis` v173 | Standard Gmail API client. |
| TTS | OpenAI `gpt-4o-mini-tts` via `openai` v6 SDK | |
| STT | Deepgram Nova-3, streaming, via raw browser `WebSocket` (not the `@deepgram/sdk` client-side) | SDK is used **server-side only**, to mint short-lived keys via the Management API. See §5.5. |
| Reply cleanup | Claude via `@anthropic-ai/sdk` v0.112, model `claude-sonnet-5` | |
| PWA | Hand-rolled `manifest.ts` (Next-native file convention) + hand-rolled `public/sw.js` | **`next-pwa` was deliberately not used** — it's unmaintained since 2022 and conflicts with the App Router. See §6. |

Full dependency list is in [package.json](../package.json).

## 3. Environment setup

[.env.local.example](../.env.local.example) documents every variable with inline instructions on where to get it. Summary:

| Var | Required for | Notes |
|---|---|---|
| `AUTH_SECRET`, `NEXTAUTH_URL` | Auth.js session encryption | Generate with `npx auth secret` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Login + Gmail API | Redirect URI must be `http://localhost:3000/api/auth/callback/google` in dev. Requires the `gmail.modify` scope enabled on the OAuth consent screen. |
| `MONGODB_URI`, `MONGODB_DB` | Everything — the app can't boot past sign-in without this | `MONGODB_DB` defaults to `"mailflow"` if unset |
| `TOKEN_ENC_KEY` | Encrypting stored Gmail OAuth tokens | Must be a base64-encoded 32-byte key: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `OPENAI_API_KEY` | TTS | |
| `DEEPGRAM_API_KEY`, `DEEPGRAM_PROJECT_ID` | STT | Needs a **Management-API-capable** key, not just a regular streaming key — see §5.5 |
| `ANTHROPIC_API_KEY` | Reply cleanup | |

A local `.env.local` with **placeholder values** for all of the above already exists (gitignored, never committed — verify with `git status` if unsure) and is enough to `npm run dev` and inspect every page's *rendering*, but not to complete sign-in or any Gmail/TTS/STT/Claude call.

`.claude/launch.json` is configured so the `preview_start` tool can run `npm run dev` on port 3000 (must stay 3000 — it's baked into the Google OAuth redirect URI).

## 4. Design tokens — the one non-obvious Tailwind v4 gotcha

`globals.css` defines all of BRAND.md's tokens as CSS custom properties in three places: `:root` (light default), `@media (prefers-color-scheme: dark) { :root {...} }`, and `:root[data-theme="light|dark"]` (manual override, set by `ThemeScript.tsx`'s inline pre-paint script and `useTheme.ts`). These get exposed to Tailwind via `@theme inline { --color-brand: var(--brand); ... }` — the `inline` keyword is required because the values need to stay live `var()` references (so the media-query/data-theme overrides keep working), not get statically inlined at build time.

**Spacing scale:** BRAND.md's "4/8/12/16/24/32/48/64" 8px scale needed *no* custom tokens — it's exactly Tailwind's default `--spacing` multiplier (0.25rem) at steps 1/2/3/4/6/8/12/16. Don't add custom `--spacing-*` keys; Tailwind v4 doesn't use per-step keys for the numeric scale (only a single `--spacing: 0.25rem` multiplier), so any such keys would be dead weight, not an override.

**The `--on-accent` token** (added, not in original BRAND.md) is the one real bug found and fixed during the accessibility pass: BRAND.md's dark-theme accent colors (`--brand: #5FC1E8`, `--danger: #F1815C`, etc.) are deliberately *re-lightened* so they're legible as **text on the dark background**. But `Button.tsx`/`IconButton.tsx`'s solid-fill variants originally paired those same light colors with hardcoded `text-white` — white-on-light-blue in dark mode measured **2.04:1 contrast** (BRAND.md's own bar is 4.5:1 minimum). Fixed by adding a per-theme `--on-accent` token (`#FFFFFF` light, `#17140F` dark) and swapping every `text-white` in the button components for `text-on-accent`. Verified visually and via `getComputedStyle` in the browser (see §8). **If you add another solid-fill accent button anywhere, use `text-on-accent`, never `text-white`.**

## 5. Architecture — file map by layer

### 5.1 Auth (`src/lib/auth/`)
- `options.ts` — the actual NextAuth v5 config + `export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)`. Google provider requests `openid email profile https://www.googleapis.com/auth/gmail.modify` and forces `access_type: "offline"` + `prompt: "consent"` (without this, Google only issues a refresh token on a user's *first-ever* consent — a real bug the original plan docs missed). The `jwt` callback **only persists tokens on initial sign-in** (upserts the Mongo `users` doc, encrypts tokens). It does **not** handle refresh — that's `lib/gmail/client.ts`'s job exclusively, so there's one source of truth for token refresh, not two competing paths.
- `tokenCrypto.ts` — AES-256-GCM encrypt/decrypt via Node's built-in `crypto` only (no `argon2` — that's a password-hashing algorithm and was in the original plan's dependency table by mistake; irrelevant here since we're encrypting OAuth tokens, not hashing passwords).
- `requireUser.ts` — shared `requireUser()` helper every API route calls first; returns `{ userId: ObjectId, email }` or `null`. Routes return 401 JSON on `null`.
- `next-auth.d.ts` — module augmentation adding `session.user.id` and `token.dbUserId`.

`proxy.ts` (repo root — **not** `middleware.ts**, see §6) gates `/home`, `/listen`, `/settings`, `/api/*` (except `/api/auth/*`) behind `auth()`, redirecting unauthenticated page requests to `/` and returning 401 JSON for API requests.

### 5.2 Database (`src/lib/db/`)
- `client.ts` — `getMongoClient()`, a lazily-created singleton cached on `global` (survives dev HMR and warm serverless invocations). **Deliberately lazy** — reading `MONGODB_URI` at module-load time broke `next build`'s page-data collection step when the env var wasn't set (real error hit and fixed during Phase 1).
- `collections.ts` — typed collection accessors (`usersCollection()`, `sessionsCollection()`, `bookmarksCollection()`, `emailActionLogsCollection()`) plus `ensureIndexes()` (idempotent, called from the NextAuth `jwt` callback on every sign-in — cheap since `createIndex` no-ops if the index exists).

Schemas match IMPLEMENTATION-PLAN.md §3 exactly — see `src/lib/types.ts` for the canonical TypeScript shapes (`UserDoc`, `ListeningSessionDoc`, `BookmarkDoc`, `EmailActionLogDoc`, `ParsedEmail`, `CheckpointPayload`).

### 5.3 Gmail integration (`src/lib/gmail/`)
- `client.ts` — `getGmailClientForUser(userId)` builds a per-user authenticated `googleapis` client. **This is the only place token refresh happens**: `OAuth2Client`'s built-in refresh fires transparently on expiry, and its `tokens` event handler re-encrypts and persists the new tokens back to Mongo (best-effort — a failed persist just means the next request refreshes again). Also exports `fetchMessage()`.
- `list.ts` — `buildInboxSnapshot()` builds the ordered message-ID snapshot for a session, respecting scope (`unread`/`all`) and order (`oldest`/`newest` — Gmail returns newest-first, so `oldest` reverses the array). Capped at 2000 messages per snapshot as a sanity limit (not in the original plan — added because nothing else bounded it and "1000 email backlog" is explicitly the target use case).
- `parse.ts` — `parseGmailMessage()`: walks the MIME tree for `text/plain` (preferred) or `text/html` (stripped via regex — no HTML parser dependency), strips quoted-reply chains (`On ... wrote:`, `-----Original Message-----`, `>`-prefixed lines) via pattern matching, splits into paragraphs on blank lines. No summarization, matching PRD scope exactly.
- `actions.ts` — `archiveMessage()` (removes `INBOX` label) and `sendReply()` (fetches the original message's `Message-Id`/`References` headers first, builds a proper RFC822 raw message with `In-Reply-To`/`References` so Gmail threads it correctly, base64url-encodes, sends via `messages.send` with the correct `threadId`).

### 5.4 Bookmark / session logic (`src/lib/bookmark/session.ts`)
The core stateful logic. Key functions:
- `getOrCreateActiveSession()` — resumes the existing active session if scope/order still match the user's current settings; otherwise marks it exhausted and builds a fresh snapshot (snapshots are immutable once created, per IMPLEMENTATION-PLAN.md §3's resolved reconciliation rule).
- `advanceSession()` — atomic `findOneAndUpdate` with `$inc: { cursorIndex: 1 }` (not read-then-write — guards against double-tap/two-device races cheaply, per the plan's Phase-0 validation pass). Flips `status` to `"exhausted"` when the cursor runs off the end. Also atomically upserts the `bookmarks` doc and inserts an `emailActionLogs` entry, in parallel.
- `buildCheckpointResponse()` — shared by every action route: given wherever the session cursor now points, fetches+parses that email (or returns `email: null` if the session is exhausted) and shapes the `CheckpointPayload` the client expects.

### 5.5 Voice pipeline (`src/lib/voice/`, `src/hooks/`)
- `tts.ts` — `getTtsProvider()` returns a swappable `TtsProvider` interface; the OpenAI impl calls `audio.speech.create()` with `gpt-4o-mini-tts`, streams the response body straight through. Tone is steered via the `instructions` param — a base "calm, unhurried, warm" instruction, optionally appended with the user's custom `voiceTone` setting.
- `stt.ts` — **server-side only**. `mintSttToken()` calls Deepgram's **Management API** (`client.manage.v1.projects.keys.create(projectId, {...})` via `@deepgram/sdk`) to mint a 60-second-TTL scoped key. This is a real, separate credential-minting call, not just re-exposing the main API key — confirmed against the SDK's actual type definitions during Phase 6 (the original plan docs treated this as a vague "token mint" without specifying it's a distinct Management API surface requiring its own `DEEPGRAM_PROJECT_ID`).
- `useVoiceSession.ts` (client hook) — the actual mic capture. Uses a **hand-rolled `AudioWorklet`** (`public/audio/pcm-worklet.js`) to capture raw Float32 mic samples and convert to 16-bit linear PCM in real time, then streams raw PCM frames over a native browser `WebSocket` directly to `wss://api.deepgram.com/v1/listen` (auth via the `["token", key]` WebSocket subprotocol trick — browsers can't set custom headers on the WS handshake, so this is Deepgram's documented workaround). **Why raw PCM instead of `MediaRecorder`:** `MediaRecorder`'s `audio/webm;codecs=opus` isn't supported on Safari/iOS at all, and PRD §8 requires Safari iOS to work — raw PCM via Web Audio API works identically across Chrome/Firefox/Safari. Implements silence-timeout (default 4s, 1.5s during reply dictation) and a hard max-duration cap, both cancellable via a returned `cancel()`.
- `useAudioPlayback.ts` (client hook) — thin wrapper around a single `<audio>` element; `speak(text)` POSTs to `/api/tts`, plays the returned blob, resolves on the `ended` event. Capture and playback are never concurrent by construction — nothing in the codebase runs `useVoiceSession.listen()` and `useAudioPlayback.speak()` at the same time.
- `commandMatcher.ts` — plain keyword/synonym matching (`matchCommand(transcript)` → `{ command, phrase } | null`), word-boundary regex per phrase so e.g. "moreover" doesn't false-match "more". Returns which literal phrase matched (not just the command) so the archive route can distinguish "archive" vs. "delete" for logging even though both have identical effect.
- `replyCleanup.ts` — `cleanupReply(rawTranscript)` calls Claude (`claude-sonnet-5`) with a system prompt instructing grammar/filler cleanup while preserving intent exactly, returns the first text block.

### 5.6 The `/listen` screen (`src/app/listen/ListenClient.tsx`)
This is the single largest and most load-bearing file in the app — the full paragraph-checkpoint state machine from IMPLEMENTATION-PLAN.md §7.1, implemented as nested async functions rather than a formal reducer (the flow is inherently sequential — `await speak, await listen, branch` — so an async control-flow function reads far more directly than an action-dispatch reducer would).

**Cancellation model** (not detailed in the original plan, designed during Phase 7): a `generationRef` counter. Every manual button tap or navigation-away bumps it; every `await` boundary inside the voice loop checks `isCurrent(gen)` afterward and throws a local `CancelledError` if stale, which every loop's `try/catch` swallows silently. This is what lets a manual "Archive" tap instantly interrupt an in-progress TTS readout or an open mic window without needing real `AbortController`-based cancellation of the underlying `fetch`/`audio`/`WebSocket` calls (those still get explicitly stopped via `voice.cancel()`/`audio.stop()` too — the generation counter handles the *logical* cancellation, the explicit calls handle the *physical* one).

Key functions and what they own:
- `runEmailLoop()` — speaks the intro line, hands off to `runParagraphsFrom(..., startIndex: 0, ...)`.
- `runParagraphsFrom()` — **the actual checkpoint loop**: speak paragraph → speak "there's more / that's everything" prompt → listen → branch on matched command (continue/skip/archive/snooze/reply) → on unrecognized, speak retry prompt and re-listen (capped at `MAX_RETRIES = 3`, after which it gives up and tells the user to use the buttons — matches BRAND.md's "never silent failure" rule while still having a hard stop). This function is also the one reused by the manual "Continue Reading" button (`handleContinueButton`), so there's exactly one place the paragraph-walking logic lives, not two copies (an early draft had two copies — consolidated during Phase 7 review, see the `CancelledError`/duplication note if you're diffing against an intermediate commit).
- `runAction()` — the shared terminal-action handler (skip/archive/snooze): performs the API call, **speaks a short confirmation** ("Archived.", "Skipped.", "Snoozed.", "Deleted.") — this was a gap fixed during the Phase 9 accessibility pass, since BRAND.md §6 explicitly requires a spoken confirmation for the "confirmed" state and the first draft only changed the UI label silently — then resumes `runEmailLoop()` on whatever email comes next, or flips to the "done" phase if the session's exhausted.
- `runDictationFlow()` / `sendReplyAndResume()` — the reply sub-flow (IMPLEMENTATION-PLAN.md §7.4): speaks "Go ahead," captures dictation (1.5s silence timeout — shorter than the 4s checkpoint default, since the user is actively composing, not deciding), sends to `/api/reply/cleanup`, shows the cleaned draft on screen **and** speaks it back with "Send it? ", listens for confirm/redo (redo loops back to dictation). The on-screen textarea is always editable and has its own Send/Cancel buttons — the user can bypass voice entirely at any point and just type, which is the same generation-bump-and-take-over pattern as the other manual controls.

Every `speak()` call also sets `promptText` (rendered on screen) — this is what satisfies BRAND.md §9's "every spoken confirmation has an on-screen text equivalent" rule; there's no code path that speaks something without also displaying it.

**iOS Safari autoplay note:** the screen shows a "Start listening" tap-to-begin button rather than auto-playing on mount — the first `audio.play()` call needs to originate from a user gesture or Safari silently blocks it. All subsequent `speak()` calls happen inside the async chain kicked off by that click, which is the standard pattern for satisfying autoplay-with-sound restrictions.

### 5.7 UI primitives (`src/components/ui/`)
`Button`, `Card`, `Chip`, `IconButton` — all built from scratch (no component library), directly encoding BRAND.md's tokens (pill radius, 56px/44px touch targets, the four Okabe-Ito-derived semantic colors). `icons.tsx` is a small hand-drawn SVG set (no icon library dependency) — mic, check, alert, skip, archive, reply, snooze, play, pause, dots, Google logo.

`StatusIndicator` + `Waveform` + `ListeningRing` (in `src/components/listening/`) implement BRAND.md §6's state table exactly: every state pairs shape/motion + color + a text label, never color alone. All decorative motion (`Waveform`'s bar animation, `ListeningRing`'s pulse, the thinking-dots bounce, the confirm scale-pop, the error shake) is gated behind Tailwind's `motion-safe:` variant *and* a global `@media (prefers-reduced-motion: reduce)` fallback in `globals.css` — belt-and-suspenders, satisfies the BRAND.md §9 checklist item twice over.

### 5.8 Settings (`src/app/settings/`)
`SettingsClient.tsx` — inbox scope/order toggles (with a static note that changing them starts a fresh session, rather than a confirm dialog — the plan left this UX detail open, this is the resolution), theme toggle (wired to both the client-side `useTheme()` hook for instant application *and* persisted server-side via `/api/settings` for cross-device consistency), voice-tone freeform text field, and a two-step "Disconnect Google account" flow (`idle → confirm → working`) that calls `/api/settings/disconnect`, which revokes the token with Google's `oauth2.googleapis.com/revoke` endpoint (best-effort — local cleanup proceeds even if Google's revoke call fails) and deletes the user's `users`/`bookmarks`/`sessions` documents (leaves `emailActionLogs` for audit purposes, matching their stated MVP purpose).

## 6. Deviations from IMPLEMENTATION-PLAN.md (and why)

These aren't oversights — each was a deliberate call, mostly discovered by checking the actual installed package versions/APIs rather than assuming the plan doc's specifics were still current:

1. **Next.js 16, not 15.** User's explicit instruction ("why would you pin next 15? just do next 16") after I'd initially proposed pinning to 15 out of caution. Verified via `npm view next dist-tags` that 16 is current stable, not a risky bleeding-edge choice.
2. **`middleware.ts` → `proxy.ts`.** Next 16 renamed the file convention and deprecated the `middleware` export name in favor of `proxy` (confirmed by reading `node_modules/next/dist/docs/.../proxy.md` directly, per this repo's `AGENTS.md` warning that Next 16 has training-data-invalidating breaking changes). The proxy runtime is Node-only now (no edge runtime option), which is actually convenient here since our `auth()` check needs Node APIs anyway.
3. **No `next-pwa`.** Confirmed unmaintained (last publish 2022, predates App Router) via npm registry check. Hand-rolled `manifest.ts` + `public/sw.js` instead — this was already the plan's stated fallback, just promoted to the primary (only) approach.
4. **No `@node-rs/argon2`.** Was in the original stack table for "token encryption" alongside Node `crypto` — argon2 is password hashing, unrelated to AES-GCM token encryption. Dropped as a dead/wrong dependency.
5. **`/api/actions/{archive,reply,snooze}` each do their own bookmark advance + logging inline**, rather than the client calling the action endpoint *and then separately* calling `/api/session/next` (which is how a literal reading of the original route table could be interpreted). Consolidated to avoid double-logging the same action and an extra network round-trip per checkpoint decision — real latency that matters for a voice UI's "calm, snappy" feel per BRAND.md. `/api/session/next` is now specifically the *skip-only* endpoint (no Gmail side effect).
6. **Google OAuth `access_type: "offline"` + `prompt: "consent"`** added explicitly — without it, Google only issues a `refresh_token` on a user's very first-ever consent, which would silently break the "transparently refresh" promise on any later re-auth. Not mentioned in the original auth-flow doc section.
7. **`--on-accent` design token** — not in BRAND.md, added to fix the real dark-mode contrast bug described in §4.
8. **Generation-counter cancellation pattern** in `ListenClient.tsx` — an implementation detail the plan didn't specify (it described the state machine's *transitions* but not how to make it interruptible by manual UI). Designed during Phase 7.
9. **Reply command's "delete" vs "archive" phrase tracking** — `commandMatcher.ts` returns which literal phrase matched (not just the command bucket) specifically so voice-triggered "delete" can still be logged distinctly from "archive," matching the manual-button behavior. Not spelled out in the original command-matcher pseudocode.

## 7. Known gotchas (found the hard way — read before you burn an hour on them)

- **Service worker caches `/_next/static/*` cache-first.** In **dev mode**, Turbopack's chunk filenames aren't content-hashed the way production build output is — so after editing CSS/JS, a browser tab with the SW already registered from a prior visit will keep serving **stale CSS/JS indefinitely**, surviving even a full dev-server restart and `.next` deletion. This is exactly what happened verifying the `--on-accent` fix (§4) — the fix was correct and present in the served files (confirmed via `curl` bypassing the browser tool entirely) but the browser kept rendering the old styles until the SW was explicitly unregistered and its cache cleared (`navigator.serviceWorker.getRegistrations()` → `unregister()`, `caches.keys()` → `caches.delete()`). **If a change to a static asset doesn't seem to take effect in the browser during local testing, suspect the SW first** — hard-unregister it or test in a fresh incognito window. This is a dev-only footgun; production works fine because hashed filenames mean a new deploy naturally gets fresh cache entries.
- **`create-next-app` scaffolded a stray `src/app/sitemap.ts`** referencing a `/login` route that was never built (the app consolidates login into `/`). Deleted during the Phase 9 cleanup — if you see sitemap-related 404s or dead-route references anywhere else, that's the kind of scaffold cruft to watch for.
- **`next@latest` currently resolves to 16, not 15** — if a future session's training data suggests pinning to 15 "to be safe," check `npm view next dist-tags` first; the ecosystem moves fast and this repo intentionally tracks current-stable.
- **`next-auth@5.0.0-beta.31` is pinned exactly**, not `next-auth@beta` floating — the v5 line has been in beta for a long time and could ship breaking changes between beta releases. Bump deliberately, not automatically.
- **AudioContext sample rate is device-dependent** (`useVoiceSession.ts` reads `audioContext.sampleRate` at runtime and passes it as the `sample_rate` query param to Deepgram rather than assuming a fixed rate) — don't hardcode 16000/44100/48000 anywhere in the STT path.

## 8. What's actually been verified vs. not

**Verified (via `npm run build`/`lint` and live browser testing with placeholder env vars):**
- Full production build compiles clean, zero lint warnings, zero type errors, across all 10 phases.
- Landing page renders correctly in both light and dark theme, correct font loading (`Atkinson Hyperlegible Next`), correct BRAND.md colors.
- `/home`, `/listen`, `/settings`, and every `/api/*` route correctly redirect/401 unauthenticated requests (proxy.ts + per-route `requireUser()` both confirmed working).
- The Google OAuth redirect fires with the correct scopes/params (confirmed by clicking through to Google's consent screen and inspecting the resulting URL — it failed only because the client ID is a placeholder, which is expected).
- Dark-mode button contrast fix (§4) confirmed via `getComputedStyle` + screenshot.

**Not verified (requires real credentials the user hasn't supplied yet):**
- Actual sign-in completing and a `users` document appearing in MongoDB.
- Gmail snapshot building, parsing, archive, and reply-send against a real inbox.
- TTS audio actually playing, STT actually transcribing, Claude actually cleaning up a reply.
- The full voice checkpoint loop end-to-end (paragraph walk, command recognition, retry/error prompts).
- Installed-to-home-screen behavior on an actual mobile device (Safari iOS or Chrome Android), per PRD §8's success criteria.
- MongoDB index creation (`ensureIndexes()`) actually succeeding against a real cluster.

**To unblock the "not verified" list**, the user needs to supply, in this order (each unblocks the next phase of testing): `MONGODB_URI` + a real Google OAuth client (get sign-in working) → `OPENAI_API_KEY` + `DEEPGRAM_API_KEY`/`DEEPGRAM_PROJECT_ID` (get the voice loop working) → `ANTHROPIC_API_KEY` (get reply dictation working end-to-end).

## 9. Explicitly deferred (unchanged from IMPLEMENTATION-PLAN.md §9)

Mid-sentence interruption/barge-in, a true wake-word engine, deep HTML-parsing fidelity for heavily-formatted/marketing emails, real snooze scheduling (currently an alias for skip, logged distinctly), concurrency/scale infrastructure beyond what Gmail/OpenAI/Deepgram/Anthropic already rate-limit, an automated test suite (none exists yet — `commandMatcher.ts`, `lib/bookmark/session.ts`'s reconciliation logic, and `lib/gmail/parse.ts` would be the highest-value first additions), structured observability/error tracking (Sentry etc.), and deployment/hosting setup (this build stops at a working local dev app; Vercel remains the recommendation, untouched so far).
