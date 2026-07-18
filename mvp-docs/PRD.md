# MailFlow — MVP PRD

## 1. Summary

MailFlow is the "audiobook app for your inbox." It reads emails aloud sequentially and lets the user manage their inbox hands-free with voice commands — skip, archive, delete, snooze, reply. It's mobile-first (installed to the home screen as a PWA), works over Bluetooth speakers/headsets, and remembers exactly where the user left off, even across sessions days apart.

**Primary use case:** a user with an overwhelming inbox (starting with the founder's mother) triages hundreds/thousands of emails by listening while doing something else (chores, walking, commuting), using short voice commands instead of typing or tapping.

## 2. Goals / Non-Goals

**Goals (MVP)**
- Log in with Google, grant Gmail access.
- Play emails aloud sequentially, one at a time, hands-free.
- Support voice commands: Skip, Next, Archive, Delete (→archive), Reply, Snooze (→skip/next).
- Reply via dictation, cleaned up by an LLM, with playback confirmation before sending.
- Persist listening progress (a "bookmark") per user so a session can resume exactly where it left off, even days later.
- Mobile-first responsive UI, installable to home screen (PWA), usable on tablet/desktop too.
- Multi-user: any user can sign up and connect their own Gmail account.

**Non-Goals (explicitly out of scope for MVP)**
- Non-Gmail providers (Outlook, IMAP) — future work.
- Native iOS/Android apps — PWA only.
- Web Bluetooth device pairing UI — audio output goes through the OS/browser's already-paired Bluetooth speaker/headset via standard `<audio>`/`getUserMedia`, not a custom Bluetooth pairing flow.
- Advanced email actions (labeling, forwarding, multi-select bulk actions, search).
- Offline mode.
- Fine-grained voice command customization / multi-language support.
- Team/shared inboxes.

## 3. Users

- **Primary persona:** a non-technical user with a large, unmanaged inbox who wants to process email passively/hands-free rather than by scrolling and tapping. Comfortable with simple voice interaction, not comfortable with complex UI.
- **MVP scale:** small number of real users (friends/family), not designed for high concurrency yet, but built multi-tenant from the start since sharing beyond one user is expected.

## 4. Core User Flow

1. User opens MailFlow on their phone (installed to home screen), logs in with Google.
2. Grants Gmail read/modify access via OAuth.
3. Taps "Start listening." App fetches the next unprocessed email starting from their saved bookmark (or the top of the inbox on first run).
4. App speaks the email in segments — sender + subject, then the body one paragraph at a time — pausing after each paragraph at a **checkpoint** rather than reading the whole message uninterrupted. **Interrupting playback mid-sentence is explicitly out of scope for MVP** (see resolved decision below); the checkpoint cadence is the supported mechanism for not having to sit through an entire long email.
5. At each checkpoint, the app tells the user there's more if applicable ("There's more — want me to keep reading, or...") and listens for a voice command:
   - **"Continue" / "Keep reading"** → play the next paragraph, another checkpoint follows.
   - **"Skip" / "Next"** → move to the next email, no state change on current one, bookmark advances.
   - **"Archive" or "Delete"** → archive the email in Gmail, bookmark advances.
   - **"Snooze"** → treated as skip/next for MVP (no actual snooze scheduling yet), bookmark advances.
   - **"Reply"** → app prompts "go ahead," records dictation, sends transcript through an LLM to clean up grammar/tone, reads the cleaned draft back to the user for confirmation ("send it?" / "redo"), sends on confirmation via Gmail API, bookmark advances.
6. Bookmark (current position in the ordered email list) is persisted after every action, immediately, to MongoDB.
7. User can close the app mid-inbox and resume later (same day or days later) — next session starts exactly at the saved bookmark.

## 5. Functional Requirements

### 5.1 Auth & Account
- Google OAuth sign-in (used for both app login and Gmail API access — single consent flow).
- Store per-user Gmail OAuth tokens (access + refresh) securely, encrypted at rest.
- Multi-user from day one: each user has their own account, own Gmail connection, own bookmark/progress state.

### 5.2 Email Ingestion
- Fetch emails from Gmail via Gmail API (inbox, unread and/or all — default: unread inbox, newest-first or oldest-first — **needs decision**, see open questions).
- Define a stable, deterministic ordering of the inbox at the start of a "listening session" so bookmark position is meaningful (e.g., sort by internal Gmail message ID or received date, snapshot the list, and progress through that snapshot rather than a live/changing query).
- Fetch email body, parse to plain text/summary suitable for TTS (strip HTML, signatures/quoted threads as needed for MVP — full body is fine for v1, no summarization required initially).

### 5.3 Playback (TTS)
- Convert sender + subject + body to speech via a cloud TTS API (e.g., OpenAI TTS, ElevenLabs, or Google Cloud TTS — pick one for MVP, keep provider swap easy).
- Play audio through the device's active audio output (works automatically with connected Bluetooth speakers/headsets — no custom Bluetooth code needed, standard HTML5 audio playback).
- Basic playback controls: play/pause, and voice-command driven skip/next.

### 5.4 Voice Commands (STT)
- Capture microphone audio, send to a cloud STT API (e.g., OpenAI Whisper or Google Speech-to-Text) for transcription.
- Match transcribed text to supported commands: Skip, Next, Archive, Delete, Reply, Snooze (simple keyword/intent matching for MVP, no fuzzy NLU needed beyond basic synonym handling).
- Handle "Reply" as a distinct sub-flow: switch to dictation-capture mode, transcribe the full reply, pass to LLM for cleanup, TTS the cleaned draft back, listen for confirm/redo command.

### 5.5 Actions
- **Archive:** call Gmail API to archive the message (remove INBOX label).
- **Delete:** same as Archive for MVP (per spec — no permanent delete).
- **Snooze:** same as Skip/Next for MVP (no real snooze scheduling — bookmark just advances, message stays in inbox for now).
- **Reply:** send the LLM-cleaned reply via Gmail API as a reply-in-thread.

### 5.6 Bookmark / Progress Persistence
- Persist to MongoDB after every processed email: user ID, the session's email-list snapshot (or a resumable query), and the index/message-ID of the last processed email.
- On new session start, resume from the stored bookmark rather than the beginning.
- If the underlying inbox changed since the last session (new mail arrived, old mail was archived elsewhere), MVP behavior: keep resuming the original snapshot until exhausted, then start a fresh snapshot for anything new. (Exact reconciliation logic is an open question below.)

### 5.7 UI
- Mobile-first, installable PWA (manifest + service worker for "Add to Home Screen").
- Responsive layout that also works on tablet/laptop/desktop.
- Minimal screens: Login → Home/"Start Listening" → Playback/Listening view (shows current email's sender/subject as text + a simple waveform/status indicator + manual buttons mirroring each voice command as a fallback for when voice isn't practical).

## 6. Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (latest) |
| Database | MongoDB |
| Auth | Google OAuth (NextAuth.js or equivalent), doubles as Gmail API auth |
| Email provider | Gmail API |
| TTS | Cloud TTS API (provider TBD — OpenAI/ElevenLabs/Google) |
| STT | Cloud STT API (provider TBD — OpenAI Whisper/Google) |
| Reply cleanup | LLM API (e.g., Claude/OpenAI) |
| Hosting | Not yet decided — any Next.js-friendly host |

## 7. Data Model (high-level)

- **User**: `_id`, `email`, `name`, `googleOAuthTokens` (encrypted), `createdAt`.
- **Bookmark**: `userId`, `sessionSnapshotId` or ordered list of message IDs, `lastProcessedMessageId`/index, `updatedAt`.
- **EmailActionLog** (optional but useful even for MVP): `userId`, `messageId`, `action` (skip/archive/reply/snooze), `timestamp` — useful for debugging and later analytics, not user-facing in MVP.

## 8. Success Criteria for MVP

- A user can log in with Google, grant Gmail access, and start listening to their inbox read aloud.
- All 6 voice commands work reliably in a normal quiet environment.
- Reply-by-voice produces a sensible LLM-cleaned message that sends correctly and appears properly threaded in Gmail.
- Closing the app and reopening it (even after several days, even after new mail has arrived) resumes from the correct saved position, not the beginning.
- Works installed to a mobile home screen and functions correctly on at least one major mobile browser (Safari iOS or Chrome Android) plus desktop Chrome.

## 9. Open Questions

Resolved during MVP planning (see [IMPLEMENTATION-PLAN.md](./IMPLEMENTATION-PLAN.md) and [TTS-STT-ANALYSIS.md](./TTS-STT-ANALYSIS.md) for full reasoning); still listed here for the original context, with resolutions noted inline.

1. **Inbox scope & order:** Unread-only or all inbox mail? Newest-first or oldest-first? This affects both the ingestion query and what "bookmark" conceptually means. — **Resolved: user-configurable in Settings** (Unread/All × Oldest/Newest), defaults to Unread + Oldest-first.
2. ~~**Barge-in vs. wait-for-finish**~~ — **Resolved: no interruption support in MVP.** Playback and mic capture never overlap. Instead the app reads the email a paragraph at a time and pauses at a checkpoint after each paragraph, telling the user there's more and asking if they want to keep listening or act. This gives the same practical benefit (not being stuck through a long email) without the cost/complexity of true concurrent-audio barge-in. See §4 above for the revised flow.
3. **Snapshot reconciliation:** Exact rule for how new mail that arrives mid-session (or between sessions) gets folded into the queue relative to the saved bookmark. — **Resolved:** snapshot is immutable once created; a new snapshot is built fresh (respecting scope/order settings) once the current one is exhausted.
4. **Wake word / always-listening vs. push-to-talk:** Does the mic listen continuously for commands, or does the user tap a button to talk? — **Resolved:** no button tap needed, but also no continuous whole-session listening or dedicated wake-word engine. The mic opens automatically at each paragraph checkpoint and closes once a command is recognized or a short silence timeout passes.
5. **TTS/STT provider choice:** Final pick between OpenAI, ElevenLabs, Google, etc. — **Resolved: OpenAI `gpt-4o-mini-tts` + Deepgram Nova-3** (streaming), kept swappable behind a provider interface. Anthropic has no first-party TTS/STT product to consider here.
6. **Snooze semantics beyond MVP:** Is "real" snooze (resurface after N hours/days) a near-term follow-up, or fine to leave as permanent skip indefinitely? — Still open; MVP treats it as skip, logged distinctly so real snooze can be added later without a schema change.
7. **Error handling for STT misfires:** What happens if a voice command isn't recognized — silent retry prompt, fallback to on-screen buttons, or something else? — **Resolved:** always a spoken retry prompt naming the supported commands, never a silent failure, per BRAND.md tone rules.
