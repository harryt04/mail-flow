# TTS / STT Provider Analysis

*Companion to [PRD.md](./PRD.md) §9.5 (open question) and [BRAND.md](./BRAND.md). Written 2026-07-17.*

This resolves the PRD's open provider question with a recommendation, but every integration point in the implementation plan wraps these providers behind a thin interface (`lib/voice/tts.ts`, `lib/voice/stt.ts`) so swapping providers later is a config change, not a rewrite.

---

## 1. Why this decision is harder than "pick the cheapest one"

**MVP decision: no interruption support.** Barge-in (mic live concurrently with TTS playback) is out of scope. Instead the app reads each email a paragraph at a time and pauses at a checkpoint after every paragraph — see [IMPLEMENTATION-PLAN.md §7](./IMPLEMENTATION-PLAN.md) for the state machine. This removes the hardest requirement (concurrent live mic + live playback with echo cancellation) from the MVP entirely. The provider recommendation below is unaffected — Deepgram's low-latency streaming is still the right call, for a simpler reason now: snappy turnaround at each paragraph checkpoint, not surviving simultaneous playback — and the cost/complexity profile is meaningfully lighter than a barge-in design would be, since the mic is only ever open during short listening windows between paragraphs, never concurrently with TTS output.

Two things about this planning session's requirements push the pick past what a naive TTS/STT choice would need to handle:

- **Fast, responsive turn-taking matters** — even without any concurrency, the checkpoint pattern only feels "calm and unhurried" (per BRAND.md) rather than laggy if the app recognizes a command quickly once the user starts talking. This still favors an STT provider with a true low-latency **streaming** (WebSocket) API over a "record a clip, upload, wait" batch API — the difference between a snappy check-in and an awkward pause is exactly the round-trip latency at each checkpoint, and with a checkpoint after every paragraph, that latency is felt often.
- **No button-tap listening is in scope** — the mic should open on its own at each checkpoint, not require the user to tap a button to talk. This still has cost implications (more checkpoints per email than a single end-of-email prompt means more, shorter STT sessions) and rules out providers that only offer batch transcription. See IMPLEMENTATION-PLAN.md for how this composes with the paragraph-checkpoint architecture.

A second constraint, independent of these decisions but just as binding: **PRD §8 requires Safari iOS to work**, and the browser-native `SpeechRecognition` API (Web Speech API) is **not implemented in any iOS browser** — Apple requires all iOS browsers to use WebKit, and WebKit has no `SpeechRecognition` support ([TestMu AI browser support survey](https://www.testmuai.com/learning-hub/speech-recognition-api-browser-support/), [xjavascript.com iOS Web Speech API guide](https://www.xjavascript.com/blog/add-ios-speech-recognition-support-for-web-app/)). Chrome for Android does support it, but Firefox ships it disabled by default. **This effectively forces a cloud STT integration with our own streaming pipeline regardless of cost** — the free browser-native option is not viable for the primary target platform.

So the real decision is: *which streaming-capable cloud STT provider, and which TTS provider*, not *"should we use the browser's free API."*

---

## 2. Text-to-Speech options

| Provider / Model | Price | Notes |
|---|---|---|
| **OpenAI `gpt-4o-mini-tts`** | ~$0.015/min (\$0.60/1M input tokens + \$12/1M audio output tokens) | Cheapest of the three; steerable tone via natural-language instructions ("warm, unhurried"), which maps directly onto the BRAND.md "calm, unhurried" voice tone requirement; 13+ voices, 50+ languages ([OpenAI pricing docs](https://developers.openai.com/api/docs/pricing), [TokenMix cost breakdown](https://tokenmix.ai/blog/gpt-4o-mini-tts-cheapest-tts-api-2026)) |
| **OpenAI `tts-1` / `tts-1-hd`** | $15 / $30 per 1M characters | Older, character-billed, no steerability — superseded by `gpt-4o-mini-tts` for this use case |
| **ElevenLabs (Flash/Turbo)** | $0.05/1,000 chars (~$0.03/min) | Highest perceived voice quality/naturalness on the market; roughly 2x OpenAI's cost; strongest option if voice quality becomes a differentiator post-MVP ([ElevenLabs API pricing](https://elevenlabs.io/pricing/api), [flexprice.io breakdown](https://flexprice.io/blog/elevenlabs-pricing-breakdown)) |
| **ElevenLabs (Multilingual v2/v3)** | $0.10/1,000 chars | Higher-fidelity model tier, ~2x the Flash price |
| **Google Cloud TTS (Neural2)** | $16/1M characters | Mid-price; Chirp 3 HD tier is $30/1M chars; Standard/WaveNet voices are $4/1M chars but sound dated ([Google Cloud TTS pricing](https://cloud.google.com/text-to-speech/pricing)) |

**Recommendation: OpenAI `gpt-4o-mini-tts`.**
- Cheapest option by a meaningful margin (~50% cheaper than ElevenLabs per the TokenMix comparison above), which matters because MVP usage is "read a 900-email backlog aloud" — high per-user audio volume.
- The `instructions` steerability parameter is a direct match for BRAND.md's tone requirements ("calm, unhurried, warm... never blame the user") — we can bake brand voice instructions straight into the TTS call rather than fighting a fixed-persona voice model.
- Keeps billing on one vendor alongside the LLM reply-cleanup step (also likely Claude/OpenAI), simplifying API key/secrets management for an MVP with a tiny ops team.
- Trade-off accepted: ElevenLabs voices sound more natural. If user feedback says the robotic quality breaks the "audiobook" feel, this is a one-line provider swap behind the `lib/voice/tts.ts` interface.

---

## 3. Speech-to-Text options

| Provider | Streaming? | Price | Notes |
|---|---|---|---|
| **OpenAI Whisper API (batch)** | No | $0.006/min | Batch-only — "upload complete file, wait for full transcript," no WebSocket, no partial results ([community.openai.com](https://community.openai.com/t/new-tts-api-pricing-and-gotchas/1150616), [diyai.io Whisper pricing breakdown](https://diyai.io/ai-tools/speech-to-text/openai-whisper-api-pricing-2026/)). Usable in principle now that there's no concurrency requirement, but the lack of partial/streaming results still makes each checkpoint feel slower than a WebSocket-based option. |
| **OpenAI Realtime (streaming transcribe)** | Yes | ~$0.017/min | Streaming exists but is bundled into the pricier Realtime API surface, not a standalone lightweight STT product |
| **Google Cloud Speech-to-Text** | Yes (streaming endpoint) | Free first 60 min/mo, then $0.006/15sec (~$0.024/min) standard | Viable streaming option; pairs naturally with Google OAuth already in the stack ([Google Cloud STT pricing](https://cloud.google.com/speech-to-text/pricing)) |
| **Deepgram Nova-3** | Yes, WebSocket, <300ms latency | $0.0043/min batch, $0.0077/min streaming (~$0.46/hr) | Purpose-built for exactly this: continuous low-latency streaming transcription with partial results as speech happens ([Deepgram pricing](https://deepgram.com/pricing), [convertaudiototext.com Nova-3 breakdown](https://convertaudiototext.com/blog/deepgram-nova-3-explained)) |

**Recommendation: Deepgram Nova-3 (streaming).**
- It's the only option in this table purpose-built for low-latency, partial-result streaming — still the right call for snappy checkpoint turnaround even with concurrency off the table.
- Sub-300ms median latency keeps each "continue or do something else?" check-in feeling responsive rather than laggy, which matters directly for the BRAND.md "calm, quiet confidence" feel — a voice UI that visibly lags reads as broken, not calm. With a checkpoint after every paragraph rather than just once per email, this latency is felt many times per email, so it's worth paying for.
- At MVP scale (a handful of friends/family users, not high concurrency per PRD §3), streaming cost stays low regardless: ~$0.46/hr of *actual open-mic* time. Because the mic only opens during listening windows between paragraphs, real spend per email is a handful of few-second bursts, not the full length of the email.
- Solves the iOS Safari gap directly — since we can't rely on `SpeechRecognition` at all on iOS, we were always going to build a custom `getUserMedia` → stream → cloud STT pipeline; Deepgram's WebSocket API is a clean fit for that pipeline on every platform, so there's no separate "iOS fallback" to build.

### On "wake word" specifically

The user chose always-listening/wake-word over push-to-talk. True dedicated wake-word engines (e.g., **Picovoice Porcupine**, on-device, sub-second, near-zero marginal cost per detection) are the industry-standard way to do this cheaply and are what phone assistants use — but Picovoice's commercial pricing starts at **$6,000/year** for the Starter tier ([Picovoice pricing](https://checkthat.ai/brands/picovoice/pricing)), which doesn't fit an MVP built for a handful of family/friend users.

**MVP approach:** skip a dedicated wake-word engine. Under the paragraph-checkpoint architecture (§7 of the implementation plan), "no button tap needed" doesn't require the mic to be hot for the entire session — it means the mic **opens automatically after every paragraph** (and after a reply confirmation) with no button tap required, and closes again once a command is recognized or a short silence timeout passes. This delivers the hands-free feel the user wanted without ever running Deepgram concurrently with TTS output, and without needing a dedicated wake-word engine at all — there's no continuous whole-session stream to distinguish "wake phrase" from "everything else," because the mic is only ever open during an explicit listening window in the state machine.

---

## 4. Does Anthropic have a first-party TTS/STT product?

Short answer: **no first-party TTS/STT API you can build against.** What exists instead:

- **Claude's consumer voice mode** (in the Claude.ai mobile/web/desktop apps) — Claude sends your audio to Anthropic's servers, but **the text-to-speech component itself is powered by ElevenLabs under the hood**, not an Anthropic-built TTS model ([datastudios.org overview](https://www.datastudios.org/post/claude-voice-features-explained-current-status-and-upcoming-real-time-updates)). This is a consumer app feature, not an API product — there's no endpoint to call `tts.anthropic.com` from our own app.
- **Claude Code's voice dictation** — speech-to-text for talking to Claude Code itself, but it explicitly **only works when authenticated via a Claude.ai account**, and is unavailable "when Claude Code is configured to use an Anthropic API key directly, Amazon Bedrock, Google Cloud's Agent Platform, or Microsoft Foundry" ([Claude Code voice dictation docs](https://code.claude.com/docs/en/voice-dictation)). That restriction rules it out categorically for a third-party product like MailFlow — we authenticate as an API-key-based service, not as an interactive Claude.ai user.
- **Anthropic's own published guidance for developers wanting voice** is to pair Claude with a third-party STT/TTS vendor — their own cookbook demonstrates exactly this pattern using ElevenLabs for both legs ([Claude Cookbook: low-latency voice assistant with ElevenLabs](https://platform.claude.com/cookbook/third-party-elevenlabs-low-latency-stt-claude-tts)), which is effectively Anthropic confirming "bring your own TTS/STT vendor" is the intended integration path.

**Conclusion:** this doesn't change the recommendation in §5 — Claude stays in the stack for reply-cleanup only (an LLM task, not audio), and TTS/STT remain OpenAI + Deepgram respectively. The one interesting signal from this research: Anthropic's own consumer product picked **ElevenLabs** for voice quality, which is a small point in ElevenLabs' favor if MailFlow's voice quality ever becomes a complaint worth the ~2x cost premium over OpenAI (see §2) — noted here as a tie-breaker for that future decision, not a reason to switch now.

---

## 5. Reply-cleanup LLM

Not asked about explicitly, but implied by PRD §5.4/§5.6: use **Claude (Sonnet)** via the Anthropic API for dictation cleanup — it's already the ecosystem this build is happening in, the task (grammar/tone cleanup of a short dictated paragraph) doesn't need a frontier reasoning model, and Sonnet-tier pricing is negligible at this volume. This is also swappable behind a `lib/voice/reply-cleanup.ts` interface.

---

## 6. Summary of MVP provider choices

| Function | Provider | Est. cost driver |
|---|---|---|
| TTS | OpenAI `gpt-4o-mini-tts` | ~$0.015/min of email audio read aloud |
| STT (streaming) | Deepgram Nova-3 | ~$0.0077/min of open-mic time |
| Reply cleanup | Claude (Sonnet) | Negligible at MVP volume, per-reply |

All three are wrapped behind swappable interfaces per the implementation plan — this document records the *reasoning*, not a permanent lock-in.
