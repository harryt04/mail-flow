# Contributing to MailFlow

MailFlow is free, open-source software with a bring-your-own-key (BYOK) cost model — see the
"Free trial & BYOK" section in [README.md](README.md) for how that works for end users. As a
contributor, you don't need a personal OpenAI key just to develop locally: the app's own
`OPENAI_API_KEY` funds the first 100 actions per user, which is plenty for local testing.

## Getting started

1. Fork the repo and clone your fork.
2. Follow "Getting started" in [README.md](README.md) to set up `.env.local` and run `npm install && npm run dev`.
3. Read [docs/README.md](docs/README.md) before exploring the codebase — it indexes a `docs/`
   tree that mirrors `src/` and answers "where does X live" for most tasks.

## Making changes

1. Create a branch off `master` for your change.
2. Keep changes focused — one logical change per PR.
3. Before opening a PR, run:
   ```bash
   npm run prettify
   npm run ci
   ```
   `npm run ci` runs formatting checks, lint, tests, and a production build — all must pass.
4. If your change affects where code lives or how a module works, update the relevant
   `docs/*.md` file in the same change (see [AGENTS.md](AGENTS.md) for the convention).

## Opening a PR

Push your branch and open a PR against `master`. Describe what changed and why; link any related
issue. A maintainer will review and may ask for changes before merging.
