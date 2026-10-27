# MailFlow

A mobile-first, installable PWA that reads a user's Gmail inbox aloud, paragraph by
paragraph, and takes voice commands between paragraphs — skip, archive, reply (by dictation),
snooze. It's built for someone drowning in email who wants to process it hands-free (e.g. over
Bluetooth), not a general email client or a general-purpose voice-assistant framework.

Listening sessions persist: a per-user bookmark tracks progress through an ordered inbox
snapshot, so listening resumes where it left off across days.

## Documentation

**[docs/README.md](docs/README.md) is the place to start** — a `docs/` tree that mirrors
`src/`, documenting the purpose, key files, dependencies, and conventions of every module, plus
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (system overview + five feature-flow walkthroughs)
and [docs/DECISION-TREE.md](docs/DECISION-TREE.md) ("I need to do X → read Y → edit Z").

`mvp-docs/` holds the original pre-implementation planning docs (product brief, PRD, brand
guide, TTS/STT provider analysis, implementation plan, build log) — useful for historical
context on *why* early decisions were made, not kept current as ongoing reference.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19 |
| Auth | NextAuth (Auth.js) v5, Google provider scoped to Gmail (single OAuth consent flow) |
| Database | MongoDB, raw driver (no ODM) |
| Gmail | `googleapis` |
| TTS | OpenAI (`gpt-4o-mini-tts`), server key funds a 100-action free trial, then BYOK |
| STT | OpenAI (`gpt-4o-mini-transcribe`), batch — client records + silence-detects locally, server key funds a 100-action free trial, then BYOK |
| Reply cleanup | OpenAI (`gpt-4o-mini`), server key funds a 100-action free trial, then BYOK |
| Styling | Tailwind CSS v4 |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for exact versions and
`mvp-docs/TTS-STT-ANALYSIS.md` for the original provider evaluation (the app has since
consolidated onto OpenAI only — see "Free trial & BYOK" below).

## Repository layout

```
src/app/            App Router pages: /, /home, /listen, /settings, and all /api routes
src/app/api/        Backend API routes — one subfolder per route, all gated by requireUser()
src/components/     ui/ (generic primitives), listening/, settings/, landing/
src/hooks/          Client hooks: useAudioPlayback, useVoiceSession, useTheme
src/lib/            Domain layer: auth/, db/, gmail/, bookmark/, voice/, types.ts
proxy.ts            Next 16's middleware.ts replacement — auth gating at the edge
public/             PWA icons, service worker (sw.js), mic audio worklet (pcm-worklet.js)
docs/               Ongoing reference documentation — see above
mvp-docs/           Pre-implementation planning docs (historical)
```

Full detail on every directory is in [docs/](docs/README.md).

## Getting started

Copy `.env.local.example` to `.env.local` and fill in:

- `AUTH_SECRET` — generate with `pnpm dlx auth secret`
- `NEXTAUTH_URL` — `http://localhost:3000` for local dev
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — from the [Google Cloud Console](https://console.cloud.google.com/apis/credentials); enable the Gmail API and add the `gmail.modify` scope under OAuth consent screen > Scopes; authorized redirect URI is `http://localhost:3000/api/auth/callback/google`
- `MONGODB_URI` / `MONGODB_DB` — a MongoDB Atlas connection string (`MONGODB_DB` defaults to `mailflow`)
- `TOKEN_ENC_KEY` — AES-256-GCM key for encrypting stored Gmail OAuth tokens and user-supplied OpenAI keys at rest; generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
- `OPENAI_API_KEY` — funds a 100-action free trial (TTS + STT + reply-cleanup) per user; not needed by contributors beyond that trial, since BYOK only kicks in once a user's own trial is exhausted

Then:

```bash
pnpm install
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000). Other scripts: `pnpm run build`,
`pnpm run start`, `pnpm run lint`.

## Free trial & BYOK

MailFlow is free, open-source software — anyone can run it themselves. The hosted version funds
the first **100 actions** (archive/move/reply, roughly proportional to voice usage) per user from
the maintainer's own OpenAI key. After that, MailFlow isn't being paid for continued usage — each
user adds their own [OpenAI API key](https://platform.openai.com/api-keys) (in Settings, or on
the onboarding page once their trial runs out) and covers their own OpenAI cost for TTS, STT, and
reply-cleanup going forward. This isn't a paid tier; it's a cost pass-through so the app doesn't
have to fund every user indefinitely.

Contributing? See [CONTRIBUTING.md](CONTRIBUTING.md).

## For agents working in this repo

Read [AGENTS.md](AGENTS.md) — this Next.js version has breaking changes from training-data
assumptions, and it points to [docs/README.md](docs/README.md) as the first stop before
exploring the codebase.

## Package manager

Use pnpm 11.24.0, pinned in `package.json`. Install it with
`npm install --global pnpm@11.24.0` if pnpm is not available.
Run `pnpm install --frozen-lockfile` after cloning. Commit `pnpm-lock.yaml`
when dependencies change; do not generate npm or Yarn lockfiles.
