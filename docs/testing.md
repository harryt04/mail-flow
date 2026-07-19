# Testing — unit, component, and e2e

## Scripts

- `npm run test` — run unit/component tests once (Vitest)
- `npm run test:watch` — watch mode for unit/component tests
- `npm run test:coverage` — run unit/component tests with a v8 coverage report (text + `coverage/` HTML report, gitignored)
- `npm run test:e2e` — run end-to-end tests (Playwright)

## Unit & component tests

Tests are **colocated** with source files as `*.test.ts(x)` (not in a separate `__tests__` tree).
Run via Vitest + React Testing Library (jsdom environment).

### Coverage strategy

**Pure logic** (no mocks needed):
- `src/lib/voice/commandMatcher.test.ts` — voice command parsing
- `src/lib/voice/labelMatcher.test.ts` — label fuzzy matching
- `src/lib/gmail/parse.test.ts` — email parsing (body extraction, quote stripping, URL humanizing)
- `src/lib/gmail/actions.test.ts` — archive/move/reply mutations against a mocked Gmail client, including reply threading headers
- `src/lib/auth/tokenCrypto.test.ts` — encrypt/decrypt round-trips
- `src/lib/auth/requireUser.test.ts` — session → authenticated user resolution, with `@/lib/auth/options` mocked
- `src/lib/auth/openaiKey.test.ts` — resolving a user's own key vs. the shared trial key vs. exhausted trial
- `src/lib/utils.test.ts` — tailwind class merging

**Component rendering** (jsdom):
- `src/components/ui/Button.test.tsx`, `Card.test.tsx`, `Badge.test.tsx`, `IconButton.test.tsx` — basic render/variant/click tests
- `src/components/listening/StatusIndicator.test.tsx` — render states for the core listening UX
- `src/components/listening/ManualControls.test.tsx` — fallback manual action buttons; uses `src/test/renderWithIntl.tsx` since the component calls `useTranslations` (see [i18n.md](./i18n.md))

Any component test whose component (or a child it renders) calls `useTranslations` needs
`renderWithIntl` from `src/test/renderWithIntl.tsx` instead of RTL's plain `render` — it wraps
the tree in a `NextIntlClientProvider` seeded with the real `en-US` catalog.

**Hooks** (renderHook):
- `src/hooks/useTheme.test.ts` — theme preference persistence
- `src/hooks/useAudioPlayback.test.ts` — playback status state
- `src/hooks/use-mobile.test.ts` — media query for mobile breakpoint
- `src/hooks/useVoiceSession.test.ts` — mic-capture lifecycle (connecting → listening →
  transcribing), silence/max-duration timeouts, cancel-while-listening, and the
  `/api/stt/transcribe` success/failure paths, with `getUserMedia`/`AudioContext`/
  `AudioWorkletNode` stubbed on `globalThis` since jsdom has no Web Audio implementation

**Mocked external calls** (vi.mock):
- `src/lib/voice/stt.test.ts` — OpenAI transcription (mocked)
- `src/lib/voice/tts.test.ts` — OpenAI TTS synthesis (mocked)
- `src/lib/voice/replyCleanup.test.ts` — OpenAI chat completion for dictated-reply cleanup (mocked)

### Known gaps

Not yet covered, flagged as follow-up work: the 16 `src/app/api/**/route.ts` handlers (need Next.js request/response fixtures), and the `(authenticated)` page-level client components (`ListenClient.tsx`, `InboxClient.tsx`, `SettingsClient.tsx`, `OnboardingClient.tsx`).

## E2E tests

End-to-end tests live in `e2e/` and run via Playwright against a built+running instance of the app.

### Setup

Playwright is configured to start a dev server via `webServer` in `playwright.config.ts`. Tests run in Chromium headless by default.

### Example: smoke test

```ts
// e2e/landing.spec.ts
test('landing page displays sign-in flow when unauthenticated', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1')).toContainText('MailFlow')
})
```

## CI integration

Per AGENTS.md, run `npm run prettify && npm run ci` before considering work done. The `ci` script runs prettier check, eslint, and vitest.

E2E tests are kept separate (`npm run test:e2e`) since they require a built, running server and take longer.

A GitHub Actions workflow (`.github/workflows/ci.yml`) runs `npm run ci` on every push/PR to `master`, so this gate is now enforced automatically as well as locally.
