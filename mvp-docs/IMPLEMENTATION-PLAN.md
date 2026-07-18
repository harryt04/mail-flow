# MailFlow — MVP Implementation Plan

*Companion to [PRD.md](./PRD.md), [BRAND.md](./BRAND.md), and [TTS-STT-ANALYSIS.md](./TTS-STT-ANALYSIS.md). Written 2026-07-17.*

This plan scaffolds the entire Next.js app: pages, API routes, MongoDB schema, auth, and the voice pipeline. It implements as much of the PRD as reasonably fits an MVP; gaps are called out explicitly in §9 rather than silently skipped.

---

## 0. Decisions locked in for this plan

Resolved via conversation with the user (supersedes/narrows the PRD's open questions in §9):

| Open question | Resolution |
|---|---|
| TTS/STT provider | OpenAI `gpt-4o-mini-tts` (TTS) + Deepgram Nova-3 streaming (STT). Full reasoning in [TTS-STT-ANALYSIS.md](./TTS-STT-ANALYSIS.md). Anthropic has no first-party TTS/STT API to build against (see analysis doc §4) — Claude stays in the stack only for reply-cleanup text generation. |
| Inbox scope & order | **User-configurable**, not fixed. Settings screen lets the user pick: Unread-only vs. All mail, × Oldest-first vs. Newest-first. Stored per-user, defaults to Unread + Oldest-first. |
| Barge-in / interruptions | **Not supported in MVP — by design, not as a temporary compromise.** Playback and mic capture never run concurrently, so there's no echo cancellation or concurrent-audio problem to solve at all. In its place: the app reads the email **one paragraph at a time**, pausing at a checkpoint after each paragraph. At each checkpoint it tells the user if there's more, then listens for "continue" or any other supported command. See §7 below for the full state machine. |
| Wake word / always-listening | **Scoped down accordingly.** No continuous whole-session mic capture and no dedicated wake-word engine. Instead, the mic opens automatically (no button tap) after every paragraph, and closes once a command is recognized or a short silence timeout passes. This preserves the "don't make me tap a button" feel without the cost/complexity of true always-on listening. |

Not building interruption support removes the single riskiest technical item from the plan (concurrent capture+playback, echo cancellation over Bluetooth) while the paragraph-checkpoint pattern still gives the user a natural, frequent "get out of this email" opportunity — never more than one paragraph away — without the engineering cost of true concurrency. See §7 for the resulting state machine and §9 for what's still deferred.

---

## 1. Tech stack (concrete versions/choices)

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router), TypeScript, React 19 |
| Styling | Tailwind CSS v4, CSS variables for the BRAND.md token system (light/dark) |
| Database | MongoDB Atlas, official `mongodb` driver (no ODM — schema is simple enough that Mongoose adds more ceremony than value) |
| Auth | NextAuth.js (Auth.js v5) with Google provider, `gmail.modify` scope requested at sign-in |
| Email | Gmail API (`googleapis` npm package) |
| TTS | OpenAI `gpt-4o-mini-tts` |
| STT | Deepgram Nova-3, streaming WebSocket |
| Reply cleanup LLM | Anthropic Claude (Sonnet) via `@anthropic-ai/sdk` |
| PWA | `next-pwa` (or hand-rolled manifest + service worker — see §6) |
| Hosting | Vercel (Next.js-native, simplest for an MVP; PRD leaves this open, this is a recommendation not a hard requirement) |
| Token encryption | `@node-rs/argon2`/Node `crypto` (AES-256-GCM) for encrypting stored OAuth refresh tokens at rest |

---

## 2. Project scaffolding

```
mailflow/
├── .env.local.example
├── next.config.ts
├── manifest.webmanifest
├── public/
│   └── icons/                     # PWA icons, 192/512/maskable
├── src/
│   ├── app/
│   │   ├── layout.tsx              # root layout, theme provider, font
│   │   ├── globals.css             # design tokens from BRAND.md as CSS vars
│   │   ├── page.tsx                 # marketing/landing + "Sign in with Google"
│   │   ├── login/page.tsx           # explicit login screen (if not folded into "/")
│   │   ├── home/page.tsx            # "Start Listening" hub, session settings summary
│   │   ├── listen/page.tsx          # the core playback/listening screen
│   │   ├── settings/page.tsx        # inbox scope/order, theme, account, disconnect
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── session/route.ts             # start/resume a listening session
│   │   │   ├── session/next/route.ts        # advance bookmark, fetch next email
│   │   │   ├── emails/[id]/route.ts         # fetch single email content for TTS
│   │   │   ├── actions/archive/route.ts
│   │   │   ├── actions/reply/route.ts
│   │   │   ├── actions/snooze/route.ts      # MVP: alias of skip, logged distinctly
│   │   │   ├── tts/route.ts                 # text -> audio stream
│   │   │   ├── stt/token/route.ts           # short-lived Deepgram token mint
│   │   │   ├── reply/cleanup/route.ts       # raw dictation -> LLM-cleaned draft
│   │   │   └── settings/route.ts
│   │   └── manifest.ts / manifest.webmanifest
│   ├── components/
│   │   ├── ui/                     # Button, Card, Chip, IconButton — brand primitives
│   │   ├── listening/
│   │   │   ├── PlaybackPanel.tsx
│   │   │   ├── Waveform.tsx
│   │   │   ├── ListeningRing.tsx
│   │   │   ├── StatusIndicator.tsx  # speaking/listening/thinking/confirmed/error states
│   │   │   └── ManualControls.tsx   # fallback buttons: Skip/Archive/Reply/Snooze
│   │   └── settings/
│   ├── lib/
│   │   ├── db/
│   │   │   ├── client.ts            # MongoClient singleton (Next.js dev-hot-reload safe)
│   │   │   └── collections.ts       # typed collection accessors
│   │   ├── auth/
│   │   │   ├── options.ts           # NextAuth config
│   │   │   └── tokenCrypto.ts       # AES-256-GCM encrypt/decrypt for refresh tokens
│   │   ├── gmail/
│   │   │   ├── client.ts            # authenticated Gmail API client per user
│   │   │   ├── list.ts              # build ordered snapshot per user's scope/order pref
│   │   │   ├── parse.ts             # MIME -> plain text for TTS (strip HTML/quotes)
│   │   │   └── actions.ts           # archive, sendReply
│   │   ├── voice/
│   │   │   ├── tts.ts               # provider-agnostic interface + OpenAI impl
│   │   │   ├── stt.ts               # provider-agnostic interface + Deepgram impl
│   │   │   ├── commandMatcher.ts    # transcript -> {skip,next,archive,delete,reply,snooze,confirm,redo}
│   │   │   └── replyCleanup.ts      # Claude call wrapper
│   │   ├── bookmark/
│   │   │   └── session.ts           # snapshot creation, advance, reconciliation logic
│   │   └── types.ts
│   └── hooks/
│       ├── useAudioPlayback.ts      # <audio> element control, waveform data
│       ├── useVoiceSession.ts       # orchestrates mic stream + Deepgram WS + command state machine
│       └── useTheme.ts              # prefers-color-scheme + manual override
├── package.json
└── tsconfig.json
```

---

## 3. Data model (MongoDB)

Collections, expanding PRD §7 into concrete schemas:

### `users`
```ts
{
  _id: ObjectId,
  googleId: string,
  email: string,
  name: string,
  image?: string,
  gmailTokens: {
    accessTokenEnc: string,      // AES-256-GCM ciphertext
    refreshTokenEnc: string,
    expiryDate: number,
    iv: string,
    authTag: string,
  },
  settings: {
    inboxScope: "unread" | "all",
    inboxOrder: "oldest" | "newest",
    theme: "system" | "light" | "dark",
    voiceTone?: string,           // passed to TTS `instructions` param, defaults to brand voice
  },
  createdAt: Date,
  updatedAt: Date,
}
```

### `sessions` (listening-session snapshots — distinct from NextAuth's session concept)
```ts
{
  _id: ObjectId,
  userId: ObjectId,
  status: "active" | "exhausted",
  scope: "unread" | "all",
  order: "oldest" | "newest",
  messageIds: string[],          // Gmail message ID snapshot, frozen at session creation
  cursorIndex: number,           // last processed index into messageIds
  createdAt: Date,
  updatedAt: Date,
}
```

### `bookmarks` (one live document per user — "where do I resume")
```ts
{
  _id: ObjectId,
  userId: ObjectId,              // unique index
  activeSessionId: ObjectId,
  lastProcessedMessageId: string | null,
  updatedAt: Date,
}
```

### `emailActionLogs`
```ts
{
  _id: ObjectId,
  userId: ObjectId,
  sessionId: ObjectId,
  messageId: string,
  action: "skip" | "archive" | "delete" | "reply" | "snooze",
  replyText?: string,             // only for action="reply", the cleaned text actually sent
  timestamp: Date,
}
```

**Indexes:** `users.googleId` (unique), `users.email` (unique), `bookmarks.userId` (unique), `sessions.userId + status`, `emailActionLogs.userId + timestamp`.

**Snapshot reconciliation (PRD §5.6, open question #3):** MVP rule — a session's `messageIds` snapshot is immutable once created. When `cursorIndex` reaches the end (`status` flips to `"exhausted"`), the *next* "Start Listening" tap creates a **new** session snapshot querying Gmail fresh (respecting the user's scope/order settings), which naturally captures new mail and excludes anything archived elsewhere in the meantime (Gmail API just won't return it). The `bookmarks` document always points at the current/most recent session. This matches the PRD's stated MVP behavior exactly ("keep resuming the original snapshot until exhausted, then start a fresh snapshot for anything new").

---

## 4. Auth flow

1. NextAuth Google provider, requesting scopes: `openid email profile https://www.googleapis.com/auth/gmail.modify`.
2. On first sign-in (`signIn`/`jwt` callback), upsert a `users` document; encrypt and store `access_token`/`refresh_token` from the Google account object.
3. A `lib/gmail/client.ts` helper loads the user's encrypted tokens, decrypts, constructs an authenticated `googleapis` client, and **transparently refreshes and re-persists** the access token when Google's client reports expiry — every Gmail-calling API route goes through this helper rather than touching tokens directly.
4. Middleware (`middleware.ts`) protects `/home`, `/listen`, `/settings`, and all `/api/*` except `/api/auth/*` — redirect unauthenticated requests to `/login`.

---

## 5. Core screens

Per BRAND.md §6/§3.4 and PRD §5.7. All screens use the Atkinson Hyperlegible Next font, the light/warm-paper palette with dark-mode CSS-variable overrides, 8px spacing scale, 16px card radius / pill buttons, and never encode state in color alone.

1. **`/` (Landing/Login)** — Wordmark, one-line brand pitch, single "Sign in with Google" button (56px+ target). No marketing fluff — the primary user just needs to get to "Start Listening" fast.
2. **`/home`** — Post-login hub. Shows: bookmark status ("You have 214 emails left in this session" / "Fresh inbox — ready to start"), a large `--brand`-colored "Start Listening" pill (this is the `--text-display` hero moment per BRAND.md §4), and a link to Settings.
3. **`/listen`** — The core screen (BRAND.md §6). Single centered focus column at every breakpoint (never multi-column, even on desktop, per BRAND.md §5). Shows:
   - Current email's sender + subject as `--text-body-lg` text (BRAND.md §4 scale)
   - A subtle progress cue showing which paragraph of the current email is playing ("Paragraph 2 of 5") — small text label, not a scrubber; this is a listening app, not a video player
   - `StatusIndicator` cycling through Speaking / Listening (checkpoint) / Thinking / Confirmed / Error states, each with the paired shape+color+earcon+spoken-equivalent from BRAND.md §6's state table
   - `Waveform` component during Speaking, `ListeningRing` (pulsing, amber) during a checkpoint's Listening window — both respecting `prefers-reduced-motion`
   - `ManualControls`: Skip / Archive / Reply / Snooze / **Continue Reading** buttons, 56px min touch target, exact icon+color pairing as the voice-state vocabulary (BRAND.md §6 closing note) — fallback for when voice isn't practical. "Continue Reading" only appears at a checkpoint when there's another paragraph left to read.
   - Reply sub-flow UI: dictation-in-progress indicator → cleaned draft text shown on screen (redundant with the spoken read-back) → Send/Redo controls
4. **`/settings`** — Inbox scope toggle (Unread/All), order toggle (Oldest/Newest first — starting a *new* toggle selection prompts "this starts a new session" since it invalidates the current snapshot), theme override, voice tone (optional freeform hint passed to TTS), "Disconnect Google account" (danger-styled, confirmation required, Vermillion + icon + label per BRAND.md §3.4 rule 1 — never color-only).

Route note: `/login` and `/` can be the same route — plan assumes a single `/` that shows sign-in when logged out and redirects to `/home` when logged in, to keep the screen count minimal per BRAND.md's "legibility → calm" priority order.

---

## 6. PWA setup

- `manifest.webmanifest`: name "MailFlow", theme colors from BRAND.md tokens (`--bg` / `--brand`), icons (192/512/maskable), `display: "standalone"`, `start_url: "/home"`.
- Minimal service worker: cache-first for static assets/fonts, network-first for API routes — this MVP is explicitly **not** building offline mode (PRD non-goal), the service worker's only job is enabling "Add to Home Screen" installability, not offline functionality.
- `theme-color` meta tag driven by `prefers-color-scheme`.

---

## 7. Voice pipeline (the hard part)

**No interruption support in MVP, by design.** Playback and mic capture are never concurrent — this removes echo cancellation, concurrent-audio handling, and continuous streaming cost from the pipeline entirely. In its place: the app reads each email **one paragraph at a time**, pausing at a checkpoint after every paragraph to tell the user if there's more and ask what they want to do.

### 7.1 The checkpoint state machine

Each email is split into paragraphs up front by `lib/gmail/parse.ts` (simple blank-line/line-break segmentation on the parsed plain text — no LLM summarization needed, matching the PRD's "no summarization required" scope). `useVoiceSession` walks the paragraph list:

```
idle
  → speaking:intro                 ("From Jane Doe. Subject: Q3 budget.")
  → speaking:paragraph[i]          (reads paragraph i)
  → listening:checkpoint[i]        (mic opens automatically, no button tap required)
       if i < lastParagraph:
         spoken prompt: "There's more. Keep listening, or...?"
       else:
         spoken prompt: "That's the whole message. What next?"
       ├─ "continue" / "read on" / "keep going"   → i++ → speaking:paragraph[i]  (only offered if more remain)
       ├─ "skip" / "next"                          → advance bookmark, no Gmail state change → next email
       ├─ "archive" / "delete"                     → archive via Gmail, advance bookmark → next email
       ├─ "reply"                                   → dictating sub-flow (§7.4) → next email
       ├─ "snooze"                                   → same as skip, logged distinctly → next email
       └─ unrecognized / timeout                    → error prompt, re-listen (§7.5)
  → (repeat until "continue" is no longer offered, or a terminal command fires) → next email
```

A short email (one paragraph) still gets exactly one checkpoint after it, matching the original PRD flow almost exactly. A long email gets a checkpoint after every paragraph, so the user is never more than one paragraph away from being able to bail out — this is the practical replacement for interrupt-anywhere: not instant, but never far off either.

### 7.2 Architecture (sequential, not concurrent)

1. **Playback channel:** `POST /api/tts` streams synthesized audio for the current paragraph (or the intro); played via a standard `<audio>` element (works automatically with any OS-paired Bluetooth output per PRD §5.3/non-goals — no custom Bluetooth pairing code). The mic is **not** open during this phase.
2. **Capture channel:** once a paragraph finishes playing, the app automatically opens a `getUserMedia` mic stream — no button tap required. Audio is piped through a `MediaRecorder`/`AudioWorklet` to a WebSocket opened against Deepgram (token minted server-side via `/api/stt/token` so the Deepgram API key never reaches the client). The stream closes as soon as a command is recognized, or after a short silence timeout (e.g. ~4s of nothing → re-prompt, see §7.5).

Because capture and playback never overlap, there's no echo-cancellation problem to solve and no VAD-based gating needed during playback — Deepgram is only ever billed for the few seconds of an actual checkpoint response. This is both simpler to build and cheaper to run than any design involving concurrent audio (see [TTS-STT-ANALYSIS.md](./TTS-STT-ANALYSIS.md) for the full cost picture).

**Tuning knob, not an architecture decision:** paragraph is the natural checkpoint unit for MVP, but the split granularity in `lib/gmail/parse.ts` (paragraph vs. every N sentences, for emails with one giant paragraph) is a small, isolated piece of logic — worth revisiting once there's real usage data on whether checkpoints feel too frequent or not frequent enough for actual emails people receive.

### 7.3 Command matching

`lib/voice/commandMatcher.ts` — simple keyword/synonym matching per PRD §5.4 ("no fuzzy NLU needed beyond basic synonym handling"):

```ts
const COMMANDS: Record<Command, string[]> = {
  continue: ["continue", "read on", "keep going", "more"],   // only offered when another paragraph remains
  skip:     ["skip", "next"],
  archive:  ["archive", "delete", "remove"],
  reply:    ["reply", "respond"],
  snooze:   ["snooze"],
  confirm:  ["send", "yes", "confirm", "send it"],
  redo:     ["redo", "try again", "no"],
};
```
Matched against the lower-cased Deepgram transcript with simple substring/word-boundary checks — no ML intent classification needed for MVP, matching PRD scope exactly.

### 7.4 Reply sub-flow

1. "Reply" recognized at a checkpoint → state `dictating`, mic stays open (this is the one phase where an extended mic window is intentional — the user is actively composing), TTS speaks "Go ahead" (per PRD §5.4/BRAND.md tone).
2. On a pause (silence timeout, e.g. ~1.5s) or an explicit "done" phrase, the accumulated transcript is sent to `/api/reply/cleanup`. Mic closes before the confirmation TTS plays — same sequential capture/playback discipline as everywhere else in the pipeline.
3. That route calls Claude with a small prompt: clean up grammar/tone, preserve intent, keep it a plausible short reply — returns cleaned text.
4. Cleaned text is both shown on screen (BRAND.md §9 checklist: every spoken confirmation has an on-screen equivalent) and spoken back via TTS: "Here's your reply: ... Send it?"
5. Mic reopens for the confirm/redo response. "Send"/"Yes" → `POST /api/actions/reply` sends via Gmail API as a proper in-thread reply (`References`/`In-Reply-To` headers, correct `threadId`). "Redo" → back to step 1.

### 7.5 Error handling (PRD open question #7)

Per BRAND.md's explicit tone rule ("never blame the user," "errors always offer the next step in the same breath"): an unmatched transcript triggers the Error state (icon shake, respects `prefers-reduced-motion`, Vermillion + icon + label) and a spoken prompt: *"Didn't catch that. Say Skip, Archive, or Reply."* No silent failures, no on-screen-only errors — every error is spoken, matching BRAND.md §9's channel-parity checklist item.

---

## 8. API route summary

| Route | Method | Purpose |
|---|---|---|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth handler |
| `/api/session` | POST | Get-or-create the active listening session for the current user (applies scope/order settings, builds/reuses snapshot) |
| `/api/session/next` | POST | Given current messageId + action taken, log the action, advance bookmark, return next email's parsed content |
| `/api/emails/:id` | GET | Fetch + parse a single Gmail message to plain text (used for retry/replay) |
| `/api/actions/archive` | POST | Archive via Gmail API, log action |
| `/api/actions/reply` | POST | Send cleaned reply in-thread via Gmail API, log action |
| `/api/actions/snooze` | POST | MVP: same effect as skip, logged as `"snooze"` distinctly for future real-snooze work |
| `/api/tts` | POST | `{ text, voiceTone? }` → streamed audio (OpenAI `gpt-4o-mini-tts`) |
| `/api/stt/token` | POST | Mints a short-lived scoped Deepgram token for the client to open its own WebSocket (keeps the long-lived Deepgram API key server-only) |
| `/api/reply/cleanup` | POST | `{ rawTranscript }` → `{ cleanedText }` via Claude |
| `/api/settings` | GET/POST | Read/update the user's `settings` sub-document |

---

## 9. What this plan intentionally leaves short (fix-later list)

Being explicit per the user's instruction ("wherever we fall short, I can fix it later"):

- **Mid-sentence interruption.** Not supported, by design — see §0/§7. The paragraph-checkpoint pattern is the accepted permanent answer for MVP, not a placeholder for a future barge-in build. A user who wants out of a long paragraph still has to hear the rest of that paragraph before the next checkpoint. If real usage shows single paragraphs are sometimes too long to sit through (e.g. one giant unformatted block with no line breaks), the cheap fix is a smarter split in `lib/gmail/parse.ts` (e.g. cap paragraph length by sentence count), not a concurrency rewrite.
- **True wake-word.** MVP scopes "no button tap needed" down to "mic auto-opens after each paragraph," not a continuous whole-session stream or a dedicated low-power wake-word engine (Picovoice etc. is $6k+/yr, not MVP-appropriate). Revisit if false-trigger rate or the checkpoint cadence itself feels wrong in practice.
- **HTML email parsing fidelity.** `lib/gmail/parse.ts` will do a reasonable strip of HTML/signatures/quoted threads (PRD explicitly allows "full body is fine for v1, no summarization required"), but heavily-formatted marketing emails, deeply nested quote chains, and inline images/attachments are not specially handled — they'll just read as messy text. No summarization layer in MVP.
- **Real snooze.** Explicitly deferred per PRD — logged distinctly in `emailActionLogs` so a future "resurface after N days" feature has the data it needs without a schema migration.
- **Concurrency/scale.** Per PRD §3 ("small number of real users... not designed for high concurrency"), no queueing/rate-limit infrastructure beyond what Gmail API and the chosen providers already enforce. Fine for friends/family scale, would need revisiting before any public launch.
- **Testing.** No automated test suite is scaffolded in this pass (unit tests for `commandMatcher`, `bookmark/session.ts` reconciliation logic, and the Gmail parsing pipeline would be the highest-value first additions).
- **Observability.** `emailActionLogs` exists per PRD §7 for basic debugging, but no structured logging/error tracking (e.g., Sentry) is wired up.
- **Settings-change mid-session semantics.** Changing inbox scope/order mid-session invalidates the current snapshot; the plan above prompts the user about this, but the exact UX (confirm dialog vs. just-in-time note) is left as an implementation detail to refine.

---

## 10. Suggested build order

1. Scaffold Next.js app, Tailwind, brand CSS tokens, fonts, base layout, PWA manifest.
2. MongoDB client + schemas/indexes; NextAuth + Google OAuth + encrypted token storage.
3. Gmail integration: list/snapshot building, MIME parsing, archive action — verify against a real inbox before touching voice at all.
4. Bookmark/session logic (`lib/bookmark/session.ts`) + `/api/session`, `/api/session/next` — verify resume-after-close works with plain manual-button-only UI first (no voice yet).
5. `/listen` screen with **manual controls only** (Skip/Archive/Reply/Snooze buttons) wired to real Gmail actions — this validates the entire data/action pipeline before voice complexity is layered on.
6. TTS integration (`/api/tts` + playback) — get intro + single-paragraph playback working end-to-end, no commands yet.
7. STT integration at checkpoints: mic auto-opens once a paragraph finishes playing, closes on recognized command or timeout — this is the whole pipeline now, since capture and playback are never concurrent.
8. Wire up the full paragraph-walk loop (§7.1) across a multi-paragraph email, including the "there's more" / "that's everything" spoken prompt branching.
9. Reply dictation sub-flow (cleanup LLM + confirm/redo).
10. Tune checkpoint UX: paragraph-split quality on real Gmail content, silence timeout duration, and the error/retry prompt cadence.
11. Settings screen (scope/order/theme/voice tone/disconnect), PWA install polish, accessibility pass against BRAND.md §9's checklist.
