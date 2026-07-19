# API Key Management & Model Migration (BYOK + Free Trial)

## Context
MailFlow currently pays for both Anthropic (reply-cleanup) and OpenAI (TTS) out of the
developer's own API keys via server env vars. To make the app free-to-run for the maintainer
while staying free-to-use, costs need to shift to each user: every user eventually supplies
their own OpenAI API key, which the app then uses for both TTS and reply-cleanup. This also lets
us drop the Anthropic dependency entirely — one BYOK key instead of two keys was called out as
the deciding factor (a second required key is a real signup dealbreaker). This is also a
positioning shift: the app becomes FOSS with BYOK ("the audiobook-app equivalent of an email
client"), which needs a CONTRIBUTING.md and README updates to support outside contributors.

**Free trial, not a hard gate at signup.** Rather than requiring a key before a new user can do
anything, the app keeps using the developer's own `OPENAI_API_KEY` server-side as a free trial:
each user gets **100 email actions** (archive/move/reply) covered by the app's own key before
they're required to supply their own. This removes the signup-friction cost of a hard key gate
while still capping the developer's ongoing OpenAI spend per user. The messaging throughout the
app must be explicit that **MailFlow isn't monetizing this** — once the trial is used up, the
user is covering their own OpenAI usage cost so the app doesn't keep absorbing it, not paying
for a product tier.

Confirmed decisions (from user):
- The developer's server-side `OPENAI_API_KEY` is **not** removed — it funds a free trial of
  **100 email actions per user**, then the user's own OpenAI key takes over for **both** TTS and
  reply-cleanup — full cost shift after the trial.
- Onboarding/key-entry is a gate that triggers **once the trial is exhausted**, not at signup:
  a signed-in user is redirected to onboarding only when they have no saved key *and* have used
  all 100 trial actions. Until then they use the app normally.
- Reply-cleanup migrates to **`gpt-4o-mini`** (replacing Claude Haiku), matching the tier `tts.ts`
  already uses (`gpt-4o-mini-tts`). This migration happens regardless of trial state — Anthropic
  is dropped entirely, it's just the *key* (app's vs. user's) that varies.
- Deepgram (STT) stays app-funded — out of scope, not mentioned in the BYOK rationale.
- Copy everywhere (onboarding, settings, in-app usage indicator) must make clear this is a cost
  pass-through, not a paid plan: MailFlow isn't being paid, the user is just covering the OpenAI
  cost of their own usage past the free trial.

## 1. Data model — `src/lib/types.ts`
Add two optional fields to `UserDoc`:
```ts
openaiKey?: EncryptedTokenPayload   // structurally parallel to gmailTokens — a credential, not a UserSettings preference
trialActionsUsed?: number           // count of archive/move/reply actions covered by the app's own OpenAI key
```
Both optional so existing user docs don't need a migration (same pattern as
`totalEstimate`/`playbackSpeed`); missing `trialActionsUsed` is treated as `0`.

## 2. Key resolution & trial accounting — new `src/lib/auth/openaiKey.ts`
Small helper alongside `tokenCrypto.ts`, since it reuses `encryptToken`/`decryptToken` and
follows the same "credential on `UserDoc`" shape as `gmailTokens`:

- `const FREE_TRIAL_ACTION_LIMIT = 100` — exported constant, single source of truth (onboarding
  copy, settings usage display, and the gate check all import this rather than hardcoding `100`).
- `resolveOpenAiCredential(userId: ObjectId): Promise<OpenAiCredential | null>` — reads
  `usersCollection()` once and returns:
  - `{ apiKey: <decrypted user key>, usingTrial: false }` if `openaiKey` is set (user's own key
    always wins once present, regardless of trial counter), or
  - `{ apiKey: process.env.OPENAI_API_KEY!, usingTrial: true, actionsRemaining: FREE_TRIAL_ACTION_LIMIT - (trialActionsUsed ?? 0) }`
    if under the trial limit, or
  - `null` if no user key **and** the trial is exhausted — callers (the `tts`/`reply/cleanup`
    routes) treat this as "must supply a key."
  Used by the `tts` and `reply/cleanup` routes in place of the old `getUserOpenAiKey`.
- `incrementTrialActionUsage(userId: ObjectId): Promise<void>` — `usersCollection().updateOne({
  _id: userId }, { $inc: { trialActionsUsed: 1 } })`. Called unconditionally from the
  archive/move/reply routes after the Gmail action succeeds — it's just an action counter,
  independent of which OpenAI key (if any) was used, so no branching on trial state is needed.

Setting/clearing the user's own key happens directly in the new API route (§3), same as
`settings/disconnect/route.ts` calls `usersCollection()`/`encryptToken` inline rather than via a
shared writer — no need for a second helper there.

## 3. New API route — `src/app/api/settings/openai-key/route.ts`
Kept separate from the generic `/api/settings` PATCH-style route because it handles a secret and
needs its own validation step:
- `GET` — returns `{ hasKey: boolean, trialActionsUsed: number, trialActionsRemaining: number }`.
  Never returns the plaintext or ciphertext. Powers both the Settings card (§7) and the in-app
  usage indicator (§6).
- `POST` — body `{ apiKey: string }`. Validate non-empty string; do a cheap live check
  (`new OpenAI({apiKey}).models.list()`) to catch bad keys immediately rather than failing silently
  on first real use; on success `encryptToken` it into `usersCollection().openaiKey` and return
  `{ hasKey: true }`. On invalid key, `400` with a clear error.
- `DELETE` — unsets `openaiKey` (lets a user remove/replace their key from Settings). Note this
  does **not** reset `trialActionsUsed` — removing a key doesn't refund trial actions already
  spent.

Register in the route table in `docs/app/api/README.md`, and add `docs/app/api/settings.md` coverage.

## 4. Voice pipeline changes — `src/lib/voice/replyCleanup.ts` and `tts.ts`
Both currently cache a singleton client built from a server env var; both move to a per-call
client built from a caller-supplied key (no more module-level singleton, since the key now
varies per request — either the app's trial key or the user's own):

- `replyCleanup.ts`: drop the `@anthropic-ai/sdk` import entirely. Switch to `openai`
  (`chat.completions.create`, model `gpt-4o-mini`), same system prompt intent (grammar/filler
  cleanup, preserve meaning). New signature: `cleanupReply(rawTranscript: string, apiKey: string): Promise<string>`.
- `tts.ts`: `TtsSynthesizeOptions` gains `apiKey: string`. `OpenAiTtsProvider.synthesize` builds
  `new OpenAI({ apiKey })` per call instead of the constructor caching one client — the
  `getTtsProvider()` factory/interface shape stays (per `voice.md`'s "swappable provider"
  convention), only the client construction moves inside `synthesize`.

## 5. Route updates — `src/app/api/reply/cleanup/route.ts`, `src/app/api/tts/route.ts`
Both call `resolveOpenAiCredential(auth.userId)` first. If it returns `null` (trial exhausted and
no user key), return `400` with a clear "OpenAI API key required" error rather than calling
OpenAI with `undefined` — the client should treat this as "redirect to onboarding," since the
hard gate (§6) should normally have already caught this case before the user got here. Pass the
resolved `apiKey` through to `cleanupReply`/`synthesize` either way (trial or user key — the
downstream call doesn't need to know which).

## 6. Onboarding — deferred gate, not signup gate
No onboarding flow exists today — sign-in goes straight to `/home`. Add:
- `src/app/onboarding/page.tsx` + `OnboardingClient.tsx` — **outside** the `(authenticated)` route
  group (like `tos/`/`privacy/`), so it does its own `auth()` redirect-to-`/` check but isn't
  itself gated by the layout's key check (avoiding a redirect loop). Client component: explains
  the trial is used up and MailFlow isn't monetizing this — "your 100 free actions are used;
  add your own OpenAI key to keep going. MailFlow isn't being paid for this — you're just
  covering your own usage so we don't have to fund it indefinitely." Single API key input, calls
  `POST /api/settings/openai-key`, on success `router.push('/home')`. Reuse the same input
  styling as the Settings card added in §7.
- `src/app/(authenticated)/layout.tsx`: after the existing `auth()` redirect check, look up
  `user.openaiKey` and `user.trialActionsUsed` via `usersCollection()` directly (same "server
  component calls `lib/*` directly" pattern as `home/page.tsx`) and `redirect('/onboarding')`
  only if **both** no key is set **and** `trialActionsUsed >= FREE_TRIAL_ACTION_LIMIT`. A fresh
  user with `trialActionsUsed` unset/low passes through untouched — no onboarding step at
  signup.
- `proxy.ts`: add `/onboarding` to `PROTECTED_PREFIXES` and `config.matcher` so it gets the same
  edge auth gate as the other authenticated pages.
- **Usage indicator**: somewhere persistently visible while trial is active and no key is set yet
  (e.g. a small banner in the `(authenticated)` layout or inbox header — exact placement left to
  implementation, following existing banner/toast conventions in the app) showing
  "`{remaining}/100 free actions left`" once remaining drops below some visible threshold (e.g.
  ≤20), so the redirect to onboarding isn't a surprise. Same "MailFlow isn't being paid, you're
  covering your own usage" framing as the onboarding copy, kept short.

## 7. Settings UI — `src/app/(authenticated)/settings/SettingsClient.tsx`
Add a new `Card` ("OpenAI API key") near the top, following the existing fetch/save pattern:
fetch `GET /api/settings/openai-key` for `{ hasKey, trialActionsUsed, trialActionsRemaining }` on
load. Show:
- A `Badge` ("Connected" if `hasKey`, else "Free trial" with the remaining-actions count, e.g.
  "62/100 free actions left").
- Short explanatory copy: MailFlow's own key covers the first 100 actions for free; after that
  (or any time, if the user wants to switch early) they can add their own key — again framed as
  cost pass-through, not a paid tier.
- A password-style input + Save button that `POST`s to the same route, and a small "Remove key"
  action that calls `DELETE` (visible once `hasKey` is true).

This reuses the existing `Card`/`Button`/`Badge` components and `saving`/`error`/`flashSaved`
state machine already in this file.

## 8. Cleanup: drop Anthropic dependency, keep OpenAI server key
- `package.json`: remove `@anthropic-ai/sdk`.
- `.env.local.example` / README "Getting started": remove `ANTHROPIC_API_KEY`. **Keep**
  `OPENAI_API_KEY`, documented as "funds the free trial (100 actions/user) — required to run the
  app; users can supply their own key once their trial runs out." `TOKEN_ENC_KEY` now also
  covers the user-supplied OpenAI key on top of Gmail tokens.

## 9. README updates
- Stack table: reply-cleanup and TTS rows both become "OpenAI (server key funds a 100-action free
  trial, then BYOK)"; drop the Anthropic row.
- New "Free trial & BYOK" section: explain the 100-free-action trial funded by the app's own key,
  that it's not a paid product — the user is just covering their own OpenAI usage cost afterward
  so the app doesn't have to fund everyone indefinitely — where to get a key, and that it's
  entered on the onboarding page once the trial runs out, or any time in Settings.
- Position the project as FOSS with BYOK per the vision blurb ("the audiobook app equivalent of
  an email client" for commuting/chores/yardwork), and link the new `CONTRIBUTING.md`.

## 10. New `CONTRIBUTING.md` (repo root)
Basic contribution guide: fork/branch/PR flow, run `npm run prettify && npm run ci` before
opening a PR, link back to `docs/README.md` for codebase orientation, note that running locally
needs `OPENAI_API_KEY`/`TOKEN_ENC_KEY`/Google/Mongo/Deepgram but not an Anthropic key, and that
BYOK only kicks in after 100 actions so contributors won't need a personal OpenAI key just to
develop.

## 11. Docs to update in the same change
- `docs/lib/voice.md` — `replyCleanup.ts`/`tts.ts` now take a per-call `apiKey` param (trial or
  user key), no more `ANTHROPIC_API_KEY`/module-level singleton; update "Depends on" env var list
  (keep `OPENAI_API_KEY`, drop `ANTHROPIC_API_KEY`).
- `docs/lib/auth.md` — new `openaiKey.ts` (`resolveOpenAiCredential`, `incrementTrialActionUsage`,
  `FREE_TRIAL_ACTION_LIMIT`), new `UserDoc.openaiKey`/`trialActionsUsed` fields.
- `docs/app/api/README.md` — add the `/api/settings/openai-key` row to the route table.
- `docs/app/api/settings.md`, `docs/app/api/reply-cleanup.md`, `docs/app/api/stt-tts.md` — reflect
  the trial/BYOK key flow.
- `docs/app/settings.md` — new Card in `SettingsClient.tsx`.
- `docs/app/README.md` — new `onboarding/` page (outside the route group, like `tos/`/`privacy/`).
- `docs/DECISION-TREE.md` — new row: "Manage the user's OpenAI key / free trial" → this doc set.
- `docs/ARCHITECTURE.md` — update the reply-cleanup/TTS provider mentions to reflect the trial +
  BYOK model, mention the deferred onboarding gate.
- `docs/app/api/actions.md` (or wherever `archive`/`move`/`reply` routes are documented) — note
  the `incrementTrialActionUsage` call on each.

## Execution strategy — delegate to `generic-chore-agent` subagents
The plan above is fully specified (exact files, signatures, and patterns to copy), so
implementation is mechanical, well-specified work. The orchestrating (this) session does not
write the implementation itself — it delegates each step below to a `generic-chore-agent`
subagent, in the phases below, then reviews the diffs and runs verification. Phases are
sequential (each depends on the previous); tasks within a phase are independent and are
dispatched to multiple subagents in parallel in a single message.

- **Phase A — foundation (1 agent, sequential prerequisite for everything else)**
  Give one `generic-chore-agent` §1–3 together: add `UserDoc.openaiKey`/`trialActionsUsed` to
  `src/lib/types.ts`, add `src/lib/auth/openaiKey.ts` (`FREE_TRIAL_ACTION_LIMIT`,
  `resolveOpenAiCredential`, `incrementTrialActionUsage`), add
  `src/app/api/settings/openai-key/route.ts` (GET/POST/DELETE, with the live-key validation
  call and trial counters in the GET response). Bundled into one agent because all three
  touch/depend on the same new fields and would conflict if split.

- **Phase B — parallel, depends on Phase A**
  Dispatch 3 `generic-chore-agent` subagents in parallel, single message:
  - **B1**: §4–5 — rewrite `replyCleanup.ts` (drop Anthropic, add `gpt-4o-mini` + `apiKey` param)
    and `tts.ts` (`apiKey` in `TtsSynthesizeOptions`, per-call client), update
    `api/reply/cleanup/route.ts` and `api/tts/route.ts` to resolve the key via
    `resolveOpenAiCredential` and pass it through. Update `docs/lib/voice.md`,
    `docs/app/api/reply-cleanup.md`, `docs/app/api/stt-tts.md` in the same task.
  - **B2**: §6 — onboarding deferred gate: `src/app/onboarding/page.tsx` + `OnboardingClient.tsx`
    with the free-trial/cost-pass-through copy, the `(authenticated)/layout.tsx` key+trial check
    and redirect, `proxy.ts` matcher/prefix update, and the in-app usage indicator. Update
    `docs/app/README.md` and `docs/DECISION-TREE.md` in the same task.
  - **B3**: call `incrementTrialActionUsage` from `src/app/api/actions/archive/route.ts`,
    `src/app/api/actions/move/route.ts`, and `src/app/api/actions/reply/route.ts` after each
    Gmail action succeeds. Update whichever `docs/app/api/*.md` file covers these routes.

- **Phase C — parallel, depends on Phase A's API route existing**
  Dispatch 2 `generic-chore-agent` subagents in parallel, single message:
  - **C1**: §7 — Settings UI card (fetch/save/remove key, trial usage badge and copy), update
    `docs/app/settings.md` and `docs/app/api/settings.md`.
  - **C2**: §8–10 — drop `@anthropic-ai/sdk` from `package.json`, update `.env.local.example`,
    README (stack table + free trial/BYOK section), and write `CONTRIBUTING.md`.

- **Phase D — sequential, after B and C land**
  One `generic-chore-agent`: sweep `docs/ARCHITECTURE.md` for stale Anthropic/hard-gate mentions
  (§11) now that the full implementation is in place, since this doc describes cross-cutting
  flows only Phase B+C's combined result can describe accurately.

- **Orchestrator's own role**: review each phase's diff before dispatching the next phase (so
  Phase B/C agents build on a correct Phase A), then run the Verification section below itself
  (or via one more subagent) once all phases land — including manually driving a fresh user
  through 100 trial actions (or lowering the constant temporarily to test) → onboarding →
  key entry → listen → settings flow in the browser preview.

## Verification
- `npm run prettify && npm run ci` (required by `AGENTS.md`) — typecheck/lint/tests/build all pass.
- Manual flow via dev server: sign in as a fresh user → confirm normal access to `/home`/`/listen`
  with no key set (trial active) → confirm `archive`/`move`/`reply` increment
  `trialActionsUsed` → drive `trialActionsUsed` to `FREE_TRIAL_ACTION_LIMIT` (or temporarily lower
  the constant for a faster test loop) → confirm the next protected page load redirects to
  `/onboarding` → enter an invalid key (expect rejection) → enter a valid key → confirm redirect
  to `/home` → confirm `/listen` triggers a real TTS call and a real reply-cleanup call using the
  user's stored key (not the server trial key) → go to `/settings`, confirm "Connected" badge,
  remove the key, confirm next page load bounces back to `/onboarding` (trial already exhausted,
  so removing the key re-triggers the gate immediately).
- Existing Vitest/Playwright suites (`docs/testing.md`) should cover `replyCleanup`/`tts` unit
  tests if present — update/add tests for the new `apiKey` parameter, `resolveOpenAiCredential`'s
  three branches (user key / trial / exhausted), and the deferred onboarding gate.
